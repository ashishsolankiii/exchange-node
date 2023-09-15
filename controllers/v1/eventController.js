import eventRequest from "../../requests/v1/eventRequest.js";
import eventService from "../../services/v1/eventService.js";

// Get all events
const getAllEvent = async (req, res) => {
  const { body } = await eventRequest.eventListingRequest(req);

  const events = await eventService.fetchAllEvent({ ...body });

  return res.status(200).json({ success: true, data: events });
};

// Get event by ID
const getEventById = async (req, res) => {
  const { _id = null } = req.body;

  if (!_id) {
    throw new Error("_id is required");
  }

  const events = await eventService.fetchEventId(_id);

  res.status(200).json({ success: true, data: { details: events } });
};

// Create a new event
const createEvent = async (req, res) => {
  const { body } = await eventRequest.createEventRequest(req);

  const newEvent = await eventService.addEvent({ ...body });

  res.status(201).json({ success: true, data: { details: newEvent } });
};

// Update a event
const updateEvent = async (req, res) => {
  const { body } = await eventRequest.updateEventRequest(req);

  const updatedEvent = await eventService.modifyEvent({ ...body });

  res.status(200).json({ success: true, data: { details: updatedEvent } });
};

// Delete a event
const deleteEvent = async (req, res) => {
  const { _id } = req.body;

  if (!_id) {
    throw new Error("_id is required!");
  }

  const deletedEvent = await eventService.removeEvent(_id);

  res.status(200).json({ success: true, data: { details: deletedEvent } });
};

const updateEventStatus = async (req, res) => {
  const _id = req.body?._id || null;
  const fieldName = req.body?.fieldName || null;
  const status = req.body?.status || null;

  if (!(_id && fieldName && status)) {
    throw new Error("_id && fieldName && status is required!");
  }

  const updatedEventStatus = await eventService.eventStatusModify({
    _id,
    fieldName,
    status,
  });

  res.status(200).json({ success: true, data: { details: updatedEventStatus } });
};

// Active all event
const activeAllEvent = async (req, res) => {
  const { eventIds, competitionId } = req.body;

  if (!(eventIds && competitionId)) {
    throw new Error("_id && competitionId is required!");
  }

  await eventService.activeEvent({ eventIds, competitionId });

  res.status(200).json({ success: true, data: { details: {} } });
};

const upcomingEvent = async (req, res) => {
  const UpcomingEvent = await eventService.upcomingEvents();

  res.status(200).json({ success: true, data: { details: UpcomingEvent } });
};

const getEventMatchData = async (req, res) => {
  const { eventId } = req.body;
  const GetEventMatchData = await eventService.getEventMatchData({
    eventId,
  });

  res.status(200).json({ success: true, data: { details: GetEventMatchData } });
};

const getEventMatchDataFront = async (req, res) => {
  const { eventId } = req.body;
  const user = req.user;
  const GetEventMatchData = await eventService.getEventMatchDataFront({
    eventId,
    user,
  });

  res.status(200).json({ success: true, data: { details: GetEventMatchData } });
};

export default {
  getAllEvent,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  updateEventStatus,
  activeAllEvent,
  upcomingEvent,
  getEventMatchData,
  getEventMatchDataFront,
};
