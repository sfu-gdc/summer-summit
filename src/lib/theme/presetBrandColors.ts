import { formatRgb, toGamut } from 'culori';
import { definePreset } from 'unocss';

type BrandColorPalette = Record<string, Record<string, string>>;

export interface BrandColorPresetOptions {
	values: BrandColorPalette;
	references: BrandColorPalette;
}

const toSrgb = toGamut('rgb', 'oklch');

function declarations(palette: BrandColorPalette, serialize: (color: string) => string): string {
	return Object.entries(palette)
		.flatMap(([family, colors]) =>
			Object.entries(colors).map(
				([stop, color]) => `  --brand-${family}-${stop}: ${serialize(color)};`,
			),
		)
		.join('\n');
}

export function createBrandColorCss(values: BrandColorPalette): string {
	const fallback = declarations(values, (color) => formatRgb(toSrgb(color)));
	const modern = declarations(values, (color) => color);

	return `:root,
:host {
${fallback}
}
@supports (color: oklch(0% 0 0)) {
  :root,
  :host {
${modern}
  }
}`;
}

export const presetBrandColors = definePreset<BrandColorPresetOptions>((options) => {
	if (!options) throw new Error('presetBrandColors requires brand color values and references');

	return {
		name: 'summer-summit-brand-colors',
		theme: {
			colors: {
				brand: options.references,
			},
		},
		preflights: [{ getCSS: () => createBrandColorCss(options.values) }],
	};
});
