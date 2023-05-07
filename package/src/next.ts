// @ts-nocheck
/**
 *
 * **/

import path from "path";
import { BASE_PATH } from "./constants";

import { generateSlug, parseTemplate } from "./formatters";
import { crawlForFiles } from "./fs";

/**
 * Generate a valid Next.JS `getStaticPaths` object that is plug-and-play
 * @param {array|string} files name of the directory to crawl, or an array listing of an already crawled directory
 * @param {boolean} drafts whether or not to include items that are marked as `draft: true` in their front-matter
 * @returns a valid Next.JS `getStaticPaths` object
 */
export function generateStaticPaths(files = null, drafts = false) {
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
export function paginateStaticPaths(pagination) {
  let paths = [];

  // perform basic validation of the `pagination` object
  if (pagination?.totalPages && pagination?.template && pagination?.baseHref) {
    // parse each of the items
    for (let i = 2; i <= pagination.totalPages; i++) {
      paths.push(
        parseTemplate(pagination.template, {
          baseHref: pagination.baseHref,
          id: i,
        }),
      );
    }
  }

  return { paths, fallback: true };
}
