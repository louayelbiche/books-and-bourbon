/**
 * Intent Detection Patterns
 *
 * Deterministic pattern matching for intent classification.
 * Multilingual: French (primary), English, Arabic.
 * Patterns are ordered by specificity (most specific first).
 */

// ─── Data Extraction Patterns ──────────────────────────────────────

export const EMAIL_REGEX = /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/;
export const PHONE_REGEX = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/;
export const ORDER_NUMBER_REGEX = /(?:commande|order|numero|ref|reference|#)\s*(?:n[°o]?\s*)?([A-Z]{2,4}[-\s]?\d{4,}[-\s]?\d{0,4})/i;
export const CONTRACT_REGEX = /(?:contrat|contract|abonnement|subscription)\s*(?:n[°o]?\s*)?([A-Z]{2,4}[-\s]?\d{4,})/i;
export const DATE_REGEX = /(?:le\s+)?(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?)|(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|monday|tuesday|wednesday|thursday|friday|saturday|sunday|demain|tomorrow|aujourd'?hui|today)/i;
export const QUANTITY_PRODUCT_REGEX = /(\d+)\s+(?:plants?|pieces?|units?|articles?|pieds?)\s+(?:de\s+)?(\w[\w\s]{2,30})/gi;

// ─── Confirmation / Cancellation ───────────────────────────────────

const CONFIRMATION_PATTERNS = [
  /^oui\b/i,
  /^yes\b/i,
  /^ok\b/i,
  /^d['']accord\b/i,
  /^bien\s+s[uû]r\b/i,
  /^confirm[eé]?\b/i,
  /^proceed\b/i,
  /^go\s+ahead\b/i,
  /^absolument\b/i,
  /^parfait\b/i,
  /^exactement\b/i,
  /^نعم\b/,     // na'am (Arabic yes)
  /^أكيد\b/,    // akid (Arabic sure)
  /^موافق\b/,   // muwafiq (Arabic agree)
  /\bje\s+confirme\b/i,
  /\bI\s+confirm\b/i,
  /\bsoumettez\b/i,
  /\bsubmit\b/i,
  /\bprocede[rz]?\b/i,
  /\ballez-?y\b/i,
  /\bfaites-?le\b/i,
];

const CANCELLATION_PATTERNS = [
  /^non\b/i,
  /^no\b/i,
  /^annule[rz]?\b/i,
  /^cancel\b/i,
  /^pas\s+maintenant\b/i,
  /^not\s+now\b/i,
  /^laisse[rz]?\s+tomber\b/i,
  /^never\s*mind\b/i,
  /^لا\b/,      // la (Arabic no)
  /\bje\s+ne\s+veux\s+pas\b/i,
  /\bI\s+don['']t\s+want\b/i,
  /\bpas\s+la\s+peine\b/i,
];

// ─── HELP Intent Signals ───────────────────────────────────────────

const HELP_KEYWORDS = [
  // Explicit human request
  /\bparler\s+[àa]\s+(?:un|quelqu)/i,
  /\bspeak\s+(?:to|with)\s+(?:a|someone)/i,
  /\btalk\s+to\s+(?:a\s+)?(?:human|person|agent|manager|representative)/i,
  /\bresponsable\b/i,
  /\bmanager\b/i,
  /\bagent\s+humain\b/i,
  /\bhuman\s+agent\b/i,
  // Complaints
  /\bplainte\b/i,
  /\bcomplaint\b/i,
  /\bm[ée]content/i,
  /\bunhappy\b/i,
  /\bdissatisfied\b/i,
  /\bendomm?ag[ée]/i,
  /\bdamaged\b/i,
  /\bdefectu/i,
  /\bdefective\b/i,
  /\bremboursement\b/i,
  /\brefund\b/i,
  // Account/contract data (bot can't access)
  /\bstatut\s+(?:de\s+)?(?:ma|mon|la|le)\b/i,
  /\bstatus\s+(?:of\s+)?my\b/i,
  /\bpaiement\b/i,
  /\bpayment\s+status\b/i,
  /\bfacture\b/i,
  /\binvoice\b/i,
  /\bsuivi\s+(?:de\s+)?(?:commande|colis|livraison)/i,
  /\btrack(?:ing)?\s+(?:my\s+)?(?:order|shipment|delivery)/i,
];

// ─── INTEREST Intent Signals ───────────────────────────────────────

const INTEREST_KEYWORDS = [
  /\bdevis\b/i,
  /\bquote\b/i,
  /\bint[ée]ress[ée]/i,
  /\binterested\b/i,
  /\bj['']aimerais\b/i,
  /\bI['']d\s+like\b/i,
  /\bje\s+voudrais\b/i,
  /\bI\s+would\s+like\b/i,
  /\bje\s+souhaite(?:rais)?\b/i,
  /\benvisage\b/i,
  /\bconsidering\b/i,
  /\bplus\s+d['']info/i,
  /\bmore\s+info/i,
  /\bsend\s+me\b/i,
  /\benvoyez/i,
  /\bcontactez/i,
  /\bcontact\s+me\b/i,
  /\brappele[rz]/i,
  /\bcall\s+me\s+back\b/i,
  /\bpour\s+(?:mon|ma|notre)\s+(?:exploitation|ferme|entreprise|projet|terrain)/i,
];

// ─── ORDER Intent Signals ──────────────────────────────────────────

const ORDER_KEYWORDS = [
  /\bcommander\b/i,
  /\border\b/i,
  /\bacheter\b/i,
  /\bbuy\b/i,
  /\bpurchase\b/i,
  /\breserver\s+\d+/i,
  /\breserve\s+\d+/i,
  /\bje\s+(?:veux|voudrais|souhaite)\s+(?:commander|acheter|prendre)\b/i,
  /\bI\s+(?:want|would\s+like)\s+to\s+(?:order|buy|purchase)\b/i,
  /\bmettre\s+(?:de\s+c[ôo]t[ée]|en\s+r[ée]serve)/i,
  /\bset\s+aside\b/i,
];

// ─── BOOKING Intent Signals ────────────────────────────────────────

const BOOKING_KEYWORDS = [
  /\brendez-?vous\b/i,
  /\bappointment\b/i,
  /\br[ée]server\s+(?:un\s+)?(?:cr[ée]neau|heure|place|table|chambre)/i,
  /\bbook\s+(?:a|an)\s+(?:slot|appointment|table|room)/i,
  /\bdisponibilit[ée]/i,
  /\bavailab/i,
  /\bschedule\b/i,
  /\bplanifier\b/i,
  /\bquand\s+(?:est-ce\s+que\s+)?(?:je\s+)?(?:peux|pourrais|puis)/i,
  /\bwhen\s+can\s+I\b/i,
];

// ─── Classifier Functions ──────────────────────────────────────────

export function extractEmail(text: string): string | undefined {
  const match = text.match(EMAIL_REGEX);
  return match ? match[0] : undefined;
}

export function extractPhone(text: string): string | undefined {
  const match = text.match(PHONE_REGEX);
  return match ? match[0] : undefined;
}

export function extractName(text: string): string | undefined {
  // Common patterns: "Mon nom est X", "Je suis X", "My name is X", "je m'appelle X"
  const patterns = [
    /(?:mon\s+nom\s+(?:est|c['']est)|je\s+(?:suis|m['']appelle)|my\s+name\s+is|I['']m)\s+([A-Z\u00C0-\u024F][a-z\u00C0-\u024F]+(?:\s+[A-Z\u00C0-\u024F][a-z\u00C0-\u024F]+){0,2})/i,
    /(?:nom|name)\s*:\s*([A-Z\u00C0-\u024F][a-z\u00C0-\u024F]+(?:\s+[A-Z\u00C0-\u024F][a-z\u00C0-\u024F]+){0,2})/i,
  ];
  for (const p of patterns) {
    const match = text.match(p);
    if (match) return match[1].trim();
  }
  return undefined;
}

export function extractProducts(text: string): { name: string; quantity?: number }[] {
  const products: { name: string; quantity?: number }[] = [];
  const regex = /(\d+)\s+(?:plants?|pi[eè]ces?|unit[ée]s?|articles?|pieds?)\s+(?:de\s+)?([A-Za-z\u00C0-\u024F][\w\s]{2,25})/gi;
  let match;
  while ((match = regex.exec(text)) !== null) {
    products.push({
      quantity: parseInt(match[1], 10),
      name: match[2].trim(),
    });
  }
  return products;
}

export function isConfirmation(text: string): boolean {
  const trimmed = text.trim();
  // Short messages (<30 chars) with confirmation pattern
  if (trimmed.length < 50) {
    return CONFIRMATION_PATTERNS.some(p => p.test(trimmed));
  }
  // Longer messages: check if they START with confirmation
  return CONFIRMATION_PATTERNS.slice(0, 12).some(p => p.test(trimmed));
}

export function isCancellation(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 50) {
    return CANCELLATION_PATTERNS.some(p => p.test(trimmed));
  }
  return CANCELLATION_PATTERNS.slice(0, 8).some(p => p.test(trimmed));
}

export function detectHelpSignals(text: string): string[] {
  return HELP_KEYWORDS.filter(p => p.test(text)).map(p => p.source);
}

export function detectInterestSignals(text: string): string[] {
  return INTEREST_KEYWORDS.filter(p => p.test(text)).map(p => p.source);
}

export function detectOrderSignals(text: string): string[] {
  return ORDER_KEYWORDS.filter(p => p.test(text)).map(p => p.source);
}

export function detectBookingSignals(text: string): string[] {
  return BOOKING_KEYWORDS.filter(p => p.test(text)).map(p => p.source);
}

export function hasOrderNumber(text: string): boolean {
  return ORDER_NUMBER_REGEX.test(text) || CONTRACT_REGEX.test(text);
}

export function hasDate(text: string): boolean {
  return DATE_REGEX.test(text);
}
