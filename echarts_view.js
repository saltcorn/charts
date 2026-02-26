const Workflow = require("@saltcorn/data/models/workflow");
const Form = require("@saltcorn/data/models/form");
const FieldRepeat = require("@saltcorn/data/models/fieldrepeat");
const Table = require("@saltcorn/data/models/table");
const { div, script, domReady, code } = require("@saltcorn/markup/tags");
const {
  readState,
  stateFieldsToWhere,
} = require("@saltcorn/data/plugin-helper");
const { jsexprToWhere } = require("@saltcorn/data/models/expression");
const { mergeIntoWhere } = require("@saltcorn/data/utils");

const multiAblePlots = ["line", "area", "scatter"];

const configuration_workflow = () =>
  new Workflow({
    steps: [
      {
        name: "Chart",
        form: async (context) => {
          const table = await Table.findOne({ id: context.table_id });
          const fields = await table.getFields();
          const fieldOptions = fields.map((f) => f.name);
          const group_fields = fields
            .filter(
              (f) => ["Integer", "String"].includes(f.type.name) || f.is_fkey
            )
            .map((f) => f.name);
          const factor_fields = fields
            .filter(
              (f) =>
                ["String", "Bool", "Integer"].includes(f.type.name) || f.is_fkey
            )
            .map((f) => f.name);
          const outcome_fields = [
            "Row count",
            ...fields
              .filter((f) =>
                ["Float", "Integer", "Money"].includes(f.type.name)
              )
              .map((f) => f.name),
          ];
          return new Form({
            fields: [
              {
                name: "plot_type",
                label: "Plot type",
                type: "String",
                required: true,
                attributes: {
                  options: [
                    { label: "Line chart", name: "line" },
                    { label: "Area chart", name: "area" },
                    { label: "Scatter chart", name: "scatter" },
                    { label: "Bar chart", name: "bar" },
                    { label: "Pie chart", name: "pie" },
                    { label: "Histogram", name: "histogram" },
                  ],
                },
              },
              {
                name: "plot_series",
                label: "Plot series",
                type: "String",
                required: true,
                showIf: { plot_type: multiAblePlots },
                attributes: {
                  options: [
                    { label: "Single", name: "single" },
                    { label: "Multiple", name: "multiple" },
                    { label: "Group by Field", name: "group_by_field" },
                  ],
                },
              },
              {
                name: "x_field",
                label: "X field",
                type: "String",
                required: true,
                showIf: { plot_type: ["line", "area", "scatter"] },
                attributes: { options: fieldOptions },
              },
              {
                name: "y_field",
                label: "Y field",
                type: "String",
                required: true,
                showIf: {
                  plot_series: ["single", "group_by_field"],
                  plot_type: ["line", "area", "scatter"],
                },
                attributes: { options: fieldOptions },
              },
              {
                name: "histogram_field",
                label: "Data field",
                type: "String",
                required: true,
                showIf: { plot_type: "histogram" },
                attributes: { options: fieldOptions },
              },
              new FieldRepeat({
                name: "series",
                label: "Series",
                showIf: {
                  plot_series: "multiple",
                  plot_type: multiAblePlots,
                },
                fields: [
                  {
                    name: "y_field",
                    label: "Y field",
                    type: "String",
                    required: true,
                    attributes: { options: fieldOptions },
                  },
                ],
              }),
              {
                name: "group_field",
                label: "Grouping field",
                type: "String",
                required: true,
                attributes: {
                  options: group_fields,
                },
                showIf: {
                  plot_series: "group_by_field",
                  plot_type: multiAblePlots,
                },
              },
              new FieldRepeat({
                name: "outcomes",
                label: "Outcomes",
                showIf: { plot_type: "bar" },
                fields: [
                  {
                    name: "outcome_field",
                    label: "Outcome field",
                    type: "String",
                    required: true,
                    attributes: { options: outcome_fields },
                  },
                ],
              }),
              {
                name: "outcome_field",
                label: "Outcome field",
                type: "String",
                required: true,
                showIf: { plot_type: "pie" },
                attributes: { options: outcome_fields },
              },
              {
                name: "factor_field",
                label: "Factor field",
                type: "String",
                required: true,
                showIf: { plot_type: ["bar", "pie"] },
                attributes: { options: factor_fields },
              },
              {
                name: "statistic",
                label: "Statistic",
                type: "String",
                required: true,
                showIf: { plot_type: ["bar", "pie"] },
                attributes: { options: ["Count", "Avg", "Sum", "Max", "Min"] },
              },
              {
                name: "bar_stack",
                label: "Stack series",
                type: "Bool",
                showIf: { plot_type: "bar" },
              },
              {
                name: "bar_orientation",
                label: "Orientation",
                type: "String",
                showIf: { plot_type: "bar" },
                attributes: {
                  options: [
                    { label: "Vertical", name: "vertical" },
                    { label: "Horizontal", name: "horizontal" },
                  ],
                },
              },
              {
                name: "smooth",
                label: "Smooth line",
                type: "Bool",
                showIf: { plot_type: ["line", "area"] },
              },
              {
                name: "pie_donut",
                label: "Donut",
                type: "Bool",
                showIf: { plot_type: "pie" },
              },
              {
                name: "donut_ring_width",
                label: "Ring width (%)",
                type: "Integer",
                showIf: { plot_type: "pie", pie_donut: true },
                default: 50,
              },
              {
                name: "pie_label_position",
                label: "Label position",
                type: "String",
                showIf: { plot_type: "pie" },
                attributes: {
                  options: [
                    { label: "Inside", name: "inside" },
                    { label: "Outside", name: "outside" },
                    { label: "Legend", name: "legend" },
                  ],
                },
              },
              {
                name: "title",
                label: "Plot title",
                type: "String",
              },
              {
                name: "include_fml",
                label: "Row inclusion formula",
                class: "validate-expression",
                sublabel:
                  "Only include rows where this formula is true. " +
                  "In scope: " +
                  [
                    ...fields.map((f) => f.name),
                    "user",
                    "year",
                    "month",
                    "day",
                    "today()",
                  ]
                    .map((s) => code(s))
                    .join(", "),
                type: "String",
              },
            ],
          });
        },
      },
    ],
  });

