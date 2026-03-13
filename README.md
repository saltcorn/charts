# charts

A [Saltcorn](https://github.com/saltcorn/saltcorn) plugin that renders interactive charts using [Apache ECharts](https://echarts.apache.org/).

## Chart types

| Type | Description |
|------|-------------|
| **Line** | Line chart with optional smooth curves. Supports single series, multiple series, or group-by-field. |
| **Area** | Filled area chart. Same options as line. |
| **Scatter** | Scatter plot. Supports single or multiple series. |
| **Bar** | Vertical or horizontal bar chart. Supports multiple outcome fields, stacking, and axis title/limits. |
| **Pie** | Pie or donut chart. Label position: inside, outside (rich label), or legend. |
| **Histogram** | Histogram using ECharts statistical transforms. |
| **Funnel** | Funnel chart with descending sort and percentage labels. |
| **Gauge** | Gauge chart in arc or pointer style. Supports single value, multiple named values, or group-by-field. |
| **Heatmap** | 2D heatmap with a continuous or stepped color scale. |

## Configuration options

### Common options

| Option | Description |
|--------|-------------|
| **Plot title** | Optional title rendered above the chart. |
| **Row inclusion formula** | JavaScript expression to filter rows (e.g. `status === "active"`). In scope: all table fields plus `user`, `year`, `month`, `day`, `today()`. |
| **Show missing values** | Include rows where the factor field is null/empty. |
| **Label for missing values** | Display label used for null/empty factor values when "Show missing values" is on. |
| **Margins** | Left / right / top / bottom margins in pixels. |

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
| **Factor field** | Categorical field whose distinct values become the bars. |
| **Outcomes** | One or more numeric fields (or "Row count") to aggregate. Each becomes a series. |
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
| **Label position** | Inside, outside (rich callout labels), or legend. |

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
| **Outcome field** | Numeric field (or "Row count") to aggregate. |
| **Statistic** | Aggregation: Count, Avg, Sum, Max, or Min. |
| **Min / Max value** | Value range for the gauge arc. Max defaults to automatic. |
| **Gauge style** | Arcs (concentric progress rings) or Pointer (classic needle). |
| **Gauge type** | Single value, multiple named values (FieldRepeat), or group-by-field. |
| **Group field** | Field whose distinct values each get their own gauge (group-by mode). |
| **Gauge label** | Display name for the single-value gauge. |

### Heatmap

| Option | Description |
|--------|-------------|
| **X axis field** | Categorical or FK field for the X axis. |
| **Y axis field** | Categorical or FK field for the Y axis. |
| **Value field** | Numeric field whose value determines cell color. |
| **Color scale min** | Minimum value for the color scale (defaults to 0). |
| **Color scale max** | Maximum value for the color scale (defaults to automatic). |
| **Color scale type** | Gradient (smooth continuous transition) or Steps (discrete equal-width bands). |

## State / filtering integration

When a **Factor field** is configured on a bar or pie chart, clicking a bar segment or pie slice calls `set_state_field` with the factor value. Clicking the same item again calls `unset_state_field` to deselect. This integrates with Saltcorn's PJAX state so that other views on the same page can react to the selection.

The chart itself **always shows all data** — the factor field is excluded from its own WHERE clause so the full dataset is visible. The selected value is only used for highlighting (opacity dimming on bars, slice offset on pie).

For **foreign-key factor fields**, `set_state_field` is called with the raw FK integer ID (not the display label), so other views that filter by the same FK field receive the correct value.

## Foreign key fields

Fields that reference another table via a foreign key are resolved to their summary field automatically:

- **Heatmap** X/Y axis: resolved via a JOIN in `getJoinedRows`.
- **Bar / Pie / Funnel** factor field: resolved via a two-step lookup — `aggregationQuery` groups by raw FK ID, then the reference table is queried to build an ID → label map.

## Technical notes

- Charts are rendered client-side using the bundled `echarts.min.js` and `ecStat.min.js` in `public/`.
- When the underlying table supports `aggregationQuery` (normal tables, not external), bar/pie/funnel/gauge use it for efficient DB-level aggregation. Other plot types always use `getJoinedRows`.
- Zero values in heatmap cells are displayed as `"-"` and rendered in dark gray (via ECharts `outOfRange`) so they do not skew the color scale.
