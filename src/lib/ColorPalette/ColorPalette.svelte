<script module lang="ts">
	import type { Color } from 'culori';

	export interface ColorPaletteProps {
		/** Colors to display. Any Culori color objects are accepted. */
		colors: readonly Color[];
		label?: string;
		class?: string;
	}
</script>

<script lang="ts">
	import { formatCss, formatHex, oklch } from 'culori';

	import { classifyGamut, gamutLabels } from './gamutMap';
	import HueChromaMinimap from './HueChromaMinimap.svelte';

	let { colors, label = 'Color palette', class: className }: ColorPaletteProps = $props();

	const swatches = $derived(
		colors.map((input, index) => {
			const color = oklch(input);
			const css = formatCss(color);
			return {
				key: `${String(index)}:${css}`,
				stop: Math.round((1 - color.l) * 1000),
				gamut: classifyGamut(color),
				color,
				css,
				hex: formatHex(color),
			};
		}),
	);

	let copyResult = $state<{ key: string; status: 'copied' | 'failed' } | undefined>();

	async function copyColor(key: string, css: string): Promise<void> {
		try {
			await navigator.clipboard.writeText(css);
			copyResult = { key, status: 'copied' };
		} catch {
			copyResult = { key, status: 'failed' };
		}
	}
</script>

<figure class={['palette', className]}>
	<figcaption>{label}</figcaption>

	{#if swatches.length > 0}
		<ol aria-label={label}>
			{#each swatches as swatch (swatch.key)}
				<li>
					<span
						class="chip"
						style:--swatch={swatch.css}
						style:--swatch-fallback={swatch.hex}
						aria-label={`${String(swatch.stop)}: ${swatch.css}`}
						role="img"
					></span>
					<HueChromaMinimap
						color={swatch.color}
						gamut={swatch.gamut}
						label={`${label} ${String(swatch.stop)}`}
					/>
					<span class="stop">
						{swatch.stop}
						<small class:gamut-wide={swatch.gamut !== 'srgb'}>{gamutLabels[swatch.gamut]}</small>
					</span>
					<button
						class="copy"
						type="button"
						onclick={() => copyColor(swatch.key, swatch.css)}
						aria-live="polite"
						aria-label={copyResult?.key === swatch.key
							? copyResult.status === 'copied'
								? `Copied CSS color for stop ${String(swatch.stop)}`
								: `Retry copying CSS color for stop ${String(swatch.stop)}`
							: `Copy CSS color for stop ${String(swatch.stop)}`}
					>
						{#if copyResult?.key === swatch.key}
							{copyResult.status === 'copied' ? 'Copied' : 'Retry copy'}
						{:else}
							Copy CSS
						{/if}
					</button>
					<span class="channels">
						L {swatch.color.l.toFixed(2)} · C {swatch.color.c.toFixed(3)}
						{#if swatch.color.h !== undefined}· H {swatch.color.h.toFixed(1)}°{/if}
					</span>
				</li>
			{/each}
		</ol>
	{:else}
		<p class="error">No colors were provided.</p>
	{/if}
</figure>

<style>
	.palette {
		box-sizing: border-box;
		max-inline-size: 100%;
		margin: 0;
		color: inherit;
		font-family: inherit;
	}

	figcaption {
		margin-block-end: 0.75rem;
		font-size: 0.875rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	ol {
		display: grid;
		grid-template-columns: repeat(11, minmax(5.5rem, 1fr));
		gap: 0.5rem;
		margin: 0;
		padding: 0 0 0.5rem;
		overflow-x: auto;
		list-style: none;
	}

	li {
		display: grid;
		gap: 0.3rem;
	}

	.chip {
		display: block;
		aspect-ratio: 4 / 5;
		background: var(--swatch-fallback);
		border: 1px solid color-mix(in oklab, currentColor 16%, transparent);
		border-radius: 0.5rem;
		box-shadow: inset 0 0 0 1px color-mix(in oklab, white 12%, transparent);
	}

	@supports (color: oklch(50% 0.1 180)) {
		.chip {
			background: var(--swatch);
		}
	}

	.stop {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.25rem;
		font-size: 0.75rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}

	small {
		color: color-mix(in oklab, currentColor 55%, transparent);
		font-size: 0.5rem;
		font-weight: 500;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	small.gamut-wide {
		color: color(display-p3 0.72 0.16 0.74);
	}

	.copy,
	.channels {
		overflow: hidden;
		color: color-mix(in oklab, currentColor 68%, transparent);
		font-size: 0.625rem;
		font-variant-numeric: tabular-nums;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.copy {
		inline-size: fit-content;
		padding: 0;
		background: none;
		border: 0;
		border-block-end: 1px solid currentColor;
		font: inherit;
		font-size: 0.625rem;
		letter-spacing: 0.03em;
		text-transform: uppercase;
		cursor: pointer;
	}

	.copy:hover {
		color: inherit;
	}

	.copy:focus-visible {
		border-radius: 0.125rem;
		outline: 2px solid currentColor;
		outline-offset: 0.125rem;
	}

	.channels {
		font-size: 0.55rem;
	}

	.error {
		margin: 0;
		padding: 1rem;
		border: 1px solid currentColor;
		border-radius: 0.5rem;
	}
</style>