const get_state_fields = async (table_id, viewname, config) => {
  return [];
};

const buildChartScript = (
  data,
  {
    plot_type,
    plot_series,
    smooth,
    bar_stack,
    bar_orientation,
    pie_donut,
    pie_label_position,
    donut_ring_width,
    title,
  }
) => {
  const titleOption = title ? `title: { text: ${JSON.stringify(title)} },` : "";
  switch (plot_type) {
    case "line":
      if (plot_series === "multiple" || plot_series === "group_by_field") {
        const seriesArr = data.map((s) => ({
          type: "line",
          name: s.name,
          smooth: !!smooth,
          data: s.points,
        }));
        return `
          var option = {
            ${titleOption}
            xAxis: { type: 'value' },
            yAxis: { type: 'value' },
            legend: {},
            series: ${JSON.stringify(seriesArr)}
          };
          myChart.setOption(option);`;
      }
      return `
        var option = {
            ${titleOption}
          xAxis: { type: 'value' },
          yAxis: { type: 'value' },
          series: [{ type: 'line', smooth: ${!!smooth}, data: ${JSON.stringify(
        data
      )} }]
        };
        myChart.setOption(option);`;

    case "area":
      if (plot_series === "multiple" || plot_series === "group_by_field") {
        const seriesArr = data.map((s) => ({
          type: "line",
          name: s.name,
          smooth: !!smooth,
          areaStyle: {},
          data: s.points,
        }));
        return `
          var option = {
            ${titleOption}
            xAxis: { type: 'value' },
            yAxis: { type: 'value' },
            legend: {},
            series: ${JSON.stringify(seriesArr)}
          };
          myChart.setOption(option);`;
      }
      return `
        var option = {
            ${titleOption}
          xAxis: { type: 'value' },
          yAxis: { type: 'value' },
          series: [{
            type: 'line',
            smooth: ${!!smooth},
            areaStyle: {},
            data: ${JSON.stringify(data)}
          }]
        };
        myChart.setOption(option);`;

    case "bar": {
      const { categories, series: barSeries } = data;
      const horizontal = bar_orientation === "horizontal";
      const seriesArr = JSON.stringify(
        barSeries.map((s) => ({
          type: "bar",
          name: s.name,
          stack: bar_stack ? "total" : undefined,
          data: s.values,
        }))
      );
      const categoryAxis = JSON.stringify({
        type: "category",
        data: categories,
      });
      const valueAxis = JSON.stringify({ type: "value" });
      return `
        var option = {
            ${titleOption}
          ${
            horizontal
              ? `xAxis: ${valueAxis}, yAxis: ${categoryAxis}`
              : `xAxis: ${categoryAxis}, yAxis: ${valueAxis}`
          },
          legend: {},
          series: ${seriesArr}
        };
        myChart.setOption(option);`;
    }

    case "pie": {
      const pieData = JSON.stringify(data);
      const radius = pie_donut
        ? `['${Math.round(
            70 - ((donut_ring_width || 50) / 100) * 70
          )}%', '70%']`
        : "'70%'";
      const useLegend = pie_label_position === "legend";
      const useOutside = pie_label_position === "outside";
      if (useOutside) {
        return `
          var option = {
            ${titleOption}
            series: [{
              type: 'pie',
              radius: ${radius},
              label: {
                backgroundColor: '#F6F8FC',
                borderColor: '#8C8D8E',
                borderWidth: 1,
                borderRadius: 4,
                formatter: '  {b|{b}:}  {val|{c}}  ',
                rich: {
                  b: {
                    color: '#4C5058',
                    fontSize: 16,
                    fontWeight: 'bold',
                    lineHeight: 33
                  },
                  val: {
                    color: '#4C5058',
                    fontSize: 16
                  }
                }
              },
              labelLine: { length: 30 },
              data: ${pieData}
            }]
          };
          myChart.setOption(option);`;
      }
      const label = useLegend
        ? { position: "inside", formatter: "{c}" }
        : { position: "inside", formatter: "{b}\n{c}" };
      return `
        var option = {
            ${titleOption}
          ${useLegend ? "legend: {}," : ""}
          series: [{
            type: 'pie',
            radius: ${radius},
            label: ${JSON.stringify(label)},
            data: ${pieData}
          }]
        };
        myChart.setOption(option);`;
    }

    case "scatter":
      if (plot_series === "multiple" || plot_series === "group_by_field") {
        const seriesArr = data.map((s) => ({
          type: "scatter",
          name: s.name,
          data: s.points,
        }));
        return `
          var option = {
            ${titleOption}
            xAxis: { type: 'value' },
            yAxis: { type: 'value' },
            legend: {},
            series: ${JSON.stringify(seriesArr)}
          };
          myChart.setOption(option);`;
      }
      return `
        var option = {
            ${titleOption}
          xAxis: { type: 'value' },
          yAxis: { type: 'value' },
          series: [{ type: 'scatter', data: ${JSON.stringify(data)} }]
        };
        myChart.setOption(option);`;

    case "histogram": {
      return `
        echarts.registerTransform(ecStat.transform.histogram);
        var option = {
            ${titleOption}
          dataset: [
            { source: ${JSON.stringify(data)} },
            { transform: { type: 'ecStat:histogram', config: {} } }
          ],
          tooltip: {},
          xAxis: [{ scale: true, boundaryGap: ['5%', '5%'] }],
          yAxis: [{}],
          series: [{
            name: 'histogram',
            type: 'bar',
            barWidth: '99.3%',
            encode: { x: 0, y: 1, itemName: 4 },
            datasetIndex: 1
          }]
        };
        myChart.setOption(option);`;
    }

    default:
      return "";
  }
};

