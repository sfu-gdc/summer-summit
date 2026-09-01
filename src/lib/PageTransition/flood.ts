export interface FloodPlan {
	/** Dry cells ranked by connected arrival; progress consumes this list by area percentile. */
	readonly fillOrder: Uint32Array;
	readonly initialMask: Uint8Array;
	readonly nx: number;
	readonly ny: number;
	readonly sourceMask: Uint8Array;
}

function cellNoise(x: number, y: number): number {
	let value = Math.imul(x + 1, 0x9e3779b1) ^ Math.imul(y + 1, 0x85ebca77);
	value ^= value >>> 16;
	value = Math.imul(value, 0x7feb352d);
	value ^= value >>> 15;
	return (value >>> 0) / 0xffff_ffff;
}

class MinHeap {
	readonly #indices: number[] = [];
	readonly #priorities: number[] = [];

	get size(): number {
		return this.#indices.length;
	}

	push(index: number, priority: number): void {
		let child = this.#indices.length;
		this.#indices.push(index);
		this.#priorities.push(priority);
		while (child > 0) {
			const parent = Math.floor((child - 1) / 2);
			if ((this.#priorities[parent] ?? 0) <= priority) break;
			this.#indices[child] = this.#indices[parent] ?? index;
			this.#priorities[child] = this.#priorities[parent] ?? priority;
			child = parent;
		}
		this.#indices[child] = index;
		this.#priorities[child] = priority;
	}

	pop(): { index: number; priority: number } | undefined {
		const index = this.#indices[0];
		const priority = this.#priorities[0];
		if (index === undefined || priority === undefined) return undefined;

		const lastIndex = this.#indices.pop();
		const lastPriority = this.#priorities.pop();
		if (this.#indices.length > 0 && lastIndex !== undefined && lastPriority !== undefined) {
			let parent = 0;
			while (parent < this.#indices.length) {
				const left = parent * 2 + 1;
				if (left >= this.#indices.length) break;
				const right = left + 1;
				const child =
					right < this.#indices.length &&
					(this.#priorities[right] ?? Infinity) < (this.#priorities[left] ?? Infinity)
						? right
						: left;
				if ((this.#priorities[child] ?? Infinity) >= lastPriority) break;
				this.#indices[parent] = this.#indices[child] ?? lastIndex;
				this.#priorities[parent] = this.#priorities[child] ?? lastPriority;
				parent = child;
			}
			this.#indices[parent] = lastIndex;
			this.#priorities[parent] = lastPriority;
		}
		return { index, priority };
	}
}

/** Decode the rectangular-run path emitted by `puddlePath` back into its cell mask. */
export function puddleMaskFromPath(
	path: string,
	nx: number,
	ny: number,
	cellSize: number,
): Uint8Array {
	const mask = new Uint8Array(Math.max(0, nx * ny));
	if (cellSize <= 0 || nx <= 0 || ny <= 0) return mask;

	const runPattern =
		/M(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)h(-?\d+(?:\.\d+)?)v(-?\d+(?:\.\d+)?)h-?\d+(?:\.\d+)?z/g;
	for (const match of path.matchAll(runPattern)) {
		const x = Number(match[1]);
		const y = Number(match[2]);
		const width = Number(match[3]);
		const height = Number(match[4]);
		if (![x, y, width, height].every(Number.isFinite) || height <= 0 || width <= 0) continue;
		const row = Math.round(y / cellSize);
		const start = Math.round(x / cellSize);
		const end = start + Math.round(width / cellSize);
		if (row < 0 || row >= ny) continue;
		for (let column = Math.max(0, start); column < Math.min(nx, end); column++) {
			mask[row * nx + column] = 1;
		}
	}
	return mask;
}

function largestConnectedComponentMask(mask: Uint8Array, nx: number, ny: number): Uint8Array {
	const visited = new Uint8Array(mask.length);
	const queue = new Int32Array(mask.length);
	const largestMembers = new Int32Array(mask.length);
	let largestSize = 0;

	for (let start = 0; start < mask.length; start++) {
		if (mask[start] !== 1 || visited[start] === 1) continue;

		let head = 0;
		let tail = 0;
		queue[tail++] = start;
		visited[start] = 1;

		while (head < tail) {
			const current = queue[head++];
			if (current === undefined) continue;
			const x = current % nx;
			const y = Math.floor(current / nx);
			const neighbors = [
				x > 0 ? current - 1 : -1,
				x + 1 < nx ? current + 1 : -1,
				y > 0 ? current - nx : -1,
				y + 1 < ny ? current + nx : -1,
			];
			for (const neighbor of neighbors) {
				if (neighbor < 0 || mask[neighbor] !== 1 || visited[neighbor] === 1) continue;
				visited[neighbor] = 1;
				queue[tail++] = neighbor;
			}
		}

		// Keeping the first equal-sized component makes ties deterministic in row-major order.
		if (tail <= largestSize) continue;
		largestSize = tail;
		largestMembers.set(queue.subarray(0, tail), 0);
	}

	const sourceMask = new Uint8Array(mask.length);
	for (let index = 0; index < largestSize; index++) {
		const componentIndex = largestMembers[index];
		if (componentIndex !== undefined) sourceMask[componentIndex] = 1;
	}

	return sourceMask;
}

/** Build a connected, deterministic flood frontier from the largest wet component. */
export function createFloodPlan(seedMask: ArrayLike<number>, nx: number, ny: number): FloodPlan {
	if (!Number.isInteger(nx) || !Number.isInteger(ny) || nx <= 0 || ny <= 0) {
		throw new Error('Flood dimensions must be positive integers');
	}

	const initialMask = Uint8Array.from({ length: nx * ny }, (_, index) =>
		(seedMask[index] ?? 0) === 1 ? 1 : 0,
	);
	if (!initialMask.includes(1)) {
		initialMask[Math.floor(ny / 2) * nx + Math.floor(nx / 2)] = 1;
	}
	const sourceMask = largestConnectedComponentMask(initialMask, nx, ny);

	const arrivals = new Float64Array(initialMask.length);
	arrivals.fill(Infinity);
	const heap = new MinHeap();
	for (let index = 0; index < sourceMask.length; index++) {
		if (sourceMask[index] !== 1) continue;
		arrivals[index] = 0;
		heap.push(index, 0);
	}

	while (heap.size > 0) {
		const current = heap.pop();
		if (!current || current.priority !== arrivals[current.index]) continue;
		const x = current.index % nx;
		const y = Math.floor(current.index / nx);
		const neighbors = [
			x > 0 ? current.index - 1 : -1,
			x + 1 < nx ? current.index + 1 : -1,
			y > 0 ? current.index - nx : -1,
			y + 1 < ny ? current.index + nx : -1,
		];
		for (const neighbor of neighbors) {
			if (neighbor < 0) continue;
			const neighborX = neighbor % nx;
			const neighborY = Math.floor(neighbor / nx);
			const nextArrival = current.priority + 0.82 + cellNoise(neighborX, neighborY) * 0.36;
			if (nextArrival >= (arrivals[neighbor] ?? Infinity)) continue;
			arrivals[neighbor] = nextArrival;
			heap.push(neighbor, nextArrival);
		}
	}

	const fillOrder = Uint32Array.from(
		Array.from({ length: initialMask.length }, (_, index) => index)
			.filter((index) => initialMask[index] !== 1)
			.sort((left, right) => {
				const arrivalDifference = (arrivals[left] ?? Infinity) - (arrivals[right] ?? Infinity);
				return arrivalDifference === 0 ? left - right : arrivalDifference;
			}),
	);
	return { fillOrder, initialMask, nx, ny, sourceMask };
}

export function floodMaskAtProgress(plan: FloodPlan, progress: number): Uint8Array {
	const clamped = Math.max(0, Math.min(1, progress));
	const mask = plan.initialMask.slice();
	const fillCount = Math.round(plan.fillOrder.length * clamped);
	for (let rank = 0; rank < fillCount; rank++) {
		const index = plan.fillOrder[rank];
		if (index !== undefined) mask[index] = 1;
	}
	return mask;
}

export function floodProgressForDirection(
	animationProgress: number,
	direction: 'cover' | 'reveal',
): number {
	const clamped = Math.max(0, Math.min(1, animationProgress));
	return direction === 'cover' ? clamped : 1 - clamped;
}
