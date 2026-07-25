import { describe, expect, test } from 'vitest';

import { createBrandColorCss } from './theme/presetBrandColors';
import { brandColors, brandColorValues, heroColors, heroColorValues } from './tokens';

describe('hero color tokens', () => {
	test('maps semantic roles to the approved palette stops', () => {
		expect(heroColorValues).toEqual({
			background: brandColorValues.primary[100],
			content: brandColorValues.shade[900],
			outline: brandColorValues.shade[900],
			inverseContent: brandColorValues.shade[50],
		});
		expect(heroColors).toEqual({
			background: brandColors.primary[100],
			content: brandColors.shade[900],
			outline: brandColors.shade[900],
			inverseContent: brandColors.shade[50],
		});
	});

	test('keeps canonical values in OKLCH and references generated brand variables', () => {
		expect(Object.values(heroColorValues).every((color) => color.startsWith('oklch('))).toBe(true);
		expect(heroColors).toEqual({
			background: 'var(--brand-primary-100)',
			content: 'var(--brand-shade-900)',
			outline: 'var(--brand-shade-900)',
			inverseContent: 'var(--brand-shade-50)',
		});
	});

	test('retains sRGB fallbacks and canonical OKLCH overrides for hero palette stops', () => {
		const css = createBrandColorCss(brandColorValues);

		expect(css).toMatch(/--brand-primary-100: rgb\(/);
		expect(css).toMatch(/--brand-shade-900: rgb\(/);
		expect(css).toContain(`--brand-primary-100: ${heroColorValues.background};`);
		expect(css).toContain(`--brand-shade-900: ${heroColorValues.content};`);
		expect(css).toContain('@supports (color: oklch(0% 0 0))');
	});
});
