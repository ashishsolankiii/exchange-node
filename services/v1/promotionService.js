import ErrorResponse from "../../lib/error-handling/error-response.js";
import { generatePaginationQueries, generateSearchFilters } from "../../lib/helpers/pipeline.js";
import Currency from "../../models/v1/Currency.js";
import Promotion from "../../models/v1/Promotion.js";
import mongoose from "mongoose";
import User from "../../models/v1/User.js";

// Fetch all Promotion from the database
const fetchAllPromotion = async ({ page, perPage, sortBy, direction, showDeleted, searchQuery, userId }) => {
  try {
    const sortDirection = direction === "asc" ? 1 : -1;

    const paginationQueries = generatePaginationQueries(page, perPage);

    const filters = {
      isDeleted: showDeleted,
    };

    if (userId) {
      filters.userId = new mongoose.Types.ObjectId(userId);
    }

    if (searchQuery) {
      const fields = ["title"];
      filters.$or = generateSearchFilters(searchQuery, fields);
    }

    const promotion = await Promotion.aggregate([
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

    if (promotion?.length) {
      data.records = promotion[0]?.paginatedResults || [];
      data.totalRecords = promotion[0]?.totalRecords?.length ? promotion[0]?.totalRecords[0].count : 0;
    }

    return data;
  } catch (e) {
    throw new Error(e.message);
  }
};

/**
 * Fetch Promotion by Id from the database
 */
const fetchPromotionId = async (_id) => {
  try {
    const promotion = await Promotion.findOne({ _id: _id, isDeleted: false });

    if (!promotion) {
      throw new Error("Promotion not found.");
    }

    return promotion;
  } catch (e) {
    throw new Error(e);
  }
};

/**
 * create Promotion in the database
 */
const addPromotion = async ({ title, description, rules, termsConditions, promotionType, userId }) => {
  try {
    const newPromotionObj = { title, description, rules, termsConditions, promotionType, userId }
    const newPromotion = await Promotion.create(newPromotionObj);

    return newPromotion;
  } catch (e) {
    throw new Error(e);
  }
};

/**
 * update Promotion in the database
 */
const modifyPromotion = async ({ _id, title, description, rules, termsConditions, promotionType, userId }) => {
  try {
    const promotion = await Promotion.findOne({ _id: _id, isDeleted: false });

    if (!promotion) {
      throw new Error("Promotion not found.");
    }

    promotion.title = title;
    promotion.description = description;
    promotion.rules = rules;
    promotion.termsConditions = termsConditions;
    promotion.promotionType = promotionType;
    promotion.userId = userId;

    await promotion.save();

    return promotion;
  } catch (e) {
    throw new Error(e.message);
  }
};

/**
 * delete Promotion in the database
 */
const removePromotion = async (_id) => {
  try {
    const promotion = await Promotion.findById(_id);

    if (!promotion) {
      throw new Error("Promotion not found.");
    }

    await promotion.softDelete();

    return promotion;
  } catch (e) {
    throw new Error(e.message);
  }
};

const promotionStatusModify = async ({ _id, fieldName, status }) => {
  try {
    const promotion = await Promotion.findById(_id);

    promotion[fieldName] = status;
    await promotion.save();

    return promotion;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

const allPromotion = async ({ ...reqBody }) => {
  try {
    const { countryName, domainUrl } = reqBody;

    let currencyId = null;
    const regex = new RegExp(`^${countryName}$`, "i");
    let currency = await Currency.findOne({ countryName: { $regex: regex } }).select("_id");
    if (!currency) {
      currency = await Currency.findOne({ name: { $regex: "inr" } }).select("_id");
      if (!currency) {
        return {};
      }
    }
    currencyId = currency._id;

    const superAdmin = await User.findOne({ currencyId: currencyId, domainUrl: domainUrl }).select("_id");
    if (!superAdmin) {
      return {};
    }
    let existingPromotion = await Promotion.find({ isActive: true, isDeleted: false, userId: superAdmin._id });
    return existingPromotion;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

export default {
  fetchAllPromotion,
  fetchPromotionId,
  addPromotion,
  modifyPromotion,
  removePromotion,
  promotionStatusModify,
  allPromotion
};
