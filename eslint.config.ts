import path from 'node:path';

import { defineConfig, includeIgnoreFile, type Config } from 'eslint/config';
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import perfectionist, { type SortImportsOptions } from 'eslint-plugin-perfectionist';
import { Alphabet } from 'eslint-plugin-perfectionist/alphabet';
// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from 'eslint-plugin-storybook';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import stylistic from '@stylistic/eslint-plugin';
import type { UndefinedOnPartialDeep } from 'type-fest';
import ts, { type CompatibleConfigArray } from 'typescript-eslint';
import unocss from '@unocss/eslint-config/flat';

import svelteConfig from './svelte.config.ts';

const gitignorePath = path.resolve(import.meta.dirname, '.gitignore');
const extraFileExtensions = ['.svelte'];

// sort subpaths before hyphenated packages
const alphabet = Alphabet.generateRecommendedAlphabet()
	.sortByNaturalSort()
	.placeCharacterBefore({ characterBefore: '/', characterAfter: '-' })
	.placeCharacterBefore({ characterBefore: '.', characterAfter: '/' })
	.getCharacters();

function importSortRule(hoistedGroups?: string[], files?: Config['files']) {
	type GroupNames = NonNullable<SortImportsOptions[number]['groups']>;

	const result = {
		...(files !== undefined && { files }),
		rules: {
			'perfectionist/sort-imports': [
				'warn',
				{
					type: 'custom',
					alphabet,
					order: 'asc',
					specialCharacters: 'trim',
					fallbackSort: { type: 'natural', order: 'asc' },
					tsconfig: {
						rootDir: '.',
					},
					newlinesBetween: 0,
					// mirrors `svelte.config.ts` kit alias and default sveltekit aliases
					internalPattern: ['^\\$lib(/.*)?$', '^\\$app/.*', '^\\$env/.*', '^\\$storybook(/.*)?$'],
					customGroups: [
						{ groupName: 'svelte', elementNamePattern: '^svelte(/.*)?|^@sveltejs/kit$' },
						{ groupName: 'storybook', elementNamePattern: '^@storybook/.*$' },
					],
					groups: [
						'builtin',
						{ newlinesBetween: 1 },
						...((hoistedGroups as GroupNames | undefined)?.concat([{ newlinesBetween: 1 }]) ?? []),
						'external',
						{ newlinesBetween: 1 },
						['internal', 'tsconfig-path'],
						{ newlinesBetween: 1 },
						'parent',
						'sibling',
						'index',
						{ newlinesBetween: 1 },
						'side-effect',
						'unknown',
					],
				},
			],
		},
	} as const satisfies UndefinedOnPartialDeep<Config>;

	return result as Config;
}

function stripFileFilter(...configs: CompatibleConfigArray[]): Config[] {
	// Split each config's `rules` into a `files`-less object so they apply to every
	// file, while the original keeps its plugin/parser registration scoped as-is.
	return configs.flat().flatMap(({ rules, ...config }) => (rules ? [config, { rules }] : [config]));
}

export default defineConfig(
	includeIgnoreFile(gitignorePath, {
		gitignoreResolution: true,
	}),
	js.configs.recommended,
	stripFileFilter(ts.configs.strictTypeChecked, ts.configs.stylisticTypeChecked),
	svelte.configs.recommended,
	unocss,
	storybook.configs['flat/recommended'] as unknown as Config[],
	prettier,
	svelte.configs.prettier,
	importSortRule(['svelte'], ['src/**/*', '@types/**/*']),
	importSortRule(['storybook', 'svelte'], ['src/**/*.stories.svelte']),
	{
		plugins: {
			'@stylistic': stylistic,
			perfectionist,
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
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
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
			'no-promise-executor-return': ['error', { allowVoid: true }],
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

			'@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
			'@typescript-eslint/consistent-type-exports': [
				'error',
				{ fixMixedExportsWithInlineTypeSpecifier: true },
			],
			'@typescript-eslint/no-import-type-side-effects': 'error',
			'@typescript-eslint/switch-exhaustiveness-check': [
				'error',
				{ considerDefaultExhaustiveForUnions: true },
			],
			'@typescript-eslint/strict-void-return': 'error',
			'@typescript-eslint/require-array-sort-compare': ['error', { ignoreStringArrays: true }],
			'@typescript-eslint/method-signature-style': ['error', 'property'],
			'@typescript-eslint/prefer-readonly': 'error',
			'@typescript-eslint/no-unnecessary-parameter-property-assignment': 'error',
			'@typescript-eslint/no-unnecessary-qualifier': 'error',
			'@typescript-eslint/no-useless-empty-export': 'error',
			'@typescript-eslint/no-unused-private-class-members': 'error',
			'@typescript-eslint/class-methods-use-this': ['error', { ignoreOverrideMethods: true }],
			'@typescript-eslint/strict-boolean-expressions': [
				'error',
				{
					allowString: false,
					allowNumber: false,
					allowNullableBoolean: true,
				},
			],
			'@typescript-eslint/restrict-template-expressions': [
				'error',
				{
					allowNumber: true,
				},
			],

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