const prepChartData = (
  rows,
  {
    plot_type,
    plot_series,
    x_field,
    y_field,
    series,
    factor_field,
    outcome_field,
    outcomes,
    statistic,
    group_field,
    histogram_field,
  }
) => {
  if (plot_type === "histogram") {
    return rows
      .map((r) => r[histogram_field])
      .filter((v) => v !== null && v !== undefined)
      .map((v) => [v]);
  }
  if (plot_type === "bar" || plot_type === "pie") {
    const stat = (statistic || "count").toLowerCase();
    const aggregateField = (groupRows, field) => {
      if (field === "Row count" || stat === "count") return groupRows.length;
      const vals = groupRows
        .map((r) => r[field])
        .filter((v) => v !== null && v !== undefined);
      if (!vals.length) return 0;
      if (stat === "sum") return vals.reduce((a, b) => a + b, 0);
      if (stat === "avg") return vals.reduce((a, b) => a + b, 0) / vals.length;
      if (stat === "max") return Math.max(...vals);
      if (stat === "min") return Math.min(...vals);
      return groupRows.length;
    };
    const allCategories = [
      ...new Set(rows.map((r) => String(r[factor_field]))),
    ];
    if (plot_type === "pie") {
      return allCategories.map((cat) => ({
        name: cat,
        value: aggregateField(
          rows.filter((r) => String(r[factor_field]) === cat),
          outcome_field
        ),
      }));
    }
    const seriesData = (outcomes || []).map(({ outcome_field: of }) => ({
      name: of || "Count",
      values: allCategories.map((cat) =>
        aggregateField(
          rows.filter((r) => String(r[factor_field]) === cat),
          of
        )
      ),
    }));
    return { categories: allCategories, series: seriesData };
  }
  if (plot_series === "group_by_field" && group_field) {
    const diffvals = new Set(rows.map((r) => r[group_field]));
    return [...diffvals].map((val) => ({
      name: val === null ? "null" : String(val),
      points: rows
        .filter((r) => r[group_field] === val)
        .map((r) => [r[x_field], r[y_field]]),
    }));
  }
  if (plot_series === "multiple" && series) {
    return series.map((s) => ({
      name: s.y_field,
      points: rows.map((r) => [r[x_field], r[s.y_field]]),
    }));
  }
  return rows.map((r) => [r[x_field], r[y_field]]);
};

