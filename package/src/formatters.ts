// @ts-nocheck
/**
 *
 * **/

import { DateTime } from "luxon";

import { CONFIG_FILE_NAME } from "./constants";

/**
 * Parse and return a `string` template
 * @param {string} template string to parse
 * @param {object} items keyed object of items to parse into the `template`
 * @returns fully parsed `template`
 */
export function parseTemplate(template, items) {
  template = template.toString() || "";

  for (const [key, value] of Object.entries(items))
    template = template.replace(`{{${key}}}`, value);

  return template;
}

/**
 * Determine a docs' primary date based on the standard priority order of: `date`, `updatedAt`, `createdAt`
 * @param {object} listing Object listing of the posts dates
 */
export function getDateByPriority({
  date = null,
  updatedAt = null,
  createdAt = null,
}) {
  if (date && !isNaN(new Date(date)).valueOf()) return date;
  else if (updatedAt && !isNaN(new Date(updatedAt)).valueOf()) return updatedAt;
  else if (createdAt && !isNaN(new Date(createdAt)).valueOf()) return createdAt;
  else return false;
}

/**
 * Sorts a listing of docs by their priority date
 * @param {array} docs array listing of parsed `doc` objects
 * @param {string} order `asc` or `desc` sort order
 * @returns sorted array
 */
export function sortByPriorityDate(docs, order = "desc") {
  return docs.sort(function (a, b) {
    if (order == "asc")
      return (
        dateToUnixTimestamp(getDateByPriority(a.meta)) -
        dateToUnixTimestamp(getDateByPriority(b.meta))
      );
    else
      return (
        dateToUnixTimestamp(getDateByPriority(b.meta)) -
        dateToUnixTimestamp(getDateByPriority(a.meta))
      );
  });
}

/**
 * Compute the required parameters used in pagination
 * @param {number} count total number of items to paginate
 * @param {number} page the current page of items to parse
 * @param {string} baseHref the base `href` used in creating routes
 * @param {string} template template string used for `href`
 * @param {number} perPage number of items desired per page
 * @returns `pagination` object ready to be used
 */
export function computePagination(
  count = 1,
  page = 1,
  baseHref = "",
  template = "{{baseHref}}/page/{{id}}",
  perPage = 9,
) {
  // parse and format the `page` (usually obtained via route `params`)
  page = parseInt(page || 1) || 1;
  if (!(page && typeof page === "number" && page >= 1)) return false;

  // construct the `pagination` data object
  const pagination = {
    count,
    page,
    perPage,
    totalPages: Math.ceil(count / perPage),
    baseHref,
    template,
  };

  // compute the `start` and `end` values used to `slice` an array
  pagination.start = page <= 1 ? 0 : (page - 1) * perPage;
  pagination.end = pagination.start + perPage;

  return pagination;
}

/**
 * Format and display the given date using the standard format
 * @param {string} date date to display in a common format
 * @param {string|null} format `DateTime` compatible date format
 * @returns formatted date string, ready for display
 */
export function displayDate(date, format = null) {
  const defaultDate = "MMM dd, yyyy";

  try {
    if (!format) format = defaultDate;
    // format = require(CONFIG_FILE_NAME)?.config?.dateFormat || defaultDate;
  } catch (e) {
    format = defaultDate;
  }

  return DateTime.fromISO(new Date(date).toISOString())
    .toFormat(format)
    .toString();
}

/**
 * Convert any string date into a unix timestamp
 * @param {string} date
 * @returns int of the unix timestamp
 */
export function dateToUnixTimestamp(date) {
  return DateTime.fromISO(new Date(date).toISOString()).toUnixInteger();
}
