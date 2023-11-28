import transferTypeRequest from "../../requests/v1/transferTypeRequest.js";
import transferTypeService from "../../services/v1/transferTypeService.js";

// Get all transferTypes
const getAllTransferType = async (req, res) => {
  const { body } = await transferTypeRequest.transferTypeListingRequest(req);

  const transferTypes = await transferTypeService.fetchAllTransferType({ ...body });

  return res.status(200).json({ success: true, data: transferTypes });
};

// Get transferType by ID
const getTransferTypeById = async (req, res) => {
  const { _id = null } = req.body;

  if (!_id) {
    throw new Error("_id is required");
  }

  const transferTypes = await transferTypeService.fetchTransferTypeId(_id);

  res.status(200).json({ success: true, data: { details: transferTypes } });
};

// Create a new transferType
const createTransferType = async (req, res) => {
  const { body } = await transferTypeRequest.createTransferTypeRequest(req);

  const newTransferType = await transferTypeService.addTransferType({ files: req.files, ...body });

  res.status(201).json({ success: true, data: { details: newTransferType } });
};

// Update a transferType
const updateTransferType = async (req, res) => {
  const { body } = await transferTypeRequest.updateTransferTypeRequest(req);

  const updatedTransferType = await transferTypeService.modifyTransferType({ files: req.files, ...body });

  res.status(200).json({ success: true, data: { details: updatedTransferType } });
};

// Delete a transferType
const deleteTransferType = async (req, res) => {
  const { _id } = req.body;

  if (!_id) {
    throw new Error("_id is required!");
  }

  const deletedTransferType = await transferTypeService.removeTransferType(_id);

  res.status(200).json({ success: true, data: { details: deletedTransferType } });
};

const updateTransferTypeStatus = async (req, res) => {
  const _id = req.body?._id || null;
  const fieldName = req.body?.fieldName || null;
  const status = req.body?.status || null;

  if (!(_id && fieldName && status)) {
    throw new Error("_id && fieldName && status is required!");
  }

  const updatedTransferTypeStatus = await transferTypeService.transferTypeStatusModify({
    _id,
    fieldName,
    status,
  });

  res.status(200).json({ success: true, data: { details: updatedTransferTypeStatus } });
};


export default {
  getAllTransferType,
  getTransferTypeById,
  createTransferType,
  updateTransferType,
  deleteTransferType,
  updateTransferTypeStatus
};
