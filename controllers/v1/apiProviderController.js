import apiProviderRequest from "../../requests/v1/apiProviderRequest.js";
import apiProviderService from "../../services/v1/apiProviderService.js";

// Get all apiProviders
const getAllApiProvider = async (req, res) => {
  const { body } = await apiProviderRequest.apiProviderListingRequest(req);

  const apiProviders = await apiProviderService.fetchAllApiProvider({
    ...body,
  });

  return res.status(200).json({ success: true, data: apiProviders });
};

// Get apiProvider by ID
const getApiProviderById = async (req, res) => {
  const { _id = null } = req.body;

  if (!_id) {
    throw new Error("_id is required");
  }

  const apiProviders = await apiProviderService.fetchApiProviderId(_id);

  res.status(200).json({ success: true, data: { details: apiProviders } });
};

// Create a new apiProvider
const createApiProvider = async (req, res) => {
  const { body } = await apiProviderRequest.createApiProviderRequest(req);

  const newApiProvider = await apiProviderService.addCometition({ ...body });

  res.status(201).json({ success: true, data: { details: newApiProvider } });
};

// Update a apiProvider
const updateApiProvider = async (req, res) => {
  const { body } = await apiProviderRequest.updateApiProviderRequest(req);

  const updatedApiProvider = await apiProviderService.modifyApiProvider({
    ...body,
  });

  res.status(200).json({ success: true, data: { details: updatedApiProvider } });
};

// Delete a apiProvider
const deleteApiProvider = async (req, res) => {
  const { _id } = req.body;

  if (!_id) {
    throw new Error("_id is required!");
  }

  const deletedApiProvider = await apiProviderService.removeApiProvider(_id);

  res.status(200).json({ success: true, data: { details: deletedApiProvider } });
};

const updateApiProviderStatus = async (req, res) => {
  const _id = req.body?._id || null;
  const fieldName = req.body?.fieldName || null;
  const status = req.body?.status || null;

  if (!(_id && fieldName && status)) {
    throw new Error("_id && fieldName && status is required!");
  }

  const updatedApiProviderStatus = await apiProviderService.apiProviderStatusModify({
    _id,
    fieldName,
    status,
  });

  res.status(200).json({ success: true, data: { details: updatedApiProviderStatus } });
};

export default {
  getAllApiProvider,
  getApiProviderById,
  createApiProvider,
  updateApiProvider,
  deleteApiProvider,
  updateApiProviderStatus,
};
