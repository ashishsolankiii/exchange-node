import { getTrimmedUser } from "../../../lib/io-guards/auth.js";
import userService from "../../../services/v1/userService.js";
import { validateAuth, validateUser } from "../../middlewares/userMiddleware.js";

async function getUserDetails(userId) {
  const user = await userService.fetchUserId(userId);
  const userDetails = getTrimmedUser(user);
  return userDetails;
}

async function handleConnection(socket) {
  try {
    const details = await getUserDetails(socket.userId);
    socket.emit(`user:${socket.userId}`, details);
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
