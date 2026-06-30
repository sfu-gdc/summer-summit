// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from 'eslint-plugin-storybook';

import prettier from 'eslint-config-prettier';
import path from 'node:path';
import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import unocss from '@unocss/eslint-config/flat';
import { defineConfig, includeIgnoreFile, globalIgnores } from 'eslint/config';
import globals from 'globals';
import ts from 'typescript-eslint';

import svelteConfig from './svelte.config.ts';

const gitignorePath = path.resolve(import.meta.dirname, '.gitignore');
const extraFileExtensions = ['.svelte'];

export default defineConfig(
	globalIgnores(['!.storybook'], 'Include Storybook Directory'),
	includeIgnoreFile(gitignorePath),
	js.configs.recommended,
	ts.configs.strictTypeChecked,
	ts.configs.stylisticTypeChecked,
	svelte.configs.recommended,
	unocss,
	/** @type {import('eslint/config').Config[]} */ (
		/** @type {unknown} */ (storybook.configs['flat/recommended'])
	),
	prettier,
	svelte.configs.prettier,
	{
		languageOptions: {
			globals: { ...globals.browser, ...globals.node },
			parserOptions: {
				projectService: true,
				extraFileExtensions,
			},
		},
		linterOptions: {
			reportUnusedDisableDirectives: 'error',
			reportUnusedInlineConfigs: 'error',
		},
		rules: {
			// typescript-eslint strongly recommend that you do not use the no-undef lint rule on TypeScript projects.
			// see: https://typescript-eslint.io/troubleshooting/faqs/eslint/#i-get-errors-from-the-no-undef-rule-about-global-variables-not-being-defined-even-though-there-are-no-typescript-errors
			'no-undef': 'off',
		},
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: {
				parser: ts.parser,
				projectService: true,
				svelteConfig: svelteConfig({ mode: 'development' }),
				extraFileExtensions,
			},
		},
	},
	{
		// Override or add rule settings here, such as:
		// 'svelte/button-has-type': 'error'
		rules: {
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					enableAutofixRemoval: { imports: true },
				},
			],
			'@typescript-eslint/no-unnecessary-condition': [
				'error',
				{
					checkTypePredicates: true,
				},
			],
		},
	},
);
