/**
 * Telegram Alert Helper
 *
 * Fire-and-forget alerts for scraper service failures.
 * Uses TELEGRAM_ALERT_BOT_TOKEN and TELEGRAM_ALERT_CHAT_ID env vars.
 * Silent fail on error (never blocks scraping).
 */

/**
 * Send a Telegram alert about scraper service failure.
 * Fire-and-forget: returns immediately, never throws.
 */
export function sendScraperAlert(message: string): void {
  const botToken = process.env.TELEGRAM_ALERT_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ALERT_CHAT_ID;

  if (!botToken || !chatId) return;

  const text = `[Scraper Alert] ${message}`;

  // Fire and forget
  fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    }),
    signal: AbortSignal.timeout(5000),
  }).catch(() => {
    // Silent fail
  });
}
