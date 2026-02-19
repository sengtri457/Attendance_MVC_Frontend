/**
 * @deprecated
 * Telegram credentials have been moved to the backend (.env).
 * The frontend now communicates with the backend endpoint:
 *   POST /api/v1/telegram/send
 *
 * This file is no longer used and can be safely deleted.
 */
export const environmentTelegram = {
  botToken: '',  // Intentionally empty — token lives in backend .env
  chatId: '',    // Intentionally empty — chatId lives in backend .env
};
