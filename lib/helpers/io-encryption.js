import CryptoJS from "crypto-js";
import moment from "moment";
import { nanoid } from "nanoid";
import { appConfig } from "../../config/app.js";

const fragChunk = 8;
const defragStep = 3;

function frag(str) {
  const arr = [];
  let keyIndex = 0;
  for (let i = 0; i < str.length; i += fragChunk) {
    const fragment = str.slice(i, i + fragChunk);
    const key = nanoid(fragChunk);
    if (i % defragStep === 0) {
      arr.push({ [fragment]: { [keyIndex++]: key } });
    } else {
      arr.push({ [key]: { [keyIndex++]: fragment } });
    }
  }
  return arr;
}

function defrag(arr) {
  let str = "";
  for (let i = 0; i < arr.length; i++) {
    const obj = arr[i];
    for (const [key, value] of Object.entries(obj)) {
      if (i % defragStep === 0) {
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
}

const encrypt = (originalData) => {
  const data = typeof originalData === "string" ? originalData : JSON.stringify(originalData);
  const ciphertext = CryptoJS.AES.encrypt(JSON.stringify(data), appConfig.RESPONSE_AES_SECRET);
  return ciphertext.toString();
};

const encryptResponse = (originalData) => {
  const ciphertext = encrypt(originalData);
  const fragments = frag(ciphertext);
  return { cpr_ctx: fragments };
  // const ciphertext = encrypt(originalData);
  // return { cpr_ctx: ciphertext };
};

const decryptRequest = (payload) => {
  const mergedString = defrag(payload);
  const bytes = CryptoJS.AES.decrypt(mergedString, appConfig.RESPONSE_AES_SECRET);
  // const bytes = CryptoJS.AES.decrypt(payload, appConfig.RESPONSE_AES_SECRET);
  const parsed = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
  return parsed;
};

const settleHandshake = (req, res) => {
  const frr = frag(encrypt(fragChunk));
  const dfr = encrypt(defragStep);

  try {
    res.status(200).json({
      success: true,
      message: "Handshake successful!",
      metadata: {
        utc_time: moment().utc().format("DD-MM-YYYY HH:mm:ss z"),
        relay: { rel_buf1: frr, rel_buf2: dfr },
      },
    });
  } catch (e) {
    res.status(500).json({ message: "Handshake failed!" });
  }
};

export { decryptRequest, encryptResponse, settleHandshake };
