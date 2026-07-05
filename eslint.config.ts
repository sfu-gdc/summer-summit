// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from 'eslint-plugin-storybook';

import prettier from 'eslint-config-prettier';
import path from 'node:path';
import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import unocss from '@unocss/eslint-config/flat';
import { defineConfig, includeIgnoreFile, globalIgnores, type Config } from 'eslint/config';
import globals from 'globals';
import ts, { type CompatibleConfigArray } from 'typescript-eslint';
import stylistic from '@stylistic/eslint-plugin';

import svelteConfig from './svelte.config.ts';

const gitignorePath = path.resolve(import.meta.dirname, '.gitignore');
const extraFileExtensions = ['.svelte'];

function stripFileFilter(...configs: CompatibleConfigArray[]): Config[] {
	// Split each config's `rules` into a `files`-less object so they apply to every
	// file, while the original keeps its plugin/parser registration scoped as-is.
	return configs.flat().flatMap(({ rules, ...config }) => (rules ? [config, { rules }] : [config]));
}

export default defineConfig(
	globalIgnores(['!.storybook'], 'Include Storybook Directory'),
	includeIgnoreFile(gitignorePath),
	js.configs.recommended,
	stripFileFilter(ts.configs.strictTypeChecked, ts.configs.stylisticTypeChecked),
	svelte.configs.recommended,
	unocss,
	storybook.configs['flat/recommended'] as unknown as Config[],
	prettier,
	svelte.configs.prettier,
	{
		plugins: {
			'@stylistic': stylistic,
		},
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
		files: ['**/*.svelte', '**/*.svelte.?({mc}){tj}s'],
		languageOptions: {
			parserOptions: {
				parser: ts.parser,
				projectService: true,
				svelteConfig: svelteConfig({ mode: 'development' }),
				extraFileExtensions,
			},
		},
		rules: {
			'prefer-const': 'off', // covered by svelte plugin
		},
	},
	{
		// Override or add rule settings here, such as:
		// 'svelte/button-has-type': 'error'
		rules: {
			// --- Possible Problems ---
			'array-callback-return': ['error', { allowImplicit: true }],
			'no-constructor-return': 'error',
			'no-promise-executor-return': 'error',
			'no-self-compare': 'error',
			'no-unmodified-loop-condition': 'error',
			'no-unreachable-loop': 'error',
			'require-atomic-updates': 'error',
			'no-implicit-coercion': 'error',

			// --- Security / correctness ---
			eqeqeq: ['error', 'always', { null: 'ignore' }],
			'no-new-wrappers': 'error',
			'no-object-constructor': 'error',
			'no-return-assign': ['error', 'always'],
			'no-sequences': 'error',
			'no-new': 'error',
			'no-octal-escape': 'error',
			'no-proto': 'error',
			'no-iterator': 'error',
			'no-caller': 'error',
			'no-extend-native': 'error',
			'no-multi-str': 'error',
			'no-div-regex': 'error',
			'no-label-var': 'error',
			'no-extra-label': 'error',
			'no-labels': 'error', // safe in runes mode (no `$:`)
			'guard-for-in': 'error',
			radix: 'error',
			'symbol-description': 'error',
			yoda: 'error',
			'no-undef-init': 'error',

			// --- Modernization / cleanup ---
			'object-shorthand': ['error', 'always'],
			'prefer-template': 'error',
			'prefer-arrow-callback': ['error', { allowNamedFunctions: true }],
			'prefer-object-has-own': 'error',
			'prefer-object-spread': 'error',
			'prefer-exponentiation-operator': 'error',
			'prefer-numeric-literals': 'error',
			'prefer-regex-literals': ['error', { disallowRedundantWrapping: true }],
			'logical-assignment-operators': ['error', 'always'],
			'operator-assignment': ['error', 'always'],
			'no-useless-call': 'error',
			'no-useless-computed-key': 'error',
			'no-useless-concat': 'error',
			'no-useless-rename': 'error',
			'no-useless-return': 'error',
			'no-lone-blocks': 'error',
			'no-lonely-if': 'error',
			'no-unneeded-ternary': 'error',
			'no-else-return': ['error', { allowElseIf: false }],
			'no-extra-bind': 'error',
			'no-multi-assign': 'error',
			'default-case-last': 'error',
			'grouped-accessor-pairs': 'error',
			'func-name-matching': 'error',

			'@stylistic/quotes': ['error', 'single', { avoidEscape: true, ignoreStringLiterals: true }],
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
