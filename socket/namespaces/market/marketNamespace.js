import { clearEmptyEmitters, getMarketData, startBroadcast } from "./broadcast.js";

let clearEmptyEmittersInterval = null;

async function handleConnection(socket) {
  try {
    socket.on("join:market", async (market, callback) => {
      socket.join(`market:${market.id}`);
      const [marketData] = await Promise.all([getMarketData(market), startBroadcast(socket, market)]);
      if (typeof callback === "function") {
        callback(marketData);
      }
    });

    if (!clearEmptyEmittersInterval) {
      clearEmptyEmittersInterval = setInterval(() => {
        clearEmptyEmitters(socket);
      }, 10000);
    }
  } catch (e) {
    socket.emit("server_error", e.message);
    socket.disconnect(true);
  }
}

const connect = (socket) => {
  socket.on("connection", handleConnection);
};

export default {
  connect,
};
