/**
 *
 * **/

const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");
const { DateTime } = require("luxon");

// const { BASE_PATH } = require("./constants");
const { crawlForFiles, locateFilePath } = require("./fs");
const { getDateByPriority, generateSlug } = require("./formatters");

/**
 * Retrieve a markdown document from the `content` directory, parsed and ready to go
 * @param {string} slug slug of the file name to locate
 * @param {string} basePath (optional) folder path inside of the `content` folder to search for the given slug
 * @returns
 */
async function getDocBySlug(slug, basePath = "") {
  try {
    // remove file extension from the slug
    if (!slug || typeof slug !== "string")
      throw Error(`Slug is not a string: ${slug}`);

    slug = slug?.replace(/.md|.mdx|.html|.html$/, "") || false;
    if (!slug) throw Error("No slug provided");

    // locate the document based on its `slug`
    const filePath = locateFilePath({ slug, basePath });
    if (!filePath) return false;

    // load the doc and return it as requested
    const doc = await loadAndParseDoc(filePath);

    // compute the href for the doc
    const href = computeHrefForDoc(doc, basePath);
    doc.href = href;

    if (
      !doc ||
      (doc?.meta?.draft === true && process.env?.NODE_ENV === "production")
    )
      return false;
    return doc;
  } catch (err) {
    console.warn("Unable to locate document:", slug);
    console.warn(err);
  }
  return false;
}

/**
 * Compute the absolute href of a given doc
 * @param {object} doc full doc or doc.meta data object
 * @param {string} basePath string of the base bath used to locate the doc
 * @returns string of the absolute href for the given doc
 */
function computeHrefForDoc(doc, basePath) {
  //
  let href = doc.path.substring(doc.path.indexOf(basePath));

  //
  href = href.substring(0, href.indexOf(doc.slug));

  //
  href = `/${href}${doc.slug}`;

  return href;
}

/**
 * Retrieve a markdown document's front matter meta, parsed and ready to go
 * @param {string} slug slug of the file name to locate
 * @param {string} basePath (optional) folder path inside of the `content` folder to search for the given slug
 * @returns
 */
async function getDocMetaBySlug(slug, basePath = "") {
  try {
    const doc = await getDocBySlug(slug, basePath);
    if (!doc || typeof doc !== "object") throw Error("Unable to locate doc");

    // clear the content
    doc.content = "";

    return doc || false;
  } catch (err) {
    console.warn("Unable to locate document:", slug);
    console.warn(err);
  }
  return false;
}

/**
 * Retrieve a listing of markdown documents from the given `searchPath` directory, parsed and ready to go
 * @param {string} searchPath base relative path of documents to locate
 * @returns `array` of documents located inside the `searchPath`
 */
async function getDocsByPath(searchPath = "", filter = null) {
  try {
    // crawl the `searchPath` for all the documents
    const files = crawlForFiles(searchPath, true);

    let docs = [];

    // load and parse each of the located docs
    for (let i = 0; i < files.length; i++) {
      // attempt to load the doc's meta info
      try {
        const doc = await loadAndParseDoc(files[i], true);

        if (doc) {
          if (
            doc?.meta?.draft !== true ||
            process.env?.NODE_ENV !== "production"
          )
            docs.push(doc);
        }
      } catch (err) {
        console.warn("Unable to parse doc:", files[i]);
      }
    }

    if (!docs || !docs?.length) return false;

    // sort the docs by their dates (making the newest first)
    docs.sort(function (a, b) {
      // determine the sorting date by their priority level
      let aDate = getDateByPriority(a.meta);
      let bDate = getDateByPriority(b.meta);

      // sort the items
      if (aDate < bDate) return 1;
      else if (aDate > bDate) return -1;
      return 0;
    });

    // docs.reverse();

    // pre filter the docs before returning
    if (filter && typeof filter === "object") docs = filterDocs(docs, filter);

    return docs;
  } catch (err) {
    console.warn("Unable to locate path:", path);
    console.warn(err);
  }
  return false;
}

/**
 * Load and parse a the file from the given `filePath`, making it ready for the frontend.
 * @param {string} filePath path to the file to load and parse
 * @param {boolean} metaOnly whether or not to only parse/return the meta data
 * @returns
 */
