/**
 *
 * **/

const path = require("path");
const { BASE_PATH } = require("./constants");

const { generateSlug, parseTemplate } = require("./formatters");
const { crawlForFiles } = require("./fs");

/**
 * Generate a valid Next.JS `getStaticPaths` object that is plug-and-play
 * @param {array|string} files name of the directory to crawl, or an array listing of an already crawled directory
 * @param {boolean} drafts whether or not to include items that are marked as `draft: true` in their front-matter
 * @returns a valid Next.JS `getStaticPaths` object
 */
function generateStaticPaths(files = null, drafts = false) {
  const paths = [];

  // when 'files' is a string => auto crawl that directory
  if (typeof files === "string")
    files = crawlForFiles(path.resolve(BASE_PATH, files));

  if (!files || !Array.isArray(files)) return paths;

  for (let i = 0; i < files.length; i++) {
    const item = {
      params: {
        slug: generateSlug(files[i]?.slug || files[i]),
      },
    };

    // add the `item` to the paths listing (handling desired draft states)
    if (
      drafts === true ||
      (files[i]?.draft !== false && files[i]?.meta?.draft !== false)
    )
      paths.push(item);
  }

  return {
    paths: paths,
    fallback: false,
  };
}

/**
 * Generate a valid Next.JS `getStaticPaths` object for paginated pages that is plug-and-play
 * @param {object} pagination object computed from `computePagination`
 * @returns a valid Next.JS `getStaticPaths` object
 */
function paginateStaticPaths(pagination) {
  let paths = [];

  for (let i = 2; i <= pagination.totalPages; i++) {
    paths.push(
      parseTemplate(pagination.template, {
        baseHref: pagination.baseHref,
        id: i,
      }),
    );
  }

  return { paths, fallback: true };
}

module.exports = {
  generateStaticPaths,
  paginateStaticPaths,
};
