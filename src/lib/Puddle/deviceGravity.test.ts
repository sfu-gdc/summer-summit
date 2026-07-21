import { describe, expect, it } from 'vitest';

import {
	createDeviceGravityEstimator,
	projectDeviceGravity,
	requestDeviceGravityPermission,
	type DeviceMotionReading,
} from './deviceGravity';

const reading = (
	acceleration: [number, number, number] | null,
	rotation: [number, number, number] | null = null,
	interval = 16,
): DeviceMotionReading => ({
	accelerationIncludingGravity: acceleration
		? { x: acceleration[0], y: acceleration[1], z: acceleration[2] }
		: null,
	rotationRate: rotation ? { alpha: rotation[0], beta: rotation[1], gamma: rotation[2] } : null,
	interval,
});

describe('projectDeviceGravity', () => {
	it('maps device gravity to the simulation sign convention in portrait', () => {
		expect(projectDeviceGravity({ x: 0, y: 1, z: 0 }, 0, 6)).toEqual({ x: 0, y: -6 });
		const right = projectDeviceGravity({ x: -1, y: 0, z: 0 }, 0, 6);
		expect(right.x).toBe(-6);
		expect(right.y).toBeCloseTo(0);
	});

	it('rotates the device axes into the current screen orientation', () => {
		const expectedByAngle = [
			{ angle: 0, x: 6, y: 0 },
			{ angle: 90, x: 0, y: -6 },
			{ angle: 180, x: -6, y: 0 },
			{ angle: 270, x: 0, y: 6 },
		];
		for (const expected of expectedByAngle) {
			const tilt = projectDeviceGravity({ x: 1, y: 0, z: 0 }, expected.angle, 6);
			expect(tilt.x).toBeCloseTo(expected.x);
			expect(tilt.y).toBeCloseTo(expected.y);
		}
	});

	it('sanitizes invalid or negative strength', () => {
		for (const tilt of [
			projectDeviceGravity({ x: 1, y: 1, z: 0 }, 0, -1),
			projectDeviceGravity({ x: 1, y: 1, z: 0 }, NaN, NaN),
		]) {
			expect(tilt.x).toBeCloseTo(0);
			expect(tilt.y).toBeCloseTo(0);
		}
	});
});

describe('requestDeviceGravityPermission', () => {
	it('reports unsupported outside a browser', async () => {
		await expect(requestDeviceGravityPermission()).resolves.toBe('unsupported');
	});
});

describe('createDeviceGravityEstimator', () => {
	it('uses acceleration including gravity as its stable reference', () => {
		const estimator = createDeviceGravityEstimator();
		estimator.update(reading([-9.8, 0, 0]), 100);
		const tilt = estimator.tilt(100, 0, 8);
		expect(tilt?.x).toBeCloseTo(-8);
		expect(tilt?.y).toBeCloseTo(0);
	});

	it('uses gyro data to predict between accelerometer readings', () => {
		const estimator = createDeviceGravityEstimator();
		estimator.update(reading([0, 0, 9.8]), 0);
		estimator.update(reading(null, [90, 0, 0], 100), 100);
		const tilt = estimator.tilt(100, 0, 8);
		expect(tilt?.y).toBeLessThan(-1);
	});

	it('ignores implausible acceleration and expires stale readings', () => {
		const estimator = createDeviceGravityEstimator();
		estimator.update(reading([0, 9.8, 0]), 0);
		estimator.update(reading([100, 0, 0]), 100);
		expect(estimator.tilt(100, 0, 6)?.y).toBeCloseTo(-6);
		expect(estimator.tilt(501, 0, 6)).toBeNull();
	});

	it('clears its reading on reset', () => {
		const estimator = createDeviceGravityEstimator();
		estimator.update(reading([0, 9.8, 0]), 0);
		estimator.reset();
		expect(estimator.tilt(0, 0, 6)).toBeNull();
	});

	it('continuously treats the trailing time-window average as neutral', () => {
		const estimator = createDeviceGravityEstimator();
		estimator.update(reading([0, 0, 9.8]), 0, 1);
		estimator.update(reading([-9.8, 0, 0]), 100, 1);
		const initialLean = estimator.tilt(100, 0, 8, 1)?.x ?? 0;
		expect(initialLean).toBeLessThan(-1);

		for (let now = 200; now <= 2500; now += 100) estimator.update(reading([-9.8, 0, 0]), now, 1);
		const settledLean = estimator.tilt(2500, 0, 8, 1)?.x ?? Infinity;
		expect(Math.abs(settledLean)).toBeLessThan(Math.abs(initialLean) * 0.1);
	});

	it('weights the neutral orientation by elapsed time instead of event count', () => {
		const frequent = createDeviceGravityEstimator();
		const sparse = createDeviceGravityEstimator();
		for (const estimator of [frequent, sparse]) {
			estimator.update(reading([0, 0, 9.8]), 0, 2);
			estimator.update(reading(null, [0, 90, 0], 100), 100, 2);
		}
		for (let now = 200; now <= 900; now += 100) frequent.update(reading(null, [0, 0, 0]), now, 2);
		sparse.update(reading(null, [0, 0, 0]), 900, 2);

		const frequentLean = frequent.tilt(900, 0, 8, 2)?.x ?? 0;
		const sparseLean = sparse.tilt(900, 0, 8, 2)?.x ?? 0;
		expect(frequentLean).toBeCloseTo(sparseLean, 1);
	});
});