async function loadAndParseDoc(filePath, metaOnly = false) {
  try {
    // read the file from the local file system
    const stats = fs.statSync(path.join(filePath));
    let file = fs.readFileSync(path.join(filePath), "utf-8");
    file = matter(file);

    // extract the desired attributes and values
    // construct the parsed 'doc' to return
    const doc = {
      path: filePath,
      href: null,
      slug: null,
      meta: file?.data || {},
      content: metaOnly ? null : file?.content,
    };

    // enable the user to override the `updatedAt` date from the front matter
    doc.meta.createdAt = DateTime.fromJSDate(stats.birthtime).toString();
    if (doc.meta?.date) doc.meta.date = new Date(doc.meta.date).toISOString();

    // parse and set the `updatedAt` date
    if (!doc?.meta?.updatedAt && doc?.meta?.updatedAt !== false)
      doc.meta.updatedAt = DateTime.fromJSDate(stats.mtime).toString();
    else if (doc?.meta?.updatedAt !== "") {
      let tmp = new Date(doc?.meta?.updatedAt);

      if (tmp instanceof Date && !isNaN(tmp).valueOf()) {
        // console.log("valid and parse");
        doc.updatedAt = DateTime.fromISO(tmp.toISOString()).toString();
      }
      // else invalid date and keep it as the updated loaded from the file
    }

    // TODO: generate the SEO details?

    // TODO: generate the date stamps to be used in the file

    // generate and store the slug
    // TODO: handle user specified slugs in the front matter
    doc.slug = generateSlug(doc);
    // doc.meta.slug = doc.slug;
    // doc.meta.path = doc.path;

    // convert the `tags` to an array
    if (doc.meta?.tags && typeof doc.meta.tags === "string")
      doc.meta.tags = doc.meta.tags.split(",").map((item) => item.trim());

    // TODO: this does not parse MDX files, or actually check to make sure the file extension is .MD

    return doc;
  } catch (err) {
    console.warn("Unable to parse file");
    // throw err;
  }

  // default return
  return false;
}

/**
 * Filter a listing of documents by the provided `filter` criteria on the `doc.meta` data
 * @param {array} docs array of documents to be filtered
 * @param {object} filters criteria to filter by
 * @param {number} limit max number of filtered documents to return
 * @returns
 */
function filterDocs(docs, filters, limit = 0) {
  try {
    // parse each of the provided filters
    for (const [key, value] of Object.entries(filters)) {
      // do NOT parse arrays!
      if (Array.isArray(value)) return false;

      // filter the provided `docs` listing for the current working filter (aka `key`)
      docs = docs?.filter((item) => {
        // console.log(key);

        // TODO: allow nested parsing
        // while (typeof value === "object" && item[key] !== undefined) {
        //   // if (typeof value === "object") {
        //   console.log(value);
        //   console.log(item);
        //   item = item[key]
        //   // }
        // }

        // auto select the `meta` object from each document
        item = item?.meta;

        // check for exact match for the simple types of `boolean` and `string`
        if (typeof value === "boolean" || typeof value === "string")
          return item?.[key] === value;
        // parse each of the comparison operators
        else if (typeof value === "object") {
          if (value?.eq) return item?.[key] === value.eq;
          else if (value?.neq) return item?.[key] !== value.neq;
          else if (value?.gt) return item?.[key] > value.gt;
          else if (value?.gte) return item?.[key] >= value.gte;
          else if (value?.lt) return item?.[key] < value.lt;
          else if (value?.lte) return item?.[key] <= value.lte;
          else if (value?.startsWith)
            return item?.[key]?.startsWith(value.startsWith.toString());
          else if (value?.endsWith)
            return item?.[key]?.endsWith(value.endsWith.toString());
          else if (value?.contains?.toString())
            return item?.[key]?.indexOf(value.contains.toString()) >= 0;
          else return false;
        }
      });
    }

    // return false when no documents were found
    if (!docs || !docs?.length) return false;

    // return the final filtered (and limited) results
    return limit ? docs?.slice(0, limit) : docs;
  } catch (err) {
    console.warn("Unable to filter documents:", filters);
    console.warn(err);
  }
  return false;
}

module.exports = {
  filterDocs,
  getDocBySlug,
  getDocMetaBySlug,
  getDocsByPath,
  loadAndParseDoc,
};
