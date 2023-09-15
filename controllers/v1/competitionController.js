import User, { USER_ROLE } from "../../models/v1/User.js";
import competitionRequest from "../../requests/v1/competitionRequest.js";
import competitionService from "../../services/v1/competitionService.js";

// Get all competitions
const getAllCompetition = async (req, res) => {
  const { body } = await competitionRequest.competitionListingRequest(req);

  const competitions = await competitionService.fetchAllCompetition({
    ...body,
  });

  return res.status(200).json({ success: true, data: competitions });
};

const getAllCompetitionEvents = async (req, res) => {
  const { user } = req;

  const loggedInUser = await User.findOne({ _id: user._id });

  if (loggedInUser.role !== USER_ROLE.SYSTEM_OWNER) {
    throw new Error("You are not authorized to access this resource!");
  }

  const competitionEvents = await competitionService.fetchAllCompetitionEvents();

  return res.status(200).json({ success: true, data: competitionEvents });
};

// Get competition by ID
const getCompetitionById = async (req, res) => {
  const { _id = null } = req.body;

  if (!_id) {
    throw new Error("_id is required");
  }

  const competitions = await competitionService.fetchCompetitionId(_id);

  res.status(200).json({ success: true, data: { details: competitions } });
};

// Create a new competition
const createCompetition = async (req, res) => {
  const { body } = await competitionRequest.createCompetitionRequest(req);

  const newCompetition = await competitionService.addCometition({ ...body });

  res.status(201).json({ success: true, data: { details: newCompetition } });
};

// Update a competition
const updateCompetition = async (req, res) => {
  const { body } = await competitionRequest.updateCompetitionRequest(req);

  const updatedCompetition = await competitionService.modifyCompetition({
    ...body,
  });

  res.status(200).json({ success: true, data: { details: updatedCompetition } });
};

// Delete a competition
const deleteCompetition = async (req, res) => {
  const { _id } = req.body;

  if (!_id) {
    throw new Error("_id is required!");
  }

  const deletedCompetition = await competitionService.removeCompetition(_id);

  res.status(200).json({ success: true, data: { details: deletedCompetition } });
};

const updateCompetitionStatus = async (req, res) => {
  const _id = req.body?._id || null;
  const fieldName = req.body?.fieldName || null;
  const status = req.body?.status || null;

  if (!(_id && fieldName && status)) {
    throw new Error("_id && fieldName && status is required!");
  }

  const updatedCompetitionStatus = await competitionService.competitionStatusModify({
    _id,
    fieldName,
    status,
  });

  res.status(200).json({ success: true, data: { details: updatedCompetitionStatus } });
};

// Active all competition
const activeAllCompetition = async (req, res) => {
  const { competitionIds, sportId } = req.body;

  if (!(competitionIds.length && sportId)) {
    throw new Error("_id && sportId is required!");
  }

  await competitionService.activeCompetition({ competitionIds, sportId });

  res.status(200).json({ success: true, data: { details: {} } });
};

// Get all competition list for Options
const getAllCompetitionList = async (req, res) => {
  const { body } = await competitionRequest.competitionListingOptionsRequest(req);

  const competitions = await competitionService.fetchAllCompetitionList({
    ...body,
  });

  return res.status(200).json({ success: true, data: { records: competitions } });
};

const getAllActiveCompetitionEvents = async (req, res) => {
  const competitionEvents = await competitionService.fetchAllActiveCompetitionEvents();

  return res.status(200).json({ success: true, data: competitionEvents });
};

export default {
  getAllCompetition,
  getAllCompetitionEvents,
  getAllActiveCompetitionEvents,
  getCompetitionById,
  createCompetition,
  updateCompetition,
  deleteCompetition,
  updateCompetitionStatus,
  activeAllCompetition,
  getAllCompetitionList,
};
