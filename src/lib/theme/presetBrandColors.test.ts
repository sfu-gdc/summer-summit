import { createGenerator, presetWind4 } from 'unocss';
import { describe, expect, test } from 'vitest';

import { brandColors, brandColorValues } from '$lib/tokens';

import { createBrandColorCss, presetBrandColors } from './presetBrandColors';

describe('presetBrandColors', () => {
	test('emits sRGB defaults and guarded canonical overrides', () => {
		const css = createBrandColorCss({ primary: { 500: 'oklch(51.2% 0.2529 286.36)' } });

		expect(css).toMatch(/--brand-primary-500: rgb\(/);
		expect(css).toContain('@supports (color: oklch(0% 0 0))');
		expect(css).toContain('--brand-primary-500: oklch(51.2% 0.2529 286.36);');
	});

	test('registers the references as UnoCSS brand colors', async () => {
		const uno = await createGenerator({
			presets: [
				presetWind4(),
				presetBrandColors({ values: brandColorValues, references: brandColors }),
			],
		});
		const { css } = await uno.generate(
			'bg-brand-primary-500 bg-brand-secondary-500 bg-brand-shade-950',
		);

		expect(css).toContain('--brand-primary-500: rgb(');
		expect(css).toContain('--brand-secondary-500: rgb(');
		expect(css).toContain('--brand-shade-950: rgb(');
		expect(css).toContain('.bg-brand-primary-500');
		expect(css).toContain('var(--brand-primary-500)');
		expect(css).toContain('.bg-brand-secondary-500');
		expect(css).toContain('var(--brand-secondary-500)');
		expect(css).toContain('.bg-brand-shade-950');
		expect(css).toContain('var(--brand-shade-950)');
	});
});
