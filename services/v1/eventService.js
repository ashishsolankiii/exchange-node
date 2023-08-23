import mongoose from "mongoose";
import ErrorResponse from "../../lib/error-handling/error-response.js";
import { generatePaginationQueries, generateSearchFilters } from "../../lib/helpers/pipeline.js";
import Event from "../../models/v1/Event.js";
import Market from "../../models/v1/Market.js";

// Fetch all event from the database
const fetchAllEvent = async ({ ...reqBody }) => {
  try {
    const {
      page,
      perPage,
      sortBy,
      direction,
      searchQuery,
      showDeleted,
      showRecord,
      status,
      sportId,
      competitionId,
      fields,
    } = reqBody;

    let fromDate, toDate;
    if (reqBody.fromDate && reqBody.toDate) {
      fromDate = new Date(new Date(reqBody.fromDate).setUTCHours(0, 0, 0)).toISOString();
      toDate = new Date(new Date(reqBody.toDate).setUTCHours(23, 59, 59)).toISOString();
    }
    // Projection
    const projection = [];
    if (fields) {
      projection.push({ $project: fields });
    }

    // Pagination and Sorting
    const sortDirection = direction === "asc" ? 1 : -1;
    const paginationQueries = generatePaginationQueries(page, perPage);

    // Filters
    let filters = {};
    if (showRecord == "All") {
      filters = {
        isDeleted: showDeleted,
      };
    } else {
      filters = {
        isDeleted: showDeleted,
        isManual: true,
      };
    }
    console.log(sportId);
    if (sportId) {
      filters.sportId = new mongoose.Types.ObjectId(sportId);
    }

    if (competitionId) {
      filters.competitionId = new mongoose.Types.ObjectId(competitionId);
    }

    if (status !== null) {
      filters.isActive = [true, "true"].includes(status);
    }

    if (fromDate && toDate) {
      filters.matchDate = { $gte: new Date(fromDate), $lte: new Date(toDate) }

    }

    if (searchQuery) {
      const fields = ["name", "sportId"];
      filters.$or = generateSearchFilters(searchQuery, fields);
    }

    const event = await Event.aggregate([
      {
        $match: filters,
      },
      {
        $lookup: {
          from: "sports",
          localField: "sportId",
          foreignField: "_id",
          as: "sport",
          pipeline: [
            {
              $project: { name: 1 },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$sport",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "competitions",
          localField: "competitionId",
          foreignField: "_id",
          as: "competition",
          pipeline: [
            {
              $project: { name: 1 },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$competition",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $set: {
          sportsName: "$sport.name",
          competitionName: "$competition.name",
        },
      },
      {
        $unset: ["sport", "competition"],
      },
      {
        $facet: {
          totalRecords: [{ $count: "count" }],
          paginatedResults: [
            ...projection,
            {
              $sort: { [sortBy]: sortDirection },
            },
            ...paginationQueries,
          ],
        },
      },
    ]);

    const data = {
      records: [],
      totalRecords: 0,
    };

    if (event?.length) {
      data.records = event[0]?.paginatedResults || [];
      data.totalRecords = event[0]?.totalRecords?.length ? event[0]?.totalRecords[0].count : 0;
    }

    return data;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

/**
 * Fetch event by Id from the database
 */
const fetchEventId = async (_id) => {
  try {
    return await Event.findById(_id);
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

/**
 * Create event in the database
 */
const addEvent = async ({ ...reqBody }) => {
  const {
    name,
    sportId,
    competitionId,
    matchDate,
    oddsLimit,
    volumeLimit,
    minStake,
    maxStake,
    minStakeSession,
    maxStakeSession,
  } = reqBody;

  try {
    const newEventObj = {
      name,
      sportId,
      competitionId,
      matchDate,
      oddsLimit,
      volumeLimit,
      minStake,
      minStakeSession,
      maxStake,
      maxStakeSession,
      isActive: true,
      isManual: true,
    };

    const newEvent = await Event.create(newEventObj);

    return newEvent;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

/**
 * update event in the database
 */
const modifyEvent = async ({ ...reqBody }) => {
  try {
    const event = await Event.findById(reqBody._id);

    if (!event) {
      throw new Error("Event not found.");
    }

    event.name = reqBody.name;
    event.sportId = reqBody.sportId;
    event.competitionId = reqBody.competitionId;
    event.matchDate = reqBody.matchDate;
    event.matchTime = reqBody.matchTime;
    event.oddsLimit = reqBody.oddsLimit;
    event.volumeLimit = reqBody.volumeLimit;
    event.minStake = reqBody.minStake;
    event.maxStake = reqBody.maxStake;
    event.minStakeSession = reqBody.minStakeSession;
    event.maxStakeSession = reqBody.maxStakeSession;
    event.isActive = reqBody.isActive;
    event.completed = reqBody.completed;
    event.betDeleted = reqBody.betDeleted;

    await event.save();

    return event;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

/**
 * delete event in the database
 */
const removeEvent = async (_id) => {
  try {
    const event = await Event.findById(_id);

    await event.softDelete();

    return event;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

const eventStatusModify = async ({ _id, fieldName, status }) => {
  try {
    const event = await Event.findById(_id);

    event[fieldName] = status;
    await event.save();

    return event;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

const activeEvent = async ({ eventIds, competitionId }) => {
  try {
    await Event.updateMany({ competitionId }, { isActive: false });
    if (eventIds.length > 0) {
      await Event.updateMany({ _id: { $in: eventIds } }, { isActive: true });
    }
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

const upcomingEvents = async () => {
  try {
    const event = await Event.find({
      matchDate: {
        $gt: new Date()
      }
    }, { name: 1, matchDate: 1 }).sort({ matchDate: 1 }).limit(10);

    return event;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

const getEventMatchData = async ({ eventId }) => {
  try {
    const event = await Market.aggregate([
      {
        $match: {
          eventId: new mongoose.Types.ObjectId(eventId)
        },
      },
      {
        $lookup: {
          from: "sports",
          localField: "sportId",
          foreignField: "_id",
          as: "sport",
          pipeline: [
            {
              $project: { name: 1 },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$sport",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "events",
          localField: "eventId",
          foreignField: "_id",
          as: "event",
          pipeline: [
            {
              $project: { name: 1 },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$event",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "competitions",
          localField: "competitionId",
          foreignField: "_id",
          as: "competition",
          pipeline: [
            {
              $project: { name: 1 },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$competition",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $set: {
          sportsName: "$sport.name",
          competitionName: "$competition.name",
          eventName: "$event.name",
        },
      },
      {
        $unset: ["sport", "competition", "event"],
      },

    ]);

    return event[0];
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

export default {
  fetchAllEvent,
  fetchEventId,
  addEvent,
  modifyEvent,
  removeEvent,
  eventStatusModify,
  activeEvent,
  upcomingEvents,
  getEventMatchData,
};
