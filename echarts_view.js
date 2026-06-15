const Workflow = require("@saltcorn/data/models/workflow");
const Table = require("@saltcorn/data/models/table");
const { div, script, domReady, text_attr } = require("@saltcorn/markup/tags");
const {
  readState,
  stateFieldsToWhere,
} = require("@saltcorn/data/plugin-helper");
const { jsexprToWhere } = require("@saltcorn/data/models/expression");
const { mergeIntoWhere } = require("@saltcorn/data/utils");
const { buildChartsForm, multiAblePlots } = require("./charts_form");
const { getState } = require("@saltcorn/data/db/state");

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

const resolveOverride = (name, overrides) => {
  if (!overrides?.length || name == null) return {};
  return overrides
    .filter((o) => o.series_name === String(name))
    .reduce(
      (acc, o) => ({
        ...acc,
        ...(o.color ? { color: o.color } : {}),
        ...(o.text_color ? { text_color: o.text_color } : {}),
        ...(o.label ? { label: o.label } : {}),
      }),
      {}
    );
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
    bar_axis_title,
    statistic,
    outcomes,
    lower_limit,
    upper_limit,
    show_legend,
    gauge_style,
    gauge_min,
    gauge_max,
    heatmap_min,
    heatmap_max,
    heatmap_color_scale,
    factor_field,
    filter_on_click,
    selected,
    line_area_scatter_overrides,
    bar_overrides,
    funnel_overrides,
    pie_overrides,
    single_override_color,
    single_override_label,
    gauge_override_color,
    gauge_override_label,
    text_color,
    number_arc_color,
    number_ring_width,
  }
) => {
  // Builds an ECharts click handler that calls set_state_field/unset_state_field.
  // getIdExpr is a JS expression (string) that evaluates to the value to store in state;
  // for plain fields it's just 'label', for FK fields it resolves to the raw FK ID.
  const makeClickHandler = (getIdExpr) =>
    factor_field && filter_on_click !== false
      ? `myChart.on('click', (params) => {
          const key = ${JSON.stringify(factor_field)};
          const label = params.name;
          const stateVal = ${getIdExpr};
          const selected = ${
            selected != null ? JSON.stringify(String(selected)) : "null"
          };
          if (selected !== null && (''+selected) === (''+label)) {
            unset_state_field(key);
          } else {
            set_state_field(key, stateVal);
          }
        });`
      : "";
  const hasLegend =
    (show_legend === true || show_legend === "true" || show_legend === 1) &&
    plot_type !== "histogram";
  const legendOption = hasLegend
    ? `legend: { bottom: 0 },`
    : `legend: { show: false },`;
  // Builds a legend option string with optional per-item textStyle.color.
  // items: array of series names (strings) or { name, textStyle } objects.
  const buildLegendOpt = (items) =>
    hasLegend
      ? `legend: { bottom: 0, data: ${JSON.stringify(items)} },`
      : `legend: { show: false },`;
  const gridOption = `grid: { left: 0, right: 0, top: 0, bottom: ${
    hasLegend ? 50 : 0
  }, containLabel: true },`;
  switch (plot_type) {
    case "line":
      if (plot_series === "multiple" || plot_series === "group_by_field") {
        const lineLegendItems = [];
        const seriesArr = data.map((s) => {
          const ov = resolveOverride(s.name, line_area_scatter_overrides);
          const seriesTextColor = ov.text_color || text_color;
          const name = ov.label || s.name;
          lineLegendItems.push(
            ov.text_color ? { name, textStyle: { color: ov.text_color } } : name
          );
          return {
            type: "line",
            name,
            smooth: !!smooth,
            ...(ov.color && {
              itemStyle: { color: ov.color },
              lineStyle: { color: ov.color },
            }),
            ...(seriesTextColor && { label: { color: seriesTextColor } }),
            data: s.points,
          };
        });
        return `
          var option = {

            ${gridOption}
            xAxis: { type: 'value' },
            yAxis: { type: 'value' },
            ${buildLegendOpt(lineLegendItems)}
            series: ${JSON.stringify(seriesArr)}
          };
          myChart.setOption(option);`;
      }
      return `
        var option = {

            ${gridOption}
          ${legendOption}
          xAxis: { type: 'value' },
          yAxis: { type: 'value' },
          series: [${JSON.stringify({
            type: "line",
            smooth: !!smooth,
            ...(single_override_label && { name: single_override_label }),
            ...(single_override_color && {
              itemStyle: { color: single_override_color },
              lineStyle: { color: single_override_color },
            }),
            data,
          })}]
        };
        myChart.setOption(option);`;

    case "area":
      if (plot_series === "multiple" || plot_series === "group_by_field") {
        const areaLegendItems = [];
        const seriesArr = data.map((s) => {
          const ov = resolveOverride(s.name, line_area_scatter_overrides);
          const seriesTextColor = ov.text_color || text_color;
          const name = ov.label || s.name;
          areaLegendItems.push(
            ov.text_color ? { name, textStyle: { color: ov.text_color } } : name
          );
          return {
            type: "line",
            name,
            smooth: !!smooth,
            areaStyle: ov.color ? { color: ov.color } : {},
            ...(ov.color && {
              itemStyle: { color: ov.color },
              lineStyle: { color: ov.color },
            }),
            ...(seriesTextColor && { label: { color: seriesTextColor } }),
            data: s.points,
          };
        });
        return `
          var option = {

            ${gridOption}
            xAxis: { type: 'value' },
            yAxis: { type: 'value' },
            ${buildLegendOpt(areaLegendItems)}
            series: ${JSON.stringify(seriesArr)}
          };
          myChart.setOption(option);`;
      }
      return `
        var option = {

            ${gridOption}
          ${legendOption}
          xAxis: { type: 'value' },
          yAxis: { type: 'value' },
          series: [${JSON.stringify({
            type: "line",
            smooth: !!smooth,
            areaStyle: single_override_color
              ? { color: single_override_color }
              : {},
            ...(single_override_label && { name: single_override_label }),
            ...(single_override_color && {
              itemStyle: { color: single_override_color },
              lineStyle: { color: single_override_color },
            }),
            data,
          })}]
        };
        myChart.setOption(option);`;

    case "bar": {
      const { categories, categoryIds, series: barSeries } = data;
      const barClickHandler = makeClickHandler(
        categoryIds
          ? `(${JSON.stringify(categoryIds)}[params.dataIndex] ?? label)`
          : "label"
      );
      const horizontal = bar_orientation === "horizontal";
      const barLegendItems = [];
      const seriesArr = JSON.stringify(
        barSeries.map((s) => {
          const ov = resolveOverride(s.name, bar_overrides);
          const seriesTextColor = ov.text_color || text_color;
          const name = ov.label || s.name;
          barLegendItems.push(
            ov.text_color ? { name, textStyle: { color: ov.text_color } } : name
          );
          return {
            type: "bar",
            name,
            stack: bar_stack ? "total" : undefined,
            ...(ov.color && { itemStyle: { color: ov.color } }),
            ...(seriesTextColor && { label: { color: seriesTextColor } }),
            data: selected
              ? s.values.map((v, i) => ({
                  value: v,
                  itemStyle: {
                    ...(ov.color && { color: ov.color }),
                    opacity:
                      "" + (categoryIds ? categoryIds[i] : categories[i]) ===
                      "" + selected
                        ? 1.0
                        : 0.4,
                  },
                }))
              : s.values,
          };
        })
      );
      const categoryAxis = JSON.stringify({
        type: "category",
        data: categories,
        axisLabel: { interval: 0 },
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
            ${selected != null ? "animation: false," : ""}

            ${gridOption}
          ${
            horizontal
              ? `xAxis: ${valueAxis}, yAxis: ${categoryAxis}`
              : `xAxis: ${categoryAxis}, yAxis: ${valueAxis}`
          },
          ${buildLegendOpt(barLegendItems)}
          series: ${seriesArr}
        };
        myChart.setOption(option);
        ${barClickHandler}`;
    }

    case "pie": {
      const pieClickHandler = makeClickHandler(
        "(params.data && params.data.fkId != null ? params.data.fkId : label)"
      );
      const pieData = JSON.stringify(
        (selected
          ? data.map((item) => ({
              ...item,
              ...("" + (item.fkId != null ? item.fkId : item.name) ===
              "" + selected
                ? { selected: true }
                : {}),
            }))
          : data
        ).map((item) => {
          const ov = resolveOverride(item.name, pie_overrides);
          const _n = parseFloat(item.value);
          const value = isFinite(_n) ? +_n.toFixed(2) : item.value;
          return {
            ...item,
            value,
            ...(ov.label && { name: ov.label }),
            ...(ov.color && { itemStyle: { color: ov.color } }),
            ...(ov.selected && { selected: true }),
            _ovTextColor: ov.text_color || null,
          };
        })
      );
      const radius = pie_donut
        ? `['${Math.round(
            70 - ((donut_ring_width || 50) / 100) * 70
          )}%', '70%']`
        : "'70%'";
      const effectiveLabelPos =
        pie_label_position === "outside" ? "legend" : pie_label_position;
      const useLegend = effectiveLabelPos === "legend";
      const noAnimation = selected != null ? "animation: false," : "";
      const baseLabel = {
        position: "inside",
        formatter: useLegend ? "{c} ({d}%)" : "{b}\n{c} ({d}%)",
        ...(text_color && { color: text_color }),
      };
      const label = baseLabel;
      const pieLegendItems = [];
      const pieDataWithLabels = JSON.parse(pieData).map((item) => {
        const { _ovTextColor, ...rest } = item;
        pieLegendItems.push(
          _ovTextColor
            ? { name: rest.name, textStyle: { color: _ovTextColor } }
            : rest.name
        );
        if (!_ovTextColor) return rest;
        return { ...rest, label: { ...baseLabel, color: _ovTextColor } };
      });
      const legendOpt = useLegend
        ? `legend: { bottom: 0, data: ${JSON.stringify(pieLegendItems)} },`
        : "legend: { show: false },";
      return `
        var option = {
            ${noAnimation}

          ${legendOpt}
          series: [{
            type: 'pie',
            selectedMode: 'single',
            radius: ${radius},
            label: ${JSON.stringify(label)},
            data: ${JSON.stringify(pieDataWithLabels)}
          }]
        };
        myChart.setOption(option);
        ${pieClickHandler}`;
    }

    case "scatter":
      if (plot_series === "multiple" || plot_series === "group_by_field") {
        const scatterLegendItems = [];
        const seriesArr = data.map((s) => {
          const ov = resolveOverride(s.name, line_area_scatter_overrides);
          const seriesTextColor = ov.text_color || text_color;
          const name = ov.label || s.name;
          scatterLegendItems.push(
            ov.text_color ? { name, textStyle: { color: ov.text_color } } : name
          );
          return {
            type: "scatter",
            name,
            ...(ov.color && { itemStyle: { color: ov.color } }),
            ...(seriesTextColor && { label: { color: seriesTextColor } }),
            data: s.points,
          };
        });
        return `
          var option = {

            ${gridOption}
            xAxis: { type: 'value' },
            yAxis: { type: 'value' },
            ${buildLegendOpt(scatterLegendItems)}
            series: ${JSON.stringify(seriesArr)}
          };
          myChart.setOption(option);`;
      }
      return `
        var option = {

            ${gridOption}
          ${legendOption}
          xAxis: { type: 'value' },
          yAxis: { type: 'value' },
          series: [${JSON.stringify({
            type: "scatter",
            ...(single_override_label && { name: single_override_label }),
            ...(single_override_color && {
              itemStyle: { color: single_override_color },
            }),
            data,
          })}]
        };
        myChart.setOption(option);`;

    case "histogram": {
      return `
        echarts.registerTransform(ecStat.transform.histogram);
        var option = {
            ${gridOption}
            legend: { show: false },
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
      const funnelBaseLabel = {
        show: true,
        position: "inside",
        formatter: "{d}%",
        ...(text_color && { color: text_color }),
      };
      const funnelLegendItems = [];
      const funnelData = data.map((item) => {
        const ov = resolveOverride(item.name, funnel_overrides);
        const itemTextColor = ov.text_color;
        const name = ov.label || item.name;
        funnelLegendItems.push(
          itemTextColor ? { name, textStyle: { color: itemTextColor } } : name
        );
        return {
          ...item,
          ...(ov.label && { name }),
          ...(ov.color && { itemStyle: { color: ov.color } }),
          ...(itemTextColor && {
            label: { ...funnelBaseLabel, color: itemTextColor },
          }),
        };
      });
      const funnelSeries = JSON.stringify({
        name: "Funnel",
        type: "funnel",
        sort: "descending",
        gap: 2,
        left: 0,
        right: 0,
        top: 0,
        bottom: 50,
        label: funnelBaseLabel,
        data: funnelData,
      });
      return `
        var option = {

          legend: { bottom: 0, data: ${JSON.stringify(funnelLegendItems)} },
          tooltip: { trigger: 'item', formatter: '{a} <br/>{b}: {c} ({d}%)' },
          series: [${funnelSeries}]
        };
        myChart.setOption(option);`;
    }

    case "heatmap": {
      const { xCategories, yCategories, cells } = data;
      const hmMax =
        heatmap_max != null
          ? heatmap_max
          : cells.length
          ? Math.max(...cells.filter((c) => c[2] !== "-").map((c) => c[2]))
          : 10;
      const hmMin = heatmap_min ?? 0;
      const vmHeight = 60;
      return `
        var option = {

          tooltip: { position: 'top' },
          grid: { left: 0, right: 0, top: 0, bottom: ${vmHeight}, containLabel: true },
          xAxis: { type: 'category', data: ${JSON.stringify(
            xCategories
          )}, splitArea: { show: true } },
          yAxis: { type: 'category', data: ${JSON.stringify(
            yCategories
          )}, splitArea: { show: true } },
          visualMap: {
            ${heatmap_color_scale === "steps" ? "type: 'piecewise'," : ""}
            min: ${hmMin},
            max: ${hmMax},
            calculable: true,
            orient: 'horizontal',
            left: 'center',
            bottom: 0,
            outOfRange: { color: ['#333'] }
          },
          series: [{
            type: 'heatmap',
            data: ${JSON.stringify(cells)},
            label: { show: true },
            emphasis: {
              itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 0, 0, 0.5)' }
            }
          }]
        };
        myChart.setOption(option);`;
    }

    case "number": {
      const numVal = parseFloat(data) || 0;
      const gaugeMin = gauge_min ?? 0;
      const gaugeMax = (() => {
        if (gauge_max != null) return gauge_max;
        if (!isFinite(numVal) || numVal <= 100) return 100;
        const magnitude = Math.pow(10, Math.floor(Math.log10(numVal)));
        return Math.ceil((numVal * 1.05) / magnitude) * magnitude;
      })();
      if (gauge_style !== "pointer") {
        return `
          var option = {

            series: [{
              type: 'gauge',
              min: ${gaugeMin},
              max: ${gaugeMax},
              startAngle: 90,
              endAngle: -270,
              pointer: { show: false },
              progress: {
                show: true,
                overlap: false,
                roundCap: true,
                clip: false,
                itemStyle: { borderWidth: 1, borderColor: '#464646', ${
                  number_arc_color ? `color: ${JSON.stringify(number_arc_color)}` : ""
                } }
              },
              axisLine: { lineStyle: { width: ${
                parseInt(number_ring_width, 10) || 40
              } } },
              splitLine: { show: false },
              axisTick: { show: false },
              axisLabel: { show: false },
              data: [{ value: ${JSON.stringify(numVal)} }],
              detail: {
                width: Math.min(30, Math.round(myChart.getWidth() * 0.12)),
                height: 14, fontSize: 14,
                color: ${JSON.stringify(text_color || "inherit")},
                borderColor: ${JSON.stringify(text_color || "inherit")},
                borderRadius: 20, borderWidth: 1, formatter: '{value}',
                offsetCenter: ['0%', '0%']
              }
            }]
          };
          myChart.setOption(option);`;
      }
      return `
        var option = {

          series: [{
            type: 'gauge',
            min: ${gaugeMin},
            max: ${gaugeMax},
            ${
              number_arc_color
                ? `itemStyle: { color: ${JSON.stringify(number_arc_color)} },`
                : ""
            }
            detail: {
              width: Math.min(30, Math.round(myChart.getWidth() * 0.12)),
              offsetCenter: ['0%', '0%'],
              ${text_color ? `color: ${JSON.stringify(text_color)},` : ""}
            },
            data: [{ value: ${JSON.stringify(numVal)} }]
          }]
        };
        myChart.setOption(option);`;
    }

    case "gauge": {
      const gaugeData =
        gauge_override_color || gauge_override_label
          ? data.map((d) => ({
              ...d,
              ...(gauge_override_label && { name: gauge_override_label }),
              ...(gauge_override_color && {
                itemStyle: { color: gauge_override_color },
              }),
            }))
          : data;
      const gaugeMin = gauge_min ?? 0;
      const gaugeMax = (() => {
        if (gauge_max != null) return gauge_max;
        const m = Math.max(...data.map((d) => d.value));
        if (!isFinite(m) || m <= 100) return 100;
        const magnitude = Math.pow(10, Math.floor(Math.log10(m)));
        return Math.ceil((m * 1.05) / magnitude) * magnitude;
      })();
      if (gauge_style !== "pointer") {
        return `
          var option = {

            series: [{
              type: 'gauge',
              min: ${gaugeMin},
              max: ${gaugeMax},
              startAngle: 90,
              endAngle: -270,
              pointer: { show: false },
              progress: {
                show: true,
                overlap: false,
                roundCap: true,
                clip: false,
                itemStyle: { borderWidth: 1, borderColor: '#464646' }
              },
              axisLine: { lineStyle: { width: 40 } },
              splitLine: { show: false, distance: 0, length: 10 },
              axisTick: { show: false },
              axisLabel: { show: false, distance: 50 },
              data: ${JSON.stringify(gaugeData)},
              title: { fontSize: 14 },
              detail: {
                width: 50,
                height: 14,
                fontSize: 14,
                color: ${JSON.stringify(text_color || "inherit")},
                borderColor: ${JSON.stringify(text_color || "inherit")},
                borderRadius: 20,
                borderWidth: 1,
                formatter: '{value}'
              }
            }]
          };
          myChart.setOption(option);`;
      }
      return `
        var option = {

          series: [{
            type: 'gauge',
            min: ${gaugeMin},
            max: ${gaugeMax},
            anchor: {
              show: true,
              showAbove: true,
              size: 18,
              itemStyle: { color: '#FAC858' }
            },
            pointer: {
              icon: 'path://M2.9,0.7L2.9,0.7c1.4,0,2.6,1.2,2.6,2.6v115c0,1.4-1.2,2.6-2.6,2.6l0,0c-1.4,0-2.6-1.2-2.6-2.6V3.3C0.3,1.9,1.4,0.7,2.9,0.7z',
              width: 8,
              length: '80%',
              offsetCenter: [0, '8%']
            },
            progress: { show: true, overlap: true, roundCap: true },
            axisLine: { roundCap: true },
            data: ${JSON.stringify(gaugeData)},
            title: { fontSize: 14 },
            detail: {
              width: 40,
              height: 14,
              fontSize: 14,
              color: ${JSON.stringify(text_color || "#fff")},
              backgroundColor: 'inherit',
              borderRadius: 3,
              formatter: '{value}'
            }
          }]
        };
        myChart.setOption(option);`;
    }

    default:
      return "";
  }
};

// Assigns positions to the gauge data labels
// Arc style: stack them vertically, centered, with fixed spacing
// Pointer style: spreads them horizontally at the bottom of the gauge
const positionGaugeItems = (items, getEntry, gauge_style) => {
  const n = items.length;
  if (gauge_style === "pointer") {
    const hSpacing = n > 1 ? 80 / (n - 1) : 0;
    const startX = n > 1 ? -40 : 0;
    return items.map((item, i) => ({
      ...getEntry(item),
      title: { offsetCenter: [`${startX + i * hSpacing}%`, "80%"] },
      detail: {
        valueAnimation: true,
        offsetCenter: [`${startX + i * hSpacing}%`, "95%"],
      },
    }));
  }
  const spacing = 36;
  const startY = -((n - 1) * spacing) / 2;
  return items.map((item, i) => {
    const titleY = startY + i * spacing;
    return {
      ...getEntry(item),
      title: { offsetCenter: ["0%", `${titleY}%`] },
      detail: {
        valueAnimation: true,
        offsetCenter: ["0%", `${titleY + 15}%`],
      },
    };
  });
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
    gauge_name,
    gauge_type,
    gauge_style,
    gauge_series,
    gauge_group_field,
    heatmap_x_field,
    heatmap_y_field,
    heatmap_value_field,
    bar_series_field,
  }
) => {
  const applyNullLabel = (v) =>
    (v === null || v === "") && null_label ? null_label : v || "null";
  const isMissing = (v) => v === null || v === "" || v === undefined;
  if (plot_type === "heatmap") {
    const xCategories = [
      ...new Set(rows.map((r) => String(r[heatmap_x_field] ?? "null"))),
    ];
    const yCategories = [
      ...new Set(rows.map((r) => String(r[heatmap_y_field] ?? "null"))),
    ];
    const xIndex = new Map(xCategories.map((x, i) => [x, i]));
    const yIndex = new Map(yCategories.map((y, i) => [y, i]));
    const cells = rows
      .filter((r) => r[heatmap_value_field] != null)
      .map((r) => [
        xIndex.get(String(r[heatmap_x_field] ?? "null")),
        yIndex.get(String(r[heatmap_y_field] ?? "null")),
        r[heatmap_value_field] || "-",
      ]);
    return { xCategories, yCategories, cells };
  }
  if (plot_type === "histogram") {
    return rows
      .map((r) => r[histogram_field])
      .filter((v) => v !== null && v !== undefined)
      .map((v) => [v]);
  }
  if (
    plot_type === "bar" ||
    plot_type === "pie" ||
    plot_type === "funnel" ||
    plot_type === "gauge"
  ) {
    const rows_ =
      plot_type === "gauge" || show_missing
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
    if (plot_type === "gauge") {
      if (gauge_type === "group_by_field" && gauge_group_field) {
        const groups = [...new Set(rows_.map((r) => r[gauge_group_field]))];
        return positionGaugeItems(
          groups,
          (val) => ({
            value: aggregateField(
              rows_.filter((r) => r[gauge_group_field] === val),
              outcome_field
            ),
            name: val === null ? "null" : String(val),
          }),
          gauge_style
        );
      }
      if (gauge_type === "multiple" && gauge_series?.length) {
        return positionGaugeItems(
          gauge_series,
          ({ outcome_field: of, gauge_name: gn }) => ({
            value: aggregateField(rows_, of),
            name: gn || of || "Value",
          }),
          gauge_style
        );
      }
      return [
        {
          value: aggregateField(rows_, outcome_field),
          name: gauge_name || outcome_field || "Value",
        },
      ];
    }
    if (plot_type === "pie" || plot_type === "funnel") {
      return allCategories.map((cat) => ({
        name: cat,
        value: aggregateField(
          rows_.filter((r) => String(applyNullLabel(r[factor_field])) === cat),
          outcome_field
        ),
      }));
    }
    if (bar_series_field) {
      const seriesVals = [
        ...new Set(rows_.map((r) => String(r[bar_series_field] ?? "null"))),
      ];
      return {
        categories: allCategories,
        series: seriesVals.map((sv) => ({
          name: sv,
          values: allCategories.map((cat) =>
            aggregateField(
              rows_.filter(
                (r) =>
                  String(applyNullLabel(r[factor_field])) === cat &&
                  String(r[bar_series_field] ?? "null") === sv
              ),
              outcomes?.[0]?.outcome_field
            )
          ),
        })),
      };
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

const aggTypes = ["bar", "pie", "funnel", "gauge"];

const loadAggregated = async (
  table,
  fields,
  where,
  {
    plot_type,
    statistic,
    null_label,
    show_missing,
    factor_field,
    outcome_field,
    outcomes,
    gauge_type,
    gauge_group_field,
    gauge_series,
    gauge_style,
    gauge_name,
    bar_series_field,
  }
) => {
  const stat = (statistic || "count").toLowerCase();
  const isCount = (of_) => !of_ || of_ === "Row count" || stat === "count";
  const aggFor = (of_) =>
    isCount(of_) ? { aggregate: "count" } : { field: of_, aggregate: stat };
  const outcomeFieldField = outcome_field
    ? table.getField(outcome_field)
    : null;
  if (plot_type === "gauge") {
    if (gauge_type === "group_by_field" && gauge_group_field) {
      const aggRows = await table.aggregationQuery(
        { __val: aggFor(outcome_field) },
        { where, groupBy: [gauge_group_field] }
      );
      const items = aggRows.map((r) => ({
        value: r.__val,
        name:
          r[gauge_group_field] === null ? "null" : String(r[gauge_group_field]),
      }));
      return positionGaugeItems(items, (item) => item, gauge_style);
    }
    if (gauge_type === "multiple" && gauge_series?.length) {
      const aggregations = {};
      for (const { outcome_field: of_ } of gauge_series) {
        aggregations[isCount(of_) ? "__count" : of_] = aggFor(of_);
      }
      const result = await table.aggregationQuery(aggregations, { where });
      const items = gauge_series.map(
        ({ outcome_field: of_, gauge_name: gn }) => ({
          value: isCount(of_) ? result.__count : result[of_],
          name: gn || of_ || "Value",
        })
      );
      return positionGaugeItems(items, (item) => item, gauge_style);
    }
    const result = await table.aggregationQuery(
      { __val: aggFor(outcome_field) },
      { where }
    );
    const items = [
      {
        value: result.__val,
        name:
          gauge_name || outcomeFieldField?.label || outcome_field || "Value",
      },
    ];
    return positionGaugeItems(items, (item) => item, gauge_style);
  }

  // bar / pie / funnel
  if (!factor_field)
    return plot_type === "bar" ? { categories: [], series: [] } : [];
  const applyNL = (v) =>
    (v === null || v === "") && null_label ? null_label : v ?? "null";
  const isMiss = (v) => v === null || v === "" || v === undefined;
  const factor_field_obj = fields.find((f) => f.name === factor_field);
  const factorIsFK = !!(
    factor_field_obj?.is_fkey && factor_field_obj.attributes.summary_field
  );
  let labelMap = null;
  if (factorIsFK) {
    const refTable = await Table.findOne({
      name: factor_field_obj.reftable_name,
    });
    const summaryField = factor_field_obj.attributes.summary_field;
    const labelRows = refTable ? await refTable.getRows({}) : [];
    labelMap = new Map(labelRows.map((r) => [r.id, r[summaryField]]));
  }
  const getLabel = (fkId) => {
    if (labelMap) {
      if (isMiss(fkId)) return String(applyNL(null));
      const label = labelMap.get(fkId);
      return label != null ? String(label) : String(fkId);
    }
    return String(applyNL(fkId));
  };
  let seriesLabelMap = null;
  if (bar_series_field) {
    const series_field_obj = fields.find((f) => f.name === bar_series_field);
    if (
      series_field_obj?.is_fkey &&
      series_field_obj.attributes.summary_field
    ) {
      const refTable = await Table.findOne({
        name: series_field_obj.reftable_name,
      });
      const summaryField = series_field_obj.attributes.summary_field;
      const labelRows = refTable ? await refTable.getRows({}) : [];
      seriesLabelMap = new Map(labelRows.map((r) => [r.id, r[summaryField]]));
    }
  }
  const getSeriesLabel = (val) => {
    if (seriesLabelMap) {
      if (isMiss(val)) return "null";
      const label = seriesLabelMap.get(val);
      return label != null ? String(label) : String(val);
    }
    return String(val ?? "null");
  };
  if (plot_type === "bar" && bar_series_field) {
    const of_ = outcomes?.[0]?.outcome_field;
    const aggKey = isCount(of_) ? "__count" : of_;
    const bsAggRows = await table.aggregationQuery(
      { [aggKey]: aggFor(of_) },
      { where, groupBy: [factor_field, bar_series_field] }
    );
    const bsFiltered = show_missing
      ? bsAggRows
      : bsAggRows.filter((r) => !isMiss(r[factor_field]));
    const getBsVal = (r) => (isCount(of_) ? r.__count : r[of_]);
    const catSeen = new Set();
    const categories = [];
    for (const r of bsFiltered) {
      const cat = getLabel(r[factor_field]);
      if (!catSeen.has(cat)) {
        categories.push(cat);
        catSeen.add(cat);
      }
    }
    const seriesVals = [
      ...new Set(bsFiltered.map((r) => getSeriesLabel(r[bar_series_field]))),
    ];
    const lookup = new Map();
    for (const r of bsFiltered) {
      const key = `${getLabel(r[factor_field])}\x00${getSeriesLabel(
        r[bar_series_field]
      )}`;
      lookup.set(key, getBsVal(r));
    }
    return {
      categories,
      series: seriesVals.map((sv) => ({
        name: sv,
        values: categories.map((cat) => lookup.get(`${cat}\x00${sv}`) ?? 0),
      })),
    };
  }
  const allOutcomeFields =
    plot_type === "bar"
      ? (outcomes || []).map((o) => o.outcome_field)
      : [outcome_field];
  const aggregations = {};
  for (const of_ of allOutcomeFields) {
    aggregations[isCount(of_) ? "__count" : of_] = aggFor(of_);
  }
  const aggRows = await table.aggregationQuery(aggregations, {
    where,
    groupBy: [factor_field],
  });
  const filtered = show_missing
    ? aggRows
    : aggRows.filter((r) => !isMiss(r[factor_field]));
  const getVal = (r, of_) => (isCount(of_) ? r.__count : r[of_]);
  if (plot_type === "pie" || plot_type === "funnel") {
    return filtered.map((r) => ({
      name: getLabel(r[factor_field]),
      value: getVal(r, outcome_field),
      ...(factorIsFK && { fkId: r[factor_field] }),
    }));
  }
  const categories = filtered.map((r) => getLabel(r[factor_field]));
  return {
    categories,
    ...(factorIsFK && { categoryIds: filtered.map((r) => r[factor_field]) }),
    series: (outcomes || []).map(({ outcome_field: of_ }) => {
      const ofField = of_ ? table.getField(of_) : null;
      return {
        name: ofField?.label || of_ || "Count",
        values: filtered.map((r) => getVal(r, of_)),
      };
    }),
  };
};

const loadRows = async (
  table,
  fields,
  where,
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
    gauge_type,
    gauge_series,
    gauge_group_field,
    heatmap_x_field,
    heatmap_y_field,
    heatmap_value_field,
    bar_series_field,
  }
) => {
  const joinFields = {};
  const qfields = [];

  const gfield = fields.find((f) => f.name === group_field);
  let joinedConfigKey = null;
  let hmFieldMap = null;
  if (plot_type === "heatmap") {
    const xFieldObj = fields.find((f) => f.name === heatmap_x_field);
    const yFieldObj = fields.find((f) => f.name === heatmap_y_field);
    const xIsFK = !!(xFieldObj?.is_fkey && xFieldObj.attributes.summary_field);
    const yIsFK = !!(yFieldObj?.is_fkey && yFieldObj.attributes.summary_field);
    let effectiveXField = heatmap_x_field;
    let effectiveYField = heatmap_y_field;
    if (xIsFK) {
      joinFields.__hm_x = {
        ref: heatmap_x_field,
        target: xFieldObj.attributes.summary_field,
      };
      effectiveXField = "__hm_x";
    } else if (heatmap_x_field) {
      qfields.push(heatmap_x_field);
    }
    if (yIsFK) {
      joinFields.__hm_y = {
        ref: heatmap_y_field,
        target: yFieldObj.attributes.summary_field,
      };
      effectiveYField = "__hm_y";
    } else if (heatmap_y_field) {
      qfields.push(heatmap_y_field);
    }
    if (heatmap_value_field && heatmap_value_field !== "Row count")
      qfields.push(heatmap_value_field);
    if (
      effectiveXField !== heatmap_x_field ||
      effectiveYField !== heatmap_y_field
    ) {
      hmFieldMap = {
        ...(effectiveXField !== heatmap_x_field && {
          heatmap_x_field: effectiveXField,
        }),
        ...(effectiveYField !== heatmap_y_field && {
          heatmap_y_field: effectiveYField,
        }),
      };
    }
  } else if (plot_type === "histogram") {
    qfields.push(histogram_field);
  } else if (plot_type === "gauge") {
    if (gauge_type === "multiple") {
      for (const { outcome_field: of } of gauge_series || []) {
        if (of && of !== "Row count") qfields.push(of);
      }
    } else if (gauge_type === "group_by_field") {
      if (gauge_group_field) qfields.push(gauge_group_field);
      if (outcome_field && outcome_field !== "Row count")
        qfields.push(outcome_field);
    } else if (outcome_field && outcome_field !== "Row count") {
      qfields.push(outcome_field);
    }
  } else if (
    plot_type === "bar" ||
    plot_type === "pie" ||
    plot_type === "funnel"
  ) {
    const factor_field_obj = fields.find((f) => f.name === factor_field);
    const factorIsFK = !!(
      factor_field_obj?.is_fkey && factor_field_obj.attributes.summary_field
    );
    if (factorIsFK) {
      joinedConfigKey = "factor_field";
      joinFields.__groupjoin = {
        ref: factor_field,
        target: factor_field_obj.attributes.summary_field,
      };
    } else {
      qfields.push(factor_field);
    }
    if (plot_type === "bar") {
      if (bar_series_field) qfields.push(bar_series_field);
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
  return { rows, joinedConfigKey, hmFieldMap };
};

const run = async (table_id, viewname, config, state, { req }, queriesObj) => {
  const table = await Table.findOne({ id: table_id });
  const fields = await table.getFields();

  // Extract the selected factor value for highlighting before stripping it from state.
  // The factor field is excluded from the WHERE clause so the chart always shows all
  // data — other views on the page use the state to filter, the chart only highlights.
  const factorField = config.factor_field;
  const selected =
    factorField &&
    state[factorField] &&
    !(Array.isArray(state[factorField]) || state[factorField]?.in)
      ? state[factorField]
      : undefined;
  const stateForWhere = factorField
    ? Object.fromEntries(
        Object.entries(state).filter(([k]) => k !== factorField)
      )
    : state;

  readState(stateForWhere, fields);
  const where = await stateFieldsToWhere({ fields, state: stateForWhere });
  if (config.include_fml) {
    const ctx = {
      ...stateForWhere,
      user_id: req?.user?.id || null,
      user: req?.user,
    };
    mergeIntoWhere(where, jsexprToWhere(config.include_fml, ctx, fields) || {});
  }

  const useAgg =
    typeof table.aggregationQuery === "function" &&
    aggTypes.includes(config.plot_type);
  getState().log(
    6,
    `charts: table=${table.name} plot_type=${config.plot_type} query_type=${
      useAgg ? "aggregationQuery" : "loadRows"
    }`
  );
  let data;
  if (config.plot_type === "number") {
    const rawVal = config.number_state_field
      ? state[config.number_state_field]
      : undefined;
    data = parseFloat(rawVal) || 0;
  } else if (useAgg) {
    data = await loadAggregated(table, fields, where, config);
  } else {
    const { rows, joinedConfigKey, hmFieldMap } = await loadRows(
      table,
      fields,
      where,
      config
    );
    const effectiveConfig = joinedConfigKey
      ? { ...config, [joinedConfigKey]: "__groupjoin" }
      : hmFieldMap
      ? { ...config, ...hmFieldMap }
      : config;
    data = prepChartData(rows, effectiveConfig);
  }

  const chartScript = buildChartScript(data, { ...config, selected });
  if (!chartScript) return "";
  const divid = `echarts_${viewname}_${Math.random().toString(36).slice(2, 8)}`;
  const { mleft, mright, mtop, mbottom } = config;
  const paddingParts = [
    mtop != null ? `padding-top:${mtop}px` : "",
    mright != null ? `padding-right:${mright}px` : "",
    mbottom != null ? `padding-bottom:${mbottom}px` : "",
    mleft != null ? `padding-left:${mleft}px` : "",
  ]
    .filter(Boolean)
    .join(";");
  const heightStyle = config.chart_height
    ? `height:${config.chart_height}px;`
    : `aspect-ratio:2/1;min-height:150px;`;
  const labelHtml = config.title
    ? `<div style="display:block;margin:0;padding:0;line-height:normal;text-align:center;font-size:1rem;font-weight:600;color:#6b7280;letter-spacing:0.04em;">${text_attr(
        config.title
      )}</div>`
    : "";
  const chartHasLegend = (() => {
    const pt = config.plot_type;
    if (pt === "pie")
      return (
        config.pie_label_position === "legend" ||
        config.pie_label_position === "outside"
      );
    if (pt === "funnel") return true;
    if (
      pt === "histogram" ||
      pt === "gauge" ||
      pt === "heatmap" ||
      pt === "number"
    )
      return false;
    return (
      config.show_legend === true ||
      config.show_legend === "true" ||
      config.show_legend === 1
    );
  })();
  const textColorScript = config.text_color
    ? `myChart.setOption({ textStyle: { color: ${JSON.stringify(
        config.text_color
      )} }${
        chartHasLegend
          ? `, legend: { textStyle: { color: ${JSON.stringify(
              config.text_color
            )} } }`
          : ""
      } });`
    : "";
  const chartDiv =
    div({
      id: divid,
      style: `display:block;width:100%;${heightStyle}`,
    }) +
    script(
      domReady(`
        var chartDom = document.getElementById(${JSON.stringify(divid)});
        var myChart = echarts.init(chartDom);
        new ResizeObserver(function() { myChart.resize(); }).observe(chartDom);
        ${chartScript}
        ${textColorScript}
      `)
    );
  const inner = `<div style="display:inline-block;vertical-align:top;width:100%;">${labelHtml}${chartDiv}</div>`;
  return paddingParts ? `<div style="${paddingParts}">${inner}</div>` : inner;
};

module.exports = {
  name: "Chart",
  display_state_form: false,
  get_state_fields,
  configuration_workflow,
  run,
};
