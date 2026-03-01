const { features } = require("@saltcorn/data/db/state");

module.exports = {
  sc_plugin_api_version: 1,
  plugin_name: "charts",
  headers: [
    {
      script: `/plugins/public/charts${
        features?.version_plugin_serve_path
          ? "@" + require("./package.json").version
          : ""
      }/echarts.min.js`,
    },
    {
      script: `/plugins/public/charts${
        features?.version_plugin_serve_path
          ? "@" + require("./package.json").version
          : ""
      }/ecStat.min.js`,
    },
  ],

  viewtemplates: [require("./echarts_view"), require("./charts_explorer")],
};
