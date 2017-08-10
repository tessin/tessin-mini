var webpackConfig = require("./webpack.config");

module.exports = webpackConfig({
  ssr: false,
  hot: false
});
