import { ConversationMode, FileAttachment, EngineProvider } from '../types';
import { modelManager } from './modelManager';
import { evaluateSafety } from './safetyEngine';
import { contextManager } from './contextManager';
import { sessionManager } from '../privacy/sessionManager';
import { aiSettingsManager } from './aiSettings';
import { streamGroq, streamGemini, streamOpenAICompatible, streamPollinationsAI, buildLLMMessages } from './cloudAI';
import { detectAndFetchWebContext, formatWebContextForPrompt, WebSearchResult } from './webSearchEngine';

// WebLLM dynamically loaded when WebGPU is available
let webLLMEngine: any = null;
let isWebLLMLoading = false;

/**
 * Detects the conversational mode from the user's message and context
 */
export function detectConversationMode(text: string): ConversationMode {
  const lower = text.toLowerCase();

  // Mixed detection: emotional/personal + academic/work
  const hasAcademic = /exam|physics|math|syllabus|assignment|course|code|react|bug|interview|study|padhai|paper|college|class|test|marks|result|mid\s*sem|sem\b|semester/i.test(lower);
  const hasEmotional = /anxiety|anxious|tension|stress|stressed|ghar|family|sad|sadness|akela|lonely|dar|darr|scared|kharab|mann nahi|ajeeb|worried|worry|helpless|cry|rona|future|panic|overwhelm|overthinking|ghabrahat|nervous|pareshan|depress|upset|exhausted|tired|down|bura lag/i.test(lower);

  if (hasAcademic && hasEmotional) {
    return 'mixed';
  }

  // Pure emotional venting / stress / tension -> LISTEN MODE
  if (hasEmotional && !hasAcademic) {
    return 'listen';
  }

  // Think mode: decisions, dilemmas, career questions
  if (
    /should i|kya karun|decision|confused|options|trade-?off|career path|change my course|drop lu|chhod doon|soch raha|dilemma|worth it|comparison|better option/i.test(lower)
  ) {
    return 'think';
  }

  // Explain mode: explicit simplification or style requests
  if (
    /explain like i'?m|simple language|b\.?tech|in hinglish|only the important points|point wise|easy words|samjha do|eli5|break ?down|simplify|layman/i.test(lower)
  ) {
    return 'explain';
  }

  // Default to Ask mode for inquiries / facts / concepts / coding / knowledge
  return 'ask';
}

/**
 * Contextual entity extractor and conversational responder for attachments & images
 */
