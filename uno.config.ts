import {
	defineConfig,
	presetIcons,
	presetTypography,
	presetWebFonts,
	transformerVariantGroup,
	transformerDirectives,
	transformerCompileClass,
	presetWind4,
} from 'unocss';
import extractorSvelte from '@unocss/extractor-svelte';

import { brandColors, fonts } from './src/lib/tokens';

export default defineConfig({
	presets: [
		presetWind4({
			preflights: {
				reset: true,
			},
		}),
		presetIcons({
			warn: true,
		}),
		presetTypography(),
		presetWebFonts({
			provider: 'none', // handled by unplugin-font with vite
			fonts,
		}),
	],
	transformers: [transformerVariantGroup(), transformerDirectives(), transformerCompileClass()],
	extractors: [extractorSvelte()],
	theme: {
		colors: {
			brand: brandColors,
		},
	},
});
