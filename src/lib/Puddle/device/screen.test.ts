import { expect, test } from 'vitest';

import { getScreenAngle } from './screen';

test('reads the current screen orientation angle', () => {
	expect(getScreenAngle({ orientation: { angle: 270 } })).toBe(270);
});

test('falls back when the screen orientation API is unavailable', () => {
	expect(getScreenAngle({})).toBe(0);
});
