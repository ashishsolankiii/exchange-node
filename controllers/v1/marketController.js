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

export default {
  createMarket,
  updateMarket
};