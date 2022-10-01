/**
 *
 * **/

import fs from "fs";
import path from "path";

import { BASE_PATH } from "./constants";
import { generateSlug } from "./formatters";

/**
 * Locate a file's path based on it's slug
 * @param {object} options
 * @returns `string` path of the located file
 */
export function locateFilePath(options) {
  // options structure
  // const struct = {
  // 	// either a path or a slug is required, but not both. Path will supersede the slug, since it is faster
  // 	path: "",
  // 	slug: "",
  // 	basePath: null, // base directory, inside of BASE_PATH
  // };

  // convert the `options` into an object
  if (typeof options === "string") options = { slug: options };
  if (!options?.slug) return false;

  // construct the base working path to search
  if (!options?.basePath) options.basePath = path.join(BASE_PATH);
  //   options.basePath = path.join(BASE_PATH, options.basePath);

  // try file based routing first, since it's the fastest
  if (
    options?.slug &&
    fs.existsSync(path.join(options.basePath, `${options?.slug}.md`))
  )
    return path.join(options.basePath, `${options?.slug}.md`);

  // when not found in file based routing, begin crawling...
  const files = crawlForFiles(options.basePath, true) || [];

  const file =
    files?.filter((item) => {
      if (!item) return false;

      // TODO: I think there are more ways to accept the slugs here...

      if (item?.slug && options?.slug && item.slug === options.slug)
        return item;
      else if (
        generateSlug(item) === (options?.slug || generateSlug(options?.path))
      )
        return item;

      return false;
    })[0] || false;

  if (file && fs.existsSync(path.join(file))) return path.join(file);
  else return false;
}

/**
 * Crawl a given directory to locate all of the files in in
 * @param {string} dirName String name of the directory to crawl
 * @param {boolean} autoParseFile
 * @param {boolean} drafts
 * @returns array of file paths, and when `autoParseFile` is true returns an array of file paths with their file parsed
 */
export function crawlForFiles(
  dirName = "",
  autoParseFile = true,
  drafts = false
) {
  let files = [];

  // only resolve in the `BASE_PATH` directory
  if (!dirName?.startsWith(path.resolve(BASE_PATH)))
    dirName = path.resolve(path.join(BASE_PATH, dirName));

  try {
    // ensure the root `dirName` actually exists
    if (!fs.existsSync(dirName)) return false;

    // read in the desired directory
    let listing = fs.readdirSync(dirName, { withFileTypes: true });

    // crawl the search directory for more files
    for (let i = 0; i < listing.length; i++) {
      const pointer = path.join(dirName, listing[i]?.name);

      // prevent crawling files/dirs with names starting with "_"
      if (listing[i]?.name?.startsWith("_")) continue;

      // recursively crawl child directories
      if (listing[i].isDirectory()) {
        files.push(...crawlForFiles(pointer, autoParseFile));
      } else if (listing[i].isFile()) {
        // TODO: add checking to only search for the given file extensions
        files.push(pointer);
      }
    }
  } catch (err) {
    console.warn("[error] crawlForFiles:", err);
  }

  return files;
}
