/**
 * Detection Patterns
 *
 * Regex patterns for detecting business signals from scraped website content.
 */

export const DETECTION_PATTERNS = {
  // Product indicators
  products: {
    text: [
      /add to cart/i,
      /buy now/i,
      /shop now/i,
      /add to bag/i,
      /purchase/i,
      /in stock/i,
      /out of stock/i,
      /free shipping/i,
      /product details/i,
    ],
    price:
      /\$\d+(?:\.\d{2})?|\€\d+(?:\.\d{2})?|£\d+(?:\.\d{2})?|\d+\.\d{2}\s*(?:USD|EUR|GBP)/i,
    urls: [/\/products?\//, /\/shop\//, /\/store\//, /\/catalog\//],
  },

  // Service indicators
  services: {
    text: [
      /our services/i,
      /what we do/i,
      /how we help/i,
      /we offer/i,
      /we provide/i,
      /our expertise/i,
      /our solutions/i,
      /service areas/i,
      /consulting/i,
      /advisory/i,
    ],
    urls: [/\/services?\//, /\/solutions?\//, /\/what-we-do/],
  },

  // Pricing indicators
  pricing: {
    text: [
      /pricing/i,
      /plans?\s*(?:&|and)?\s*pricing/i,
      /our plans/i,
      /subscription/i,
      /per month/i,
      /\/month/i,
      /\/year/i,
      /free tier/i,
      /enterprise plan/i,
      /starter plan/i,
      /professional plan/i,
      /basic plan/i,
    ],
    urls: [/\/pricing/, /\/plans/],
  },

  // Booking indicators
  booking: {
    text: [
      /book\s*(a|an)?\s*(call|meeting|demo|appointment|consultation|session)/i,
      /schedule\s*(a|an)?\s*(call|meeting|demo|appointment|consultation|session)/i,
      /calendly/i,
      /acuity/i,
      /book online/i,
      /make.*appointment/i,
      /reserve/i,
    ],
    urls: [/calendly\.com/, /acuity/, /\/book/, /\/schedule/, /\/appointment/],
  },

  // Case study indicators
  caseStudies: {
    text: [
      /case stud(?:y|ies)/i,
      /success stor(?:y|ies)/i,
      /client results/i,
      /customer stories/i,
      /portfolio/i,
      /our work/i,
      /featured projects/i,
    ],
    urls: [
      /\/case-stud/,
      /\/success-stor/,
      /\/portfolio/,
      /\/our-work/,
      /\/projects/,
    ],
  },

  // Team page indicators
  team: {
    text: [
      /our team/i,
      /meet the team/i,
      /leadership/i,
      /about us/i,
      /who we are/i,
      /founders?/i,
      /co-founders?/i,
      /our people/i,
    ],
    urls: [/\/team/, /\/about/, /\/people/, /\/leadership/],
    roles: [
      /\b(CEO|CTO|CFO|COO|CMO|CPO)\b/,
      /\b(founder|co-founder)\b/i,
      /\b(director|manager|lead|head of)\b/i,
      /\b(president|partner|principal)\b/i,
    ],
  },

  // FAQ indicators
  faq: {
    text: [
      /frequently asked/i,
      /\bfaq\b/i,
      /common questions/i,
      /questions.*answers/i,
    ],
    urls: [/\/faq/, /\/frequently-asked/, /\/help/],
  },

  // Blog indicators
  blog: {
    text: [
      /\bblog\b/i,
      /latest posts/i,
      /articles/i,
      /news\s*(?:&|and)?\s*updates/i,
      /insights/i,
    ],
    urls: [/\/blog/, /\/articles/, /\/news/, /\/insights/, /\/posts/],
  },

  // Contact methods
  contact: {
    email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    phone: /(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/g,
    form: [
      /<form[^>]*>/i,
      /contact.*form/i,
      /get in touch/i,
      /send.*message/i,
      /contact us/i,
    ],
    chat: [
      /intercom/i,
      /drift/i,
      /zendesk/i,
      /hubspot/i,
      /crisp/i,
      /tawk/i,
      /livechat/i,
      /freshchat/i,
    ],
    social: {
      linkedin: /linkedin\.com/i,
      twitter: /(?:twitter|x)\.com/i,
      facebook: /facebook\.com/i,
      instagram: /instagram\.com/i,
      youtube: /youtube\.com/i,
      github: /github\.com/i,
    },
  },

  // Industry keywords for classification
  // Each industry needs >= 2 pattern matches to be detected (see extractIndustryKeywords).
  industries: {
    food: [
      /restaurant/,
      /\bmenu\b/,
      /dining/,
      /cuisine/,
      /\bchef\b/,
      /kitchen/,
      /bakery/,
      /\bcafe\b/,
      /bistro/,
      /pizza/,
      /sushi/,
      /catering/,
      /dessert/,
      /pastry/,
      /tiramisu/,
      /patisserie/,
    ],
    salon: [
      /\bsalon\b/,
      /\bbeauty\b/,
      /\bhair\b/,
      /\bnails?\b/,
      /skincare/,
      /facial/,
      /\bspa\b/,
      /\bbarber\b/,
      /grooming/,
      /stylist/,
      /manicure/,
      /pedicure/,
    ],
    fitness: [
      /\bgym\b/,
      /fitness/,
      /workout/,
      /\byoga\b/,
      /pilates/,
      /crossfit/,
      /trainer/,
      /exercise/,
      /martial arts/,
    ],
    hotel: [
      /\bhotel\b/,
      /\bresort\b/,
      /accommodation/,
      /\bsuites?\b/,
      /check.in/,
      /hospitality/,
      /\blodging\b/,
      /\binn\b/,
      /\brooms?\b.*\bavailab/,
    ],
    healthcare: [
      /medical/,
      /healthcare/,
      /clinic/,
      /hospital/,
      /patient/,
      /doctor/,
    ],
    technology: [/software/, /saas/, /platform/, /api/, /cloud/, /tech/],
    finance: [/financial/, /investment/, /banking/, /insurance/, /fintech/],
    legal: [/law firm/, /attorney/, /legal/, /lawyer/],
    marketing: [/marketing/, /agency/, /advertising/, /branding/, /creative/],
    realestate: [/real estate/, /property/, /realtor/, /homes for sale/],
    education: [/education/, /learning/, /training/, /courses/, /academy/],
    ecommerce: [/shop/, /store/, /products/, /buy/, /cart/],
  },
} as const;

// Type for the patterns object
export type DetectionPatterns = typeof DETECTION_PATTERNS;
