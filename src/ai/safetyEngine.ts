import { HelplineInfo, SafetyCheckResult } from '../types';

export const CRISIS_HELPLINES: HelplineInfo[] = [
  {
    name: 'Tele-MANAS (India)',
    number: '14416 / 1800 891 4416',
    description: '24/7 free, confidential mental health support by Ministry of Health & Family Welfare.',
    timing: '24 Hours | Free & Confidential',
  },
  {
    name: 'National Emergency Helpline',
    number: '112',
    description: 'Immediate all-in-one emergency service (police, medical, rescue).',
    timing: '24 Hours | Immediate Response',
  },
  {
    name: 'Vandrevala Foundation',
    number: '+91 9999 666 555',
    description: 'Free professional psychological counseling in English, Hindi, and regional languages.',
    timing: '24/7 Helpline & WhatsApp',
  },
  {
    name: 'KIRAN Helpline',
    number: '1800-599-0019',
    description: 'National helpline for mental health, psychological support, and stress alleviation.',
    timing: '24/7 Multi-language Support',
  },
];

const SUICIDE_KEYWORDS = [
  'suicide', 'kill myself', 'end my life', 'want to die', 'end it all', 'hanging myself',
  'cutting my wrist', 'mar jana chahta hoon', 'khatam karna chahta hoon', 'jaan dena chahta hoon',
  'marne ka mann kar raha hai', 'zindagi khatam kar doon', 'khudkushi', 'atmaghat'
];

const VIOLENCE_KEYWORDS = [
  'kill someone', 'how to make a bomb', 'how to poison', 'how to murder',
  'shoot them', 'violent attack', 'weapon to hurt someone'
];

const MEDICAL_EMERGENCY_KEYWORDS = [
  'chest pain radiating to arm', 'difficulty breathing suddenly', 'coughing blood heavily',
  'severe anaphylaxis', 'swallowed poison', 'stroke symptoms', 'face drooping slurred speech',
  'heart attack symptoms right now', 'excessive bleeding won\'t stop'
];

/**
 * SafetyEngine evaluates user input to protect well-being.
 * Follows PRD Principle 2: "Don't overreact. Not every sad statement needs a crisis response."
 * For normal sadness -> listens & talks normally.
 * For true crisis / self-harm / danger -> intervenes calmly with real-world care resources.
 */
export function evaluateSafety(input: string): SafetyCheckResult {
  const normalized = input.toLowerCase();

  // 1. Critical: Immediate Self-Harm / Suicide
  const hasSelfHarm = SUICIDE_KEYWORDS.some(kw => normalized.includes(kw));
  if (hasSelfHarm) {
    return {
      isHarmful: true,
      category: 'crisis',
      helplineList: CRISIS_HELPLINES,
      safetyInterventionText: 
        `Main samajh sakta hoon ki is waqt sab kuch bahut zyada heavy lag raha hai, par tum bilkul akele nahi ho. ` +
        `Main ek AI hoon aur meri limit hai — main ek human therapist ya doctor nahi hoon. ` +
        `Please turant kisi trusted insaan se baat karo ya in free, confidential helplines par call karo. Log tumhari madad ke liye yahan hain:`
    };
  }

  // 2. Immediate Violence or Dangerous instructions
  const hasViolence = VIOLENCE_KEYWORDS.some(kw => normalized.includes(kw));
  if (hasViolence) {
    return {
      isHarmful: true,
      category: 'violence',
      safetyInterventionText:
        `I cannot assist with instructions or plans that cause physical harm or danger to yourself or others. ` +
        `If you are in danger or facing conflict, please reach out to emergency services (112) or seek trusted support.`
    };
  }

  // 3. Urgent Medical Emergency
  const hasUrgentMedical = MEDICAL_EMERGENCY_KEYWORDS.some(kw => normalized.includes(kw));
  if (hasUrgentMedical) {
    return {
      isHarmful: true,
      category: 'medical',
      helplineList: [
        {
          name: 'Emergency Medical Services (Ambulance)',
          number: '112 / 102',
          description: 'Immediate urgent medical transportation and triage.',
          timing: 'Immediate 24/7',
        }
      ],
      safetyInterventionText:
        `Ye symptoms serious medical emergency ho sakte hain. Main ek AI assistant hoon aur doctor nahi hoon. ` +
        `Please bina deri kiye turant nearest hospital ya Emergency Helpline (112) par call karein.`
    };
  }

  return { isHarmful: false, category: 'none' };
}
