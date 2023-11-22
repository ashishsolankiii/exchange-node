import moment from "moment";
import eventService from "../../../services/v1/eventService.js";

async function getCompletedEvents(userId) {
  const startDate = moment().subtract(1, "days").startOf("day").toDate();
  const endDate = moment().endOf("day").toDate();
  const completedEvents = await eventService.completedEventList(startDate, endDate, userId);
  return completedEvents;
}

async function handleConnection(socket) {
  try {
    socket.on("join:event:notification", async (user, callback) => {
      socket.join("event:notification");
      const completedEvents = await getCompletedEvents(user.userId);
      if (typeof callback === "function") {
        callback(completedEvents);
      }
    });
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
