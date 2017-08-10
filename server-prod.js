// required to be able to require modules built with webpack from within Node.js server environment
require("babel-polyfill");

const path = require("path");
const fs = require("fs");
const express = require("express");

//
// INIT
// ================

const clientManifest = JSON.parse(
  fs.readFileSync("build/client/manifest.json")
);
const serverManifest = JSON.parse(
  fs.readFileSync("build/server/manifest.json")
);

const serverFn = `./build/server/${serverManifest.assetsByChunkName.ssr}`;
const { render, renderError } = require(serverFn);

const app = express();

// prefer gzipped content, if available (over 3G this changes the load time from 7s to 1.5s)
app.get("*.js", (req, res, next) => {
  const gzfn = `build/client/${path.basename(req.url)}.gz`;
  fs.access(gzfn, err => {
    if (err) {
      next();
      return;
    }
    req.url = `${req.url}.gz`; // rewrite to serve gzipped content
    res.set("Content-Encoding", "gzip");
    next();
  });
});

app.use("/static", express.static("build/client"));

app.get("*", (req, res) => {
  render(req, res, { stats: clientManifest }).catch(reason => {
    renderError(req, res, { reason }).catch(renderErrorError => {
      const err = {
        description: `An error occured in the 'renderError' function`,
        error: errorToJSON(renderErrorError)
      };

      res.status(500);
      res.header("Content-Type", "application/json");
      res.send(JSON.stringify(err, null, 2));
    });
  });
});

app.listen(3000, function() {
  console.log("Listening on port 3000!");
});
