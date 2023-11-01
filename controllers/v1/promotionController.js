import promotionRequest from "../../requests/v1/promotionRequest.js";
import themeSettingRequest from "../../requests/v1/themeSettingRequest.js";
import promotionService from "../../services/v1/promotionService.js";

// Get all promotions
const getAllPromotion = async (req, res) => {
  const { body } = await promotionRequest.promotionListingRequest(req);

  const promotions = await promotionService.fetchAllPromotion({ ...body });

  return res.status(200).json({ success: true, data: promotions });
};

// Get promotion by ID
const getPromotionById = async (req, res) => {
  const { _id = null } = req.body;

  if (!_id) {
    throw new Error("_id is required");
  }

  const promotions = await promotionService.fetchPromotionId(_id);

  res.status(200).json({ success: true, data: { details: promotions } });
};

// Create a new promotion
const createPromotion = async (req, res) => {
  const { body } = await promotionRequest.createPromotionRequest(req);

  const newPromotion = await promotionService.addPromotion({ ...body });

  res.status(201).json({ success: true, data: { details: newPromotion } });
};

// Update a promotion
const updatePromotion = async (req, res) => {
  const { body } = await promotionRequest.updatePromotionRequest(req);

  const updatedPromotion = await promotionService.modifyPromotion({ ...body });

  res.status(200).json({ success: true, data: { details: updatedPromotion } });
};

// Delete a promotion
const deletePromotion = async (req, res) => {
  const { _id } = req.body;

  if (!_id) {
    throw new Error("_id is required!");
  }

  const deletedPromotion = await promotionService.removePromotion(_id);

  res.status(200).json({ success: true, data: { details: deletedPromotion } });
};

const updatePromotionStatus = async (req, res) => {
  const _id = req.body?._id || null;
  const fieldName = req.body?.fieldName || null;
  const status = req.body?.status || null;

  if (!(_id && fieldName && status)) {
    throw new Error("_id && fieldName && status is required!");
  }

  const updatedPromotionStatus = await promotionService.promotionStatusModify({
    _id,
    fieldName,
    status,
  });

  res.status(200).json({ success: true, data: { details: updatedPromotionStatus } });
};

const allPromotion = async (req, res) => {
  const { body } = await themeSettingRequest.getThemeSettingByCurrencyAndDomainRequest(req);
  const promotions = await promotionService.allPromotion({ ...body });

  res.status(200).json({ success: true, data: { details: promotions } });
};

export default {
  getAllPromotion,
  getPromotionById,
  createPromotion,
  updatePromotion,
  deletePromotion,
  updatePromotionStatus,
  allPromotion
};
