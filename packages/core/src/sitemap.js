/**
 *
 * **/

const fs = require("fs");
const path = require("path");
const globby = require("globby");

function getPages() {
  const fileObj = {};

  const walkSync = (dir) => {
    // Get all files of the current directory & iterate over them
    const files = fs.readdirSync(dir);
    files.forEach((file) => {
      // Construct whole file-path & retrieve file's stats
      const filePath = `${dir}${file}`;
      const fileStat = fs.statSync(filePath);

      if (fileStat.isDirectory()) {
        // Recurse one folder deeper
        walkSync(`${filePath}/`);
      } else {
        console.log(filePath);

        // Construct this file's pathname excluding the "pages" folder & its extension
        const cleanFileName = filePath
          .substring(0, filePath.lastIndexOf("."))
          .replace("pages/", "")
          .replace("index", "");

        // Add this file to `fileObj`
        fileObj[`/${cleanFileName}`] = {
          page: `/${cleanFileName}`,
          lastModified: fileStat.mtime,
        };
      }
    });
  };

  // Start recursion to fill `fileObj`
  walkSync("pages/");

  return fileObj;
}

function buildSitemapXml(fields) {
  const content = fields
    .map((fieldData) => {
      const field = Object.entries(fieldData).map(([key, value]) => {
        if (!value) return "";
        return `<${key}>${value}</${key}>`;
      });

      return `<url>${field.join("")}</url>\n`;
    })
    .join("");

  return withXMLTemplate(content);
}

function withXMLTemplate(content) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">\n${content}</urlset>`;
}

// console.table(getPages());
(async () => {
  const pages = await globby([
    "pages/**/*.js", // get all static pages
    "!pages/**/[*.js", // ignore dynamic routes as those won't work
    "!pages/_*.js", // ignore nextjs components
    "!pages/api", // ignore api routes as those aren't actual pages
  ]);

  console.log(pages);
})();
