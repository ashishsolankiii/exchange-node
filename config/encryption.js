export const encryptionConfig = {
  fragmentLength: 50,
  defragmentStep: 3,

  responseKey: "cpr_ctx",
  requestKey: "payload",

  handshakeFragKey: "rel_buf1",
  handshakeDefragKey: "rel_buf2",
  handshakeDevEnvKey: "rel_buf3",

  encBypassHeader: "X-Bypass-Res-Enc",
  encBypassKeyHeader: "X-Res-Enc-Bypass-Key",
};
