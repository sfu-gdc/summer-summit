import type { StorybookConfig } from '@storybook/sveltekit';

const config = {
	stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|ts|svelte)'],
	addons: [
		'@storybook/addon-svelte-csf',
		'@chromatic-com/storybook',
		'@storybook/addon-vitest',
		'@storybook/addon-a11y',
		'@storybook/addon-docs',
		'storybook-addon-pseudo-states',
	],
	framework: '@storybook/sveltekit',
} satisfies StorybookConfig;
export default config;
