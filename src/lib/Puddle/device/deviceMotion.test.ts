import { describe, expect, it } from 'vitest';

import {
	createDeviceMotionEstimator,
	projectDeviceMotion,
	requestDeviceGravityPermission,
	type DeviceMotionReading,
} from './index';

const reading = (
	rotation: [number, number, number] | null,
	interval = 16,
): DeviceMotionReading => ({
	rotationRate: rotation ? { alpha: rotation[0], beta: rotation[1], gamma: rotation[2] } : null,
	interval,
});

describe('projectDeviceMotion', () => {
	it('maps device axes to the simulation sign convention in portrait', () => {
		expect(projectDeviceMotion({ x: 0, y: 1 }, 0, 6)).toEqual({ x: 0, y: -6 });
		const right = projectDeviceMotion({ x: -1, y: 0 }, 0, 6);
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
			const tilt = projectDeviceMotion({ x: 1, y: 0 }, expected.angle, 6);
			expect(tilt.x).toBeCloseTo(expected.x);
			expect(tilt.y).toBeCloseTo(expected.y);
		}
	});

	it('sanitizes invalid or negative strength', () => {
		for (const tilt of [
			projectDeviceMotion({ x: 1, y: 1 }, 0, -1),
			projectDeviceMotion({ x: NaN, y: 1 }, NaN, NaN),
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

describe('createDeviceMotionEstimator', () => {
	it('makes angular acceleration the dominant impulse and retains a smaller velocity term', () => {
		const estimator = createDeviceMotionEstimator();
		estimator.update(reading([0, 0, 0]), 0);
		estimator.update(reading([0, 90, 0]), 16);
		const impulse = estimator.tilt(16, 0, 8)?.x ?? 0;

		for (let now = 32; now <= 400; now += 16) estimator.update(reading([0, 90, 0]), now);
		const steadyRotation = estimator.tilt(400, 0, 8)?.x ?? 0;

		expect(impulse).toBeLessThan(-4);
		expect(steadyRotation).toBeLessThan(0);
		expect(Math.abs(impulse)).toBeGreaterThan(Math.abs(steadyRotation) * 3);
	});

	it('projects the motion into the current screen orientation', () => {
		const estimator = createDeviceMotionEstimator();
		estimator.update(reading([0, 0, 0]), 0);
		estimator.update(reading([0, 90, 0]), 16);
		const portrait = estimator.tilt(16, 0, 8);
		const landscape = estimator.tilt(16, 90, 8);
		expect(portrait?.x).toBeLessThan(-4);
		expect(landscape?.y).toBeGreaterThan(4);
	});

	it('clamps extreme values, filters noise, and expires stale readings', () => {
		const quiet = createDeviceMotionEstimator();
		quiet.update(reading([0, 0, 0]), 0);
		quiet.update(reading([0, 1, 0]), 16);
		expect(quiet.tilt(16, 0, 8)?.x).toBeCloseTo(0);
		expect(quiet.tilt(16, 0, 8)?.y).toBeCloseTo(0);

		const extreme = createDeviceMotionEstimator();
		extreme.update(reading([0, 0, 0]), 0);
		extreme.update(reading([0, 100_000, 0]), 16);
		const tilt = extreme.tilt(16, 0, 8);
		expect(Math.hypot(tilt?.x ?? 0, tilt?.y ?? 0)).toBeLessThanOrEqual(8);
		expect(extreme.tilt(517, 0, 8)).toBeNull();
	});

	it('returns to rest after one complete rotation instead of retaining the final side', () => {
		const estimator = createDeviceMotionEstimator();
		estimator.update(reading([0, 0, 0]), 0);
		for (let now = 16; now <= 2000; now += 16) {
			estimator.update(reading([0, 180, 0]), now);
		}
		const rotating = estimator.tilt(2000, 0, 8)?.x ?? 0;
		expect(rotating).toBeLessThan(-1);

		estimator.update(reading([0, 0, 0]), 2016);
		const braking = estimator.tilt(2016, 0, 8)?.x ?? 0;
		expect(braking).toBeGreaterThan(1);
		for (let now = 2032; now <= 2512; now += 16) {
			estimator.update(reading([0, 0, 0]), now);
		}
		const resting = estimator.tilt(2512, 0, 8);
		expect(Math.abs(resting?.x ?? Infinity)).toBeLessThan(0.01);
		expect(Math.abs(resting?.y ?? Infinity)).toBeLessThan(0.01);
	});

	it('clears rate and derivative history on reset', () => {
		const estimator = createDeviceMotionEstimator();
		estimator.update(reading([0, 0, 0]), 0);
		estimator.update(reading([0, 90, 0]), 16);
		const impulse = Math.abs(estimator.tilt(16, 0, 8)?.x ?? 0);
		estimator.reset();
		expect(estimator.tilt(16, 0, 8)).toBeNull();

		estimator.update(reading([0, 90, 0]), 32);
		const afterReset = Math.abs(estimator.tilt(32, 0, 8)?.x ?? Infinity);
		expect(afterReset).toBeLessThan(impulse * 0.25);
	});
});
