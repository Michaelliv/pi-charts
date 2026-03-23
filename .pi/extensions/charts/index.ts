import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { StringEnum } from "@mariozechner/pi-ai";
import { Container, Image, Text, getCapabilities } from "@mariozechner/pi-tui";
import { createCharts } from "charts-cli";

const charts = createCharts();
const { series, components } = charts.listSchemaTypes();
const ALL_TYPES = [...series, ...components] as const;

interface ChartsConfig {
	saveToDisk: boolean;
	width: number;
	height: number;
	defaultTheme: string | undefined;
	maxWidthCells: number;
}

const DEFAULT_CONFIG: ChartsConfig = {
	saveToDisk: true,
	width: 1200,
	height: 600,
	defaultTheme: "dark",
	maxWidthCells: 90,
};

function ensureChartsDir(cwd: string): void {
	const dir = join(cwd, ".charts");
	if (existsSync(dir)) return;
	mkdirSync(dir, { recursive: true });
	writeFileSync(
		join(dir, "settings.json"),
		JSON.stringify(DEFAULT_CONFIG, null, 2) + "\n",
	);
}

function loadConfig(cwd: string): ChartsConfig {
	const configPath = join(cwd, ".charts", "settings.json");
	if (!existsSync(configPath)) return { ...DEFAULT_CONFIG };
	try {
		const raw = JSON.parse(readFileSync(configPath, "utf-8"));
		return {
			saveToDisk: raw.saveToDisk ?? DEFAULT_CONFIG.saveToDisk,
			width: raw.width ?? DEFAULT_CONFIG.width,
			height: raw.height ?? DEFAULT_CONFIG.height,
			defaultTheme: raw.defaultTheme ?? DEFAULT_CONFIG.defaultTheme,
			maxWidthCells: raw.maxWidthCells ?? DEFAULT_CONFIG.maxWidthCells,
		};
	} catch {
		return { ...DEFAULT_CONFIG };
	}
}

function getOutputDir(cwd: string): string {
	const dir = join(cwd, ".charts", "output");
	if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
	return dir;
}

export default function chartsExtension(pi: ExtensionAPI) {
	pi.registerTool({
		name: "render_chart",
		label: "Render Chart",
		description:
			"Render an ECharts JSON configuration to a PNG image.",
		promptSnippet:
			"Render ECharts JSON to PNG. Use chart_schema first to get the schema for a chart type.",
		promptGuidelines: [
			"Always call chart_schema first to get the JSON schema before building a chart config — do not render without reading the schema.",
			"Pass a complete ECharts option object as the `option` parameter.",
			"The tool returns a rendered PNG image inline.",
			"Default size is 1200x600 — do not pass width/height unless the user requests a specific size.",
			"Use fontSize 24 for labels, legends, and other text elements — the default is too small.",
			"Do NOT use emoji in chart text (titles, labels, legends). The renderer lacks emoji font support and will show placeholder boxes instead.",
		],
		parameters: Type.Object({
			option: Type.String({ description: "ECharts option as a JSON string" }),
			width: Type.Optional(
				Type.Number({ description: "Width in pixels (default: 1200)" }),
			),
			height: Type.Optional(
				Type.Number({ description: "Height in pixels (default: 600)" }),
			),
			theme: Type.Optional(
				Type.String({ description: "Theme: dark, vintage" }),
			),
			filename: Type.Optional(
				Type.String({ description: "Output filename without extension (default: chart)" }),
			),
		}),

		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			let option: Record<string, unknown>;
			try {
				option = JSON.parse(params.option);
			} catch {
				throw new Error("Invalid JSON in option parameter.");
			}

			ensureChartsDir(ctx.cwd);
			const config = loadConfig(ctx.cwd);
			const width = params.width ?? config.width;
			const height = params.height ?? config.height;
			const theme = params.theme ?? config.defaultTheme;

			const png = await charts.toPNG(option, {
				width,
				height,
				theme,
			});

			const base64 = png.toString("base64");

			let savedPath: string | undefined;
			if (config.saveToDisk) {
				const dir = getOutputDir(ctx.cwd);
				const name = params.filename || "chart";
				savedPath = join(dir, `${name}-${Date.now()}.png`);
				writeFileSync(savedPath, png);
			}

			const label = savedPath
				? `Rendered chart (${width}×${height}) → ${savedPath}`
				: `Rendered chart (${width}×${height})`;

			return {
				content: [{ type: "text", text: label }],
				details: { width, height, path: savedPath, base64, maxWidthCells: config.maxWidthCells },
			};
		},

		renderResult(result, _options, theme) {
			const { details } = result;
			const caps = getCapabilities();

			const container = new Container("vertical", 0);

			// Text summary
			const label = details?.path
				? `${details.width}×${details.height} → ${details.path}`
				: `${details?.width ?? "?"}×${details?.height ?? "?"}`;
			container.addChild(new Text(theme.fg("muted", label), 0, 0));

			// Render image if terminal supports it
			if (caps.images && details?.base64) {
				container.addChild(
					new Image(details.base64, "image/png", {}, { maxWidthCells: details.maxWidthCells ?? 120 }),
				);
			}

			return container;
		},
	});

	pi.registerTool({
		name: "chart_schema",
		label: "Chart Schema",
		description:
			"Get the JSON schema for a chart type or component. Use type='list' to see all available types.",
		promptSnippet:
			"Get ECharts JSON schema for a chart type (bar, line, pie, etc.) or component (xAxis, tooltip, etc.)",
		parameters: Type.Object({
			type: Type.Optional(
				StringEnum([...ALL_TYPES, "full", "list"] as const, {
					description:
						"Chart type, component name, 'full' for complete schema, or 'list' to see all types",
				}),
			),
		}),

		async execute(_toolCallId, params) {
			const type = params.type || "list";

			if (type === "list") {
				const text = [
					"Series types:",
					...series.map((t) => `  ${t}`),
					"",
					"Component types:",
					...components.map((t) => `  ${t}`),
					"",
					"Use type='full' for the complete EChartsOption schema.",
					"Use type='<name>' (e.g. type='bar') for a specific schema.",
				].join("\n");

				return {
					content: [{ type: "text", text }],
					details: {
						series: [...series],
						components: [...components],
					},
				};
			}

			const schema = charts.getSchema(type as any);
			return {
				content: [{ type: "text", text: JSON.stringify(schema, null, 2) }],
				details: { type },
			};
		},

		renderCall(params, _options, theme) {
			const type = params.type || "list";
			return new Text(theme.fg("muted", `chart_schema { type: "${type}" }`), 0, 0);
		},

		renderResult(result, _options, theme) {
			const details = result.details;
			let label: string;
			if (details?.series) {
				label = `${details.series.length} series, ${details.components.length} components`;
			} else {
				label = `schema for ${details?.type ?? "unknown"}`;
			}
			return new Text(theme.fg("muted", label), 0, 0);
		},
	});
}
