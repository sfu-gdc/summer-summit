export interface Rng {
	/** Next float in [0, 1). */
	next: () => number;
	/** Float in [min, max). */
	range: (min: number, max: number) => number;
}

export class SeededRng implements Rng {
	private state: number;

	constructor(seed: number) {
		// Fold a possibly non-integer/negative seed into a nonzero uint32 state.
		const initialState = Math.floor(seed) >>> 0;
		this.state = initialState === 0 ? 0x9e3779b9 : initialState;
	}

	next(): number {
		this.state = (this.state + 0x6d2b79f5) | 0;
		const mixed = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
		const remixed = mixed ^ (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed));
		return ((remixed ^ (remixed >>> 14)) >>> 0) / 4294967296;
	}

	range(min: number, max: number): number {
		return min + (max - min) * this.next();
	}
}

export function createRng(seed: number): Rng {
	return new SeededRng(seed);
}
