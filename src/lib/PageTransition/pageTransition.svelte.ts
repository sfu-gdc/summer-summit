import { getContext, hasContext, setContext } from 'svelte';
import { MediaQuery } from 'svelte/reactivity';

import { PUDDLE_DEFAULTS } from '../Puddle/config';
import type { PuddleTransitionTarget } from '../Puddle/config';
import { resolvePuddleGeometry } from '../Puddle/geometry';
import { puddlePath } from '../Puddle/render/puddleRenderer';
import {
	createFloodPlan,
	floodMaskAtProgress,
	floodProgressForDirection,
	puddleMaskFromPath,
	type FloodPlan,
} from './flood';

const TRANSITION_DURATION = 400;
const HOME_TARGET_TIMEOUT = 200;
const contextKey = Symbol('page-transition');

function easeOutQuart(value: number): number {
	return 1 - (1 - value) ** 4;
}

function nextFrame(): Promise<void> {
	return new Promise((resolve) => {
		requestAnimationFrame(() => {
			resolve();
		});
	});
}

function planFor(target: PuddleTransitionTarget): FloodPlan {
	return createFloodPlan(
		puddleMaskFromPath(target.path, target.cols, target.rows, target.cellSize),
		target.cols,
		target.rows,
	);
}

function centerTransform(target: PuddleTransitionTarget): string {
	return `translate(50%, 50%) translate(${((-target.cols * target.cellSize) / 2).toString()}px, ${((-target.rows * target.cellSize) / 2).toString()}px)`;
}

function clipTransform(
	target: PuddleTransitionTarget,
	viewportWidth: number,
	viewportHeight: number,
): string {
	const x = (viewportWidth - target.cols * target.cellSize) / 2;
	const y = (viewportHeight - target.rows * target.cellSize) / 2;
	return `translate(${x.toString()} ${y.toString()})`;
}

function expandTargetToViewport(
	target: PuddleTransitionTarget,
	viewportWidth: number,
	viewportHeight: number,
): PuddleTransitionTarget {
	const horizontalPadding = Math.max(
		0,
		Math.ceil((viewportWidth - target.cols * target.cellSize) / (2 * target.cellSize)),
	);
	const verticalPadding = Math.max(
		0,
		Math.ceil((viewportHeight - target.rows * target.cellSize) / (2 * target.cellSize)),
	);
	if (horizontalPadding === 0 && verticalPadding === 0) return target;

	const source = puddleMaskFromPath(target.path, target.cols, target.rows, target.cellSize);
	const cols = target.cols + horizontalPadding * 2;
	const rows = target.rows + verticalPadding * 2;
	const padded = new Uint8Array(cols * rows);
	for (let row = 0; row < target.rows; row++) {
		const sourceStart = row * target.cols;
		const destinationStart = (row + verticalPadding) * cols + horizontalPadding;
		padded.set(source.subarray(sourceStart, sourceStart + target.cols), destinationStart);
	}
	return {
		path: puddlePath(padded, cols, rows, target.cellSize),
		cols,
		rows,
		cellSize: target.cellSize,
	};
}

export class PageTransitionCoordinator {
	overlayPath = $state('');
	overlayTransform = $state('');
	overlayClipTransform = $state('translate(0 0)');
	overlayVisible = $state(false);
	phase = $state<'idle' | 'covering' | 'covered' | 'revealing'>('idle');

	readonly #reducedMotion = new MediaQuery('(prefers-reduced-motion: reduce)');
	#homeTarget: PuddleTransitionTarget | null = null;
	#homeTargetReady: Promise<PuddleTransitionTarget> | null = null;
	#resolveHomeTarget: ((target: PuddleTransitionTarget) => void) | null = null;
	#transitionId = 0;

	registerHomeTarget = (target: PuddleTransitionTarget): void => {
		if (target.cols <= 0 || target.rows <= 0 || target.cellSize <= 0) return;
		const snapshot = { ...target };
		this.#homeTarget = snapshot;
		this.#resolveHomeTarget?.(snapshot);
		this.#resolveHomeTarget = null;
		if (this.phase === 'idle' || (this.phase === 'covering' && !this.overlayVisible)) {
			this.#applyTarget(snapshot);
		}
	};