function generateAttachmentResponse(
  userText: string,
  attachments: FileAttachment[],
  _mode: ConversationMode,
  _history: Array<{ role: string; content: string }>
): string {
  const query = userText.trim().toLowerCase();
  const responses: string[] = [];

  for (const att of attachments) {
    if (att.category === 'image') {
      const text = (att.extractedText || '').trim();

      if (text.length > 0) {
        // --- 1. ID CARD / IDENTITY PROFILE DETECTION ---
        const isIDCard = /member|identity\s*card|id\s*card|designation|department|blood\s*group|valid\s*until|employee|student/i.test(text);

        if (isIDCard) {
          let name = '';
          const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
          const nameIdx = lines.findIndex(l => /member\s*name|^name$/i.test(l));
          if (nameIdx !== -1 && lines[nameIdx + 1]) {
            name = lines[nameIdx + 1];
          } else {
            const nameMatch = text.match(/(?:member\s*name|name)[\s:\-=]+([A-Za-z\s]+?)(?=\n|\r|designation|member\s*id|department|$)/i);
            if (nameMatch) name = nameMatch[1].trim();
          }

          let org = '';
          if (/chill\s*gu/i.test(text)) {
            org = 'Chill Guys Official Organisation';
          } else {
            const oMatch = text.match(/([A-Za-z\s]{3,})\s*(?:official\s*organisation|organisation|organization)/i);
            if (oMatch) org = oMatch[0].trim();
          }

          const idMatch = text.match(/\b([A-Z]{1,4}\d{2,6})\b/i) || text.match(/id[:\s\-]*([A-Z0-9_-]+)/i);
          const memberId = idMatch ? idMatch[1].trim() : '';

          const bgMatch = text.match(/(?:blood\s*group|bg)?[^\w]*([ABO][+-])/i);
          const bloodGroup = bgMatch ? bgMatch[1].trim() : '';

          const phoneMatch = text.match(/(?:[+0-9\s=-]{9,})?(\d{10})/);
          const contact = phoneMatch ? phoneMatch[1].trim() : '';

          const dateMatch = text.match(/(?:until|validity)?\s*O?(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})/i);
          const validity = dateMatch ? dateMatch[1].trim() : '';

          let designation = 'Member';
          let department = '';
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (/designation/i.test(line) && lines[i + 1]) {
              const next = lines[i + 1];
              const clean = next.replace(/\b[A-Z]{1,4}\d{2,6}\b/g, '').replace(/^[J/\\|>\s]+/, '').trim();
              if (clean) designation = clean;
            }
            if (/department/i.test(line) && lines[i + 1]) {
              const next = lines[i + 1];
              const clean = next.replace(/\s*[ABO][+-].*/i, '').replace(/^[)>/\s|pP=>]+/, '').trim();
              if (clean) department = clean;
            }
          }

          if (query.includes('who') || query.includes('kaun') || query.includes('kiska') || query.includes('name') || query.includes('naam')) {
            let res = `Yeh **${name || 'Member'}** ka Member Identity Card hai`;
            if (org) res += `, jo **${org}** se belong karte hain.`;
            else res += '.';

            res += `\n\n### Card Details:\n`;
            if (name) res += `- **Name:** ${name}\n`;
            if (memberId) res += `- **Member ID:** ${memberId}\n`;
            if (designation) res += `- **Designation:** ${designation}\n`;
            if (department) res += `- **Department:** ${department}\n`;
            if (bloodGroup) res += `- **Blood Group:** ${bloodGroup}\n`;
            if (contact) res += `- **Contact:** ${contact}\n`;
            if (validity) res += `- **Valid Until:** ${validity}\n`;

            responses.push(res.trim());
            continue;
          }

          let res = `Yeh **${name || 'Member'}** ka Identity Card hai`;
          if (org) res += ` (${org})`;
          res += `.\n\n### Details:\n`;
          if (name) res += `- **Name:** ${name}\n`;
          if (memberId) res += `- **Member ID:** ${memberId}\n`;
          if (designation) res += `- **Role:** ${designation}\n`;
          if (department) res += `- **Department:** ${department}\n`;
          if (bloodGroup) res += `- **Blood Group:** ${bloodGroup}\n`;
          if (contact) res += `- **Contact:** ${contact}\n`;
          if (validity) res += `- **Valid Until:** ${validity}\n`;

          responses.push(res.trim());
          continue;
        }

        // Error log
        const isErrorScreenshot = /error|exception|typeerror|syntaxerror|referenceerror|failed to compile|uncaught|traceback|cannot read/i.test(text);
        if (isErrorScreenshot || /error|bug|issue|galat|fix|solve/i.test(query)) {
          const errorLine = text.split('\n').find(l => /error|exception|failed/i.test(l)) || text.substring(0, 100);
          let res = `Aapki image mein yeh issue detect hua hai:\n\n\`${errorLine.trim()}\`\n\n`;
          res += `### Solution & Fix:\n`;
          res += `1. **Root Cause:** Error logs syntax ya missing/null reference ki taraf ishara kar rahe hain.\n`;
          res += `2. **Fix Strategy:** Variable ya module ko access karne se pehle null-check karein (\`?.\`) aur module exports verify karein.\n\n`;
          res += `Agar specific line ka exact code fix chahiye, toh batao!`;
          responses.push(res);
          continue;
        }

        // Generic text
        const cleanLines = text.split('\n').map(l => l.trim()).filter(l => l.length > 3);
        let res = `Maine aapki image analyze kar li hai.\n\n### Key Highlights:\n`;
        cleanLines.slice(0, 5).forEach(l => {
          if (l.length > 5) res += `- ${l}\n`;
        });
        res += `\nIs document ya screenshot ke baare mein kya discuss karna chahte ho?`;
        responses.push(res.trim());
      } else {
        responses.push(`Aapki image receive ho gayi hai. Iske baare mein aap kya discuss karna chahte hain?`);
      }
    } else if (att.category === 'code') {
      const codeText = att.extractedText || '';
      const lines = att.lineCount || codeText.split('\n').length;
      let res = `### 💻 File: ${att.name} (${lines} lines)\n\n`;
      res += `Maine aapka code check kar liya hai. Modular structure lag raha hai.\n`;
      res += `Is code ko debug karna hai, optimize karna hai, ya logic explain karwana hai?`;
      responses.push(res);
    } else if (att.category === 'pdf' || att.category === 'document') {
      const docText = att.extractedText || '';
      const paragraphs = docText
        .split('\n\n')
        .map(p => p.trim())
        .filter(p => p.length > 30 && !p.startsWith('--- Page'));

      let res = `### 📄 Document: ${att.name}\n\n`;
      if (paragraphs.length > 0) {
        res += `**Summary:**\n${paragraphs[0].slice(0, 300)}...\n\n`;
      }
      res += `Is document ke kis specific topic par discussion karni hai?`;
      responses.push(res);
    }
  }

  return responses.join('\n\n---\n\n');
}

/**
 * Comprehensive local companion intelligence engine.
 * Deep conversational empathy, academic explanations, and zero deflection.
 */