const loadRows = async (
  table_id,
  {
    plot_type,
    plot_series,
    x_field,
    y_field,
    series,
    factor_field,
    outcome_field,
    outcomes,
    group_field,
    histogram_field,
    include_fml,
  },
  state,
  req
) => {
  const table = await Table.findOne({ id: table_id });
  const fields = await table.getFields();
  readState(state, fields);
  const where = await stateFieldsToWhere({ fields, state });
  if (include_fml) {
    const ctx = { ...state, user_id: req?.user?.id || null, user: req?.user };
    mergeIntoWhere(where, jsexprToWhere(include_fml, ctx, fields) || {});
  }
  const joinFields = {};
  const qfields = [];

  const gfield = fields.find((f) => f.name === group_field);
  let joinedConfigKey = null;
  if (plot_type === "histogram") {
    qfields.push(histogram_field);
  } else if (plot_type === "bar" || plot_type === "pie") {
    const factor_field_obj = fields.find((f) => f.name === factor_field);
    if (
      factor_field_obj?.is_fkey &&
      factor_field_obj.attributes.summary_field
    ) {
      joinedConfigKey = "factor_field";
      joinFields.__groupjoin = {
        ref: factor_field,
        target: factor_field_obj.attributes.summary_field,
      };
    } else {
      qfields.push(factor_field);
    }
    if (plot_type === "bar") {
      for (const { outcome_field: of } of outcomes || []) {
        if (of && of !== "Row count") qfields.push(of);
      }
    } else if (outcome_field && outcome_field !== "Row count") {
      qfields.push(outcome_field);
    }
  } else if (
    plot_series === "group_by_field" &&
    group_field &&
    multiAblePlots.indexOf(plot_type) >= 0
  ) {
    if (gfield?.is_fkey && gfield.attributes.summary_field) {
      joinedConfigKey = "group_field";
      joinFields.__groupjoin = {
        ref: group_field,
        target: gfield.attributes.summary_field,
      };
    }
    qfields.push(x_field, y_field);
    if (!joinedConfigKey) qfields.push(group_field);
  } else if (
    plot_series === "multiple" &&
    series &&
    multiAblePlots.indexOf(plot_type) >= 0
  ) {
    qfields.push(x_field, ...series.map((s) => s.y_field));
  } else {
    qfields.push(x_field, y_field);
  }

  const orderBy = ["line", "area"].includes(plot_type) ? x_field : undefined;

  const rows = await table.getJoinedRows({
    where,
    joinFields,
    fields: qfields,
    ...(orderBy && { orderBy }),
  });
  return { rows, joinedConfigKey };
};

const run = async (table_id, viewname, config, state, { req }, queriesObj) => {
  const { rows, joinedConfigKey } = await loadRows(
    table_id,
    config,
    state,
    req
  );
  const effectiveConfig = joinedConfigKey
    ? { ...config, [joinedConfigKey]: "__groupjoin" }
    : config;
  const data = prepChartData(rows, effectiveConfig);
  const chartScript = buildChartScript(data, config);
  if (!chartScript) return "";

  const divid = `echarts_${viewname}`;
  return (
    div({ id: divid, style: "width: 600px; height: 400px;" }) +
    script(
      domReady(`
        var chartDom = document.getElementById('${divid}');
        var myChart = echarts.init(chartDom);
        ${chartScript}
      `)
    )
  );
};

module.exports = {
  name: "Chart",
  display_state_form: false,
  get_state_fields,
  configuration_workflow,
  run,
};