	async coverFromHome(): Promise<number | null> {
		if (this.#reducedMotion.current || !this.#homeTarget) return null;
		const transitionId = this.#beginTransition();
		this.phase = 'covering';
		this.overlayVisible = false;
		const registeredTarget = this.#homeTarget;
		const preparedFrame = await registeredTarget.prepareExpansion?.();
		if (!this.#isCurrent(transitionId)) return null;
		const liveTarget = preparedFrame ? { ...registeredTarget, ...preparedFrame } : this.#homeTarget;
		const target = expandTargetToViewport(liveTarget, window.innerWidth, window.innerHeight);
		const plan = planFor(target);
		this.overlayVisible = true;
		this.#applyPlan(plan, 0, target.cellSize);
		await this.#animate(plan, 'cover', target.cellSize, transitionId);
		if (!this.#isCurrent(transitionId)) return null;
		this.phase = 'covered';
		return transitionId;
	}

	prepareReveal(): number | null {
		if (this.#reducedMotion.current) return null;
		const transitionId = this.#beginTransition();
		this.#homeTargetReady = new Promise((resolve) => {
			this.#resolveHomeTarget = resolve;
		});
		const target = this.#coverTarget();
		this.#applyMask(
			new Uint8Array(target.cols * target.rows).fill(1),
			target.cols,
			target.rows,
			target.cellSize,
		);
		this.overlayVisible = true;
		this.phase = 'covered';
		return transitionId;
	}

	finishOnDarkPage(transitionId: number | null): void {
		if (transitionId === null || !this.#isCurrent(transitionId)) return;
		this.overlayVisible = false;
		this.phase = 'idle';
	}

	async revealHome(transitionId: number | null): Promise<void> {
		if (transitionId === null) return;
		if (!this.#isCurrent(transitionId)) return;
		if (this.#reducedMotion.current) {
			this.overlayVisible = false;
			this.phase = 'idle';
			return;
		}
		const target = await this.#waitForHomeTarget();
		if (!this.#isCurrent(transitionId)) return;
		if (!target) {
			this.overlayVisible = false;
			this.phase = 'idle';
			return;
		}

		const expandedTarget = expandTargetToViewport(target, window.innerWidth, window.innerHeight);
		const plan = planFor(expandedTarget);
		this.phase = 'revealing';
		this.#applyPlan(plan, 1, expandedTarget.cellSize);
		await this.#animate(plan, 'reveal', expandedTarget.cellSize, transitionId);
		if (!this.#isCurrent(transitionId)) return;

		const latestTarget = this.#homeTarget ?? target;
		this.#applyTarget(latestTarget);
		await nextFrame();
		if (!this.#isCurrent(transitionId)) return;
		this.overlayVisible = false;
		this.phase = 'idle';
	}

	#beginTransition(): number {
		return ++this.#transitionId;
	}

	#isCurrent(transitionId: number): boolean {
		return transitionId === this.#transitionId;
	}

	#waitForHomeTarget(): Promise<PuddleTransitionTarget | null> {
		const ready = this.#homeTargetReady;
		if (!ready) return Promise.resolve(this.#homeTarget);

		return new Promise((resolve) => {
			let settled = false;
			let timeout: ReturnType<typeof setTimeout> | undefined;
			const finish = (target: PuddleTransitionTarget | null): void => {
				if (settled) return;
				settled = true;
				if (timeout) clearTimeout(timeout);
				if (this.#homeTargetReady === ready) {
					this.#homeTargetReady = null;
					this.#resolveHomeTarget = null;
				}
				resolve(target);
			};

			timeout = setTimeout(() => {
				finish(this.#homeTarget);
			}, HOME_TARGET_TIMEOUT);
			void ready.then(finish);
		});
	}

	#coverTarget(): PuddleTransitionTarget {
		const cached = this.#homeTarget;
		if (cached) return expandTargetToViewport(cached, window.innerWidth, window.innerHeight);
		const geometry = resolvePuddleGeometry(window.innerWidth, window.innerHeight, {
			cellSize: PUDDLE_DEFAULTS.cellSize,
			maxCells: PUDDLE_DEFAULTS.maxCells,
		});
		return {
			path: '',
			cols: geometry.cols,
			rows: geometry.rows,
			cellSize: geometry.cellSize,
		};
	}

	#applyMask(mask: Uint8Array, cols: number, rows: number, cellSize: number): void {
		this.#applyTarget({ path: puddlePath(mask, cols, rows, cellSize), cols, rows, cellSize });
	}

	#applyTarget(target: PuddleTransitionTarget): void {
		this.overlayPath = target.path;
		this.overlayTransform = centerTransform(target);
		this.overlayClipTransform = clipTransform(target, window.innerWidth, window.innerHeight);
	}

	#applyPlan(plan: FloodPlan, progress: number, cellSize: number): void {
		this.#applyMask(floodMaskAtProgress(plan, progress), plan.nx, plan.ny, cellSize);
	}

	#animate(
		plan: FloodPlan,
		direction: 'cover' | 'reveal',
		cellSize: number,
		transitionId: number,
	): Promise<void> {
		return new Promise((resolve) => {
			const startedAt = performance.now();
			const frame = (time: number): void => {
				if (!this.#isCurrent(transitionId)) {
					resolve();
					return;
				}
				const animationProgress = Math.min(1, (time - startedAt) / TRANSITION_DURATION);
				const floodProgress = floodProgressForDirection(easeOutQuart(animationProgress), direction);
				this.#applyPlan(plan, floodProgress, cellSize);
				if (animationProgress < 1) requestAnimationFrame(frame);
				else resolve();
			};
			requestAnimationFrame(frame);
		});
	}
}

export function providePageTransition(): PageTransitionCoordinator {
	const coordinator = new PageTransitionCoordinator();
	setContext(contextKey, coordinator);
	return coordinator;
}

export function usePageTransition(): PageTransitionCoordinator | null {
	return hasContext(contextKey) ? getContext<PageTransitionCoordinator>(contextKey) : null;
}
