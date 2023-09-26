import CryptoJS from "crypto-js";
import { appConfig } from "../../config/app.js";
import User from "../../models/v1/User.js";
import { randomNumber } from "../helpers/random.js";

/**
 * Encrypts a transaction code using AES encryption.
 *
 * @param {string} uniqueCode - The transaction code to be encrypted.
 * @returns {string} The encrypted transaction code.
 */
export const encryptTransactionCode = (uniqueCode) => {
  const encryptedCode = CryptoJS.AES.encrypt(uniqueCode, appConfig.TRANSACTION_AES_SECRET).toString();

  return encryptedCode;
};

/**
 * Decrypts an encrypted transaction code using AES decryption.
 *
 * @param {string} encryptedCode - The encrypted transaction code to be decrypted.
 * @returns {string} The decrypted transaction code.
 */
export const decryptTransactionCode = (encryptedCode) => {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedCode, appConfig.TRANSACTION_AES_SECRET);

    const decryptedCode = bytes.toString(CryptoJS.enc.Utf8);

    return decryptedCode;
  } catch (e) {
    throw new Error(e.message);
  }
};

/**
 * Validates a transaction code by comparing it to an encrypted code.
 *
 * @param {string} uniqueCode - The transaction code to be validated.
 * @param {string} encryptedCode - The encrypted transaction code to compare against.
 * @returns {boolean} A boolean indicating if the transaction code is valid.
 */
export const validateTransactionCode = (uniqueCode, encryptedCode) => {
  const decryptedCode = decryptTransactionCode(encryptedCode);
  const isValid = decryptedCode === uniqueCode;

  return isValid;
};

/**
 * Generates a unique encrypted transaction code.
 *
 * This function generates a unique transaction code that is not already in use
 * by any user in the system. It generates a random number of length 6 and encrypts
 * it to create the transaction code.
 *
 * @async
 * @function generateTransactionCode
 * @returns {Promise<string>} A Promise that resolves to the encrypted transaction code.
 * @throws {Error} If there is an error during the database query or encryption process.
 */
export const generateTransactionCode = async () => {
  const codesInUse = await User.distinct("transactionCode").exec();

  let uniqueCode = randomNumber(6);

  while (codesInUse.includes(uniqueCode)) {
    uniqueCode = randomNumber(6);
  }

  const encryptedCode = encryptTransactionCode(uniqueCode);
  return encryptedCode;
};
