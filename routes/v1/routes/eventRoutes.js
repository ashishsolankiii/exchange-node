import express from "express";
import eventController from "../../../controllers/v1/eventController.js";
import { route } from "../../../lib/error-handling/routes-error-boundary.js";

const router = express.Router();

route(router, "post", "/getAllEvent", eventController.getAllEvent);
route(router, "post", "/getEventById", eventController.getEventById);
route(router, "post", "/createEvent", eventController.createEvent);
route(router, "post", "/updateEvent", eventController.updateEvent);
route(router, "post", "/deleteEvent", eventController.deleteEvent);
route(router, "post", "/updateEventStatus", eventController.updateEventStatus);
route(router, "post", "/activeAllEvent", eventController.activeAllEvent);
route(router, "get", "/upcomingEvent", eventController.upcomingEvent, false);
route(router, "post", "/upcomingLiveEvents", eventController.upcomingLiveEvents, false);
route(router, "post", "/getEventMatchData", eventController.getEventMatchData);
route(router, "post", "/getEventMatchDataFront", eventController.getEventMatchDataFront, false);
route(router, "post", "/getRacingMatchData", eventController.getRacingMatchData, false);
route(router, "post", "/getMatchWiseWinLoss", eventController.getMatchWiseWinLoss);
route(router, "post", "/completedEventList", eventController.completedEventList);
route(router, "post", "/getAllBetResultData", eventController.getAllBetResultData);

export default router;
