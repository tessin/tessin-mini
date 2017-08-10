// required to be able to require modules built with webpack from within Node.js server environment
require("babel-polyfill");

var path = require("path");
var fs = require("fs");
var rimraf = require("rimraf");
var express = require("express");
var webpackDevMiddleware = require("webpack-dev-middleware");
var webpackHotMiddleware = require("webpack-hot-middleware");
var webpack = require("webpack");
var webpackConfig = require("./webpack/webpack.config");

var app = express();

const env = "development";
const optimize = env === "production";

// client
let compilerConfig, compiler, compilerStats;
if (true) {
  compilerConfig = webpackConfig({
    env,
    ssr: false,
    optimize
  });
  compiler = webpack(compilerConfig);

  compilerStats = new Promise(resolve => {
    let context = { stats: null };
    compiler.plugin("done", stats => {
      const resolveContext = !context.stats;
      context.stats = stats.toJson({ entrypoints: true });
      if (resolveContext) {
        resolve(context);
      }
    });
  });

  app.use(
    webpackDevMiddleware(compiler, {
      noInfo: true, // a lot less clutter in console
      publicPath: compilerConfig.output.publicPath
    })
  );

  app.use(webpackHotMiddleware(compiler));
}

// server
let compilerServerConfig, compilerServer, compilerServerRenderer;
if (true) {
  compilerServerConfig = webpackConfig({
    env,
    ssr: true,
    optimize
  });
  compilerServer = webpack(compilerServerConfig);

  compilerServer.plugin("compilation", compilation => {
    if (compilation.compiler.isChild()) return;

    console.log("webpack server-side building...");
    console.time("webpack server-side building");
  });

  rimraf.sync(path.normalize(path.resolve(__dirname, `build/server`)));

  compilerServerRenderer = new Promise(resolve => {
    let context = { render: null };
    compilerServer.watch({}, (err, stats) => {
      const resolveContext = !context.render;

      console.timeEnd("webpack server-side building");

      if (err) {
        console.error(
          "Error: an error occured while compiling the server-side bundle"
        );
        console.error("----------------");
        console.error(err);
        console.error("----------------");
        return;
      }

      if (stats.hasErrors()) {
        console.error(
          "Error: an error occured while compiling the server-side bundle"
        );
        const { errors } = stats.toJson("errors-only");
        for (const error of errors) {
          console.error("----------------");
          console.error(error);
        }
        console.error("----------------");
        return;
      }

      const { assetsByChunkName } = stats.toJson({ chunks: true });

      const fn = path.normalize(
        path.resolve(__dirname, `build/server/${assetsByChunkName.ssr}`)
      );

      try {
        var serverRenderer = require(fn);

        const fs = ["render", "renderError"];
        for (const f of fs) {
          if (typeof serverRenderer[f] !== "function") {
            console.warn(
              `Warning: server-side bundle does not export a '${f}' function`
            );
            continue;
          }
          context[f] = serverRenderer[f];
        }

        context.requireError = null;
      } catch (requireError) {
        console.error(`Error: cannot load file '${fn}'`);
        console.error("----------------");
        console.error(requireError);
        console.error("----------------");
        context.requireError = requireError;
        return;
      } finally {
        if (context.fn) {
          delete require.cache[fn];
          fs.unlink(context.fn, err => err && console.warn(err));
        }
        context.fn = fn;
      }

      if (resolveContext) {
        resolve(context);
      }
    });
  });

  app.get("*", (req, res) => {
    console.log("<<<<", req.url);

    compilerStats.then(({ stats }) => {
      compilerServerRenderer.then(({ render, renderError }) => {
        render(req, res, { stats }).catch(reason => {
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
    });
  });
}

function errorToJSON(reason) {
  const plainObject = {};
  const keys = Object.getOwnPropertyNames(reason);
  keys.sort();
  for (const k of keys) {
    plainObject[k] = reason[k];
  }
  if (reason instanceof Error) {
    if (typeof plainObject.stack === "string") {
      plainObject.stack = plainObject.stack.split(/\r?\n/).map(ln => ln.trim());
    }
  }
  return plainObject;
}

app.listen(3000, function() {
  console.log("Listening on port 3000!");
});
