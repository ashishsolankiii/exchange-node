import mongoose from "mongoose";
import ErrorResponse from "../../lib/error-handling/error-response.js";
import { generatePaginationQueries, generateSearchFilters } from "../../lib/helpers/pipeline.js";
import DepositRequest, { STATUS, DEPOSIT_SCREENSHOT_IMAGE_SIZES, DEPOSIT_SCREENSHOT_IMAGE_TYPES } from "../../models/v1/DepositRequest.js";
import User from "../../models/v1/User.js";
import { checkImageExist } from "../../lib/helpers/images.js";
import { IMAGE_FORMATS, deleteImageFromS3, uploadImageToS3 } from "../../lib/files/image-upload.js";

const uploadDepositImages = async (depositRequestId, files) => {
  const depositRequest = await DepositRequest.findById(depositRequestId);

  const { depositScreenShot } = files;

  const imagePromises = [];

  // Generates image size promises for given type
  const imageSizePromises = (depositRequest, image, type, name = "") => {
    const imagePromises = [];
    const sizes = [
      DEPOSIT_SCREENSHOT_IMAGE_SIZES[type].ORIGINAL,
      DEPOSIT_SCREENSHOT_IMAGE_SIZES[type].DEFAULT,
      DEPOSIT_SCREENSHOT_IMAGE_SIZES[type].THUMBNAIL,
    ];
    sizes.forEach((size) => {
      const path = depositRequest.generateImagePath(type, size, name);
      imagePromises.push(uploadImageToS3({ image, path, size, format: IMAGE_FORMATS.PNG }));
    });
    return imagePromises;
  };

  // Welcome Image Mobile
  if (depositScreenShot) {
    imagePromises.push(...imageSizePromises(depositRequest, depositScreenShot, DEPOSIT_SCREENSHOT_IMAGE_TYPES.DEPOSIT_SCREENSHOT));
  }

  await Promise.all(imagePromises);
};


// Fetch all DepositRequest from the database
const fetchAllDepositRequest = async ({ ...reqBody }) => {
  try {
    const { page, perPage, sortBy, direction, searchQuery, showDeleted, userId, requestedUserId, status } = reqBody;

    // Pagination and Sorting
    const sortDirection = direction === "asc" ? 1 : -1;
    const paginationQueries = generatePaginationQueries(page, perPage);

    // Filters
    let filters = {
      isDeleted: showDeleted,
    };

    if (userId) {
      filters.userId = new mongoose.Types.ObjectId(userId);
    }

    if (status) {
      filters.status = status;
    }

    if (searchQuery) {
      const fields = ["userId", "transferTypeId", "utrTransactionId", "status"];
      filters.$or = generateSearchFilters(searchQuery, fields);
    }

    const DepositRequests = await DepositRequest.aggregate([
      {
        $match: filters,
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
          pipeline: [{ $project: { username: 1 } }],
        },
      },
      { $unwind: "$user" },
      {
        $addFields: {
          userName: "$user.username",
        },
      },
      {
        $lookup: {
          from: "deposit_types",
          localField: "transferTypeId",
          foreignField: "_id",
          as: "transferType",
        },
      },
      { $unwind: "$transferType" },
      {
        $addFields: {
          transferTypeName: "$transferType.type",
        },
      },
      {
        $facet: {
          totalRecords: [{ $count: "count" }],
          paginatedResults: [
            ...paginationQueries,
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

    if (DepositRequests?.length) {
      data.records = DepositRequests[0]?.paginatedResults || [];
      data.totalRecords = DepositRequests[0]?.totalRecords?.length ? DepositRequests[0]?.totalRecords[0].count : 0;
    }

    for (var i = 0; i < data.records.length; i++) {
      const existingDepositRequest = await DepositRequest.findById(data.records[i]._id);
      const depositScreenshotImage = await checkImageExist(
        await existingDepositRequest.getImageUrl(DEPOSIT_SCREENSHOT_IMAGE_TYPES.DEPOSIT_SCREENSHOT, DEPOSIT_SCREENSHOT_IMAGE_SIZES.DEPOSIT_SCREENSHOT.DEFAULT)
      );
      data.records[i].depositScreenShot = depositScreenshotImage
    }

    return data;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

/**
 * Fetch DepositRequest by Id from the database
 */
const fetchDepositRequestId = async (_id) => {
  try {
    const existingDepositRequest = await DepositRequest.findById(_id);
    if (!existingDepositRequest) {
      return [];
    }
    // Deposit screenshot
    const depositScreenshotImage = await checkImageExist(
      await existingDepositRequest.getImageUrl(DEPOSIT_SCREENSHOT_IMAGE_TYPES.DEPOSIT_SCREENSHOT, DEPOSIT_SCREENSHOT_IMAGE_SIZES.DEPOSIT_SCREENSHOT.DEFAULT)
    );

    const data = {
      ...existingDepositRequest._doc,
      depositScreenshotImage,
    };
    return data;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

/**
 * Create DepositRequest in the database
 */
const addDepositRequest = async ({ files, ...reqBody }) => {
  const { userId, transferTypeId, utrTransactionId, amount } = reqBody;

  try {
    const newDepositRequestObj = {
      userId,
      transferTypeId,
      utrTransactionId,
      amount,
    };

    const newDepositRequest = await DepositRequest.create(newDepositRequestObj);
    await uploadDepositImages(newDepositRequest._id, files);

    return newDepositRequest;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

/**
 * update DepositRequest in the database
 */
const modifyDepositRequest = async ({ files, ...reqBody }) => {
  try {
    const DepositRequests = await DepositRequest.findById(reqBody._id);

    if (!DepositRequests) {
      throw new Error("DepositRequest not found.");
    }

    DepositRequests.userId = reqBody.userId;
    DepositRequests.transferTypeId = reqBody.transferTypeId;
    DepositRequests.utrTransactionId = reqBody.utrTransactionId;
    DepositRequests.amount = reqBody.amount;

    await DepositRequests.save();
    await uploadDepositImages(DepositRequests._id, files);
    return DepositRequests;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

/**
 * delete DepositRequest in the database
 */
const removeDepositRequest = async (_id) => {
  try {
    const DepositRequests = await DepositRequest.findById(_id);
    if (!DepositRequests) {
      throw new Error("DepositRequest not found.");
    }
    await DepositRequests.softDelete();

    return DepositRequests;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

/**
 *Transfer Request status modify
 */
const depositRequestStatusModify = async ({ _id, fieldName, status }) => {
  try {
    const DepositRequests = await DepositRequest.findById(_id);
    if (DepositRequests.status == STATUS.APPROVE) {
      throw new Error("DepositRequest already approved.");
    } else if (DepositRequests.status == STATUS.REJECT) {
      throw new Error("DepositRequest already rejected.");
    } else {
      if (status == STATUS.APPROVE) {
        var findUser = await User.findById(DepositRequests.userId);

        if (!findUser) {
          throw new Error("User Not Found!");
        } else {
          findUser.balance = findUser.balance + DepositRequests.amount;
          findUser.save();
        }
      }

      DepositRequests[fieldName] = status;
      await DepositRequests.save();
    }
    return DepositRequests;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

export default {
  fetchAllDepositRequest,
  fetchDepositRequestId,
  addDepositRequest,
  modifyDepositRequest,
  removeDepositRequest,
  depositRequestStatusModify,
};
