import marketRequest from "../../requests/v1/marketRequest.js";
import marketService from "../../services/v1/marketService.js";

// Create a new market
const createMarket = async (req, res) => {
  const { body } = await marketRequest.createMarketRequest(req);

  const newMarket = await marketService.addMarket({ ...body });

  res.status(201).json({ success: true, data: { details: newMarket } });
};

// Update a market
const updateMarket = async (req, res) => {
  const { body } = await marketRequest.updateMarketRequest(req);

  const updatedMarket = await marketService.modifyMarket({ ...body });

  res.status(200).json({ success: true, data: { details: updatedMarket } });
};

// Update a market runner
const updateMarketRunner = async (req, res) => {
  const { body } = await marketRequest.updateMarketRunnerRequest(req);

  const updatedMarket = await marketService.modifyMarketRunner({ ...body });

  res.status(200).json({ success: true, data: { details: updatedMarket } });
};

//  Pass eventId and sync Matchodds, Bookmaker and Fancy
const syncMarketByEvent = async (req, res) => {
  const { eventId } = req.body;
  if (!eventId) {
    throw new ErrorResponse("Event Id is required").status(401);
  }

  const syncMarketByEventId = await marketService.syncMarketByEventId({ eventId });

  res.status(200).json({ success: true, data: { details: syncMarketByEventId } });
};

export default {
  createMarket,
  updateMarket,
  syncMarketByEvent,
  updateMarketRunner
};