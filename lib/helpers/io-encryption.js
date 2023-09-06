import CryptoJS from "crypto-js";
import { nanoid } from "nanoid";
import { appConfig } from "../../config/app.js";

const frag = (str, fragmentSize = 8) => {
  const arr = [];
  let keyIndex = 0;
  for (let i = 0; i < str.length; i += fragmentSize) {
    const fragment = str.slice(i, i + fragmentSize);
    const key = nanoid(fragmentSize);
    if (i % 3 === 0) {
      arr.push({ [fragment]: { [keyIndex++]: key } });
    } else {
      arr.push({ [key]: { [keyIndex++]: fragment } });
    }
  }
  return arr;
};

const defrag = (arr) => {
  let str = "";
  for (let i = 0; i < arr.length; i++) {
    const obj = arr[i];
    for (const [key, value] of Object.entries(obj)) {
      if (i % 3 === 0) {
        str += key;
      } else {
        const sortedKeys = Object.keys(value).sort((a, b) => a - b);
        for (const keyIndex of sortedKeys) {
          str += value[keyIndex];
        }
      }
    }
  }
  return str;
};

const encryptResponse = (originalData) => {
  const data = typeof originalData === "string" ? originalData : JSON.stringify(originalData);
  const ciphertext = CryptoJS.AES.encrypt(JSON.stringify(data), appConfig.RESPONSE_AES_SECRET);
  const fragments = frag(ciphertext.toString());
  return { cpr_ctx: fragments };
};

const decryptRequest = (payload) => {
  const mergedString = defrag(payload);
  const bytes = CryptoJS.AES.decrypt(mergedString, appConfig.RESPONSE_AES_SECRET);
  const parsed = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
  return parsed;
};

export { decryptRequest, encryptResponse };
