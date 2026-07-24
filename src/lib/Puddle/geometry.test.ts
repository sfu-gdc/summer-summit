import { describe, expect, test } from 'vitest';

import { resolvePuddleGeometry } from './geometry';

describe('resolvePuddleGeometry', () => {
	test('maps host dimensions to grid and normalized clip geometry', () => {
		const geometry = resolvePuddleGeometry(760, 420, { cellSize: 19, maxCells: 200 });

		expect(geometry).toEqual({
			width: 760,
			height: 420,
			cols: 40,
			rows: 22,
			ready: true,
			viewBox: '0 0 40 22',
			clipTransform: 'scale(0.025 0.045454545454545456)',
		});
	});

	test('uses safe fallback geometry before the host is measured', () => {
		const geometry = resolvePuddleGeometry(0, 0, { cellSize: 19, maxCells: 200 });

		expect(geometry).toEqual({
			width: 0,
			height: 0,
			cols: 0,
			rows: 0,
			ready: false,
			viewBox: '0 0 1 1',
			clipTransform: 'scale(1 1)',
		});
	});

	test('falls back from invalid sizing options', () => {
		const geometry = resolvePuddleGeometry(760, 420, {
			cellSize: Number.NaN,
			maxCells: Number.NaN,
		});

		expect(geometry.cols).toBe(40);
		expect(geometry.rows).toBe(22);
	});
});
