import type { DomainCoordinate } from './brands';

function smooth(value: number): number {
	return value * value * (3 - 2 * value);
}

// Maps lattice coordinates to a deterministic value in [0, 1).
function hashLatticePoint(latticeX: number, latticeY: number, seed: number): number {
	const hash = (latticeX * 374761393 + latticeY * 668265263 + seed * 2246822519) | 0;
	const mixedHash = Math.imul(hash ^ (hash >>> 13), 1274126177);
	return ((mixedHash ^ (mixedHash >>> 16)) >>> 0) / 4294967296;
}

export function valueNoise(x: number, y: number, seed: number): number {
	// Lattice-cell origin and smoothed local coordinates within that cell.
	const latticeX = Math.floor(x);
	const latticeY = Math.floor(y);
	const blendX = smooth(x - latticeX);
	const blendY = smooth(y - latticeY);
	// Deterministic values at the cell's four corners, bilinearly interpolated below.
	const corner00 = hashLatticePoint(latticeX, latticeY, seed);
	const corner10 = hashLatticePoint(latticeX + 1, latticeY, seed);
	const corner01 = hashLatticePoint(latticeX, latticeY + 1, seed);
	const corner11 = hashLatticePoint(latticeX + 1, latticeY + 1, seed);
	return (
		(corner00 * (1 - blendX) + corner10 * blendX) * (1 - blendY) +
		(corner01 * (1 - blendX) + corner11 * blendX) * blendY
	);
}

export function fbm(x: number, y: number, seed: number, octaves = 4): number {
	const octaveIndices = Array.from(
		{ length: Math.max(0, Math.ceil(octaves)) },
		(_, octave) => octave,
	);
	const { weightedSum, amplitudeSum } = octaveIndices.reduce(
		(sums, octave) => {
			const amplitude = 0.5 ** (octave + 1);
			const frequency = 2 ** octave;
			return {
				weightedSum:
					sums.weightedSum +
					amplitude * valueNoise(x * frequency, y * frequency, seed + octave * 101),
				amplitudeSum: sums.amplitudeSum + amplitude,
			};
		},
		{ weightedSum: 0, amplitudeSum: 0 },
	);
	return weightedSum / amplitudeSum;
}

// Signed distance to a rounded box; negative inside.
export function sdRoundRect(
	x: DomainCoordinate,
	y: DomainCoordinate,
	halfWidth: number,
	halfHeight: number,
	radius: number,
): number {
	const roundedDistanceX = Math.abs(x) - halfWidth + radius;
	const roundedDistanceY = Math.abs(y) - halfHeight + radius;
	return (
		Math.min(Math.max(roundedDistanceX, roundedDistanceY), 0) +
		Math.hypot(Math.max(roundedDistanceX, 0), Math.max(roundedDistanceY, 0)) -
		radius
	);
}
