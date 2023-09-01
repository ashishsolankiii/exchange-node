import { generatePaginationQueries, generateSearchFilters } from "../../lib/helpers/pipeline.js";
import Currency from "../../models/v1/Currency.js";

// Fetch all Currency from the database
const fetchAllCurrency = async ({ page, perPage, sortBy, direction, showDeleted, searchQuery }) => {
  try {
    const sortDirection = direction === "asc" ? 1 : -1;

    const paginationQueries = generatePaginationQueries(page, perPage);

    const filters = {
      isDeleted: showDeleted,
    };

    if (searchQuery) {
      const fields = ["name"];
      filters.$or = generateSearchFilters(searchQuery, fields);
    }

    const currency = await Currency.aggregate([
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

    if (currency?.length) {
      data.records = currency[0]?.paginatedResults || [];
      data.totalRecords = currency[0]?.totalRecords?.length ? currency[0]?.totalRecords[0].count : 0;
    }

    return data;
  } catch (e) {
    throw new Error(e.message);
  }
};

/**
 * Fetch Currency by Id from the database
 */
const fetchCurrencyId = async (_id) => {
  try {
    const currency = await Currency.findById(_id);

    return currency;
  } catch (e) {
    throw new Error(e);
  }
};

/**
 * create Currency in the database
 */
const addCurrency = async ({ name, multiplier, countryName }) => {
  try {
    const existingCurrency = await Currency.findOne({ name: name });
    if (existingCurrency) {
      throw new Error("Name already exists!");
    }

    const newCurrencyObj = {
      name: name.toLowerCase(),
      multiplier: multiplier,
      countryName: countryName
    };
    const newcurrency = await Currency.create(newCurrencyObj);

    return newcurrency;
  } catch (e) {
    throw new Error(e);
  }
};

/**
 * update Currency in the database
 */
const modifyCurrency = async ({ _id, name, multiplier, countryName }) => {
  try {
    const existing = await Currency.findOne({ name: name.toLowerCase(), _id: { $ne: _id } });
    if (existing) {
      throw new Error("Name already exists!");
    }

    const currency = await Currency.findById(_id);

    currency.name = name.toLowerCase();
    currency.multiplier = multiplier;
    currency.countryName = countryName;
    await currency.save();

    return currency;
  } catch (e) {
    throw new Error(e.message);
  }
};

/**
 * delete Currency in the database
 */
const removeCurrency = async (_id) => {
  try {
    const currency = await Currency.findById(_id);

    await currency.softDelete();

    return currency;
  } catch (e) {
    throw new Error(e.message);
  }
};

export default {
  fetchAllCurrency,
  fetchCurrencyId,
  addCurrency,
  modifyCurrency,
  removeCurrency,
};
