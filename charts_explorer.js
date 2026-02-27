const Workflow = require("@saltcorn/data/models/workflow");
const Form = require("@saltcorn/data/models/form");
const Table = require("@saltcorn/data/models/table");
const View = require("@saltcorn/data/models/view");
const { renderForm } = require("@saltcorn/markup");
const { pre, code, script } = require("@saltcorn/markup/tags");
const { getState } = require("@saltcorn/data/db/state");
const { buildChartsForm } = require("./charts_form");
const { run: renderChart } = require("./echarts_view");

const configuration_workflow = () =>
  new Workflow({
    steps: [],
  });

const getForm = async ({ viewname, body }) => {
  const tables = await Table.find({});
  const fields = [
    {
      name: "table_name",
      label: "Table",
      type: "String",
      required: true,
      attributes: {
        options: [
          { name: "", label: "Select table...", disabled: true },
          ...tables.map((t) => t.name),
        ],
      },
    },
  ];
  fields.push({ name: "newviewname", input_type: "hidden" });
  if (body && body.table_name) {
    const table = await Table.findOne({ name: body.table_name });
    if (table) {
      const chartForm = await buildChartsForm({ table_id: table.id });
      fields.push(...chartForm.fields);
    }
  }
  return new Form({
    action: `/view/${viewname}`,
    fields,
    onChange: "$(this).submit()",
    noSubmitButton: true,
    additionalButtons: [
      {
        label: "Save as view",
        onclick: "save_as_view(this)",
        class: "btn btn-primary",
      },
    ],
  });
};

const js = (viewname) =>
  script(`
function save_as_view(that) {
  const form = $(that).closest('form');
  const newviewname = prompt("Please enter the name of the view to be saved", "");
  if(!newviewname) return;
  $('input[name=newviewname]').val(newviewname)
  view_post("${viewname}", "save_as_view", $(form).serialize())
}
`);

const run = async (table_id, viewname, config, state, { req }, queriesObj) => {
  const form = await getForm({ viewname });
  return renderForm(form, req.csrfToken());
};

const runPost = async (
  table_id,
  viewname,
  config,
  state,
  body,
  { req, res }
) => {
  const form = await getForm({ viewname, body });
  form.validate(body);
  let plot = "";
  if (!form.hasErrors && body.table_name && body.plot_type) {
    const table = await Table.findOne({ name: body.table_name });
    if (table) {
      try {
        plot = await renderChart(table.id, viewname, form.values, state, {
          req,
        });
      } catch (e) {
        plot = pre(code(e.stack));
      }
    }
  }
  form.hasErrors = false;
  form.errors = {};
  res.sendWrap("Charts Explorer", [
    renderForm(form, req.csrfToken()),
    js(viewname),
    plot,
  ]);
};

const save_as_view = async (table_id, viewname, config, body, { req }) => {
  const form = await getForm({ viewname, body });
  form.validate(body);
  if (!form.hasErrors) {
    const { _csrf, table_name, newviewname, ...configuration } = form.values;
    const existing = await View.findOne({ name: newviewname });
    if (existing) {
      return { json: { error: "A view with that name already exists" } };
    }
    const table = await Table.findOne({ name: table_name });
    await View.create({
      table_id: table.id,
      configuration,
      name: newviewname,
      viewtemplate: "Chart",
      min_role: 1,
    });
    await getState().refresh_views();
    return { json: { success: "ok", notify: `View ${newviewname} created` } };
  }
  return { json: { error: "Form incomplete" } };
};

module.exports = {
  name: "Charts Explorer",
  display_state_form: false,
  tableless: true,
  singleton: true,
  description: "Explore data and create charts",
  get_state_fields: () => [],
  configuration_workflow,
  run,
  runPost,
  routes: { save_as_view },
};
