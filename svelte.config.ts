import type { ConfigEnv } from 'vite';

import type { Config, KitConfig } from '@sveltejs/kit';
import adapter from '@sveltejs/adapter-cloudflare';

import type { TsConfigJson, OmitIndexSignature } from 'type-fest';

export type ConfigFn = (env: Partial<ConfigEnv>) => OmitIndexSignature<Config>;

const config: ConfigFn = ({ mode }) => {
	const isDev = mode == 'development';

	const cspDirectives = {
		'default-src': ['self'],
		'connect-src': ['self'],
		'font-src': ['self', 'data:'],
		'img-src': ['self', 'data:'],
		'object-src': ['none'],
		'base-uri': ['none'],
		'frame-ancestors': ['none'],
		'form-action': ['self'],
		'script-src': ['self', 'strict-dynamic'],
		'style-src': ['self', 'unsafe-inline'],
		'worker-src': isDev ? ['self', 'blob:'] : ['self'],
		'upgrade-insecure-requests': true,
	} satisfies NonNullable<KitConfig['csp']>['directives'];

	return {
		compilerOptions: {
			// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
			runes: ({ filename }) =>
				filename.split(/[/\\]/).includes('node_modules') ? undefined : true,
			experimental: {
				async: true,
			},
		},
		kit: {
			adapter: adapter(),
			typescript: {
				config(tsconfig: TsConfigJson) {
					// exclude tooling from app `tsconfig.json`
					const dropFromApp = [/vite\.config\.(c|m)?[jt]s$/];
					tsconfig.include = (tsconfig.include ?? []).filter(
						(p) => !dropFromApp.some((re) => re.test(p)),
					);

					tsconfig.include.push('../.storybook/preview.ts');

					return tsconfig;
				},
			},
			csp: {
				directives: cspDirectives,
			},
		},
	};
};

export default config;
