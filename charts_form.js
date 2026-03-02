const Form = require("@saltcorn/data/models/form");
const FieldRepeat = require("@saltcorn/data/models/fieldrepeat");
const Table = require("@saltcorn/data/models/table");
const { code } = require("@saltcorn/markup/tags");

const multiAblePlots = ["line", "area", "scatter"];

const buildChartsForm = async (context) => {
  const table = await Table.findOne({ id: context.table_id });
  const fields = await table.getFields();
  const fieldOptions = fields.map((f) => f.name);
  const group_fields = fields
    .filter((f) => ["Integer", "String"].includes(f.type.name) || f.is_fkey)
    .map((f) => f.name);
  const factor_fields = fields
    .filter(
      (f) => ["String", "Bool", "Integer"].includes(f.type.name) || f.is_fkey
    )
    .map((f) => f.name);
  const outcome_fields = [
    "Row count",
    ...fields
      .filter((f) => ["Float", "Integer", "Money"].includes(f.type.name))
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
            { label: "Funnel chart", name: "funnel" },
            { label: "Gauge chart", name: "gauge" },
            { label: "Heatmap", name: "heatmap" },
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
      {
        name: "heatmap_x_field",
        label: "X axis field",
        type: "String",
        required: true,
        showIf: { plot_type: "heatmap" },
        attributes: { options: factor_fields },
      },
      {
        name: "heatmap_y_field",
        label: "Y axis field",
        type: "String",
        required: true,
        showIf: { plot_type: "heatmap" },
        attributes: { options: factor_fields },
      },
      {
        name: "heatmap_value_field",
        label: "Value field",
        type: "String",
        required: true,
        showIf: { plot_type: "heatmap" },
        attributes: { options: outcome_fields },
      },
      {
        name: "heatmap_min",
        label: "Color scale min",
        type: "Float",
        sublabel: "Leave empty for 0",
        showIf: { plot_type: "heatmap" },
        attributes: { asideNext: true },
      },
      {
        name: "heatmap_max",
        label: "Color scale max",
        type: "Float",
        sublabel: "Leave empty for automatic",
        showIf: { plot_type: "heatmap" },
      },
      {
        name: "heatmap_color_scale",
        label: "Color scale type",
        type: "String",
        sublabel:
          "Gradient: smooth continuous color transition between min and max. " +
          "Steps: discrete color bands, each covering an equal value interval.",
        showIf: { plot_type: "heatmap" },
        attributes: {
          options: [
            { label: "Gradient", name: "gradient" },
            { label: "Steps", name: "steps" },
          ],
        },
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
        showIf: { plot_type: ["pie", "funnel", "gauge"] },
        attributes: { options: outcome_fields },
      },
      {
        name: "factor_field",
        label: "Factor field",
        type: "String",
        required: true,
        showIf: { plot_type: ["bar", "pie", "funnel"] },
        attributes: { options: factor_fields },
      },
      {
        name: "statistic",
        label: "Statistic",
        type: "String",
        required: true,
        showIf: { plot_type: ["bar", "pie", "funnel", "gauge"] },
        attributes: { options: ["Count", "Avg", "Sum", "Max", "Min"] },
      },
      {
        name: "gauge_min",
        label: "Min value",
        type: "Float",
        sublabel: "Leave empty to use 0",
        showIf: { plot_type: "gauge" },
        attributes: { asideNext: true },
      },
      {
        name: "gauge_max",
        label: "Max value",
        type: "Float",
        sublabel: "Leave empty for automatic",
        showIf: { plot_type: "gauge" },
      },
      {
        name: "gauge_style",
        label: "Gauge style",
        type: "String",
        showIf: { plot_type: "gauge" },
        attributes: {
          options: [
            { label: "Arcs", name: "arcs" },
            { label: "Pointer", name: "pointer" },
          ],
        },
      },
      {
        name: "gauge_type",
        label: "Gauge type",
        type: "String",
        showIf: { plot_type: "gauge" },
        attributes: {
          options: [
            { label: "Single", name: "single" },
            { label: "Multiple", name: "multiple" },
            { label: "Group by field", name: "group_by_field" },
          ],
        },
      },
      {
        name: "gauge_group_field",
        label: "Group field",
        type: "String",
        required: true,
        showIf: { plot_type: "gauge", gauge_type: "group_by_field" },
        attributes: { options: factor_fields },
      },
      {
        name: "gauge_name",
        label: "Gauge label",
        type: "String",
        showIf: { plot_type: "gauge", gauge_type: "single" },
      },
      new FieldRepeat({
        name: "gauge_series",
        label: "Gauge series",
        showIf: { plot_type: "gauge", gauge_type: "multiple" },
        fields: [
          {
            name: "outcome_field",
            label: "Outcome field",
            type: "String",
            required: true,
            attributes: { options: outcome_fields },
          },
          {
            name: "gauge_name",
            label: "Label",
            type: "String",
          },
        ],
      }),
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
        name: "bar_axis_title",
        label: "Value axis title",
        type: "String",
        showIf: { plot_type: "bar" },
      },
      {
        name: "lower_limit",
        label: "Lower value limit",
        type: "Float",
        showIf: { plot_type: "bar" },
      },
      {
        name: "upper_limit",
        label: "Upper value limit",
        type: "Float",
        showIf: { plot_type: "bar" },
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
      {
        name: "show_missing",
        label: "Show missing values",
        type: "Bool",
        showIf: {
          plot_type: ["bar", "pie", "line", "area", "scatter", "funnel"],
        },
      },
      {
        name: "null_label",
        label: "Label for missing values",
        type: "String",
        showIf: { show_missing: true },
      },
      {
        name: "show_legend",
        label: "Show legend",
        type: "Bool",
        showIf: { plot_type: ["line", "area", "scatter", "bar"] },
      },
      { input_type: "section_header", label: "Margins" },
      {
        name: "mleft",
        label: "Left (px)",
        type: "Integer",
        attributes: { asideNext: true },
      },
      {
        name: "mright",
        label: "Right (px)",
        type: "Integer",
      },
      {
        name: "mtop",
        label: "Top (px)",
        type: "Integer",
        attributes: { asideNext: true },
      },
      {
        name: "mbottom",
        label: "Bottom (px)",
        type: "Integer",
      },
    ],
  });
};

module.exports = { buildChartsForm, multiAblePlots };
