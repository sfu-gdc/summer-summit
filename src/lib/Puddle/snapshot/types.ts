export type PuddleSnapshotName = 'default' | 'compact' | 'medium' | 'expanded' | 'large';

export interface PuddleSnapshotAsset {
	readonly name: PuddleSnapshotName;
	readonly url: string;
	readonly nx: number;
	readonly ny: number;
	readonly cellSize: number;
	readonly compatibilityHash: number;
	readonly path: string;
	readonly clip: string;
}
