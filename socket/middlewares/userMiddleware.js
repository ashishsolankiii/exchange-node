import { parseJwtToken } from "../../lib/io-guards/auth.js";
import User from "../../models/v1/User.js";

async function validateAuth(socket, next) {
  const token = socket.handshake.auth.token;

  const parsedResult = await parseJwtToken(token);
  if (!parsedResult.isValid) {
    return next(new Error("Invalid token"));
  }

  socket.userId = parsedResult.tokenData._id;

  return next();
}

async function validateUser(socket, next) {
  if (!socket.userId) {
    return next(new Error("User not found"));
  }

  const user = await User.findById(socket.userId);
  if (!user) {
    return next(new Error("User not found"));
  }

  return next();
}

export { validateAuth, validateUser };
