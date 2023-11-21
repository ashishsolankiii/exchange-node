import mongoose from "mongoose";
import ErrorResponse from "../../lib/error-handling/error-response.js";
import { generatePaginationQueries, generateSearchFilters } from "../../lib/helpers/pipeline.js";
import CasinoGame, { CASINO_GAME_IMAGE_SIZES, CASINO_GAME_IMAGE_TYPES } from "../../models/v1/CasinoGame.js";
import { uploadImageToS3 } from "../../lib/files/image-upload.js";

const uploadCasinoGameImages = async (casinoGameId, files) => {
  const casinoGame = await CasinoGame.findById(casinoGameId);

  const { casinoGameImage } = files;

  const imagePromises = [];

  // Generates image size promises for given type
  const imageSizePromises = (casinoGame, image, type, name = "") => {
    const imagePromises = [];
    const sizes = [
      CASINO_GAME_IMAGE_SIZES[type].ORIGINAL,
      CASINO_GAME_IMAGE_SIZES[type].DEFAULT,
      CASINO_GAME_IMAGE_SIZES[type].THUMBNAIL,
    ];
    sizes.forEach((size) => {
      const path = casinoGame.generateImagePath(type, size, name);
      imagePromises.push(uploadImageToS3({ image, path, size }));
    });
    return imagePromises;
  };

  // CasinoGame Image
  if (casinoGameImage) {
    imagePromises.push(...imageSizePromises(casinoGame, casinoGameImage, CASINO_GAME_IMAGE_TYPES.CASINO_GAME_IMAGE));
  }

  await Promise.all(imagePromises);


};

