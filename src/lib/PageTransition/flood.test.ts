import { describe, expect, it } from 'vitest';

import { puddlePath } from '../Puddle/render/puddleRenderer';
import {
	createFloodPlan,
	floodMaskAtProgress,
	floodProgressForDirection,
	puddleMaskFromPath,
} from './flood';

function wetCount(mask: ArrayLike<number>): number {
	return Array.from(mask).filter((cell) => cell === 1).length;
}

function everyNewlyFilledCellReachesSource(
	mask: Uint8Array,
	initialMask: Uint8Array,
	sourceMask: Uint8Array,
	nx: number,
): boolean {
	const visited = new Uint8Array(mask.length);
	const pending: number[] = [];
	for (let index = 0; index < sourceMask.length; index++) {
		if (sourceMask[index] !== 1) continue;
		visited[index] = 1;
		pending.push(index);
	}
	for (const index of pending) {
		const x = index % nx;
		const neighbors = [x > 0 ? index - 1 : -1, x + 1 < nx ? index + 1 : -1, index - nx, index + nx];
		for (const neighbor of neighbors) {
			if (
				neighbor < 0 ||
				neighbor >= mask.length ||
				mask[neighbor] !== 1 ||
				visited[neighbor] === 1
			)
				continue;
			visited[neighbor] = 1;
			pending.push(neighbor);
		}
	}
	return mask.every(
		(cell, index) => cell !== 1 || initialMask[index] === 1 || visited[index] === 1,
	);
}

describe('fixed-cell flood transition', () => {
	it('round-trips renderer paths without changing cell occupancy', () => {
		const mask = Uint8Array.from([0, 1, 1, 0, 1, 1, 1, 0, 0, 1, 0, 0]);
		const path = puddlePath(mask, 4, 3, 18);

		expect(puddleMaskFromPath(path, 4, 3, 18)).toEqual(mask);
	});

	it('uses only the largest 4-connected component as the flood source', () => {
		const initialMask = Uint8Array.from([1, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0]);
		const plan = createFloodPlan(initialMask, 5, 3);

		expect(plan.initialMask).toEqual(initialMask);
		expect(plan.sourceMask).toEqual(Uint8Array.from([1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0]));
	});

	it('treats diagonally touching cells as separate components', () => {
		const plan = createFloodPlan(Uint8Array.from([1, 0, 0, 1]), 2, 2);

		expect(plan.sourceMask).toEqual(Uint8Array.from([1, 0, 0, 0]));
	});

	it('breaks equal-size component ties by their first row-major cell', () => {
		const initialMask = Uint8Array.from([0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0]);

		expect(createFloodPlan(initialMask, 4, 3).sourceMask).toEqual(
			Uint8Array.from([0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
		);
	});

	it('falls back to the center cell when the initial mask is empty', () => {
		const plan = createFloodPlan(new Uint8Array(15), 5, 3);
		const centerMask = Uint8Array.from({ length: 15 }, (_, index) => (index === 7 ? 1 : 0));

		expect(plan.initialMask).toEqual(centerMask);
		expect(plan.sourceMask).toEqual(centerMask);
		expect(floodMaskAtProgress(plan, 0)).toEqual(centerMask);
	});

	it('preserves every original puddle cell at zero progress', () => {
		const initialMask = Uint8Array.from([1, 1, 0, 0, 0, 1, 0]);
		const plan = createFloodPlan(initialMask, 7, 1);

		expect(floodMaskAtProgress(plan, 0)).toEqual(initialMask);
	});

	it('keeps smaller islands visible without letting them seed an early frontier', () => {
		const initialMask = Uint8Array.from([1, 1, 0, 0, 0, 1, 0]);
		const plan = createFloodPlan(initialMask, 7, 1);
		const bridgeRank = Array.from(plan.fillOrder).indexOf(4);
		const farSideRank = Array.from(plan.fillOrder).indexOf(6);

		expect(floodMaskAtProgress(plan, 0)[5]).toBe(1);
		expect(bridgeRank).toBeGreaterThanOrEqual(0);
		expect(farSideRank).toBeGreaterThan(bridgeRank);
	});

	it('grows monotonically through the primary frontier and guarantees full coverage', () => {
		const initialMask = Uint8Array.from({ length: 63 }, (_, index) =>
			[9, 10, 18, 31].includes(index) ? 1 : 0,
		);
		const plan = createFloodPlan(initialMask, 9, 7);
		const initialWetCount = wetCount(initialMask);

		for (let fillCount = 0; fillCount <= plan.fillOrder.length; fillCount++) {
			const mask = floodMaskAtProgress(plan, fillCount / plan.fillOrder.length);

			expect(wetCount(mask)).toBe(initialWetCount + fillCount);
			expect(
				everyNewlyFilledCellReachesSource(mask, plan.initialMask, plan.sourceMask, plan.nx),
			).toBe(true);
		}
		expect(floodMaskAtProgress(plan, 1).every((cell) => cell === 1)).toBe(true);
	});

	it('maps eased progress to the newly covered area without an outlier tail', () => {
		const seed = Uint8Array.from({ length: 221 }, (_, index) =>
			[94, 95, 110, 111, 112].includes(index) ? 1 : 0,
		);
		const plan = createFloodPlan(seed, 17, 13);
		const dryCellCount = seed.length - wetCount(seed);

		for (const progress of [0, 0.05, 0.25, 0.5, 0.75, 0.95, 0.99, 1]) {
			const mask = floodMaskAtProgress(plan, progress);
			const newlyCoveredRatio = (wetCount(mask) - wetCount(seed)) / dryCellCount;

			expect(Math.abs(newlyCoveredRatio - progress)).toBeLessThanOrEqual(0.5 / dryCellCount);
		}
	});

	it('produces the same connected fill order for the same initial mask', () => {
		const initialMask = Uint8Array.from({ length: 80 }, (_, index) =>
			index === 35 || index === 44 ? 1 : 0,
		);

		expect(createFloodPlan(initialMask, 10, 8).fillOrder).toEqual(
			createFloodPlan(initialMask, 10, 8).fillOrder,
		);
	});

	it('uses the same masks in opposite order for cover and reveal', () => {
		const seed = Uint8Array.from({ length: 30 }, (_, index) => (index === 14 ? 1 : 0));
		const plan = createFloodPlan(seed, 6, 5);
		const animationProgress = 0.3;

		expect(
			floodMaskAtProgress(plan, floodProgressForDirection(animationProgress, 'cover')),
		).toEqual(
			floodMaskAtProgress(plan, floodProgressForDirection(1 - animationProgress, 'reveal')),
		);
	});
});
