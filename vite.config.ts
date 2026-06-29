import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';

import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';

import { sveltekit } from '@sveltejs/kit/vite';
import { enhancedImages } from '@sveltejs/enhanced-img';

import UnoCSS from 'unocss/vite';

import Unfonts from 'unplugin-fonts/vite';

import devtoolsJson from 'vite-plugin-devtools-json';

import svkitCfgFn from './svelte.config.ts';

const dirname =
	typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig((env) => {
	const svkitCfg = svkitCfgFn(env);

	return {
		plugins: [
			devtoolsJson(),
			UnoCSS(),
			enhancedImages(),
			sveltekit({
				...Object.fromEntries(Object.entries(svkitCfg).filter(([key]) => key !== 'kit')),
				...svkitCfg.kit,
			}),
			Unfonts({
				inlineFontFace: true,
				fontsource: {
					families: [
						{
							name: 'Syncopate',
							weights: [700],
							fallback: {
								category: 'sans-serif',
							},
						},
						{
							name: 'Work Sans',
							variable: {
								wght: true,
							},
							fallback: {
								category: 'sans-serif',
							},
						},
					],
				},
			}),
		],
		define: {
			// Allow vite to strip out tests in production
			'import.meta.vitest': 'undefined',
		},
		test: {
			includeSource: ['src/**/*.{js,ts}'],
			expect: {
				requireAssertions: true,
			},
			projects: [
				{
					extends: './vite.config.ts',
					test: {
						name: 'client',
						browser: {
							enabled: true,
							provider: playwright(),
							instances: [
								{
									browser: 'chromium',
									headless: true,
								},
							],
						},
						include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
						exclude: ['src/lib/server/**'],
					},
				},
				{
					extends: './vite.config.ts',
					test: {
						name: 'server',
						environment: 'node',
						include: ['src/**/*.{test,spec}.{js,ts}'],
						exclude: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					},
				},
				{
					extends: true,
					plugins: [
						// The plugin will run tests for the stories defined in your Storybook config
						// See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
						storybookTest({
							configDir: path.join(dirname, '.storybook'),
						}),
					],
					test: {
						name: 'storybook',
						browser: {
							enabled: true,
							headless: true,
							provider: playwright(),
							instances: [
								{
									browser: 'chromium',
								},
							],
						},
					},
				},
			],
		},
	};
});
