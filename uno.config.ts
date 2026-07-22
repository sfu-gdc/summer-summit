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

import { presetBrandColors } from './src/lib/theme/presetBrandColors';
import { brandColors, brandColorValues, fonts } from './src/lib/tokens';

export default defineConfig({
	presets: [
		presetWind4({
			preflights: {
				reset: true,
			},
		}),
		presetBrandColors({ values: brandColorValues, references: brandColors }),
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
});
