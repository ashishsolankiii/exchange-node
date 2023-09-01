import currencyService from "../../services/v1/currencyService.js";

// Get all Currency
const getAllCurrency = async (req, res) => {
  const page = req.body?.page ? Number(req.body.page) : null;
  const perPage = req.body?.perPage ? Number(req.body.perPage) : null;
  const sortBy = req.body?.sortBy ? req.body.sortBy : "createdAt";
  const direction = req.body?.direction ? req.body.direction : "desc";
  const showDeleted = req.body?.showDeleted ? req.body.showDeleted === true || req.body.showDeleted === "true" : false;
  const searchQuery = req.body?.searchQuery || null;

  const currency = await currencyService.fetchAllCurrency({
    page,
    perPage,
    sortBy,
    direction,
    showDeleted,
    searchQuery,
  });

  return res.status(200).json({ success: true, data: currency });
};

// Get Currency by ID
const getCurrencyById = async (req, res) => {
  const { _id } = req.body;

  if (!_id) {
    throw new Error("_id is required");
  }

  const currency = await currencyService.fetchCurrencyId(_id);

  res.status(200).json({ success: true, data: { details: currency } });
};

// Create a new Currency
const createCurrency = async (req, res) => {
  const name = req.body?.name ? req.body.name.trim() : null;
  const multiplier = req.body?.multiplier ? Number(req.body.multiplier) : null;
  const countryName = req.body?.countryName ? req.body.countryName.trim() : null;

  if (!name) {
    throw new Error("name is required!");
  }
  if (multiplier < 0) {
    throw new Error("multiplier must be greater than 0!");
  }

  const newcurrency = await currencyService.addCurrency({
    name: name,
    multiplier: multiplier,
    countryName: countryName
  });

  res.status(201).json({
    success: true,
    data: { details: newcurrency },
    message: "Currency Created",
  });
};

// Update a Currency
const updateCurrency = async (req, res) => {
  const _id = req.body?._id || null;
  const name = req.body?.name ? req.body.name : null;
  const multiplier = req.body?.multiplier ? Number(req.body.multiplier) : null;
  const countryName = req.body?.countryName ? req.body.countryName : null;

  if (!_id) {
    throw new Error("_id is required!");
  }
  if (multiplier < 0) {
    throw new Error("multiplier must be greater than 0!");
  }

  const updatedCurrency = await currencyService.modifyCurrency({
    _id,
    name,
    multiplier,
    countryName
  });

  res.status(200).json({
    success: true,
    data: { details: updatedCurrency },
    message: "Currency Updated",
  });
};

// Delete a Currency
const deleteCurrency = async (req, res) => {
  const { _id } = req.body;

  if (!_id) {
    throw new Error("_id is required!");
  }

  const deletedCurrency = await currencyService.removeCurrency(_id);

  res.status(200).json({
    success: true,
    data: { details: deletedCurrency },
    message: "Currency Deleted",
  });
};

export default {
  getAllCurrency,
  getCurrencyById,
  createCurrency,
  updateCurrency,
  deleteCurrency,
};
