import { clearEmptyEmitters, emitMarketData, startBroadcast } from "./broadcast.js";

let clearEmptyEmittersInterval = null;

async function handleConnection(socket) {
  try {
    socket.on("join:market", async (market) => {
      socket.join(`market:${market.id}`);
      process.nextTick(async () => await emitMarketData(socket, market));
      await startBroadcast(socket, market);
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
