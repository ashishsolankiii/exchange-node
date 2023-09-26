import { getTrimmedUser } from "../../../lib/io-guards/auth.js";
import userService from "../../../services/v1/userService.js";
import { validateAuth, validateUser } from "./middlewares.js";

async function handleConnection(socket) {
  // console.log("A user connected", socket.id);

  try {
    const user = await userService.fetchUserId(socket.userId);
    const userDetails = getTrimmedUser(user);
    socket.emit(`user:${socket.userId}`, userDetails);
  } catch (e) {
    socket.emit("server_error", e.message);
    socket.disconnect(true);
  }

  socket.on("disconnect", () => {
    // console.log("A user disconnected", socket.id);
  });
}

const connect = (socket) => {
  socket.use(validateAuth);
  socket.use(validateUser);

  socket.on("connection", handleConnection);
};

export default {
  connect,
};
