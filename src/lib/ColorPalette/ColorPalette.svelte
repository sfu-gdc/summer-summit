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

<figure class={['[max-inline-size:100%]', className]}>
	<figcaption class="text-sm tracking-[0.04em] font-700 mb-3 uppercase">{label}</figcaption>

	{#if swatches.length > 0}
		<ol
			class="pb-2 gap-2 grid grid-cols-[repeat(11,minmax(5.5rem,1fr))] overflow-x-auto"
			aria-label={label}
		>
			{#each swatches as swatch (swatch.key)}
				<li class="gap-[0.3rem] grid">
					<span
						class="chip rounded-lg aspect-4/5 block"
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
					<span class="text-xs font-700 flex gap-1 items-baseline justify-between tabular-nums">
						{swatch.stop}
						<small
							class={[
								'text-[0.5rem] font-500 tracking-[0.04em] uppercase',
								{ 'gamut-wide': swatch.gamut !== 'srgb' },
							]}>{gamutLabels[swatch.gamut]}</small
						>
					</span>
					<button
						class="copy text-[0.625rem] tracking-[0.03em] border-b cursor-pointer truncate uppercase [inline-size:fit-content] tabular-nums hover:text-inherit focus-visible:(outline-2 outline-current outline-offset-[0.125rem] rounded-[0.125rem])"
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
					<span class="channels text-[0.55rem] truncate tabular-nums">
						L {swatch.color.l.toFixed(2)} · C {swatch.color.c.toFixed(3)}
						{#if swatch.color.h !== undefined}· H {swatch.color.h.toFixed(1)}°{/if}
					</span>
				</li>
			{/each}
		</ol>
	{:else}
		<p class="p-4 border border-current rounded-lg">No colors were provided.</p>
	{/if}
</figure>

<style>
	.chip {
		background: var(--swatch-fallback);
		border: 1px solid color-mix(in oklab, currentColor 16%, transparent);
		box-shadow: inset 0 0 0 1px color-mix(in oklab, white 12%, transparent);
	}

	@supports (color: oklch(50% 0.1 180)) {
		.chip {
			background: var(--swatch);
		}
	}

	small {
		color: color-mix(in oklab, currentColor 55%, transparent);
	}

	small.gamut-wide {
		color: color(display-p3 0.72 0.16 0.74);
	}

	.copy,
	.channels {
		color: color-mix(in oklab, currentColor 68%, transparent);
	}
</style>
