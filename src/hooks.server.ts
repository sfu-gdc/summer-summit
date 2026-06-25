import type { Handle } from '@sveltejs/kit';

export const handle: Handle = ({ event, resolve }) =>
	resolve(event, {
		preload: ({ type, path }) =>
			type === 'css' || type === 'js' || (type === 'font' && /-latin-(?!ext-)/.test(path)),
	});
