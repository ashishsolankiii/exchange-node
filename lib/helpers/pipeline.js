/**
 * This file contains utility methods that help ease
 * the process of building MongoDB aggregation pipelines.
 * @module pipeline
 */

/**
 * Generates pagination queries based on the specified page and items per page.
 * @param {number|null} page - The page number. If null, pagination queries will be empty.
 * @param {number} [perPage=10] - The number of items per page.
 * @returns {Array<Object>} An array of pagination queries.
 */
export const generatePaginationQueries = (page = null, perPage = 10) => {
  let paginationQueries = [];

  if (page) {
    const limit = perPage;
    const offset = page * perPage - perPage;

    paginationQueries = [{ $skip: offset }, { $limit: limit }];
  }

  return paginationQueries;
};

/**
 * Generates search filters based on the search query and fields.
 * @param {string} searchQuery - The search query to match.
 * @param {Array<string>} fields - The fields to search in.
 * @returns {Array<Object>} An array of search filters.
 */
export const generateSearchFilters = (searchQuery, fields) => {
  const searchFilters = fields.map((field) => {
    return {
      [field]: { $regex: `.*${searchQuery}.*`, $options: "i" },
    };
  });

  return searchFilters;
};

export const generateSelectFields = (fields) => {
  let data = {};

  fields = fields.split(",");
  for (var i = 0; i < fields.length; i++) {
    data[fields[i]] = 1;
  }

  return data;
};
