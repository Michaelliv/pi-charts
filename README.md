# pi-charts

Pi extension for rendering charts. Powered by [charts-cli](https://github.com/Michaelliv/charts-cli) SDK.

## Install

```bash
pi settings add-package npm:pi-charts
```

## Tools

### `charts_render`

Render an ECharts JSON configuration to a PNG image.

```
charts_render({ option: '{"xAxis":{...},"series":[...]}' })
```

Options: `width`, `height`, `theme` (`dark`, `vintage`), `filename`.

### `charts_schema`

Get the JSON schema for a chart type or component.

```
charts_schema({ type: "bar" })
charts_schema({ type: "list" })
```

Supports: bar, line, pie, scatter, radar, funnel, gauge, treemap, boxplot, heatmap, candlestick, sankey, and all ECharts components.

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
| `defaultTheme` | `"dark"` | Default ECharts theme |
| `maxWidthCells` | `90` | Max terminal width for inline image display |
