import { render } from 'svelte/server';

import { expect, test } from 'vitest';

import { PUDDLE_SNAPSHOTS } from './generated/puddleSnapshots';
import Puddle from './Puddle.svelte';
import PuddleClipFixture from './tests/PuddleClipFixture.svelte';

test('SSR contains the generated no-JS silhouette in centered CSS-pixel space', () => {
	const { body } = render(Puddle, { props: { animated: false, snapshot: 'compact' } });

	expect(body).toContain('data-puddle-renderer');
	expect(body).toContain('data-puddle-shape');
	expect(body).toContain(`d="${PUDDLE_SNAPSHOTS.compact.path}"`);
	expect(body).toContain(PUDDLE_SNAPSHOTS.compact.clip);
	expect(body).toMatch(
		/<use href="#[^"]+-puddle-shape"[^>]*style="transform: translate\(50%, 50%\) translate\(/,
	);
});

test('SSR wires clipped content to the same local SVG shape as the puddle fill', () => {
	const { body } = render(PuddleClipFixture);

	expect(body).toContain('data-puddle-clipped-content');
	expect(body).toContain('data-puddle-clipped-probe');
	expect(body).not.toContain('<foreignObject');
	expect(body).toMatch(/<clipPath id="([^"]+-puddle-clip)" clipPathUnits="userSpaceOnUse">/);
	expect(body).toMatch(/<path d="[^"]+" transform="translate\([^"]+\)" data-puddle-clip-shape/);
	expect(body).toContain('clip-path: var(--puddle-clip)');
});

test('SSR includes CSS-breakpoint snapshot and clip variants for the landing puddle', () => {
	const { body } = render(Puddle, {
		props: { animated: false, snapshot: 'compact', responsiveSnapshots: true },
	});

	for (const name of ['compact', 'medium', 'expanded', 'large']) {
		expect(body).toContain(`data-puddle-static-profile="${name}"`);
		const snapshot = PUDDLE_SNAPSHOTS[name as keyof typeof PUDDLE_SNAPSHOTS];
		expect(body).toContain(snapshot.path);
		expect(body).toContain(snapshot.clip);
	}
	expect(body).toContain('--puddle-clip-compact:');
	expect(body).toContain('--puddle-clip-large:');
});
