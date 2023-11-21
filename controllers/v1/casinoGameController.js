import casinoGameRequest from "../../requests/v1/casinoGameRequest.js";
import casinoGameService from "../../services/v1/casinoGameService.js";

// Get all casinoGames
const getAllCasinoGame = async (req, res) => {
  const { body } = await casinoGameRequest.casinoGameListingRequest(req);

  const casinoGames = await casinoGameService.fetchAllCasinoGame({ ...body });

  return res.status(200).json({ success: true, data: casinoGames });
};

// Get casinoGame by ID
const getCasinoGameById = async (req, res) => {
  const { _id = null } = req.body;

  if (!_id) {
    throw new Error("_id is required");
  }

  const casinoGames = await casinoGameService.fetchCasinoGameId(_id);

  res.status(200).json({ success: true, data: { details: casinoGames } });
};

// Create a new casinoGame
const createCasinoGame = async (req, res) => {
  const { body } = await casinoGameRequest.createCasinoGameRequest(req);

  const newCasinoGame = await casinoGameService.addCasinoGame({ ...body, files: req.files });

  res.status(201).json({ success: true, data: { details: newCasinoGame } });
};

// Update a casinoGame
const updateCasinoGame = async (req, res) => {
  const { body } = await casinoGameRequest.updateCasinoGameRequest(req);

  const updatedCasinoGame = await casinoGameService.modifyCasinoGame({ ...body, files: req.files });

  res.status(200).json({ success: true, data: { details: updatedCasinoGame } });
};

// Delete a casinoGame
const deleteCasinoGame = async (req, res) => {
  const { _id } = req.body;

  if (!_id) {
    throw new Error("_id is required!");
  }

  const deletedCasinoGame = await casinoGameService.removeCasinoGame(_id);

  res.status(200).json({ success: true, data: { details: deletedCasinoGame } });
};

const updateCasinoGameStatus = async (req, res) => {
  const _id = req.body?._id || null;
  const fieldName = req.body?.fieldName || null;
  const status = req.body?.status || null;

  if (!(_id && fieldName && status)) {
    throw new Error("_id && fieldName && status is required!");
  }

  const updatedCasinoGameStatus = await casinoGameService.casinoGameStatusModify({
    _id,
    fieldName,
    status,
  });

  res.status(200).json({ success: true, data: { details: updatedCasinoGameStatus } });
};

const showFavouriteGame = async (req, res) => {

  const showFavouriteCasinoGame = await casinoGameService.showFavouriteGame({
  });

  res.status(200).json({ success: true, data: { details: showFavouriteCasinoGame } });
};

const showCasinoGame = async (req, res) => {
  const casinoId = req.body?.casinoId || null;
  const showCasinoWiseGame = await casinoGameService.showCasinoGame({
    casinoId
  });

  res.status(200).json({ success: true, data: { details: showCasinoWiseGame } });
};

const getCasinoGame = async (req, res) => {
  const { body } = await casinoGameRequest.casinoGameListRequest(req);

  const casinoGames = await casinoGameService.fetchCasinoGame({ ...body });

  return res.status(200).json({ success: true, data: casinoGames });
};



export default {
  getAllCasinoGame,
  getCasinoGameById,
  createCasinoGame,
  updateCasinoGame,
  deleteCasinoGame,
  updateCasinoGameStatus,
  showFavouriteGame,
  showCasinoGame,
  getCasinoGame
};