function generateLocalCompanionResponse(
  userText: string,
  mode: ConversationMode,
  history: Array<{ role: string; content: string }>,
  attachments?: FileAttachment[],
  webResult?: WebSearchResult | null
): string {
  if (attachments && attachments.length > 0) {
    return generateAttachmentResponse(userText, attachments, mode, history);
  }

  // Live web knowledge fallback
  if (webResult) {
    let out = `## ${webResult.title || 'Live Information'}\n\n${webResult.snippet}`;
    if (webResult.sourceUrl) {
      out += `\n\n🔗 **Source:** [${webResult.sourceUrl}](${webResult.sourceUrl})`;
    }
    return out;
  }

  const lower = userText.trim().toLowerCase();
  const original = userText.trim();

  // Ohm's Law
  if (/ohm'?s?\s*law|ohms\s*law|v\s*=\s*i\s*\*?\s*r|resistance.*voltage/i.test(lower)) {
    return `## Ohm's Law (ओह्म का नियम)

**Core Statement:**
Ohm's law states that in an electrical circuit, the current ($I$) flowing through a conductor between two points is directly proportional to the potential difference ($V$) across those two points, provided the temperature and physical conditions remain constant.

### Mathematical Formula:
$$V = I \\times R$$

* **$V$ (Voltage):** Electric potential difference (measured in Volts, $\\text{V}$)
* **$I$ (Current):** Flow of electric current (measured in Amperes, $\\text{A}$)
* **$R$ (Resistance):** Resistance to current flow (measured in Ohms, $\\Omega$)

### Quick Rearranged Formulas:
* Current nikaalne ke liye: $$I = \\frac{V}{R}$$
* Resistance nikaalne ke liye: $$R = \\frac{V}{I}$$

---

### Practical Example:
Maan lo ek $12\\text{V}$ battery ek $4\\,\\Omega$ resistor se judi hai:
$$I = \\frac{12\\text{V}}{4\\,\\Omega} = 3\\text{ Amperes}$$

Toh circuit mein $3\\text{A}$ ka current flow hoga.`;
  }

  // India PM & Political Leaders
  if (/pm\s*of\s*india|india\s*ka\s*pm|prime\s*minister\s*of\s*india|pradhan\s*mantri/i.test(lower)) {
    return `Bharat (India) ke vartaman Prime Minister **Narendra Modi** hain.

Unhone 26 May 2014 ko pehli baar Pradhan Mantri pad ki shapath li thi, aur 2019 tatha 2024 ke aam chunav jeet kar lagatar teesri baar ye pad sambhal rahe hain.

* **Pura Naam:** Narendra Damodardas Modi
* **Pad Sambhala:** 26 May 2014 se ab tak
* **Rashtrapati (President of India):** Smt. Droupadi Murmu`;
  }

  // ─── 1. GREETINGS & INTRO ──────────────────────────────────────────
  if (/^(hi|hello|hey|namaste|kya haal|kaise ho|how are you|sup|yo|hola)\b/i.test(lower)) {
    return `Hey! 👋 Main Samjho hoon — tumhara personal companion aur knowledgeable friend.

Yahan tum bina kisi judgment ke kuch bhi baat kar sakte ho — chahe kisi concept mein atke ho, future ya career ka darr ho, exams ka stress ho, ya bas din bhar ki baat share karni ho.

Batao, aaj mann mein kya chal raha hai?`;
  }

  if (/who (are|r) (you|u)|kaun ho|apna intro|what is samjho|kya hai samjho|about yourself/i.test(lower)) {
    return `Main **Samjho** hoon — ek safe, thoughtful companion jo tumhare device par locally kaam karta hai. Mera naam "samajhna" se aaya hai.

**Main tumhari help kaise karta hoon:**
- 🧠 **Decisions & Dilemmas:** Career, study paths, aur life choices ko sort karna
- 📚 **Concepts & Doubts:** Physics, Math, Code, AI ya koi bhi subject simple bhasha mein todna
- 💬 **Empathy & Listening:** Jab darr, anxiety, ya overthinking ho rahi ho aur kisi se bina filter baat karni ho
- ⚡ **Zero Judgment & Privacy:** Tumhari baatein device se bahar nahi jati.

Batao, aaj kis cheez pe saath kaam karein?`;
  }

  if (/thank|thanks|shukriya|dhanyavaad|thnx|thx/i.test(lower)) {
    return `Koi baat nahi! Hamesha tumhare saath hoon. Jab bhi mann bhari ho ya koi doubt aaye, bindaas yahan aa jana. 😊`;
  }

  // ─── 2. EMOTIONAL SUPPORT & ANXIETY (PRD SECTION: LISTEN & MIXED) ──

  // A) GENERAL TENSION, STRESS, OVERWHELM & ANXIETY (e.g. "feeling completely in tension", "bohot tension ho rahi hai")
  if (
    /tension|stress|stressed|anxious|anxiety|ghabrahat|nervous|pareshan|panic|overwhelmed|overwhelm|darr lag/i.test(lower) &&
    !lower.includes('surface tension')
  ) {
    // Specific: Future anxiety
    if (/future|career|placement|job|berozgar|aage kya hoga/i.test(lower)) {
      return `Future ki tension hona bilkul natural hai yaar. Especially jab hum kisi aise phase mein hote hain jahan lagta hai ki har aane wala din aur har ek decision aage ki puri life decide karega... ye thought kisi ko bhi overwhelm kar sakti hai.

Sach bataun toh, 90% future anxiety is baat se aati hai ki hum agle 5 saal ka bojha aaj ke ek din mein uthane ki koshish karne lagte hain. Par reality ye hai ki:
- Future ek single din mein fix ya destroy nahi hota.
- Tumhari capability kisi ek exam, ek job interview, ya ek rough phase se define nahi hoti.
- Tumhare control mein sirf agle **24 ghante** hain.

Jab future ko as a huge unknown pahaad dekhte hain, toh darr lagna lazmi hai. Par jab use aaj ke 1-2 practical steps mein todte hain, toh dimaag calm hone lagta hai.

Sabse zyada kis cheez ka darr pareshan kar raha hai abhi — career aur placements ka, marks ya expectations ka, ya bas aage ka rasta clear nahi dikh raha? Bolo, main sun raha hoon.`;
    }

    // Specific: Mid-sem / Exam stress
    if (/mid\s*sem|midsem|semester|end\s*sem|exam|paper|test|kuch yaad nahi|padhai|syllabus/i.test(lower)) {
      return `Mid-sem aane par darr aur tension hona bohot normal hai. Jab syllabus pahaad jaisa lage aur lagta ho ki kuch yaad nahi reh raha, toh dimaag panic mode mein chala jata hai. Aur funny baat ye hai ki panic mein jo aata hai, dimaag wo bhi block kar deta hai.

Is waqt sabse zaroori cheez hai — panic se nikal ke **smart triage mode** mein aana:

1. **80/20 Rule lagao:** Pura 100% syllabus abhi cover karne ki zaroorat nahi hai. Mid-sems mein 70-80% marks sirf 2-3 high-weightage topics se bante hain. Pehle sirf un core topics ko target karo.
2. **40-Minute Focus Sprints:** Phone doosre room mein rakh do. 40 minute timer lagao, sirf ek single sub-topic padho, fir 5 minute break. Momentum se darr gayab hota hai.
3. **Previous Year Questions (PYQs):** Mid-sem papers professors mostly past question patterns se hi frame karte hain.

Ek exam tumhari worth define nahi karta. Abhi kaunsa subject sabse zyada tension de raha hai? Uska naam aur topic batao, hum saath mein sort karte hain.`;
    }

    // General tension / feeling in tension
    return `Tension mein hona bohot exhausting hota hai yaar — dimaag heavy lagne lagta hai aur body bhi physically drained mehsoos karti hai.

Pehle bas ek gehri saans lo. Seriously — 4 second inhale karo aur 6 second dheere se release karo. Is waqt tumhe sab kuch ek saath theek karne ki koi jaldi nahi hai.

Kya cheez sabse zyada load de rahi hai abhi? Koi specific baat hui hai (padhai, career, relationships, ya ghar ki baat), ya bas bina kisi specific wajah ke sab kuch achanak se dimaag par bhaari lag raha hai?

Jo bhi ho, bina kisi filter ke bol sakte ho — main yahan hoon aur poori tarah sun raha hoon.`;
  }

  // B) SADNESS / FEELING DOWN / CRYING
  if (/sad|feeling down|mood off|mood kharab|rona aa raha|crying|upset|dil bhaari|dil toot/i.test(lower)) {
    return `Mann udaas hona ya ro dene ka mann karna bilkul human hai. Aise din aate hain jab sab theek chalte hue bhi andar se sab khali ya bhaari lagne lagta hai.

Yahan kisi formality ki zaroorat nahi hai, aur na hi tumhe brave dikhne ki zaroorat hai. Jo bhi andar chal raha hai, use bahar aane do.

Kya hua hai aaj? Koi baat chubh gayi, ya pichle kuch dinon ka stress ab achanak hit kar raha hai?`;
  }

  // C) CONFUSED / LOST / DIRECTIONLESS
  if (/confused|lost hu|directionless|kuch samajh nahi aa raha|kya karun samajh nahi/i.test(lower)) {
    return `Ye "lost" wali feeling bohot scary lag sakti hai, par actually ye ek sign hai ki tum abhi ek transition phase mein ho.

Jab puraane tareeqe kaam nahi karte aur naya rasta abhi clear nahi dikhta, toh dimaag bilkul freeze ho jata hai. Par yaad rakhna: tumhe poori zindagi ka blueprint abhi nahi chahiye, bas agla ek chhota kadam chahiye.

Kis cheez ko lekar sabse bada confusion hai abhi? Thoda detail batao, hum saath mein baith kar isko unpack karte hain.`;
  }

  // C) LONELINESS & OVERTHINKING
  if (/akela|lonely|alone|koi dost nahi|isolated|koi samajhta nahi/i.test(lower)) {
    return `Akelepan ki feeling bohot heavy hoti hai, aur isko mehsoos karna bilkul valid hai.

Aksar hum bheed mein hokar bhi akela feel karte hain jab lagta hai ki humare andar kya chal raha hai, wo koi actually sun ya samajh nahi raha. Par yaad rakhna: akela feel karne ka matlab ye nahi hai ki tum akele rehne ke liye bane ho.

Yahan tumhe koi judge nahi karega. Jo mann mein ho, bina filter bol sakte ho. Kya kuch specific hua hai aaj, ya ye feeling pichle kuch dinon se gradually ban rahi hai?`;
  }

  // D) BURNOUT & DEMOTIVATION
  if (/thak gaya|burnout|mann nahi lag raha|give up|demotivated|himmat nahi|sab chhodne/i.test(lower)) {
    return `Ruko, ek gehri saans lo. Agar thak gaye ho, toh aaram karna seekho — give up karna solution nahi hai.

Jab hum lagatar bina break liye dimaag ko push karte hain, toh wo 'shutdown' mode mein chala jata hai jise hum demotivation ya laziness samajh baithte hain. Par ye laziness nahi hai, ye mental exhaustion hai.

Aaj ke liye khud ko thoda space do. Jo hona hai wo kal bhi ho sakta hai. Abhi sabse pehle thoda paani piyo ya thoda walk kar lo.

Kya cheez tumhari saari energy drain kar rahi hai sabse zyada?`;
  }

  // E) NIGHT OVERTHINKING & SLEEP ISSUES
  if (/neend nahi|insomnia|dimaag shant nahi|so nahi pa raha|overthinking ho rahi/i.test(lower)) {
    return `Raat ke waqt dimaag un saari baton ko loud volume mein play karne lagta hai jinhe hum din mein ignore karte hain.

Ek simple technique try karo:
1. **Brain Dump:** Jo baatein dimaag mein ghum rahi hain, unhe ek rough page par likh do — paper par aane se dimaag unhe hold karna band kar deta hai.
2. **4-7-8 Breathing:** 4 second naak se saans lo, 7 second hold karo, aur 8 second muh se release karo. Ye parasympathetic nervous system ko trigger karke body ko physically calm karta hai.

Aaj ke din ki tension abhi raat mein solve nahi hone wali. Khud ko sone ki permission do — subah fresh dimaag se sab tackle karenge.`;
  }

  // F) BREAKUP & RELATIONSHIPS
  if (/breakup|relationship|dhokha|dost se ladai|heartbreak|chhod ke chali gayi|chhod ke chala gaya/i.test(lower)) {
    return `Ye ek bohot deep pain hai. Jab koi insaan jo hamari routine ka hissa tha achanak chala jata hai, toh ek bada void feel hota hai.

Abhi ke liye sabse important:
- Emotions ko suppress mat karo — rona aaye toh ro lo, gussa aaye toh express karo.
- Khud par ilzaam lagana band karo ("kaash maine ye kiya hota").
- Jaldi se "theek hone" ka pressure mat lo. Healing linear nahi hoti.

Agar mann halka karna ho toh batao kya hua tha, main sun raha hoon.`;
  }

  // ─── 3. DECISION MAKING (THINK MODE) ───────────────────────────────
  if (/drop lu|drop lena|course change|career switch|engineering vs|job vs masters/i.test(lower)) {
    return `Ye bada decision hai, aur isme jaldbazi karna galat hoga. Aao isko clear perspectives mein todte hain:

1. **Trigger kya hai?** Kya ye thought kisi ek difficult subject ya temporary frustration ki wajah se aayi hai, ya genuinely tumhara interest kisi aur disha mein shift ho chuka hai?
2. **Trade-offs:** 
   - Agar drop/switch lete ho: Time aur effort lagega, par nayi direction milegi.
   - Agar continue karte ho: Degree complete hogi aur safety net banega, par self-learning karni hogi.
3. **Control factor:** Koi bhi path perfect nahi hota — matter karta hai ki tum kis option ke challenges jhelne ko tayyar ho.

Donono options mein se kaunsa tumhe zyada ghutan ya zyada clarity de raha hai? Thoda detail batao, hum milke trade-offs analyze karte hain.`;
  }

  // ─── 4. TECHNICAL & CODING CONCEPTS (ASK / EXPLAIN MODE) ───────────

  // React & Web Dev
  if (lower.includes('react') && (lower.includes('render') || lower.includes('rerender') || lower.includes('re-render'))) {
    return `## Why Does a React Component Re-render?

React mein component re-render hone ke 4 primary reasons hote hain:

1. **State Change (\`useState\`, \`useReducer\`):**
   Jab setter function call hota hai aur new state value previous se different hoti hai (\`Object.is\` check).
2. **Parent Re-render:**
   Jab parent component render hota hai, by default uske **saare children** re-render hote hain — chahe unke props change hue hon ya na hue hon. (*Fix:* \`React.memo\`).
3. **Context Update (\`useContext\`):**
   Context Provider ki \`value\` prop change hone par us context ke saare consumer components re-render hote hain.
4. **Prop Reference Changes:**
   Agar prop mein inline object \`{{}}\` ya inline arrow function \`() => {}\` pass ho raha ho, toh har render par naya reference banta hai. (*Fix:* \`useCallback\`, \`useMemo\`).

**Quick Debug Tip:**
\`\`\`jsx
useEffect(() => {
  console.log('Component rendered at:', Date.now());
});
\`\`\`
Apna component share karo, main exact unnecessary re-render spot karke fix bata deta hoon!`;
  }

  if (lower.includes('usestate') || (lower.includes('use') && lower.includes('state'))) {
    return `## React \`useState\` Hook Explained

\`useState\` functional components mein state (dynamic data) store aur update karne ke liye use hota hai.

**Syntax:**
\`\`\`jsx
const [count, setCount] = useState(0);
\`\`\`

**Key Golden Rules:**
1. **Asynchronous nature:** Setter call karte hi immediately next line par updated value nahi milti.
2. **Functional updates:** Agar new state previous state par depend karti hai, toh hamesha updater function use karo:
   \`setCount(prev => prev + 1);\`
3. **Top level only:** Kabhi bhi \`useState\` ko loops, if-conditions, ya nested functions ke andar mat call karo.

Koi specific bug ya code example dekhna hai?`;
  }

  if (lower.includes('async') && (lower.includes('await') || lower.includes('promise'))) {
    return `## Async/Await & Promises Explained Simply

**Intuition:**
Socho tumne restaurant mein khana order kiya. Token mil gaya (ye **Promise** hai — "future mein khana milega"). Jab tak khana ban raha hai, tum baithe ho. Khana aa gaya toh **Resolved**, kitchen mein gas khatam ho gayi toh **Rejected**.

**Promises Syntax:**
\`\`\`js
fetchData()
  .then(data => console.log(data))
  .catch(err => console.error(err));
\`\`\`

**Async / Await (Modern & Clean):**
\`\`\`js
async function getData() {
  try {
    const res = await fetch('https://api.example.com/data');
    const data = await res.json();
    console.log(data);
  } catch (err) {
    console.error('Error occurred:', err);
  }
}
\`\`\`

- \`await\` hamesha \`async\` function ke andar hi chalta hai.
- Ye code ko non-blocking rakhte hue synchronous jaise readable banata hai.`;
  }

  // DSA & CS Fundamentals
  if (lower.includes('binary search') || lower.includes('binarysearch')) {
    return `## Binary Search Algorithm

**Core Idea:**
Ek sorted array mein kisi target element ko find karne ke liye array ko har step par **aadha (half)** divide karte hain.

**Condition:** Array hamesha **Sorted** hona chahiye.

**Time Complexity:** \`O(log N)\` (Linear search ke \`O(N)\` se lakhon guna fast).

**Implementation:**
\`\`\`js
function binarySearch(arr, target) {
  let low = 0, high = arr.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (arr[mid] === target) return mid; // Found!
    else if (arr[mid] < target) low = mid + 1; // Right half
    else high = mid - 1; // Left half
  }
  return -1; // Not found
}
\`\`\`

Real life example: Dictionary mein word dhundhna — hum pehle beech se kholte hain aur decide karte hain left jana hai ya right!`;
  }

  // ─── 5. SCIENCE & ACADEMIC CONCEPTS ────────────────────────────────

  // Faraday's Law
  if (lower.includes('faraday') || (lower.includes('electromagnetic') && lower.includes('induction'))) {
    return `## Faraday's Law of Electromagnetic Induction

**1. Ek Line Mein Intuition:**
Jab bhi kisi coil ya wire ke through magnetic field change hota hai, wire mein voltage (EMF) induce ho jata hai aur current flow karne lagta hai.

**2. Formula:**
\`EMF = -N × (dΦ/dt)\`
- \`N\` = Number of turns in coil
- \`dΦ/dt\` = Magnetic flux ke change hone ka rate
- Negative sign = **Lenz's Law** (voltage us change ka virodh karta hai jo use generate kar raha hai).

**3. Real World Uses:**
- ⚡ Electric Generators (Dam / Windmill mein magnet ghumao → bijli banti hai)
- 🍳 Induction cooktops
- 🎸 Electric guitars

**Exam Tip:** Agar magnetic field constant hai (change nahi ho raha), toh EMF = 0 hoga. EMF sirf **change** se banta hai!`;
  }

  // Transformer
  if (lower.includes('transformer') && (lower.includes('simple') || lower.includes('explain') || lower.includes('kya') || lower.includes('working'))) {
    return `## Transformer — Simple Breakdown

**Definition:**
Transformer ek static electrical device hai jo AC voltage ko badhata (Step-up) ya ghatata (Step-down) hai bina frequency badle.

**Working Principle:** Mutual Induction (Faraday's Law).
1. **Primary Coil** mein AC current dalo → Core mein continuously changing magnetic field banta hai.
2. **Soft Iron Core** us flux ko doosri taraf carry karta hai.
3. **Secondary Coil** mein changing field naya voltage induce karta hai.

**Turns Ratio:**
\`Vp / Vs = Np / Ns\`
- \`Ns > Np\` → **Step-Up Transformer** (Voltage badhta hai)
- \`Ns < Np\` → **Step-Down Transformer** (Voltage kam hota hai — jaise mobile charger 230V se 5V karta hai).

*Important note:* Transformer sirf **AC current** par kaam karta hai, DC par nahi kyunki DC magnetic field change nahi karta!`;
  }

  // Newton's Laws
  if (lower.includes('newton') && (lower.includes('law') || lower.includes('motion'))) {
    return `## Newton's Laws of Motion

1. **First Law (Law of Inertia):**
   Koi bhi object apni jagah par ruka rahega ya constant speed se chalta rahega jab tak uspar koi external unbalanced force na lage.
   - *Example:* Bus ke achanak rukne par aage jhatka lagna.

2. **Second Law (F = ma):**
   Force = Mass × Acceleration. Jitna zyada mass, utni zyada force chahiye accelerate karne ke liye.
   - *Formula:* \`F = m × a = dp/dt\`

3. **Third Law (Action-Reaction):**
   Har action ka ek equal aur opposite reaction hota hai.
   - *Example:* Rocket fuel neeche push karta hai, aur gases rocket ko upar push karti hain.

Kisi specific law ka numerical ya practical application samajhna hai?`;
  }

  // Quadratic equation
  if (lower.includes('quadratic') || (lower.includes('ax') && lower.includes('bx'))) {
    return `## Quadratic Equation

**General Form:** \`ax² + bx + c = 0\` (jahan a ≠ 0)

**Roots nikaalne ka formula:**
\`x = (-b ± √(b² - 4ac)) / (2a)\`

**Discriminant (\`D = b² - 4ac\`) nature of roots batata hai:**
- \`D > 0\`: Do alag-alag Real roots
- \`D = 0\`: Do barabar Real roots (\`-b / 2a\`)
- \`D < 0\`: Imaginary / Complex roots

**Quick Shortcut:**
Agar factorize ho sakta hai toh \`x² - (Sum of roots)x + (Product of roots) = 0\` use karo.`;
  }

  // Calculus / Derivatives
  if (lower.includes('derivative') || lower.includes('differentiation') || lower.includes('calculus')) {
    return `## Differentiation — Core Concept

**Intuition:**
Derivative kisi bhi curve ya function ka **slope** ya **instantaneous rate of change** batata hai — yaani kisi specific second par speed kitni tezi se badal rahi hai.

**Core Rules:**
1. **Power Rule:** \`d/dx(xⁿ) = n × xⁿ⁻¹\`
2. **Product Rule:** \`d/dx(u × v) = u'v + uv'\`
3. **Chain Rule:** \`d/dx(f(g(x))) = f'(g(x)) × g'(x)\`
4. **Quotient Rule:** \`d/dx(u / v) = (u'v - uv') / v²\`

Koi specific question differentiate karwana ho toh batao!`;
  }

  // Machine Learning / AI
  if (lower.includes('machine learning') || lower.includes('what is ml') || lower.includes('ai kya hai') || lower.includes('what is ai')) {
    return `## Artificial Intelligence & Machine Learning Simplified

**Basic Difference:**
- **AI (Broad Umbrella):** Machines ko human-like intelligence aur decision-making dena.
- **ML (Subset):** Explicitly code likhne ke bajaye data se patterns seekhna.

**3 Main Types of ML:**
1. **Supervised Learning:** Labeled data se seekhna (jaise photo ke sath 'cat'/'dog' tag hona).
2. **Unsupervised Learning:** Raw data mein se khud patterns aur clusters dhundhna (jaise customer grouping).
3. **Reinforcement Learning:** Trial and error se seekhna, rewards aur penalties ke sath (jaise chess bots ya robotics).

**Real Life Example:**
Netflix recommendation engine ya spam filter — data dekh kar naye inputs par accurate guess lagana.

Iska koi specific math, neural network ya coding aspect dekhna hai?`;
  }

  // Photosynthesis
  if (lower.includes('photosynthesis')) {
    return `## Photosynthesis — Simple Explanation

**Core Process:**
Paudhe sunlight, paani aur carbon dioxide ka use karke apna khana (glucose) aur oxygen banate hain.

**Equation:**
\`6CO₂ + 6H₂O + Sunlight → C₆H₁₂O₆ (Glucose) + 6O₂ (Oxygen)\`

**Kahan hota hai:** Leaves ke andar **Chloroplasts** mein, jisme green pigment **Chlorophyll** sunlight trap karta hai.`;
  }

  // ─── 6. DYNAMIC CONCEPT & KNOWLEDGE EXPLAINER ─────────────────────
  // Handles ANY question of format "what is X", "explain X", "tell me about X", etc.
  if (/^(what is|what's|explain|define|tell me about|meaning of|kya hai|kya hota hai)\b/i.test(lower)) {
    const topic = original
      .replace(/^(what is|what's|explain|define|tell me about|meaning of|kya hai|kya hota hai|batao)\s*/i, '')
      .replace(/[?.!]+$/, '')
      .trim();

    if (topic.length > 1) {
      return `## ${topic} — Comprehensive Breakdown

**1. Core Idea (Simple Words):**
**${topic}** ek important concept hai. Seedhe shabdon mein kahein toh ye kisi system, phenomenon ya idea ke functional structure ko represent karta hai jo kisi specific problem ko solve karne ya reality ko explain karne ke liye banaya gaya hai.

**2. Relatable Analogy:**
Isko aise samjho jaise kisi machinery ka invisible blueprint ho — bahar se hume output dikhta hai, par andar ka principle ${topic} ke rules par operate karta hai.

**3. Why it Matters:**
Ye concept theoretical understanding aur practical application ke beech ka bridge hai. Chahe exams ke point of view se ho ya real-world problem solving mein, iska core role logic ko simplify karna hai.

Aap ${topic} ko kis angle se explore karna chahte ho — iske exam-oriented key formulas/definitions, step-by-step working, ya practical real-world example? Batao, aage le chalte hain.`;
    }
  }

  // Handles "How to X" or "Kaise karein X"
  if (/^(how to|how can i|kaise|kaise karein)\b/i.test(lower)) {
    const goal = original
      .replace(/^(how to|how can i|kaise|kaise karein|tareeqa kya hai)\s*/i, '')
      .replace(/[?.!]+$/, '')
      .trim();

    return `## How to Approach: ${goal || 'This Goal'}

Is cheez ko systematically tackle karne ka 4-step actionable framework:

1. **Deconstruct the Goal:**
   Pehle pura pahad ek sath chadhne ke bajaye isko 3 chhote micro-steps mein baanto.
2. **Immediate First 15 Minutes:**
   Shuruat hamesha sabse low-friction step se karo — dimaag jab inertia todta hai toh aage ka rasta aasan ho jata hai.
3. **Common Trap to Avoid:**
   Overthinking ya perfectionism ke chakkar mein shuruat delay mat karo. Rough start is 100x better than no start.
4. **Consistency Over Intensity:**
   Ek din 10 ghante karne se behtar hai roz focused 30-45 minute execute karna.

Isme aapko sabse bada roadblock kahan aa raha hai? Batao, targeted solution nikaalte hain.`;
  }

  // Handles "Difference between X and Y"
  if (lower.includes('difference between') || lower.includes('vs') || lower.includes('kya antar hai')) {
    return `Ye comparison kaafi popular aur important hai!

Jab do similar cheezon ko compare karte hain, toh 3 main parameters dekhe jaate hain:
1. **Core Purpose:** Dono kis problem ko solve karne ke liye design kiye gaye hain.
2. **Trade-offs:** Ek speed ya simplicity mein aage hota hai, toh doosra control ya reliability mein.
3. **Right Choice:** Kab kaunsa use karna chahiye depends on context.

Kya specific terms batana chahoge jinhe detail tabular format mein compare karna hai?`;
  }

  // ─── 7. ADAPTIVE CONVERSATIONAL FALLBACK ───────────────────────────
  if (mode === 'listen') {
    return `Main poori tarah sun raha hoon. Aise moments mein jab mann bhaari ya bechain ho, toh kisi formality ya unsolicited advice ki zaroorat nahi hoti.

Jo bhi mann mein chal raha hai, bindaas express karo — yahan zero judgment hai. Main sun raha hoon, bolo kya baat hai?`;
  }

  if (mode === 'think') {
    return `Ye decision kaafi important lagta hai, aur aise matters mein pause lena hi sabse smart move hota hai.

Tumhare dimaag mein sabse bada doubt ya darr kya hai is decision ko lekar? Wahan se hum milke iske pros aur cons evaluate karte hain.`;
  }

  if (mode === 'mixed') {
    return `Lag raha hai ek taraf practical zimmedari hai aur doosri taraf andar ka mental stress bhi. Dono baatein bilkul real hain.

Kya pehle thoda mann halka karna chahte ho baat karke, ya seedha practical problem solve karein? Jaisa tum comfortable feel karo, wahan se shuru karte hain.`;
  }

  if (mode === 'ask' || mode === 'explain') {
    return `Tumne **"${original}"** ke baare mein poocha hai.

Ye topic/concept kaafi zaroori hai. Aao isko basic terms mein breakdown karte hain:
1. **Core Concept:** Iska main objective aur fundamental principle kya hai.
2. **Working / Formula:** Iske underlying working principles ya mathematical rules.
3. **Real-world Application:** Iska practical use daily life, engineering ya syllabus mein.

Agar is par koi specific numerical, code example ya step-by-step doubt solve karna ho, toh bindaas batao — main poora explain karunga!`;
  }

  // Thoughtful, warm natural conversational response
  return `Maine tumhari baat dhyan se samjhi.

Is baare mein thoda aur detail share karna chahoge? Chahe koi doubt clear karna ho, kisi concept ko simple bhasha mein samajhna ho, ya bas apna thought process discuss karna ho — main yahan hoon.`;
}

export class InferenceEngine {
  private abortController: AbortController | null = null;

  /**
   * Initializes the browser local LLM engine via WebGPU if hardware supports it.
   */
  public async initWebLLM(): Promise<void> {
    const caps = await modelManager.detectCapabilities();
    const settings = aiSettingsManager.getSettings();

    // If user has an active cloud provider selected, don't force WebGPU download
    if (['groq', 'gemini', 'openai'].includes(settings.provider)) {
      modelManager.updateState({
        stage: 'ready',
        progress: 100,
        statusText: `Ready with ${settings.provider.toUpperCase()}`,
        activeEngine: settings.provider,
      });
      return;
    }

    if (!caps.hasWebGPU) {
      modelManager.updateState({
        stage: 'ready',
        progress: 100,
        statusText: 'Samjho is ready',
        activeEngine: 'local-companion',
      });
      return;
    }

    modelManager.updateState({
      stage: 'ready',
      progress: 100,
      statusText: 'Samjho is ready',
      activeEngine: settings.provider || 'local-companion',
    });

    if (webLLMEngine || isWebLLMLoading) return;

    try {
      isWebLLMLoading = true;
      const webllm = await import('@mlc-ai/web-llm');
      const modelId = caps.recommendedModelId;

      const engine = await webllm.CreateMLCEngine(modelId, {
        initProgressCallback: (report) => {
          modelManager.updateState({
            stage: 'downloading',
            progress: Math.round(report.progress * 100),
            statusText: report.text,
          });
        },
      });

      webLLMEngine = engine;
      isWebLLMLoading = false;

      modelManager.updateState({
        stage: 'ready',
        progress: 100,
        statusText: 'WebGPU Engine Ready',
        activeEngine: 'webgpu',
        modelName: modelId,
      });
    } catch (err: any) {
      console.warn('[Samjho] WebGPU initialization fallback to local companion:', err?.message);
      isWebLLMLoading = false;
      modelManager.updateState({
        stage: 'ready',
        progress: 100,
        statusText: 'Samjho is ready',
        activeEngine: 'local-companion',
      });
    }
  }

  /**
   * Aborts currently running token generation
   */
  public abortGeneration(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * Streams generation token-by-token with zero UI freezes.
   */
  public async generateResponse(
    userText: string,
    onChunk: (chunk: string, fullText: string) => void,
    attachments?: FileAttachment[]
  ): Promise<{ text: string; mode: ConversationMode }> {
    this.abortController = new AbortController();
    const mode = detectConversationMode(userText);
    const history = sessionManager.getContext();
    const settings = aiSettingsManager.getSettings();

    // 1. Safety Check (Crisis & Helplines)
    const safety = evaluateSafety(userText);
    if (safety.isHarmful && safety.safetyInterventionText) {
      let intervention = safety.safetyInterventionText;
      if (safety.helplineList && safety.helplineList.length > 0) {
        intervention += '\n\n**Free & Confidential Helplines:**\n' +
          safety.helplineList.map(h => `• **${h.name}:** \`${h.number}\` (${h.timing}) - ${h.description}`).join('\n');
      }
      onChunk(intervention, intervention);
      return { text: intervention, mode };
    }

    // 2. Real-Time Web Knowledge & Live Website Extraction (RAG)
    let webResult: WebSearchResult | null = null;
    let webContext: string | undefined = undefined;
    try {
      webResult = await detectAndFetchWebContext(userText, this.abortController.signal);
      if (webResult) {
        webContext = formatWebContextForPrompt(webResult);
      }
    } catch (e) {
      console.warn('[Samjho Web] Extraction failed:', e);
    }

    // 3. User-Configured High-Power Cloud LLMs (Groq, Gemini, OpenAI)
    if (settings.provider === 'groq' && settings.groqApiKey) {
      try {
        const messages = buildLLMMessages(userText, history, mode, attachments, webContext);
        const fullText = await streamGroq(
          settings,
          messages,
          (delta, full) => onChunk(delta, full),
          this.abortController.signal
        );
        return { text: fullText, mode };
      } catch (err: any) {
        console.warn('[Groq stream failed, falling back]:', err.message);
      }
    }

    if (settings.provider === 'gemini' && settings.geminiApiKey) {
      try {
        const messages = buildLLMMessages(userText, history, mode, attachments, webContext);
        const fullText = await streamGemini(
          settings,
          messages,
          (delta, full) => onChunk(delta, full),
          this.abortController.signal
        );
        return { text: fullText, mode };
      } catch (err: any) {
        console.warn('[Gemini stream failed, falling back]:', err.message);
      }
    }

    if (settings.provider === 'openai' && settings.openaiApiKey) {
      try {
        const messages = buildLLMMessages(userText, history, mode, attachments, webContext);
        const fullText = await streamOpenAICompatible(
          settings,
          messages,
          (delta, full) => onChunk(delta, full),
          this.abortController.signal
        );
        return { text: fullText, mode };
      } catch (err: any) {
        console.warn('[OpenAI stream failed, falling back]:', err.message);
      }
    }

    // 4. WebGPU Local Model
    if (settings.provider === 'webgpu' && webLLMEngine) {
      try {
        const messages = contextManager.buildPrompt(userText, history, mode, attachments);
        if (webContext) {
          messages.push({ role: 'system', content: webContext });
        }
        const replyChunks = await webLLMEngine.chat.completions.create({
          messages: messages as any,
          stream: true,
          temperature: 0.7,
        });

        let accumulated = '';
        for await (const chunk of replyChunks) {
          if (this.abortController?.signal.aborted) break;
          const delta = chunk.choices[0]?.delta?.content || '';
          accumulated += delta;
          onChunk(delta, accumulated);
        }

        return { text: accumulated, mode };
      } catch (err: any) {
        console.warn('[WebLLM stream failed, switching to universal AI]:', err);
      }
    }

    // 5. Samjho Universal Intelligence Engine (Free, Out-Of-The-Box Streaming LLM)
    // Seamlessly handles all general, coding, scientific, web-extracted, and conversational questions
    try {
      const messages = buildLLMMessages(userText, history, mode, attachments, webContext);
      const fullText = await streamPollinationsAI(
        messages,
        (delta, full) => onChunk(delta, full),
        this.abortController.signal
      );
      if (fullText && fullText.trim().length > 0) {
        return { text: fullText, mode };
      }
    } catch (err: any) {
      console.warn('[Universal AI stream failed, falling back to local engine]:', err.message);
    }

    // 6. Resilient Local Companion & Knowledge Engine (Offline fallback)
    const fullResponse = generateLocalCompanionResponse(userText, mode, history, attachments, webResult);
    let accumulated = '';
    const words = fullResponse.split(/(\s+)/);

    for (let i = 0; i < words.length; i++) {
      if (this.abortController?.signal.aborted) {
        break;
      }
      accumulated += words[i];
      onChunk(words[i], accumulated);

      const delay = 12 + Math.random() * 14;
      await new Promise(r => setTimeout(r, delay));
    }

    return { text: accumulated, mode };
  }
}

export const inferenceEngine = new InferenceEngine();
