import ErrorResponse from "../../lib/error-handling/error-response.js";
import { uploadImageToS3 } from "../../lib/files/image-upload.js";
import { generatePaginationQueries, generateSearchFilters } from "../../lib/helpers/pipeline.js";
import Casino, { CASINO_IMAGE_SIZES, CASINO_IMAGE_TYPES } from "../../models/v1/Casino.js";

const uploadCasinoImages = async (casinoId, files) => {
  const casino = await Casino.findById(casinoId);

  const { casinoImage } = files;

  const imagePromises = [];

  // Generates image size promises for given type
  const imageSizePromises = (casino, image, type, name = "") => {
    const imagePromises = [];
    const sizes = [
      CASINO_IMAGE_SIZES[type].ORIGINAL,
      CASINO_IMAGE_SIZES[type].DEFAULT,
      CASINO_IMAGE_SIZES[type].THUMBNAIL,
    ];
    sizes.forEach((size) => {
      const path = casino.generateImagePath(type, size, name);
      imagePromises.push(uploadImageToS3({ image, path, size }));
    });
    return imagePromises;
  };

  // Casino Image
  if (casinoImage) {
    imagePromises.push(...imageSizePromises(casino, casinoImage, CASINO_IMAGE_TYPES.CASINO_IMAGE));
  }

  await Promise.all(imagePromises);
};

// Fetch all casino from the database
const fetchAllCasino = async ({ ...reqBody }) => {
  try {
    const { page, perPage, sortBy, direction, searchQuery, showDeleted, status, casinoType } = reqBody;

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

    if (casinoType !== null) {
      filters.casinoType = casinoType
    }

    if (searchQuery) {
      const fields = ["name"];
      filters.$or = generateSearchFilters(searchQuery, fields);
    }

    const casino = await Casino.aggregate([
      {
        $match: filters,
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

    if (casino?.length) {
      data.records = casino[0]?.paginatedResults || [];
      data.totalRecords = casino[0]?.totalRecords?.length ? casino[0]?.totalRecords[0].count : 0;
    }

    for (var i = 0; i < data.records.length; i++) {
      const existingCasino = await Casino.findById(data.records[i]._id);
      data.records[i].image = await existingCasino.getImageUrl(
        CASINO_IMAGE_TYPES.CASINO_IMAGE,
        CASINO_IMAGE_SIZES.CASINO_IMAGE.DEFAULT
      );
    }

    return data;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

/**
 * Fetch casino by Id from the database
 */
const fetchCasinoId = async (_id) => {
  try {
    let existingCasino = await Casino.findById(_id);
    let image = await existingCasino.getImageUrl(
      CASINO_IMAGE_TYPES.CASINO_IMAGE,
      CASINO_IMAGE_SIZES.CASINO_IMAGE.DEFAULT
    );

    const data = {
      ...existingCasino._doc,
      image,
    };

    return data;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

/**
 * Create casino in the database
 */
const addCasino = async ({ files, ...reqBody }) => {
  const { name, casinoType } = reqBody;

  try {
    const existingName = await Casino.findOne({ name });
    if (existingName) {
      throw new Error("Casino with same name name already exists.");
    }

    const newCasinoObj = {
      name,
      casinoType
    };

    const newCasino = await Casino.create(newCasinoObj);

    await uploadCasinoImages(newCasino._id, files);

    return newCasino;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

/**
 * update casino in the database
 */
const modifyCasino = async ({ files, ...reqBody }) => {
  try {
    const casino = await Casino.findById(reqBody._id);
    if (!casino) {
      throw new Error("Casino not found.");
    }

    const existingName = await Casino.findOne({ name: reqBody.name, _id: { $ne: reqBody._id } });
    if (existingName) {
      throw new Error("Casino with same name already exists.");
    }

    casino.name = reqBody.name;
    casino.casinoType = reqBody.casinoType;

    await casino.save();
    await uploadCasinoImages(reqBody._id, files);
    return casino;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

/**
 * delete casino in the database
 */
const removeCasino = async (_id) => {
  try {
    const casino = await Casino.findById(_id);

    await casino.softDelete();

    return casino;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

const casinoStatusModify = async ({ _id, fieldName, status }) => {
  try {
    const casino = await Casino.findById(_id);

    casino[fieldName] = status;
    await casino.save();

    return casino;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

/**
 * Fetch all casino from the database
 */
const allCasino = async () => {
  try {
    let existingCasino = await Casino.find({ isVisible: true, isDeleted: false });
    let data = [];
    for (var i = 0; i < existingCasino.length; i++) {
      const fetchExistingCasino = await Casino.findById(existingCasino[i]._id);
      let image = await fetchExistingCasino.getImageUrl(
        CASINO_IMAGE_TYPES.CASINO_IMAGE,
        CASINO_IMAGE_SIZES.CASINO_IMAGE.DEFAULT
      );

      data.push({
        ...existingCasino[i]._doc,
        image,
      });
    }

    return data;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

export default {
  fetchAllCasino,
  fetchCasinoId,
  addCasino,
  modifyCasino,
  removeCasino,
  casinoStatusModify,
  allCasino,
};
