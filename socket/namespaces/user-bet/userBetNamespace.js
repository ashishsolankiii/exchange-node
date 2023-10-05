import betService from "../../../services/v1/betService.js";
import { validateAuth, validateUser } from "../../middlewares/userMiddleware.js";

async function handleConnection(socket) {
  try {
    socket.on("event:bet", async ({ eventId }, callback) => {
      if (!eventId) {
        throw new Error("eventId is required.");
      }
      const betsAndPls = await betService.fetchAllUserBetsAndPls({ eventId, userId: socket.userId });
      callback(betsAndPls);
    });
  } catch (e) {
    socket.emit("server_error", e.message);
    socket.disconnect(true);
  }
}

const connect = (socket) => {
  socket.use(validateAuth);
  socket.use(validateUser);

  socket.on("connection", handleConnection);
};

export default {
  connect,
};