// Fetch all casinoGame from the database
const fetchAllCasinoGame = async ({ ...reqBody }) => {
  try {
    const {
      page,
      perPage,
      sortBy,
      direction,
      searchQuery,
      showDeleted,
      status,
    } = reqBody;

    // Pagination and Sorting
    const sortDirection = direction === "asc" ? 1 : -1;
    const paginationQueries = generatePaginationQueries(page, perPage);

    // Filters
    let filters = {
      isDeleted: showDeleted,
    };

    if (status !== null) {
      filters.isVisible = [true, "true"].includes(status);
    }

    if (searchQuery) {
      const fields = ["name"];
      filters.$or = generateSearchFilters(searchQuery, fields);
    }

    const casinoGame = await CasinoGame.aggregate([
      {
        $match: filters,
      },
      {
        $lookup: {
          from: "casinos",
          localField: "casinoId",
          foreignField: "_id",
          as: "casino",
          pipeline: [
            {
              $project: { name: 1 },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$casino",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $set: {
          casinoName: "$casino.name",
        },
      },
      {
        $unset: ["casino"],
      },
      {
        $facet: {
          totalRecords: [{ $count: "count" }],
          paginatedResults: [
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

    if (casinoGame?.length) {
      data.records = casinoGame[0]?.paginatedResults || [];
      data.totalRecords = casinoGame[0]?.totalRecords?.length ? casinoGame[0]?.totalRecords[0].count : 0;
    }

    for (var i = 0; i < data.records.length; i++) {
      const existingCasinoGame = await CasinoGame.findById(data.records[i]._id)
      data.records[i].image = await existingCasinoGame.getImageUrl(
        CASINO_GAME_IMAGE_TYPES.CASINO_GAME_IMAGE,
        CASINO_GAME_IMAGE_SIZES.CASINO_GAME_IMAGE.DEFAULT
      );
    }

    return data;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

/**
 * Fetch casinoGame by Id from the database
 */
const fetchCasinoGameId = async (_id) => {
  try {
    let existingCasinoGame = await CasinoGame.findById(_id)
    let image = await existingCasinoGame.getImageUrl(
      CASINO_GAME_IMAGE_TYPES.CASINO_GAME_IMAGE,
      CASINO_GAME_IMAGE_SIZES.CASINO_GAME_IMAGE.DEFAULT
    );

    const data = {
      ...existingCasinoGame._doc,
      image,
    };

    return data;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

/**
 * Create casinoGame in the database
 */
const addCasinoGame = async ({ files, ...reqBody }) => {
  const {
    name,
    casinoId
  } = reqBody;

  try {
    const newCasinoGameObj = {
      name,
      casinoId
    };

    const newCasinoGame = await CasinoGame.create(newCasinoGameObj);

    await uploadCasinoGameImages(newCasinoGame._id, files);

    return newCasinoGame;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

/**
 * update casinoGame in the database
 */
const modifyCasinoGame = async ({ files, ...reqBody }) => {
  try {
    const casinoGame = await CasinoGame.findById(reqBody._id);

    if (!casinoGame) {
      throw new Error("CasinoGame not found.");
    }

    casinoGame.name = reqBody.name;
    casinoGame.casinoId = reqBody.casinoId;
    await casinoGame.save();
    await uploadCasinoGameImages(reqBody._id, files);
    return casinoGame;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

/**
 * delete casinoGame in the database
 */
const removeCasinoGame = async (_id) => {
  try {
    const casinoGame = await CasinoGame.findById(_id);

    await casinoGame.softDelete();

    return casinoGame;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

const casinoGameStatusModify = async ({ _id, fieldName, status }) => {
  try {
    const casinoGame = await CasinoGame.findById(_id);

    casinoGame[fieldName] = status;
    await casinoGame.save();

    return casinoGame;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

const showFavouriteGame = async () => {
  try {
    const casinoGame = await CasinoGame.find({ isFavourite: true });
    const data = [];
    for (var i = 0; i < casinoGame.length; i++) {
      const existingCasinoGame = await CasinoGame.findById(casinoGame[i]._id)
      let image = await existingCasinoGame.getImageUrl(
        CASINO_GAME_IMAGE_TYPES.CASINO_GAME_IMAGE,
        CASINO_GAME_IMAGE_SIZES.CASINO_GAME_IMAGE.DEFAULT
      );
      data.push({
        ...casinoGame[i]._doc,
        image
      })
    }
    return data;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

const showCasinoGame = async ({ casinoId }) => {
  try {
    const casinoGame = await CasinoGame.find({ casinoId: casinoId, isVisible: true, isDeleted: false });
    const data = [];
    for (var i = 0; i < casinoGame.length; i++) {
      const existingCasinoGame = await CasinoGame.findById(casinoGame[i]._id)
      let image = await existingCasinoGame.getImageUrl(
        CASINO_GAME_IMAGE_TYPES.CASINO_GAME_IMAGE,
        CASINO_GAME_IMAGE_SIZES.CASINO_GAME_IMAGE.DEFAULT
      );
      data.push({
        ...casinoGame[i]._doc,
        image
      })
    }
    return data;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

const fetchCasinoGame = async ({ ...reqBody }) => {
  try {
    const {
      page,
      perPage,
      casinoId,
      gameType
    } = reqBody;

    // Pagination 
    const paginationQueries = generatePaginationQueries(page, perPage);

    // Filters
    let filters = { isVisible: true, isDeleted: false };
    if (casinoId) {
      filters.casinoId = new mongoose.Types.ObjectId(casinoId);
    }

    const casinoGame = await CasinoGame.aggregate([
      {
        $match: filters,
      },
      {
        $lookup: {
          from: "casinos",
          localField: "casinoId",
          foreignField: "_id",
          as: "casino",
          pipeline: [
            {
              $project: { name: 1 },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$casino",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $set: {
          casinoName: "$casino.name",
        },
      },
      {
        $unset: ["casino"],
      },
      {
        $facet: {
          totalRecords: [{ $count: "count" }],
          paginatedResults: [
            ...paginationQueries,
          ],
        },
      },
    ]);

    const data = {
      records: [],
      totalRecords: 0,
    };

    if (casinoGame?.length) {
      data.records = casinoGame[0]?.paginatedResults || [];
      data.totalRecords = casinoGame[0]?.totalRecords?.length ? casinoGame[0]?.totalRecords[0].count : 0;
    }

    for (var i = 0; i < data.records.length; i++) {
      const existingCasinoGame = await CasinoGame.findById(data.records[i]._id)
      data.records[i].image = await existingCasinoGame.getImageUrl(
        CASINO_GAME_IMAGE_TYPES.CASINO_GAME_IMAGE,
        CASINO_GAME_IMAGE_SIZES.CASINO_GAME_IMAGE.DEFAULT
      );
    }

    return data;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};


export default {
  fetchAllCasinoGame,
  fetchCasinoGameId,
  addCasinoGame,
  modifyCasinoGame,
  removeCasinoGame,
  casinoGameStatusModify,
  showFavouriteGame,
  showCasinoGame,
  fetchCasinoGame
};
