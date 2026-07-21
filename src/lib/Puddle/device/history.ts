import type { TimedVector, Vector3 } from './types';

export interface GravityHistory {
	clear: () => void;
	record: (vector: Vector3 | null, nowMs: number, windowMs: number) => void;
	rollingNeutral: (nowMs: number, windowMs: number) => Vector3 | null;
}

export function createGravityHistory(): GravityHistory {
	let samples: TimedVector[] = [];
	let start = 0;

	const clear = (): void => {
		samples = [];
		start = 0;
	};

	const prune = (cutoff: number): void => {
		while (start + 1 < samples.length && (samples[start + 1]?.at ?? Infinity) <= cutoff) start++;
		if (start > 256 && start * 2 > samples.length) {
			samples = samples.slice(start);
			start = 0;
		}
	};

	const record = (vector: Vector3 | null, nowMs: number, windowMs: number): void => {
		if (!vector || windowMs === 0) {
			clear();
			return;
		}
		const last = samples.at(-1);
		if (last?.at === nowMs) samples[samples.length - 1] = { at: nowMs, vector };
		else samples.push({ at: nowMs, vector });
		prune(nowMs - windowMs);
	};

	const rollingNeutral = (nowMs: number, windowMs: number): Vector3 | null => {
		const first = samples[start];
		const latest = samples.at(-1);
		if (!first || !latest || windowMs === 0) return null;
		const windowStart = Math.max(nowMs - windowMs, first.at);
		let x = 0;
		let y = 0;
		let z = 0;
		let duration = 0;
		for (let i = start; i < samples.length; i++) {
			const sample = samples[i];
			if (!sample) continue;
			const segmentStart = Math.max(windowStart, sample.at);
			const segmentEnd = Math.min(nowMs, samples[i + 1]?.at ?? nowMs);
			const segmentDuration = Math.max(0, segmentEnd - segmentStart);
			x += sample.vector.x * segmentDuration;
			y += sample.vector.y * segmentDuration;
			z += sample.vector.z * segmentDuration;
			duration += segmentDuration;
		}
		return duration > 0 ? { x: x / duration, y: y / duration, z: z / duration } : latest.vector;
	};

	return { clear, record, rollingNeutral };
}
