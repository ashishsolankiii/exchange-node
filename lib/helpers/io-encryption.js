import CryptoJS from "crypto-js";
import { nanoid } from "nanoid";
import { appConfig } from "../../config/app.js";

const splitStrToArrFragments = (str, fragmentSize = 4) => {
  const arr = [];
  let keyIndex = 0;
  for (let i = 0; i < str.length; i += fragmentSize) {
    const fragment = str.slice(i, i + fragmentSize);
    const key = nanoid(fragmentSize);
    arr.push({ [key]: { [keyIndex++]: fragment } });
  }
  return arr;
};

const mergeArrFragmentsToStr = (arr) => {
  let str = "";
  arr.map((obj) => {
    for (const key in obj) {
      const sortedKeys = Object.keys(obj[key]).sort((a, b) => a - b);
      for (const keyIndex of sortedKeys) {
        str += obj[key][keyIndex];
      }
    }
  });
  return str;
};

const encrypt = (originalData) => {
  const data = typeof originalData === "string" ? originalData : JSON.stringify(originalData);
  const ciphertext = CryptoJS.AES.encrypt(JSON.stringify(data), appConfig.RESPONSE_AES_SECRET);
  return ciphertext.toString();
};

const encryptResponse = (originalData) => {
  const encrypted = encrypt(originalData);
  const fragments = splitStrToArrFragments(encrypted);
  return { cpr_ctx: fragments };
};

const decryptRequest = async (originalData) => {
  const bytes = CryptoJS.AES.decrypt(originalData, appConfig.RESPONSE_AES_SECRET);
  const parsed = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
  return JSON.parse(parsed);
};

export { decryptRequest, encryptResponse, mergeArrFragmentsToStr, splitStrToArrFragments };
