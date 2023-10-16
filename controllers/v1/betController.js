import Market from "../../models/v1/Market.js";
import betRequest from "../../requests/v1/betRequest.js";
import placeBetService from "../../services/v1/bet/placeBetService.js";
import betService from "../../services/v1/betService.js";
import { io } from "../../socket/index.js";

// Create a new bet
const createBet = async (req, res) => {
  const { body } = await betRequest.createBetRequest(req);

  // const newBet = await betService.addBet({ user: req.user, ...body });
  const newBet = await placeBetService.createBet({ user: req.user, ...body });

  res.status(201).json({ success: true, data: { details: newBet } });
};

// Get list bet
const getAllBet = async (req, res) => {
  const { body } = await betRequest.getAllBetRequest(req);

  const newBet = await betService.fetchAllBet({ ...body });

  res.status(201).json({ success: true, data: { details: newBet } });
};

const getUserEventBets = async (req, res) => {
  const { eventId } = req.body;

  if (!eventId) {
    throw new Error("Event id is required");
  }

  const eventBets = await betService.fetchUserEventBets({ eventId, userId: req.user._id });

  res.status(201).json({ success: true, data: { details: eventBets } });
};

// Bet complete
const betComplete = async (req, res) => {
  const { body } = await betRequest.betCompleteRequest(req);

  const completeBet = await betService.completeBet({ ...body });

  const { eventId: event } = await Market.findById(body.marketId).populate("eventId").select("eventId");
  const notification = {
    _id: event._id,
    name: event.name,
    matchDateTime: event.matchDate,
  };
  io.eventNotification.to("event:notification").emit("event:complete", notification);

  const userBetsAndPls = await betService.fetchAllUserBetsAndPls({ eventId: event._id, userId: req.user._id });
  io.userBet.emit(`event:bet:${req.user._id}`, userBetsAndPls);

  res.status(201).json({ success: true, data: { details: completeBet } });
};

// Bet complete fancy
const betCompleteFancy = async (req, res) => {
  const { body } = await betRequest.betCompleteFancyRequest(req);

  const completeBet = await betService.completeBetFency({ ...body });

  const { eventId: event } = await Market.findById(body.marketId).populate("eventId").select("eventId");
  const userBetsAndPls = await betService.fetchAllUserBetsAndPls({ eventId: event._id, userId: req.user._id });
  io.userBet.emit(`event:bet:${req.user._id}`, userBetsAndPls);

  res.status(201).json({ success: true, data: { details: completeBet } });
};

// Settlement

const settlement = async (req, res) => {
  const { body } = await betRequest.settlementRequest(req);

  const settlement = await betService.settlement({ ...body });

  res.status(201).json({ success: true, data: { details: settlement } });
};

const getChildUserData = async (req, res) => {
  const { userId, filterUserId = "" } = req.body;

  if (!userId) {
    throw new Error("_id is required!");
  }

  const getChildUserData = await betService.getChildUserData({ userId, filterUserId });
  res.status(201).json({ success: true, data: { details: getChildUserData } });
};

const getRunnerPls = async (req, res) => {
  const { body } = await betRequest.getRunnerPlsRequest(req);

  const getRunnerPls = await betService.fetchRunnerPls({ user: req.user, ...body });

  res.status(201).json({ success: true, data: { details: getRunnerPls } });
};

const getRunnerPlsFancy = async (req, res) => {
  const { body } = await betRequest.getRunnerPlsRequest(req);

  const getRunnerPls = await betService.fetchRunnerPlsFancy({ user: req.user, ...body });

  res.status(201).json({ success: true, data: { details: getRunnerPls } });
};

const getCurrentBetsUserwise = async (req, res) => {
  const { body } = await betRequest.getCurrentBetsUserwise(req);
  const getCurrentBet = await betService.getCurrentBetsUserwise({ ...body });

  res.status(201).json({ success: true, data: { details: getCurrentBet } });
};

const getCompleteBetEventWise = async (req, res) => {
  const { body } = await betRequest.getCompleteBetEventWise(req);
  const getCurrentBet = await betService.getCompleteBetEventWise({ ...body });

  res.status(201).json({ success: true, data: { details: getCurrentBet } });
};

export default {
  createBet,
  getAllBet,
  getUserEventBets,
  betComplete,
  betCompleteFancy,
  settlement,
  getChildUserData,
  getRunnerPls,
  getCurrentBetsUserwise,
  getRunnerPlsFancy,
  getCompleteBetEventWise,
};
