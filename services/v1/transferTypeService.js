import mongoose from "mongoose";
import ErrorResponse from "../../lib/error-handling/error-response.js";
import { generatePaginationQueries, generateSearchFilters } from "../../lib/helpers/pipeline.js";
import TransferType, { QR_IMAGE_SIZES, QR_IMAGE_TYPES } from "../../models/v1/TransferType.js";
import { checkImageExist } from "../../lib/helpers/images.js";
import { IMAGE_FORMATS, deleteImageFromS3, uploadImageToS3 } from "../../lib/files/image-upload.js";


const uploadTransferTypeImages = async (transferTypeId, files) => {
  const transferType = await TransferType.findById(transferTypeId);

  const { qrImage } = files;

  const imagePromises = [];

  // Generates image size promises for given type
  const imageSizePromises = (transferType, image, type, name = "") => {
    const imagePromises = [];
    const sizes = [
      QR_IMAGE_SIZES[type].ORIGINAL,
      QR_IMAGE_SIZES[type].DEFAULT,
      QR_IMAGE_SIZES[type].THUMBNAIL,
    ];
    sizes.forEach((size) => {
      const path = transferType.generateImagePath(type, size, name);
      imagePromises.push(uploadImageToS3({ image, path, size, format: IMAGE_FORMATS.PNG }));
    });
    return imagePromises;
  };

  // Welcome Image Mobile
  if (qrImage) {
    imagePromises.push(...imageSizePromises(transferType, qrImage, QR_IMAGE_TYPES.QR_IMAGE));
  }

  await Promise.all(imagePromises);
};


// Fetch all TransferType from the database
const fetchAllTransferType = async ({ ...reqBody }) => {
  try {
    const { page, perPage, sortBy, direction, searchQuery, showDeleted, userId, parentUserId, transferType } = reqBody;

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

    if (parentUserId) {
      filters.parentUserId = new mongoose.Types.ObjectId(parentUserId);
    }

    if (transferType) {
      filters.transferType = transferType
    }

    if (searchQuery) {
      const fields = ["userId", "type"];
      filters.$or = generateSearchFilters(searchQuery, fields);
    }

    const TransferTypes = await TransferType.aggregate([
      {
        $match: filters,
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

    if (TransferTypes?.length) {
      data.records = TransferTypes[0]?.paginatedResults || [];
      data.totalRecords = TransferTypes[0]?.totalRecords?.length ? TransferTypes[0]?.totalRecords[0].count : 0;
    }

    for (var i = 0; i < data.records.length; i++) {
      const existingTransferTypeRequest = await TransferType.findById(data.records[i]._id);
      const transferTypeImage = await checkImageExist(
        await existingTransferTypeRequest.getImageUrl(QR_IMAGE_TYPES.QR_IMAGE, QR_IMAGE_SIZES.QR_IMAGE.DEFAULT)
      );
      data.records[i].transferTypeImage = transferTypeImage
    }

    return data;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

/**
 * Fetch TransferType by Id from the database
 */
const fetchTransferTypeId = async (_id) => {
  try {
    const existingTransferType = await TransferType.findById(_id);
    if (!existingTransferType) {
      return [];
    }
    // QR Image
    const qrImage = await checkImageExist(
      await existingTransferType.getImageUrl(QR_IMAGE_TYPES.QR_IMAGE, QR_IMAGE_SIZES.QR_IMAGE.DEFAULT)
    );

    const data = {
      ...existingTransferType._doc,
      qrImage,
    };
    return data;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

/**
 * Create TransferType in the database
 */
const addTransferType = async ({ files, ...reqBody }) => {
  const {
    userId,
    type,
    name,
    minAmount,
    maxAmount,
    description,
    mobileNumber,
    accountHolderName,
    bankName,
    accountNumber,
    accountType,
    ifsc,
    platformName,
    platformDisplayName,
    platformAddress,
    depositLink,
    parentUserId,
    transferType
  } = reqBody;

  try {
    const newTransferTypeObj = {
      userId,
      type,
      name,
      minAmount,
      maxAmount,
      description,
      mobileNumber,
      accountHolderName,
      bankName,
      accountNumber,
      accountType,
      ifsc,
      platformName,
      platformDisplayName,
      platformAddress,
      depositLink,
      parentUserId,
      transferType
    };

    const newTransferType = await TransferType.create(newTransferTypeObj);
    await uploadTransferTypeImages(newTransferType._id, files);
    return newTransferType;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

/**
 * update TransferType in the database
 */
const modifyTransferType = async ({ files, ...reqBody }) => {
  try {
    const TransferTypes = await TransferType.findById(reqBody._id);

    if (!TransferTypes) {
      throw new Error("TransferType not found.");
    }

    TransferTypes.userId = reqBody.userId;
    TransferTypes.type = reqBody.type;
    TransferTypes.name = reqBody.name;
    TransferTypes.minAmount = reqBody.minAmount;
    TransferTypes.maxAmount = reqBody.maxAmount;
    TransferTypes.description = reqBody.description;
    TransferTypes.mobileNumber = reqBody.mobileNumber;
    TransferTypes.accountHolderName = reqBody.accountHolderName;
    TransferTypes.bankName = reqBody.bankName;
    TransferTypes.accountNumber = reqBody.accountNumber;
    TransferTypes.accountType = reqBody.accountType;
    TransferTypes.ifsc = reqBody.ifsc;
    TransferTypes.platformName = reqBody.platformName;
    TransferTypes.platformDisplayName = reqBody.platformDisplayName;
    TransferTypes.platformAddress = reqBody.platformAddress;
    TransferTypes.depositLink = reqBody.depositLink;
    TransferTypes.isActive = reqBody.isActive;
    TransferTypes.parentUserId = reqBody.parentUserId;
    TransferTypes.transferType = reqBody.transferType;

    await TransferTypes.save();
    await uploadTransferTypeImages(TransferTypes._id, files);
    return TransferTypes;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

/**
 * delete TransferType in the database
 */
const removeTransferType = async (_id) => {
  try {
    const TransferTypes = await TransferType.findById(_id);

    await TransferTypes.softDelete();

    return TransferTypes;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

/**
 * Withdraw Group status modify
 */
const transferTypeStatusModify = async ({ _id, fieldName, status }) => {
  try {
    const TransferTypes = await TransferType.findById(_id);

    TransferTypes[fieldName] = status;
    await TransferTypes.save();

    return TransferTypes;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

export default {
  fetchAllTransferType,
  fetchTransferTypeId,
  addTransferType,
  modifyTransferType,
  removeTransferType,
  transferTypeStatusModify,
};
