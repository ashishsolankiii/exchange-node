import sportService from "../../services/v1/sportService.js";

// Get all sport
const getAllSport = async (req, res) => {
  const page = req.body?.page ? Number(req.body.page) : null;
  const perPage = req.body?.perPage ? Number(req.body.perPage) : null;
  const sortBy = req.body?.sortBy ? req.body.sortBy : "positionIndex";
  const direction = req.body?.direction ? req.body.direction : "desc";
  const showDeleted = req.body?.showDeleted
    ? req.body.showDeleted === true || req.body.showDeleted === "true"
    : false;
  const searchQuery = req.body?.searchQuery || null;
  const status = req.body?.status || null;
  const selectFields = req.body?.selectFields || null;

  const sport = await sportService.fetchAllSport({
    page,
    perPage,
    sortBy,
    direction,
    showDeleted,
    searchQuery,
    status,
    selectFields
  });

  return res.status(200).json({ success: true, data: sport });
};

// Get sport by ID
const getSportById = async (req, res) => {
  const { _id } = req.body;

  if (!_id) {
    throw new Error("_id is required");
  }

  const sport = await sportService.fetchSportId(_id);

  res.status(200).json({ success: true, data: { details: sport } });
};

// Create a new sport
const createSport = async (req, res) => {
  const name = req.body?.name ? req.body.name.trim() : null;
  const betCategory = req.body?.betCategory || [];
  const apiSportId = req.body?.apiSportId ? req.body.apiSportId : null;
  const positionIndex = req.body?.positionIndex ? req.body.positionIndex : null;
  if (!name) {
    throw new Error("name is required!");
  }
  const newsport = await sportService.addSport({
    name: name,
    betCategory: betCategory,
    apiSportId: apiSportId,
    positionIndex: positionIndex
  });

  res.status(201).json({ success: true, data: { details: newsport } });
};

// Update a sport
const updateSport = async (req, res) => {
  const _id = req.body?._id || null;
  const name = req.body?.name ? req.body.name : null;
  const betCategory = req.body?.betCategory || [];
  const apiSportId = req.body?.apiSportId ? req.body.apiSportId : null;
  const positionIndex = req.body?.positionIndex ? req.body.positionIndex : null;

  if (!_id) {
    throw new Error("_id is required!");
  }
  const updatedSport = await sportService.modifySport({
    _id,
    name,
    betCategory,
    apiSportId,
    positionIndex
  });

  res.status(200).json({ success: true, data: { details: updatedSport } });
};

// Delete a sport
const deleteSport = async (req, res) => {
  const { _id } = req.body;

  if (!_id) {
    throw new Error("_id is required!");
  }

  const deletedSport = await sportService.removeSport(_id);

  res.status(200).json({ success: true, data: { details: deletedSport } });
};


// Change Status
const changeStatus = async (req, res) => {
  const { _id, status } = req.body;

  if (!_id) {
    throw new Error("_id is required!");
  }
  if (!status) {
    throw new Error("status is required!");
  }

  const changeStatusSport = await sportService.changeSportStatus(_id, status);

  res.status(200).json({ success: true, data: { details: changeStatusSport } });
};


export default {
  getAllSport,
  getSportById,
  createSport,
  updateSport,
  deleteSport,
  changeStatus
};
