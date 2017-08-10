const path = require("path");

const DefinePlugin = require("webpack/lib/DefinePlugin");
const UglifyJsPlugin = require("webpack/lib/optimize/UglifyJsPlugin");
const CompressionPlugin = require("compression-webpack-plugin");
const CommonsChunkPlugin = require("webpack/lib/optimize/CommonsChunkPlugin");
const HotModuleReplacementPlugin = require("webpack/lib/HotModuleReplacementPlugin");
const NamedModulesPlugin = require("webpack/lib/NamedModulesPlugin");
const NoEmitOnErrorsPlugin = require("webpack/lib/NoEmitOnErrorsPlugin");
const ExtractTextPlugin = require("extract-text-webpack-plugin");

const ManifestPlugin = require("./ManifestPlugin");

module.exports = function({ env, ssr, optimize, hot }) {
  if (typeof env === "undefined") {
    env = process.env.NODE_ENV || "development";
  }
  if (env !== "production" && env !== "development") {
    console.warn(`unrecognized environment '${env}'`);
  }
  const isDevelopment = env !== "production";
  if (typeof ssr !== "boolean") {
    throw new TypeError("`ssr` should be type of `boolean`");
  }
  if (typeof optimize === "undefined") {
    optimize = env === "production";
  }
  if (typeof optimize !== "boolean") {
    throw new TypeError("`optimize` should be type of `boolean`");
  }
  if (typeof hot === "undefined") {
    hot = isDevelopment && ssr === false;
  }
  if (typeof hot !== "boolean") {
    throw new TypeError("`hot` should be type of `boolean`");
  }

  //
  // Webpack configuration
  //

  const config = {
    context: path.normalize(path.resolve(__dirname, "../src")),
    entry: {
      // entries are added below...
    },
    output: {
      // see https://github.com/webpack/webpack/issues/1363#issuecomment-135010251
      filename: hot ? "[name].[hash]-[id].js" : "[name].[chunkhash].js",
      path: path.normalize(
        path.resolve(__dirname, `../build/${ssr ? "server" : "client"}`)
      ),
      publicPath: "/static/"
    },
    module: {
      rules: []
    },
    plugins: [
      new DefinePlugin({
        "process.env": {
          NODE_ENV: JSON.stringify(env)
        },
        __SSR__: ssr,
        __DEV__: isDevelopment
      })
    ],
    devtool: "eval", // cheap
    devServer: {
      hot
    }
  };

  //
  // Entry points
  //

  if (ssr) {
    config.entry.ssr = ["./server-renderer.js"];
  } else {
    config.entry.app = ["./client-renderer.js"];

    for (const k in config.entry) {
      if (hot) {
        config.entry[k] = [
          "react-hot-loader/patch",
          "webpack-hot-middleware/client",
          ...config.entry[k]
        ];
      }
    }

    // common chunks for CommonsChunkPlugin
    const common = {
      react: ["react", "react-dom"],
      router: ["react-router", "react-router-dom", "react-router-config"],
      redux: ["react-redux", "redux"],
      immutable: ["immutable"]
    };
    for (const k in common) {
      if (typeof config.entry[k] !== "undefined") {
        throw new Error(
          `common chunk '${k}' cannot override existing entry point`
        );
      }
      config.entry[k] = common[k];
    }

    config.plugins.push(
      new CommonsChunkPlugin({
        names: [...Object.keys(common), "manifest"],
        minChunks: Infinity
      })
    );
  }

  //
  // Moxy legacy?
  // (note sure about the exact implications of this)
  //

  if (ssr) {
    config.output.libraryTarget = "this"; // the "return value of your entry point"

    // Compile for usage in a Node.js-like environment (uses Node.js require to load chunks)
    // Need this for certain libraries such as 'axios' to work
    config.target = "node";

    // Need this to properly set __dirname and __filename
    config.node = {
      __dirname: false,
      __filename: false
    };
  }

  //
  // Babel
  //

  const babelLoader = {
    test: /\.js$/,
    exclude: /(node_modules|bower_components)/,
    use: {
      loader: "babel-loader",
      options: {
        presets: ["flow"],
        plugins: []
      }
    }
  };

  if (hot) {
    config.plugins.push(new HotModuleReplacementPlugin());

    if (ssr) {
      babelLoader.use.options.presets = ["es2015", "stage-2", "react"];
    } else {
      // for React.js hot loader we want no modules, but for production we do otherwise tree shaking won't work
      // but if we don't use modules then we also have to use module.hot.accept(... , () => require(...).default)
      // to grab the new component

      babelLoader.use.options.presets = [
        ...babelLoader.use.options.presets,
        ["es2015", { modules: false }],
        "stage-2",
        "react"
      ];

      babelLoader.use.options.plugins = [
        ...babelLoader.use.options.plugins,
        "react-hot-loader/babel"
      ];
    }
  } else {
    // production build
    babelLoader.use.options.presets = [
      ...babelLoader.use.options.presets,
      "es2015",
      "stage-2",
      "react"
    ];
  }

  config.module.rules.push(babelLoader);

  //
  // CSS
  //

  const cssExtractTextPlugin = new ExtractTextPlugin({
    filename: "[name].css",
    allChunks: true
  });

  const cssLocalIdentName = "[name]__[local]___[hash:base64:5]!";

  if (ssr) {
    // server side processing

    config.module.rules.push({
      test: /\.css$/,
      use: [
        {
          loader: "css-loader/locals",
          options: {
            modules: true,
            camelCase: "dashes",
            localIdentName: cssLocalIdentName
          }
        }
      ]
    });
  } else {
    // client side processing

    if (hot) {
      // the style loader works well during development
      // and supports hot reload but it does not support
      // the critical CSS path

      // this will result in flicker right after page refresh
      // but it does not happen in production.

      // CSS modularization/code splitting is problematic.

      config.module.rules.push({
        test: /\.css$/,
        use: [
          "style-loader",
          {
            loader: "css-loader",
            options: {
              modules: true,
              camelCase: "dashes",
              localIdentName: cssLocalIdentName
            }
          }
        ]
      });
    } else {
      config.module.rules.push({
        test: /\.css$/,
        loader: cssExtractTextPlugin.extract({
          fallback: {
            loader: "style-loader",
            options: {}
          },
          use: [
            {
              loader: "css-loader",
              options: {
                modules: true,
                camelCase: "dashes",
                localIdentName: cssLocalIdentName,
                importLoaders: 1
              }
            },
            {
              loader: "postcss-loader",
              options: {
                plugins: [
                  // magic here
                ]
              }
            }
          ]
        })
      });

      config.plugins.push(cssExtractTextPlugin);
    }
  }

  //
  // Minification and compression (optimization)
  //

  if (optimize) {
    config.plugins.push(
      new UglifyJsPlugin({
        compressor: {
          warnings: false
        }
      })
    );

    if (ssr) {
      // no point -- cannot load gzipped files server-side
    } else {
      config.plugins.push(
        new CompressionPlugin({
          asset: "[path].gz", // [query]: do we need a query string parameter here?
          algorithm: "gzip",
          test: /\.js$|\.css$|\.html$/,
          threshold: 4096,
          minRatio: 0.75
        })
      );
    }
  }

  //
  // Additional plugins
  //

  // config.plugins.push(new NamedModulesPlugin());
  config.plugins.push(new NoEmitOnErrorsPlugin());
  config.plugins.push(new ManifestPlugin());

  return config;
};
