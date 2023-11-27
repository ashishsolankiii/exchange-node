import depositRequestRequest from "../../requests/v1/depositRequestRequest.js";
import depositRequestService from "../../services/v1/depositRequestService.js";

// Get all depositRequests
const getAllDepositRequest = async (req, res) => {
  const { body } = await depositRequestRequest.depositRequestListingRequest(req);

  const depositRequests = await depositRequestService.fetchAllDepositRequest({ ...body });

  return res.status(200).json({ success: true, data: depositRequests });
};

// Get depositRequest by ID
const getDepositRequestById = async (req, res) => {
  const { _id = null } = req.body;

  if (!_id) {
    throw new Error("_id is required");
  }

  const depositRequests = await depositRequestService.fetchDepositRequestId(_id);

  res.status(200).json({ success: true, data: { details: depositRequests } });
};

// Create a new depositRequest
const createDepositRequest = async (req, res) => {
  const { body } = await depositRequestRequest.createDepositRequestRequest(req);

  const newDepositRequest = await depositRequestService.addDepositRequest({ files: req.files, ...body });

  res.status(201).json({ success: true, data: { details: newDepositRequest } });
};

// Update a depositRequest
const updateDepositRequest = async (req, res) => {
  const { body } = await depositRequestRequest.updateDepositRequestRequest(req);

  const updatedDepositRequest = await depositRequestService.modifyDepositRequest({ files: req.files, ...body });

  res.status(200).json({ success: true, data: { details: updatedDepositRequest } });
};

// Delete a depositRequest
const deleteDepositRequest = async (req, res) => {
  const { _id } = req.body;

  if (!_id) {
    throw new Error("_id is required!");
  }

  const deletedDepositRequest = await depositRequestService.removeDepositRequest(_id);

  res.status(200).json({ success: true, data: { details: deletedDepositRequest } });
};

const updateDepositRequestStatus = async (req, res) => {
  const _id = req.body?._id || null;
  const fieldName = req.body?.fieldName || null;
  const status = req.body?.status || null;

  if (!(_id && fieldName && status)) {
    throw new Error("_id && fieldName && status is required!");
  }

  const updatedDepositRequestStatus = await depositRequestService.depositRequestStatusModify({
    _id,
    fieldName,
    status,
  });

  res.status(200).json({ success: true, data: { details: updatedDepositRequestStatus } });
};

export default {
  getAllDepositRequest,
  getDepositRequestById,
  createDepositRequest,
  updateDepositRequest,
  deleteDepositRequest,
  updateDepositRequestStatus,
};
