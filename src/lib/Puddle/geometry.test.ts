import { describe, expect, test } from 'vitest';

import { resolvePuddleGeometry } from './geometry';

function expectCoverage(
	width: number,
	height: number,
	options: { cellSize: number; maxCells: number },
): void {
	const geometry = resolvePuddleGeometry(width, height, options);
	expect((geometry.cols - 2) * geometry.cellSize).toBeGreaterThanOrEqual(width);
	expect((geometry.rows - 2) * geometry.cellSize).toBeGreaterThanOrEqual(height);
	expect(geometry.cols * geometry.cellSize - width).toBeGreaterThanOrEqual(2 * geometry.cellSize);
	expect(geometry.rows * geometry.cellSize - height).toBeGreaterThanOrEqual(2 * geometry.cellSize);
	expect(geometry.cols).toBeLessThanOrEqual(options.maxCells);
	expect(geometry.rows).toBeLessThanOrEqual(options.maxCells);
}

describe('resolvePuddleGeometry', () => {
	test('covers fractional dimensions with a full dry guard cell on each side', () => {
		expectCoverage(1829.14, 999.3, { cellSize: 28, maxCells: 200 });
	});

	test('adds two guard cells when the visible span is an exact cell multiple', () => {
		const geometry = resolvePuddleGeometry(760, 418, { cellSize: 19, maxCells: 200 });

		expect(geometry.cols).toBe(42);
		expect(geometry.rows).toBe(24);
		expect(geometry.cellSize).toBe(19);
		expectCoverage(760, 418, { cellSize: 19, maxCells: 200 });
	});

	test('increases effective cell size under maxCells pressure on either axis', () => {
		const wide = resolvePuddleGeometry(10_000, 200, { cellSize: 10, maxCells: 52 });
		const tall = resolvePuddleGeometry(200, 10_000, { cellSize: 10, maxCells: 52 });

		expect(wide.cellSize).toBe(200);
		expect(wide.cols).toBe(52);
		expect(tall.cellSize).toBe(200);
		expect(tall.rows).toBe(52);
		expectCoverage(10_000, 200, { cellSize: 10, maxCells: 52 });
		expectCoverage(200, 10_000, { cellSize: 10, maxCells: 52 });
	});

	test('never exceeds maxCells at floating-point extremes', () => {
		const options = { cellSize: 1, maxCells: 52 };

		expectCoverage(Number.MAX_VALUE, Number.MAX_VALUE, options);
		const geometry = resolvePuddleGeometry(Number.MAX_VALUE, Number.MAX_VALUE, options);
		expect(geometry.cols).toBe(options.maxCells);
		expect(geometry.rows).toBe(options.maxCells);
	});

	test('uses safe zero geometry before the host is measured', () => {
		const geometry = resolvePuddleGeometry(0, 0, { cellSize: 19, maxCells: 200 });

		expect(geometry).toEqual({
			width: 0,
			height: 0,
			cols: 0,
			rows: 0,
			cellSize: 19,
			ready: false,
		});
	});
});
