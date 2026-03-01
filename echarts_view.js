const Workflow = require("@saltcorn/data/models/workflow");
const Table = require("@saltcorn/data/models/table");
const { div, script, domReady } = require("@saltcorn/markup/tags");
const {
  readState,
  stateFieldsToWhere,
} = require("@saltcorn/data/plugin-helper");
const { jsexprToWhere } = require("@saltcorn/data/models/expression");
const { mergeIntoWhere } = require("@saltcorn/data/utils");
const { buildChartsForm, multiAblePlots } = require("./charts_form");

const configuration_workflow = () =>
  new Workflow({
    steps: [
      {
        name: "Chart",
        form: buildChartsForm,
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
    bar_axis_title,
    statistic,
    outcomes,
    lower_limit,
    upper_limit,
    show_legend,
    mleft,
    mright,
    mtop,
    mbottom,
  }
) => {
  const titleHeight = 30;
  const titleObj = title
    ? {
        text: title,
        ...(mtop != null && { top: mtop }),
        ...(mleft != null && { left: mleft }),
      }
    : null;
  const titleOption = titleObj ? `title: ${JSON.stringify(titleObj)},` : "";
  const legendHeight = 50;
  const legendObj = show_legend
    ? { ...(mbottom != null && { bottom: mbottom }) }
    : null;
  const legendOption = legendObj ? `legend: ${JSON.stringify(legendObj)},` : "";
  const gridObj = {
    ...(mleft != null && { left: mleft }),
    ...(mright != null && { right: mright }),
    ...(mtop != null && { top: title ? mtop + titleHeight : mtop }),
    ...(mbottom != null && {
      bottom: mbottom + (show_legend ? legendHeight : 0),
    }),
  };
  const gridOption = Object.keys(gridObj).length
    ? `grid: ${JSON.stringify(gridObj)},`
    : "";
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
            ${gridOption}
            xAxis: { type: 'value' },
            yAxis: { type: 'value' },
            ${legendOption}
            series: ${JSON.stringify(seriesArr)}
          };
          myChart.setOption(option);`;
      }
      return `
        var option = {
            ${titleOption}
            ${gridOption}
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
            ${gridOption}
            xAxis: { type: 'value' },
            yAxis: { type: 'value' },
            ${legendOption}
            series: ${JSON.stringify(seriesArr)}
          };
          myChart.setOption(option);`;
      }
      return `
        var option = {
            ${titleOption}
            ${gridOption}
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
      const axisTitle =
        bar_axis_title ||
        `${statistic || "Count"} ${(outcomes || [])
          .map((o) => o.outcome_field)
          .join(", ")}`;
      const limits = {
        ...(lower_limit != null && { min: lower_limit }),
        ...(upper_limit != null && { max: upper_limit }),
      };
      const valueAxis = JSON.stringify(
        horizontal
          ? {
              type: "value",
              name: axisTitle,
              nameLocation: "middle",
              nameGap: 30,
              ...limits,
            }
          : {
              type: "value",
              name: axisTitle,
              nameLocation: "middle",
              nameRotate: 90,
              nameGap: 40,
              ...limits,
            }
      );
      return `
        var option = {
            ${titleOption}
            ${gridOption}
          ${
            horizontal
              ? `xAxis: ${valueAxis}, yAxis: ${categoryAxis}`
              : `xAxis: ${categoryAxis}, yAxis: ${valueAxis}`
          },
          ${legendOption}
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
                formatter: '  {b|{b}}\\n{hr|}\\n  {val|{c}} {per|{d}%} ',
                rich: {
                  hr: {
                    borderColor: '#8C8D8E',
                    width: '100%',
                    borderWidth: 1,
                    height: 0,
                  },
                  b: {
                    color: '#4C5058',
                    fontSize: 16,
                    fontWeight: 'bold',
                    lineHeight: 25,
                  },
                  val: {
                    color: '#4C5058',
                    fontSize: 16,
                    lineHeight: 25,
                  },
                  per: {
                    color: '#fff',
                    fontSize: 14,
                    backgroundColor: '#4C5058',
                    borderRadius: 4,
                    padding: [2, 3],
                    lineHeight: 25,
                  },
                }
              },
              labelLine: { length: 30 },
              data: ${pieData}
            }]
          };
          myChart.setOption(option);`;
      }
      const label = useLegend
        ? { position: "inside", formatter: "{c} ({d}%)" }
        : { position: "inside", formatter: "{b}\n{c} ({d}%)" };
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
            ${gridOption}
            xAxis: { type: 'value' },
            yAxis: { type: 'value' },
            ${legendOption}
            series: ${JSON.stringify(seriesArr)}
          };
          myChart.setOption(option);`;
      }
      return `
        var option = {
            ${titleOption}
            ${gridOption}
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
            ${gridOption}
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

    case "funnel": {
      const legendBottom = mbottom ?? 0;
      const funnelSeries = JSON.stringify({
        name: "Funnel",
        type: "funnel",
        sort: "descending",
        gap: 2,
        ...(mleft != null && { left: mleft }),
        ...(mright != null && { right: mright }),
        ...(mtop != null && { top: title ? mtop + titleHeight : mtop }),
        bottom: legendBottom + legendHeight,
        label: { show: true, position: "inside", formatter: "{d}%" },
        data,
      });
      return `
        var option = {
          ${titleOption}
          legend: { bottom: ${legendBottom} },
          tooltip: { trigger: 'item', formatter: '{a} <br/>{b}: {c} ({d}%)' },
          series: [${funnelSeries}]
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
    null_label,
    show_missing,
  }
) => {
  const applyNullLabel = (v) =>
    (v === null || v === "") && null_label ? null_label : v || "null";
  const isMissing = (v) => v === null || v === "" || v === undefined;
  if (plot_type === "histogram") {
    return rows
      .map((r) => r[histogram_field])
      .filter((v) => v !== null && v !== undefined)
      .map((v) => [v]);
  }
  if (plot_type === "bar" || plot_type === "pie" || plot_type === "funnel") {
    const rows_ = show_missing
      ? rows
      : rows.filter((r) => !isMissing(r[factor_field]));
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
      ...new Set(rows_.map((r) => String(applyNullLabel(r[factor_field])))),
    ];
    if (plot_type === "pie" || plot_type === "funnel") {
      return allCategories.map((cat) => ({
        name: cat,
        value: aggregateField(
          rows_.filter((r) => String(applyNullLabel(r[factor_field])) === cat),
          outcome_field
        ),
      }));
    }
    const seriesData = (outcomes || []).map(({ outcome_field: of }) => ({
      name: of || "Count",
      values: allCategories.map((cat) =>
        aggregateField(
          rows_.filter((r) => String(applyNullLabel(r[factor_field])) === cat),
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
  } else if (
    plot_type === "bar" ||
    plot_type === "pie" ||
    plot_type === "funnel"
  ) {
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
