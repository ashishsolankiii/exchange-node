import ErrorResponse from "../../lib/error-handling/error-response.js";
import { generatePaginationQueries, generateSearchFilters } from "../../lib/helpers/pipeline.js";
import ApiProvider from "../../models/v1/ApiProvider.js";

// Fetch all apiProvider from the database
const fetchAllApiProvider = async ({ ...reqBody }) => {
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
      filters.isActive = [true, "true"].includes(status);
    }

    if (searchQuery) {
      const fields = ["name", "sportId"];
      filters.$or = generateSearchFilters(searchQuery, fields);
    }

    const apiProvider = await ApiProvider.aggregate([
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

    if (apiProvider?.length) {
      data.records = apiProvider[0]?.paginatedResults || [];
      data.totalRecords = apiProvider[0]?.totalRecords?.length ? apiProvider[0]?.totalRecords[0].count : 0;
    }
    return data;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

/**
 * Fetch apiProvider by Id from the database
 */
const fetchApiProviderId = async (_id) => {
  try {
    return await ApiProvider.findById(_id);
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

/**
 * Create apiProvider in the database
 */
const addApiProvider = async ({ ...reqBody }) => {
  const {
    name,
    type,
    metaData
  } = reqBody;

  try {
    const existingApiProvider = await ApiProvider.findOne({ name: name });
    if (existingApiProvider) {
      throw new Error("ApiProvider already exists!");
    }

    const newApiProviderObj = {
      name,
      type,
      metaData
    };

    const newApiProvider = await ApiProvider.create(newApiProviderObj);

    return newApiProvider;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

/**
 * update apiProvider in the database
 */
const modifyApiProvider = async ({ ...reqBody }) => {
  try {
    const apiProvider = await ApiProvider.findById(reqBody._id);

    if (!apiProvider) {
      throw new Error("ApiProvider not found.");
    }
    apiProvider.name = reqBody.name;
    apiProvider.type = reqBody.type;
    apiProvider.metaData = reqBody.metaData;
    await apiProvider.save();

    return apiProvider;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

/**
 * delete apiProvider in the database
 */
const removeApiProvider = async (_id) => {
  try {
    const apiProvider = await ApiProvider.findById(_id);

    await apiProvider.softDelete();

    return apiProvider;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};
const apiProviderStatusModify = async ({ _id, fieldName, status }) => {
  try {
    const apiProvider = await ApiProvider.findById(_id);

    apiProvider[fieldName] = status;
    await apiProvider.save();

    return apiProvider;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

export default {
  fetchAllApiProvider,
  fetchApiProviderId,
  addApiProvider,
  modifyApiProvider,
  removeApiProvider,
  apiProviderStatusModify,
};
