import { describe, expect, it } from 'vitest';

import { seconds } from '../brands';
import { rainEmitter } from '../emitters';
import { createRng } from '../rng';

describe('rainEmitter — framerate-independent scheduling', () => {
	it('emits the same drop count over the same sim-time regardless of dt chunking', () => {
		const grid = { nx: 10, ny: 10 };
		const emitter = rainEmitter({ intervalSec: 0.5, amount: 1, radius: 1 });
		const countDrops = (dt: number, steps: number) => {
			const rng = createRng(1);
			let time = 0;
			let dropCount = 0;
			for (let stepIndex = 0; stepIndex < steps; stepIndex++) {
				dropCount += emitter({ grid, time: seconds(time), dt: seconds(dt), rng }).length;
				time += dt;
			}
			return dropCount;
		};
		// 5 sim-seconds either way; 0.5 and 0.25 are exact in binary (no fp drift).
		expect(countDrops(0.5, 10)).toBe(10);
		expect(countDrops(0.25, 20)).toBe(10);
	});
});
