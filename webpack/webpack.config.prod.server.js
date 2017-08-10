var webpackConfig = require("./webpack.config");

module.exports = webpackConfig({
  env: "production",
  ssr: true,
  optimize: true
});
