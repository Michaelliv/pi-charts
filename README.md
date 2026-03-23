# pi-charts

Chart rendering for [pi](https://github.com/badlogic/pi-mono). Powered by [charts-cli](https://github.com/Michaelliv/charts-cli) SDK and [ECharts](https://echarts.apache.org/).

Ask pi to "chart this data" and get a rendered PNG — inline in the conversation and saved to disk. Bar, line, pie, scatter, radar, funnel, gauge, treemap, boxplot, heatmap, candlestick, sankey — all 12 ECharts series types, plus full component support.

## Install

```bash
pi install npm:@miclivs/pi-charts
```

## Usage

Just ask pi to visualize data. The extension adds two tools the LLM calls automatically:

- **"Plot monthly revenue as a bar chart"** → grouped bar chart with legend
- **"Show a pie chart of browser market share"** → pie with labeled segments
- **"Heatmap of commits by day and hour"** → color-scaled grid
- **"Radar chart comparing Alice and Bob's skills"** → overlaid radar polygons

The LLM fetches the schema first (`chart_schema`), builds a valid ECharts config, then renders it (`render_chart`).

## Tools

### `chart_schema`

Get the JSON schema for any chart type or component. The LLM uses this to build valid configs.

```
chart_schema({ type: "list" })     # list all available types
chart_schema({ type: "bar" })      # schema for bar series
chart_schema({ type: "xAxis" })    # schema for xAxis component
chart_schema({ type: "full" })     # complete EChartsOption schema
```

**Series:** bar, line, pie, scatter, radar, funnel, gauge, treemap, boxplot, heatmap, candlestick, sankey

**Components:** title, tooltip, grid, xAxis, yAxis, legend, dataZoom, visualMap, toolbox, dataset, radar-coord, polar, geo

### `render_chart`

Render an ECharts JSON configuration to PNG.

```
render_chart({
  option: '{"xAxis":{...},"series":[...]}',
  width: 1200,
  height: 600,
  theme: "dark",
  filename: "revenue"
})
```

The image renders inline in the conversation via a custom `renderResult` component. If `saveToDisk` is enabled (default), it's also written to `.charts/output/`.

## Settings

On first render, `.charts/settings.json` is created with defaults:

```json
{
  "saveToDisk": true,
  "width": 1200,
  "height": 600,
  "defaultTheme": "dark",
  "maxWidthCells": 90
}
```

| Setting | Default | Description |
|---------|---------|-------------|
| `saveToDisk` | `true` | Save rendered PNGs to `.charts/output/` |
| `width` | `1200` | Default image width in pixels |
| `height` | `600` | Default image height in pixels |
| `defaultTheme` | `"dark"` | Default ECharts theme (`dark`, `vintage`, or `null` for light) |
| `maxWidthCells` | `90` | Max terminal cell width for inline image display |

## How it works

1. LLM calls `chart_schema` to get the JSON schema for the chart type it needs
2. LLM builds a valid ECharts option object using the schema
3. LLM calls `render_chart` with the option JSON
4. Extension calls `charts-cli` SDK → ECharts server-side render → SVG → resvg → PNG
5. PNG is returned inline as a base64 image (rendered via pi-tui `Image` component)
6. PNG is also saved to `.charts/output/` if `saveToDisk` is enabled

No browser. No GUI. No network requests. Everything runs locally via ECharts SSR.

## License

MIT
