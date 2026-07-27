import type { PuddleGeometryOptions } from '../geometry';
import type { PuddleSimulationOptions } from '../runtime/puddleSimulation';

export interface PuddleWorkerInitMessage {
	readonly type: 'init';
	readonly generation: number;
	readonly width: number;
	readonly height: number;
	readonly geometry: PuddleGeometryOptions;
	readonly simulation: PuddleSimulationOptions;
	readonly settleSubsteps: number;
	readonly threshold: number;
	readonly animated: boolean;
	readonly snapshotUrl: string;
	readonly compatibilityHash: number;
	readonly cursorTilt: number;
	readonly cursorEase: number;
	readonly deviceEase: number;
}

export type PuddleWorkerInput =
	| PuddleWorkerInitMessage
	| { readonly type: 'active'; readonly active: boolean }
	| { readonly type: 'pointer'; readonly x: number; readonly y: number }
	| { readonly type: 'clear-pointer' }
	| { readonly type: 'device-tilt'; readonly x: number; readonly y: number }
	| { readonly type: 'frame-consumed' };

export type PuddleWorkerOutput =
	| {
			readonly type: 'ready';
			readonly generation: number;
			readonly nx: number;
			readonly ny: number;
			readonly cellSize: number;
			readonly path: string;
	  }
	| {
			readonly type: 'path';
			readonly generation: number;
			readonly path: string;
	  }
	| { readonly type: 'error'; readonly generation: number; readonly message: string };
