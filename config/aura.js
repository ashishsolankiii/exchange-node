/**
 * Configuration object for the aura casino.
 *
 * @property {string} currency - The currency used in the application.
 * @property {string} language - The language used in the application.
 * @property {number} vip - The VIP level of the user.
 * @property {number} successCode - The success code for API responses.
 * @property {string} successMessage - The success message for API responses.
 * @property {number} errorCode - The error code for API responses.
 * @property {string} errorMessage - The error message for API responses.
 */
export const auraConfig = {
  currency: "INR",
  language: "en",
  vip: 3,
  successCode: 0,
  successMessage: "ok",
  errorCode: 1,
  errorMessage: "Authentication failed!",
  minBetINR: 500,
  maxBetINR: 200000,
  maxMarketPlINR: 600000,
  minBetHKD: 10,
  maxBetHKD: 2000,
  maxMarketPlHKD: 6000
};
