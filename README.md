# charts

A [Saltcorn](https://github.com/saltcorn/saltcorn) plugin that renders interactive charts using [Apache ECharts](https://echarts.apache.org/).

## Chart types

| Type | Description |
|------|-------------|
| **Line** | Line chart with optional smooth curves. Supports single series, multiple series, or group-by-field. |
| **Area** | Filled area chart. Same options as line. |
| **Scatter** | Scatter plot. Supports single or multiple series. |
| **Bar** | Vertical or horizontal bar chart. Supports multiple outcome fields, stacking, series field pivoting, and axis title/limits. |
| **Pie** | Pie or donut chart. Label position: inside or legend. |
| **Histogram** | Histogram using ECharts statistical transforms. |
| **Funnel** | Funnel chart with descending sort and percentage labels. |
| **Gauge** | Gauge chart in arc or pointer style. Supports single value, multiple named values, group-by-field, or a value read directly from a URL/state parameter. |
| **Heatmap** | 2D heatmap with a continuous or stepped color scale. |

## Configuration options

### Common options

| Option | Description |
|--------|-------------|
| **Plot title** | Optional title rendered as HTML above the chart. |
| **Row inclusion formula** | JavaScript expression to filter rows (e.g. `status === "active"`). In scope: all table fields plus `user`, `year`, `month`, `day`, `today()`. |
| **Show missing values** | Include rows where the factor field is null/empty. |
| **Label for missing values** | Display label used for null/empty factor values when "Show missing values" is on. |
| **Filter on click** | When enabled, clicking a bar segment or pie slice sets a page-level state field. |
| **Padding** | Left / right / top / bottom padding in pixels around the chart. |
| **Chart height** | Fixed height in pixels. When omitted the chart uses a 2:1 aspect ratio with a 150 px minimum. |
| **Text color** | Default color for data labels (e.g. slice labels on pie, gauge value text). Can be overridden per series in the Overrides section. |

### Line / Area / Scatter

| Option | Description |
|--------|-------------|
| **Plot series** | Single series, multiple series (pick Y fields), or group by a field. |
| **X field** | Field for the X axis. |
| **Y field** | Field for the Y axis (single / group-by mode). |
| **Smooth line** | Enable curve smoothing (line and area only). |
| **Show legend** | Show series legend. |

### Bar

| Option | Description |
|--------|-------------|
| **Factor field** | Categorical field whose distinct values appear as groups along the X axis. |
| **Series field** | Optional second categorical field that splits each bar group into separate series — one per distinct value. Enable **Stack series** to stack them. When this field is set, the first Outcome (or Row count if none) is used as the aggregated value; the Outcomes list is otherwise ignored. |
| **Outcomes** | One or more numeric fields (or "Row count") to aggregate. Each becomes its own series (not used when Series field is set). |
| **Statistic** | Aggregation: Count, Avg, Sum, Max, or Min. |
| **Stack series** | Stack outcome series on top of each other. |
| **Orientation** | Vertical (default) or horizontal. |
| **Value axis title** | Label on the value axis. |
| **Lower / Upper value limit** | Clamp the value axis range. |
| **Show legend** | Show series legend. |

### Pie

| Option | Description |
|--------|-------------|
| **Factor field** | Categorical field whose distinct values become slices. |
| **Outcome field** | Numeric field (or "Row count") to aggregate per slice. |
| **Statistic** | Aggregation: Count, Avg, Sum, Max, or Min. |
| **Donut** | Render as a donut. |
| **Ring width (%)** | Thickness of the donut ring (1–100). |
| **Label position** | Inside (labels on slices) or legend (labels in the legend, percentages on slices). |

### Histogram

| Option | Description |
|--------|-------------|
| **Data field** | Numeric field to compute the histogram over. |

### Funnel

| Option | Description |
|--------|-------------|
| **Factor field** | Categorical field whose distinct values become funnel stages. |
| **Outcome field** | Numeric field (or "Row count") to aggregate per stage. |
| **Statistic** | Aggregation: Count, Avg, Sum, Max, or Min. |

### Gauge

| Option | Description |
|--------|-------------|
| **Gauge type** | How the value is sourced: **Single** (aggregate one field), **Multiple** (several named fields), **Group by field** (one gauge per group), or **From state field** (value from a URL/state parameter — no table aggregation). |
| **Outcome field** | Numeric field (or "Row count") to aggregate. Not used for "From state field". |
| **Statistic** | Aggregation: Count, Avg, Sum, Max, or Min. Not used for "From state field". |
| **Min / Max value** | Value range for the gauge arc. Max defaults to automatic. |
| **Style** | Arcs (concentric progress rings) or Pointer (classic needle). |
| **Group field** | Field whose distinct values each get their own gauge (group-by mode). |
| **Gauge label** | Display name for single-value and from-state gauges. |
| **State field** | Name of the URL/state parameter whose numeric value to display (from-state mode only). |
| **Ring width (px)** | Thickness of the arc ring in pixels. Default: 40. (from-state mode only). |

### Heatmap

| Option | Description |
|--------|-------------|
| **X axis field** | Categorical or FK field for the X axis. |
| **Y axis field** | Categorical or FK field for the Y axis. |
| **Value field** | Numeric field whose value determines cell color. |
| **Color scale min** | Minimum value for the color scale (defaults to 0). |
| **Color scale max** | Maximum value for the color scale (defaults to automatic). |
| **Color scale type** | Gradient (smooth continuous transition) or Steps (discrete equal-width bands). |

## Overrides

Each chart type (except Histogram and Heatmap) has an **Overrides** section that lets you customize individual series or data items by name.

| Field | Applies to | Description |
|-------|-----------|-------------|
| **Series name** | All | Exact name of the series or data item to match. |
| **Color** | All | Fill / line color for the matched series (hex, e.g. `#22ee55`). |
| **Text color** | All | Legend label color for the matched series. Also colors data-point labels when shown. |
| **Label** | All | Override the display name shown in the legend. |

Gauge charts have simplified overrides: **Color** (arc color) and **Label** (display name).

## State / filtering integration

When a **Factor field** is configured on a bar or pie chart, clicking a bar segment or pie slice calls `set_state_field` with the factor value. Clicking the same item again calls `unset_state_field` to deselect. This integrates with Saltcorn's PJAX state so that other views on the same page can react to the selection.

The chart itself **always shows all data** — the factor field is excluded from its own WHERE clause so the full dataset is visible. The selected value is only used for highlighting (opacity dimming on bars, slice offset on pie).

For **foreign-key factor fields**, `set_state_field` is called with the raw FK integer ID (not the display label), so other views that filter by the same FK field receive the correct value.

## Foreign key fields

Fields that reference another table via a foreign key are resolved to their summary field automatically:

- **Heatmap** X/Y axis: resolved via a JOIN in `getJoinedRows`.
- **Bar / Pie / Funnel** factor field: resolved via a two-step lookup — `aggregationQuery` groups by raw FK ID, then the reference table is queried to build an ID → label map.
- **Bar** series field: same two-step FK resolution.

## Technical notes

- Charts are rendered client-side using the bundled `echarts.min.js` and `ecStat.min.js` in `public/`.
- When the underlying table supports `aggregationQuery` (normal tables, not external), bar/pie/funnel/gauge use it for efficient DB-level aggregation. Gauge with `gauge_type: "from_state"` skips aggregation entirely and reads the value directly from page state. Other plot types always use `getJoinedRows`.
- Zero values in heatmap cells are displayed as `"-"` and rendered in dark gray (via ECharts `outOfRange`) so they do not skew the color scale.
- The plot title is rendered as an HTML element above the chart (not via ECharts) so it never takes up chart canvas space.
- Legend is positioned at the bottom of the chart; when shown, the chart grid reserves 50 px of space to prevent overlap.
