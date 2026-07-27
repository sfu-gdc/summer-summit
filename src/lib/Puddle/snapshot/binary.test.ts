import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, test } from 'vitest';

import {
	assertDryGuardBand,
	decodePuddleSnapshot,
	encodePuddleSnapshot,
	remapCenteredDepth,
	type PuddleSnapshot,
} from './binary';

function snapshot(overrides: Partial<PuddleSnapshot> = {}): PuddleSnapshot {
	return {
		nx: 4,
		ny: 4,
		cellSize: 10,
		guardBand: 1,
		seed: 7,
		compatibilityHash: 42,
		totalMass: 3,
		depth: new Float32Array([0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0]),
		...overrides,
	};
}

describe('puddle snapshot binary', () => {
	test('round-trips versioned metadata and depth', () => {
		const source = snapshot();
		const decoded = decodePuddleSnapshot(encodePuddleSnapshot(source));

		expect(decoded).toMatchObject({
			nx: source.nx,
			ny: source.ny,
			cellSize: source.cellSize,
			guardBand: source.guardBand,
			seed: source.seed,
			compatibilityHash: source.compatibilityHash,
			totalMass: source.totalMass,
		});
		expect([...decoded.depth]).toEqual([...source.depth]);
	});

	test('rejects corrupt and wet-guard snapshots', () => {
		const corrupt = encodePuddleSnapshot(snapshot());
		new DataView(corrupt).setUint32(0, 0, true);
		expect(() => decodePuddleSnapshot(corrupt)).toThrow(/magic/);

		const wet = snapshot();
		wet.depth[0] = 0.1;
		expect(() => {
			assertDryGuardBand(wet);
		}).toThrow(/wet/);
	});

	test('generated default snapshot has a dry guard band', async () => {
		const contents = await readFile(path.resolve('static/puddle/default.bin'));
		const buffer = contents.buffer.slice(
			contents.byteOffset,
			contents.byteOffset + contents.byteLength,
		);
		expect(() => {
			assertDryGuardBand(decodePuddleSnapshot(buffer));
		}).not.toThrow();
	});
});

describe('centered snapshot remapping', () => {
	test('pads outside the source world domain with dry cells', () => {
		const source = snapshot();
		const target = remapCenteredDepth(source, 6, 6, 10);

		for (let x = 0; x < 6; x++) {
			expect(target[x]).toBe(0);
			expect(target[5 * 6 + x]).toBe(0);
		}
		for (let y = 0; y < 6; y++) {
			expect(target[y * 6]).toBe(0);
			expect(target[y * 6 + 5]).toBe(0);
		}
		expect(target.reduce((mass, depth) => mass + depth, 0)).toBe(3);
	});

	test('maps odd/even grids by world coordinates instead of integer offsets', () => {
		const source = snapshot({
			nx: 3,
			ny: 3,
			depth: new Float32Array([0, 0, 0, 0, 2, 0, 0, 0, 0]),
		});
		const target = remapCenteredDepth(source, 4, 4, 10);

		expect(target[1 * 4 + 1]).toBe(0.5);
		expect(target[1 * 4 + 2]).toBe(0.5);
		expect(target[2 * 4 + 1]).toBe(0.5);
		expect(target[2 * 4 + 2]).toBe(0.5);
		expect(target.reduce((mass, depth) => mass + depth, 0)).toBe(2);
		expect(target[0]).toBe(0);
	});
});
