import marketService from "../../../services/v1/marketService.js";

const marketEmitters = new Map();

const marketGetters = new Map();
marketGetters.set("match_odds", marketService.getMatchOdds);
marketGetters.set("bookamkers", marketService.getBookmakerPrice);
marketGetters.set("fancy", marketService.getFencyPrice);
marketGetters.set("live_score", marketService.liveScore);

export const getMarketData = async (market) => {
  const getter = marketGetters.get(market.type);
  if (getter) {
    const result = await getter(market.id);
    let data = null;
    if (market.type === "fancy") {
      data = result;
    } else {
      data = result[0];
    }
    return data;
  }
};

export const emitMarketData = async (socket, market) => {
  // console.log("Emitting market data", marketEmitters.keys());
  const data = await getMarketData(market);
  if (!data) {
    clearInterval(marketEmitters.get(market.id));
    marketEmitters.delete(market.id);
    return;
  }
  socket.to(`market:${market.id}`).emit(`market:data:${market.id}`, data);
};

export async function startBroadcast(socket, market) {
  if (!market.id) return;

  if (!marketEmitters.has(market.id)) {
    // TODO: Add a check to see if the market is open and set the interval accordingly
    const emitter = setInterval(async () => {
      await emitMarketData(socket, market);
    }, 1000);
    marketEmitters.set(market.id, emitter);
  }
}

export function clearEmptyEmitters(socket) {
  for (const [marketId, emitter] of marketEmitters.entries()) {
    const clients = socket.adapter.rooms.get(`market:${marketId}`)?.size;
    if (!clients) {
      clearInterval(emitter);
      marketEmitters.delete(marketId);
    }
  }
}
