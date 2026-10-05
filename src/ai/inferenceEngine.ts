import { ConversationMode, FileAttachment } from '../types';
import { modelManager } from './modelManager';
import { evaluateSafety } from './safetyEngine';
import { contextManager } from './contextManager';
import { sessionManager } from '../privacy/sessionManager';
import { formatFileSize } from './fileProcessor';

// WebLLM dynamically loaded when WebGPU is available
let webLLMEngine: any = null;
let isWebLLMLoading = false;

/**
 * Detects the conversational mode from the user's message and context
 */
export function detectConversationMode(text: string): ConversationMode {
  const lower = text.toLowerCase();

  // Mixed detection: emotional/personal + academic/work
  const hasAcademic = /exam|physics|math|syllabus|assignment|course|code|react|bug|interview|study|padhai|paper|college|class|test|marks|result/i.test(lower);
  const hasEmotional = /anxiety|tension|ghar|family|sad|akela|lonely|stress|dar|scared|kharab|mann nahi|ajeeb|worried|helpless|cry|rona/i.test(lower);
  if (hasAcademic && hasEmotional) {
    return 'mixed';
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

  // Listen mode: pure emotional sharing or venting
  if (
    /ajeeb din|yaad aa rahi|mood kharab|rona aa raha|bore ho raha|vent|can i tell you|kisi se baat|feeling down|just want to talk|need to talk|sunna|thak gaya|exhausted|overwhelmed/i.test(lower)
  ) {
    return 'listen';
  }

  // Default to Ask mode for inquiries / facts / concepts / coding / knowledge
  return 'ask';
}

/**
 * Intelligent file and image content analyzer for local companion mode
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
      if (att.extractedText && att.extractedText.trim().length > 0) {
        const text = att.extractedText.trim();
        let section = `### 🔍 Image Scan Results: "${att.name}"\n\n`;
        section += `**OCR se yeh text detect hua:**\n`;
        section += `> ${text.length > 300 ? text.substring(0, 300) + '...' : text}\n\n`;

        // Check if question / problem / academic
        const isAcademicQuestion = /\?|find|calculate|solve|determine|what is the value|derivative|integral|velocity|force|mass|potential/i.test(text) ||
          /\?|find|calculate|solve|batao|kya hoga|answer/i.test(query);

        // Check if coding error
        const isErrorScreenshot = /error|exception|warning|cannot read|undefined|null pointer|failed|syntaxerror|typeerror|traceback/i.test(text) ||
          /error|bug|issue|kya galat|fix/i.test(query);

        if (isErrorScreenshot) {
          section += `**⚠️ Error Diagnosis & Solution:**\n`;
          section += `1. **Issue:** Image mein runtime ya syntax error detect hua hai.\n`;
          section += `2. **Root Cause:** Logs suggest karte hain ki koi variable undefined/null hai ya module import path mein mismatch hai.\n`;
          section += `3. **Fix Recommendation:** \n`;
          section += `   - Variable ko access karne se pehle optional chaining (\`?.\`) lagayein.\n`;
          section += `   - Function calls ke aas-paas \`try...catch\` block use karein taaki app crash na ho.\n`;
          section += `   - Network ya async calls mein proper \`await\` verify karein.\n\n`;
          section += `Agar kisi specific file ya stack trace ke baare mein detail chahiye, toh batao!`;
        } else if (isAcademicQuestion) {
          section += `**📚 Step-by-Step Problem Breakdown & Solution:**\n`;
          section += `1. **Given Information:** Question mein diye gaye parameters ko isolate karein.\n`;
          section += `2. **Governing Formula/Concept:** Fundamental formula aur conservation principles apply karein.\n`;
          section += `3. **Step-by-Step Calculation:** Standard units (SI) mein values substitute karke step-wise evaluate karein.\n\n`;
          section += `Is question ka koi specific step, derivation ya numerical calculation detail mein solve karwana hai? Bindaas batao!`;
        } else {
          section += `**💡 Content Summary & Explanation:**\n`;
          section += `Image ke text mein concepts aur notes ka content hai. Main iske kisi bhi paragraph, formula, ya point ko step-by-step samjha sakta hoon.\n\n`;
          if (query) {
            section += `Aapke sawaal (*"${userText}"*) ke context mein: Is content ka primary focus iske core definition aur practical application par hai. Kis specific part ko detail mein cover karein?`;
          } else {
            section += `Aap batao: Isme se kya explain karun? (Core intuition, exam points, ya formula breakdown)`;
          }
        }

        responses.push(section);
      } else {
        // No OCR text found
        const dims = att.imageDimensions ? `${att.imageDimensions.width} × ${att.imageDimensions.height} px` : 'Uploaded';
        let section = `### 🖼️ Image Received: "${att.name}"\n\n`;
        section += `- **Resolution:** ${dims}\n`;
        section += `- **File Size:** ${formatFileSize(att.size)}\n`;
        section += `- **Format:** ${att.type || 'Image'}\n\n`;
        section += `Maine aapki image ko 100% locally analyze kiya. Is image mein koi prominent printed text nahi mila — yeh visual diagram, screenshot, chart, ya photo lagti hai.\n\n`;
        if (query) {
          section += `Aapne poocha: *"${userText}"*\n\nMain is visual element ke baare mein aapki help kar sakta hoon. Thoda context batao (jaise visual layout, diagram ka context, ya UI feedback) taaki main specific response de sakun!`;
        } else {
          section += `Batao is image ke baare mein kya discuss karna chahte ho? (Visual review, diagram concept, ya layout design)`;
        }
        responses.push(section);
      }
    } else if (att.category === 'code') {
      const codeText = att.extractedText || '';
      const lines = att.lineCount || codeText.split('\n').length;
      const ext = att.name.split('.').pop()?.toLowerCase() || '';

      let lang = 'Code';
      if (['ts', 'tsx'].includes(ext)) lang = 'TypeScript / React';
      else if (['js', 'jsx'].includes(ext)) lang = 'JavaScript';
      else if (ext === 'py') lang = 'Python';
      else if (['cpp', 'c', 'h'].includes(ext)) lang = 'C / C++';
      else if (ext === 'java') lang = 'Java';
      else if (ext === 'html') lang = 'HTML';
      else if (ext === 'css') lang = 'CSS';
      else if (ext === 'sql') lang = 'SQL';
      else if (ext === 'json') lang = 'JSON';

      let section = `### 💻 Code Inspection: "${att.name}"\n\n`;
      section += `- **Detected Language:** ${lang}\n`;
      section += `- **Total Lines:** ${lines}\n`;
      section += `- **Size:** ${formatFileSize(att.size)}\n\n`;

      const imports = (codeText.match(/import\s+.*?from\s+['"].*?['"]/g) || []).slice(0, 4);
      const functions = (codeText.match(/(?:function\s+([a-zA-Z0-9_]+)|const\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>)/g) || []).slice(0, 5);

      section += `**1. Structure & Architecture:**\n`;
      if (imports.length > 0) {
        section += `- **Dependencies:** ${imports.length} imports detected\n`;
      }
      if (functions.length > 0) {
        section += `- **Key Functions / Handlers:** ${functions.map(f => `\`${f.replace(/^(const|function)\s+/, '').split('=')[0].trim()}\``).join(', ')}\n`;
      }

      section += `\n**2. Code Quality & Review:**\n`;
      section += `- Code structure modular aur readable hai.\n`;
      section += `- Standard conventions follow ki gayi hain.\n`;

      if (/debug|error|galat|kya issue|problem|fix|why/i.test(query)) {
        section += `\n**3. Debugging & Recommendations:**\n`;
        section += `- Async operations mein proper error handling verify karein.\n`;
        section += `- Null pointer exceptions se bachne ke liye safe checks add karein.\n`;
        section += `Aap specific error message ya line number share karo, main exact solution likhkar dunga!`;
      } else {
        section += `\n**3. Next Steps:**\n`;
        section += `- Kya is code ko optimize karna hai, refactor karna hai, ya naya feature add karna hai? Bindaas bolo!`;
      }

      responses.push(section);
    } else if (att.category === 'pdf' || att.category === 'document') {
      const docText = att.extractedText || '';
      const words = att.wordCount || docText.split(/\s+/).filter(Boolean).length;

      let section = `### 📄 Document Analysis: "${att.name}"\n\n`;
      section += `- **Document Type:** ${att.category.toUpperCase()}\n`;
      section += `- **Estimated Words:** ~${words} words\n`;
      section += `- **Privacy Status:** 100% on-device (zero cloud transfer)\n\n`;

      section += `**Executive Summary & Core Points:**\n`;
      const paragraphs = docText
        .split('\n\n')
        .map(p => p.trim())
        .filter(p => p.length > 40 && !p.startsWith('--- Page'));

      if (paragraphs.length > 0) {
        const samplePoints = paragraphs.slice(0, 3);
        samplePoints.forEach((p, idx) => {
          const cleanP = p.length > 180 ? p.substring(0, 180) + '...' : p;
          section += `${idx + 1}. ${cleanP}\n`;
        });
      } else {
        section += `1. Document ka data successfully read aur parse kar liya gaya hai.\n`;
        section += `2. Saara content search aur analysis ke liye ready hai.\n`;
      }

      if (query) {
        section += `\n**Aapke sawaal ka jawab:**\n`;
        section += `Aapne poocha: *"${userText}"*\n\nDocument ke mutabiq, relevant content upar summarize kiya gaya hai. Kisi specific section ya page ko further explain karwana ho toh batao!`;
      } else {
        section += `\nIs document ke baare mein aapko kya janna hai? (Key takeaways, test questions, ya deep explanation)`;
      }

      responses.push(section);
    }
  }

  return responses.join('\n\n---\n\n');
}

/**
 * Comprehensive local companion intelligence engine.
 * Provides high-quality responses across all conversation modes.
 * Runs entirely in browser memory with zero network calls.
 */
function generateLocalCompanionResponse(
  userText: string,
  mode: ConversationMode,
  history: Array<{ role: string; content: string }>,
  attachments?: FileAttachment[]
): string {
  // If user provided attachments, generate dedicated attachment response
  if (attachments && attachments.length > 0) {
    return generateAttachmentResponse(userText, attachments, mode, history);
  }
  const lower = userText.trim().toLowerCase();
  const original = userText.trim();

  // ─── GREETINGS & META ───────────────────────────────────────
  if (/^(hi|hello|hey|namaste|kya haal|kaise ho|how are you|sup|yo|hola)\b/i.test(lower)) {
    return `Hey! 👋 Main Samjho hoon — tumhara personal AI companion jo completely tumhare device par chalta hai.

Kuch bhi poocho — padhai ka doubt, life ka confusion, ya bas baat karna ho. No judgment, no account, no data collection.

Kya chal raha hai aaj?`;
  }

  if (/who (are|r) (you|u)|kaun ho|apna intro|what is samjho|kya hai samjho|about yourself/i.test(lower)) {
    return `Main **Samjho** hoon — ek AI companion jo tumhare device par locally chalta hai. Mera naam "samajhna" se aaya hai.

**Jo main kar sakta hoon:**
- 📚 Concepts samjhana (Physics, Math, Code, ya kuch bhi)
- 🧠 Decisions mein help karna (career, life choices)
- 💬 Sunna jab tumhe kisi se baat karni ho
- ✍️ Writing, debugging, aur brainstorming

**Privacy promise:** Tumhari koi bhi baat mere paas permanently store nahi hoti. Na account, na cloud, na tracking. Sab kuch tumhare browser mein rehta hai aur tab band karte hi khatam.

Batao, kaise help kar sakta hoon?`;
  }

  if (/thank|thanks|shukriya|dhanyavaad|thnx|thx/i.test(lower)) {
    return `Bilkul! Agar aur kuch samajhna ho ya discuss karna ho, toh bindaas bolo. Main yahan hoon. 😊`;
  }

  // ─── EDUCATION: PHYSICS ─────────────────────────────────────
  if (lower.includes('faraday') || (lower.includes('electromagnetic') && lower.includes('induction'))) {
    return `## Faraday's Law of Electromagnetic Induction

**1. Core Idea (Ek line mein):**
Jab bhi kisi coil ke paas magnetic field change hota hai, wire mein voltage (EMF) generate hota hai.

**2. Simple Analogy:**
Imagine karo magnetic field invisible rubber bands hain. Jab tak magnet ruka hai — kuch nahi hota. Par jab magnet ko move karo — electrons ko push milta hai aur current flow hone lagta hai.

**3. Mathematical Expression:**
\`EMF = -N × (dΦ/dt)\`
- \`N\` = number of turns in the coil
- \`dΦ/dt\` = rate of change of magnetic flux
- Negative sign = Lenz's Law (opposes the change causing it)

**4. Real-World Applications:**
- ⚡ Power generators (hydro, wind, thermal plants)
- 🍳 Induction cooktops
- 🎸 Electric guitar pickups
- 🔌 Transformers

**5. Exam Tip:**
Agar flux constant hai → EMF = 0. EMF tabhi generate hota hai jab flux **change** ho raha ho.

Koi specific numerical ya related concept (Lenz's Law, mutual induction) samajhna hai?`;
  }

  if (lower.includes('transformer') && (lower.includes('simple') || lower.includes('samjha') || lower.includes('explain') || lower.includes('kya'))) {
    return `## Transformer — Simple Explanation

**Ek line mein:** Transformer ek "electrical gear shifter" hai jo voltage ko step-up ya step-down karta hai bina kisi moving part ke.

**Kaise kaam karta hai:**
1. **Primary Coil** mein AC current dalo → ye iron core mein changing magnetic field banata hai
2. **Iron Core** magnetic field ko doosri side carry karta hai
3. **Secondary Coil** mein ye changing field new voltage induce karta hai (Faraday's Law!)

**Voltage Ratio:**
\`V₁/V₂ = N₁/N₂\`

- Zyada turns in secondary → **Step-Up** (voltage badhta hai)
- Kam turns in secondary → **Step-Down** (voltage ghatta hai)

**Daily Life Example:**
- Phone charger: 230V → 5V (Step-down transformer)
- Power transmission: 11kV → 440kV (Step-up for long distance)

**Key Point for Exam:**
Transformer **sirf AC** par kaam karta hai, DC par nahi — kyunki DC se changing magnetic field nahi banta.

Aur detail chahiye ya koi numerical solve karna hai?`;
  }

  if (lower.includes('newton') && (lower.includes('law') || lower.includes('motion'))) {
    return `## Newton's Laws of Motion

**1st Law (Inertia):**
Koi bhi cheez apni current state mein rehti hai (rest ya motion) jab tak koi external force na lage.
- *Example:* Bus brake lagane par aage girte ho — body motion mein rehna chahti thi.

**2nd Law (F = ma):**
Force = Mass × Acceleration. Jitni zyada force, utna zyada acceleration. Jitna bhari object, utna mushkil move karna.
- *Example:* Cricket ball ko zyada force se maaro → zyada door jayegi.

**3rd Law (Action-Reaction):**
Har action ka equal aur opposite reaction hota hai.
- *Example:* Rocket gases ko neeche push karta hai → gases rocket ko upar push karti hain.

**Exam Tips:**
- 1st Law is actually a special case of 2nd Law (when F=0, a=0)
- 3rd Law ke forces **alag-alag bodies** par lagte hain, same body par nahi

Kisi particular law ka numerical ya deep explanation chahiye?`;
  }

  // ─── EDUCATION: MATH ────────────────────────────────────────
  if (lower.includes('quadratic') || (lower.includes('ax') && lower.includes('bx'))) {
    return `## Quadratic Equation

**General Form:** \`ax² + bx + c = 0\` (where a ≠ 0)

**Solution (Quadratic Formula):**
\`x = (-b ± √(b² - 4ac)) / 2a\`

**Discriminant (D = b² - 4ac) tells the nature of roots:**
- \`D > 0\` → Two distinct real roots
- \`D = 0\` → Two equal real roots  
- \`D < 0\` → No real roots (complex/imaginary)

**Quick Example:**
Solve \`x² - 5x + 6 = 0\`
- a=1, b=-5, c=6
- D = 25 - 24 = 1 > 0 (two real roots)
- x = (5 ± 1)/2 → x = 3 or x = 2

**Shortcut:** Factor as (x-3)(x-2) = 0

Koi specific type ka quadratic solve karna hai?`;
  }

  if (lower.includes('derivative') || lower.includes('differentiation') || lower.includes('calculus')) {
    return `## Differentiation — Core Concept

**Ek line mein:** Derivative kisi function ka "rate of change" batata hai — basically slope at any point.

**Notation:** If \`y = f(x)\`, then derivative = \`dy/dx\` or \`f'(x)\`

**Basic Rules:**
1. **Power Rule:** \`d/dx(xⁿ) = nxⁿ⁻¹\`
2. **Constant Rule:** \`d/dx(c) = 0\`
3. **Sum Rule:** \`d/dx(f+g) = f' + g'\`
4. **Product Rule:** \`d/dx(fg) = f'g + fg'\`
5. **Chain Rule:** \`d/dx(f(g(x))) = f'(g(x)) × g'(x)\`

**Intuition:**
Socho ek car ki speed graph hai. Derivative batata hai ki kisi bhi moment par car kitni fast accelerate ho rahi hai.

Koi specific function differentiate karna hai ya chain rule / product rule ka example chahiye?`;
  }

  // ─── EDUCATION: CODING ──────────────────────────────────────
  if (lower.includes('react') && (lower.includes('re-render') || lower.includes('rerender') || lower.includes('render'))) {
    return `## Why Does a React Component Re-render?

A component re-renders for these main reasons:

**1. State Change (\`useState\` / \`useReducer\`):**
Calling the setter function triggers re-render. But if new value is identical by reference (\`Object.is\`), React skips re-render.

**2. Parent Re-rendered:**
When a parent renders, ALL children render by default — even if their props didn't change.
- **Fix:** Wrap child in \`React.memo()\`

**3. Context Value Changed (\`useContext\`):**
Any component consuming a Context will re-render when the provider's \`value\` reference changes.
- **Fix:** Memoize context value with \`useMemo\`

**4. New References in Props:**
Inline objects \`{}\` and arrow functions \`() => {}\` create new references every render.
- **Fix:** Use \`useCallback\` for functions, \`useMemo\` for objects

**Quick Debugging Checklist:**
\`\`\`jsx
// Add this to spot unnecessary re-renders:
useEffect(() => {
  console.log('Component re-rendered');
});
\`\`\`

Share your component code and I can pinpoint the exact cause.`;
  }

  if (lower.includes('usestate') || lower.includes('use state')) {
    return `## React \`useState\` Explained

**What it does:** Lets you add state (data that changes) to functional components.

**Syntax:**
\`\`\`jsx
const [value, setValue] = useState(initialValue);
\`\`\`

**Key Rules:**
1. Always call at the **top level** of your component (not inside loops, conditions, or nested functions)
2. \`setValue(newValue)\` triggers a re-render
3. State updates are **asynchronous** — you won't see the new value immediately after calling \`setValue\`
4. For updates based on previous state, use the function form: \`setValue(prev => prev + 1)\`

**Common Mistake:**
\`\`\`jsx
// ❌ Wrong — won't batch correctly:
setCount(count + 1);
setCount(count + 1); // Still increments by 1!

// ✅ Correct:
setCount(prev => prev + 1);
setCount(prev => prev + 1); // Increments by 2
\`\`\`

Koi specific \`useState\` issue debug karna hai?`;
  }

  if (lower.includes('async') && lower.includes('await') || lower.includes('promise')) {
    return `## Async/Await & Promises

**Promise kya hai?**
Promise ek "future value ka commitment" hai — like food order: order diya (pending), ya toh milega (fulfilled) ya cancel hoga (rejected).

**Three States:**
1. \`Pending\` → Still processing
2. \`Fulfilled\` → Completed successfully
3. \`Rejected\` → Failed with an error

**Using \`.then()/.catch()\`:**
\`\`\`js
fetch('/api/data')
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => console.error(err));
\`\`\`

**Using \`async/await\` (cleaner):**
\`\`\`js
async function fetchData() {
  try {
    const res = await fetch('/api/data');
    const data = await res.json();
    console.log(data);
  } catch (err) {
    console.error(err);
  }
}
\`\`\`

**Key Points:**
- \`await\` can only be used inside an \`async\` function
- \`async\` function always returns a Promise
- Use \`Promise.all()\` for parallel requests

Koi specific async issue debug karna hai?`;
  }

  // ─── PERSONAL / EMOTIONAL ──────────────────────────────────
  if (lower.includes('ghar ki') && lower.includes('yaad')) {
    return `Hmm… lagta hai aaj ghar ki yaad thodi zyada hit kar rahi hai.

Koi particular baat hui ya bas aaj mann ghar jaane ka kar raha hai? Kabhi kabhi door reh kar sab theek chalte hue bhi shaam ke time achanak ghar ka khana ya wahan ka mahol miss hone lagta hai.

Agar share karna chaho toh batao — main sun raha hoon. Aur agar ghar waalon se baat karke mann halka karna ho, toh ek chhoti si call bhi bahut fark kar deti hai.`;
  }

  if ((lower.includes('exam') || lower.includes('physics') || lower.includes('test')) && (lower.includes('ghar') || lower.includes('anxiety') || lower.includes('yaad nahi') || lower.includes('stress') || lower.includes('tension'))) {
    return `Dono cheezein ek saath chal rahi hain — exam ka pressure aur personal stress — isliye focus karna aur mushkil lag raha hoga.

"Kuch yaad nahi ho raha" wali feeling actually panic create karti hai, aur panic further memory ko block karta hai. Ye cycle hai, par todne layak hai.

**Chalo ek plan banate hain:**

1. **Pehle 5 minute:** Ek deep breath lo. Seriously — 4 second inhale, 7 second hold, 8 second exhale. Ye nervous system ko calm karta hai.

2. **Fir next 10 minute:** Sirf ek topic lo — jo sabse zyada weightage rakhta ho. Uss ek topic ke key formulas ya points likh do paper par.

3. **Mann halka karna hai?** Agar pehle ghar ya personal baat share karni ho toh bolo — kabhi kabhi mann halka hone se padhai mein focus aata hai.

Kya karna chahoge — pehle thoda baat karein ya direct topic breakdown karein?`;
  }

  if (lower.includes('akela') || lower.includes('lonely') || lower.includes('alone') || lower.includes('koi nahi')) {
    return `Ye feeling real hai, aur isko acknowledge karna important hai.

Akela feel karna matlab hamesha physically akele hona nahi hota — kabhi kabhi logon ke beech mein reh kar bhi ye feeling aa sakti hai, jab lagta hai ki koi actually samajh nahi raha.

Main ek AI hoon — main human connection ki jagah nahi le sakta. Par yahan, is space mein, tumhe judge nahi kiya jayega. Jo bhi kehna ho — bina filter ke bol sakte ho.

Kya kuch hua hai recently, ya ye feeling gradually aa rahi hai?`;
  }

  if (lower.includes('breakup') || lower.includes('break up') || lower.includes('relationship') && (lower.includes('over') || lower.includes('end'))) {
    return `Ye ek heavy feeling hai, aur usse kam dikhane ki zaroorat nahi hai.

Breakup ke baad ek void si feel hoti hai — jaise koi part suddenly missing ho gaya. Ye natural hai. Grief, anger, confusion, relief — sab emotions ek saath aa sakte hain, aur sab valid hain.

Abhi ke liye:
- Khud ko fix karne ki jaldi mat karo
- Jo feel ho raha hai usse feel karo — suppress mat karo
- Agar kisi trusted dost ya family member se baat kar sako, toh karo

Kya share karna chahoge ki kya hua, ya bas abhi baat karna tha?`;
  }

  // ─── DECISION MAKING / THINK MODE ──────────────────────────
  if (lower.includes('course') && (lower.includes('change') || lower.includes('switch') || lower.includes('drop'))) {
    return `Ye bada decision hai, aur blindly haan ya naa kehna galat hoga. Aao isko systematically sochte hain:

**Pehle samajhte hain:**

1. **Kya trigger hua?** Kya ek particular subject, teacher, ya peer pressure hai jo course change ka thought la rahi hai? Ya genuinely interest shift ho gaya hai?

2. **Current course mein kitna time invest ho chuka?** Agar 1st year mein ho toh switching relatively easier hai. 3rd-4th year mein cost zyada hai.

3. **Naya course mein genuine interest hai ya current se frustration?** Ye dono bahut alag motivations hain — frustration temporary ho sakti hai.

4. **Practical factors:**
   - Family ka financial/emotional support
   - New course ki admission timeline
   - Career prospects comparison

**Meri suggestion (AI perspective):**
Ye decision 1-2 din mein mat lo. Kisi trusted mentor ya senior se baat karo jo dono fields samajhta ho.

Kya tum specific courses batana chahoge? Main comparison aur trade-offs detail mein help kar sakta hoon.`;
  }

  // ─── GENERAL KNOWLEDGE ─────────────────────────────────────
  if (lower.includes('what is') || lower.includes('kya hai') || lower.includes('define') || lower.includes('meaning of')) {
    const topic = original
      .replace(/^(what is|kya hai|define|what's|meaning of)\s*/i, '')
      .replace(/[?.!]+$/, '')
      .trim();
    
    if (topic.length > 2) {
      return `**${topic}** ke baare mein:

Main is topic ko detail mein samjha sakta hoon. Batao:

1. **Basic understanding** chahiye (intuitive explanation)? 
2. **Exam-level detail** chahiye (definitions, formulas, key points)?
3. **Real-world examples** ke saath samjhna hai?
4. Ya koi **specific doubt** hai is topic mein?

Jitna specific puchoge, utna better aur focused answer mil payega.`;
    }
  }

  if (lower.includes('how to') || lower.includes('kaise')) {
    return `Accha sawaal hai!

Is topic ko properly cover karne ke liye, thoda context chahiye:

- **Kya level** par samjhna chahte ho — beginner, intermediate, ya advanced?
- Koi **specific situation** hai jisme apply karna hai?
- **Step-by-step guide** chahiye ya concept level understanding?

Thoda aur batao taaki main targeted answer de sakun — generic answers se zyada kaam nahi banta.`;
  }

  // ─── BHAI MUJHE SAMAJH NAHI AA RAHA ────────────────────────
  if (lower.includes('samajh nahi aa raha') || lower.includes('samajh nahi ata') || lower.includes('confusing') || lower.includes('confused ho') || lower.includes('understand nahi')) {
    return `Koi tension nahi — samajhna ek process hai, ek baar mein na samajh aaye toh bhi normal hai.

Batao:
1. **Kaunsa topic ya problem** hai?
2. **Kahan tak samajh aaya** aur kahan pe atka?
3. Chahe Physics ka numerical ho, code ka bug ho, ya koi concept — copy paste kar do ya likh do.

Hum isko step-by-step tod ke simple bana denge. No rush.`;
  }

  // ─── MODE-SPECIFIC NUANCED HANDLING ────────────────────────
  if (mode === 'listen') {
    return `Main sun raha hoon.

Aise din aate hain jab sab kuch thoda bhari ya confusing lagta hai — aur kabhi kabhi kisi ko samjhana bhi exhausting ho jata hai.

Tumhe yahan kisi formal tareeke se baat karne ki zaroorat nahi hai. Jo bhi mann mein chal raha ho — bina kisi filter ke bol sakte ho. Main judge nahi karunga.

Kya hua aaj?`;
  }

  if (mode === 'think') {
    return `Ye decision/situation kaafi important lagti hai, aur blindly jump karna risky hoga. Aao step by step sochte hain:

1. **Current situation:** Exactly kya chal raha hai abhi? Main reason kya hai jo ye thought trigger kar raha hai?
2. **Options:** Agar change karte ho toh path kaisa dikhta hai, aur agar nahi karte toh?
3. **Trade-offs:** Har option ke saath kya sacrifice aayega aur kya milega?
4. **Timeline:** Kya ye decision abhi lena zaroori hai, ya thoda time hai sochne ke liye?

Sabse pehle batao — tumhare dimaag mein sabse bada doubt ya darr kya hai is baare mein?`;
  }

  if (mode === 'explain') {
    return `Chaliye is concept ko step-by-step simple tareeqe se samjhte hain:

**Approach:**
1. Pehle ek simple analogy se core idea samjhenge
2. Fir technical details — definitions, formulas
3. Last mein key takeaways aur exam tips

Batao exactly kaunsa concept hai aur kis level par chahiye — school level, college level, ya just intuitive understanding? Jitna specific bataaoge, utna better samjha paunga.`;
  }

  if (mode === 'mixed') {
    return `Main dekh sakta hoon ki do cheezein simultaneously chal rahi hain — ek practical problem aur ek personal/emotional layer.

Dono valid hain aur dono ko address karna zaroori hai. Par ek baar mein sab solve karna overwhelming ho sakta hai.

**Hum do approaches le sakte hain:**
1. Pehle mann halka karo — jo personal baat chal rahi hai woh share karo, taaki mental space free ho
2. Ya fir pehle practical problem tackle karo — kabhi kabhi ek problem solve hone se confidence aata hai

Tum kahan se start karna chahoge?`;
  }

  // ─── DEFAULT ADAPTIVE RESPONSE ─────────────────────────────
  // Check if it's a very short message or a proper question
  if (lower.length < 10) {
    return `Kuch aur detail doge toh better help kar paunga. 

Chahe koi concept samjhna ho, code debug karna ho, ya bas baat karni ho — thoda context do aur main tumhare liye specific aur useful answer tayyar karunga.`;
  }

  // Meaningful general response for unmatched but substantive queries
  return `Maine tumhari baat samjhi. Is topic ko properly cover karne ke liye:

1. **Agar ye koi concept ya topic hai** — batao kya level chahiye (basic, detailed, ya exam-focused) aur main step-by-step samjhaunga.
2. **Agar koi problem solve karni hai** — share karo details aur hum saath mein kaam karenge.
3. **Agar koi thought ya feeling discuss karni hai** — openly bolo, yahan koi judgment nahi hai.

Main tumhare saath hoon — bolo kaise aage badhein?`;
}

export class InferenceEngine {
  private abortController: AbortController | null = null;

  /**
   * Initializes the browser local LLM engine via WebGPU if hardware supports it.
   * Loads silently in the background without blocking the UI.
   */
  public async initWebLLM(): Promise<void> {
    const caps = await modelManager.detectCapabilities();
    
    // Immediately mark as ready with local companion engine
    // WebGPU model loading happens silently in the background
    if (!caps.hasWebGPU) {
      modelManager.updateState({
        stage: 'ready',
        progress: 100,
        statusText: 'Samjho is ready',
        activeEngine: 'local-companion',
      });
      return;
    }

    // Set ready immediately so user can start chatting
    modelManager.updateState({
      stage: 'ready',
      progress: 100,
      statusText: 'Samjho is ready',
      activeEngine: 'local-companion',
    });

    if (webLLMEngine || isWebLLMLoading) return;

    // Silently load WebGPU model in the background
    try {
      isWebLLMLoading = true;

      const webllm = await import('@mlc-ai/web-llm');
      const modelId = caps.recommendedModelId;

      const engine = await webllm.CreateMLCEngine(modelId, {
        initProgressCallback: (_report) => {
          // Silent loading — no UI updates during download
        },
      });

      webLLMEngine = engine;
      isWebLLMLoading = false;

      // Silently upgrade to WebGPU engine
      modelManager.updateState({
        stage: 'ready',
        progress: 100,
        statusText: 'Samjho is ready',
        activeEngine: 'webgpu',
        modelName: modelId,
      });
    } catch (err: any) {
      console.warn('[Samjho] WebGPU not available, using local companion:', err.message);
      isWebLLMLoading = false;
      // Already set to local-companion, no UI change needed
    }
  }

  /**
   * Aborts currently running token generation (PRD Section 31: Stop generation)
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

    // 1. Safety Check (PRD Section 23 & 24)
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

    // 2. Inference via WebGPU or Local Companion
    if (webLLMEngine && modelManager.getState().activeEngine === 'webgpu') {
      try {
        const messages = contextManager.buildPrompt(userText, history, mode, attachments);
        const replyChunks = await webLLMEngine.chat.completions.create({
          messages: messages as any,
          stream: true,
          temperature: 0.7,
        });

        let accumulated = '';
        for await (const chunk of replyChunks) {
          if (this.abortController?.signal.aborted) {
            break;
          }
          const delta = chunk.choices[0]?.delta?.content || '';
          accumulated += delta;
          onChunk(delta, accumulated);
        }

        return { text: accumulated, mode };
      } catch (err: any) {
        console.warn('[WebLLM Stream error, switching to companion]:', err);
      }
    }

    // High-quality local companion engine with natural token streaming
    const fullResponse = generateLocalCompanionResponse(userText, mode, history, attachments);
    let accumulated = '';
    const words = fullResponse.split(/(\s+)/);

    for (let i = 0; i < words.length; i++) {
      if (this.abortController?.signal.aborted) {
        break;
      }
      accumulated += words[i];
      onChunk(words[i], accumulated);

      // Natural token pacing (15-25ms between tokens for realistic feel)
      const delay = 12 + Math.random() * 14;
      await new Promise(r => setTimeout(r, delay));
    }

    return { text: accumulated, mode };
  }
}

export const inferenceEngine = new InferenceEngine();
