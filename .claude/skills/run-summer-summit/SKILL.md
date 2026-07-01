---
name: run-summer-summit
description: Build, run, and drive the summer-summit SvelteKit app and its Storybook. Use to launch Storybook or the dev server, run/drive the component stories as real-browser tests, exercise a component in a specific state, or verify a UI change works.
---

# Run summer-summit

There is no custom driver script: the project already wires every
Storybook story into **Vitest browser mode** (real Chromium via the Playwright
provider). That Vitest integration _is_ the agent-facing harness — you drive a
component by writing a story (optionally with a `play` interaction) and running it as
a browser test, then reading pass/fail. No screenshots, no DOM scraping needed.

All paths below are relative to the repo root (the unit dir). Commands use `pnpm`.

## Prerequisites

Verified on: Windows 11, Node **24.16.0** (`package.json` `devEngines` asks for
`^24.18.0`; 24.16.0 worked fine), pnpm **11.9.0**, Playwright Chromium browser present.

```bash
pnpm install                          # prepare hook auto-runs `svelte-kit sync`
pnpm exec playwright install chromium # browser used by the Vitest browser projects
```

If `svelte-kit sync` didn't run (no `.svelte-kit/`), run it explicitly:

```bash
pnpm run gen:svelte-kit
```

## Run — agent path (drive the components)

The harness is `vitest`. The `vite.config.ts` defines three `test.projects`:
`client` (browser tests for `src/**/*.svelte.{test,spec}.ts`), `server` (node), and
`storybook` (every story, run in real Chromium). To drive the UI, use the
`storybook` project.

**Smoke-run every story in a real browser** (this is the proof the app actually
renders — 4 stories pass):

```bash
pnpm vitest run --project storybook                 # all stories
pnpm vitest run --project storybook -t Default      # one story by NAME (not title)
```

NOTE: `-t` filters on the leaf **story name** (`Default`, `With Icon`, …), not the meta
`title`. Filtering by a title like `-t Button` matches the file but no leaf test, so
every story is reported **skipped** — use a story name instead.

**Drive a specific state.** To exercise a component interactively, add a `play`
function to a `<Story>` in `src/lib/<Component>/<Component>.stories.svelte`. `play`
runs in real Chromium after the story mounts; throw/assert to fail the run. Example
(verified — click + assert passes):

```svelte
<script module lang="ts">
	import { expect, userEvent, within } from 'storybook/test';
	/* ...existing defineMeta... */
</script>

<Story
	name="Default"
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const button = canvas.getByRole('button', { name: 'Notify me' });
		await userEvent.click(button);
		await expect(button).toBeEnabled();
	}}>Notify me</Story
>
```

Then `pnpm vitest run --project storybook` — a green run means the interaction +
assertions held; a red run prints the failing assertion and a
`http://localhost:6006/?path=/story/...` debug URL. This is how you confirm a new
component state behaves, without leaving the test harness.

Filter to one file while iterating: `pnpm vitest run --project storybook src/lib/Button`.

## Run — human path (visual / interactive)

Storybook dev server (interactive canvas, Controls, autodocs, a11y, interactions
panel):

```bash
pnpm run storybook        # serves http://localhost:6006  (see Gotchas: port shift)
```

The plain SvelteKit app (just a "Welcome to SvelteKit" page today — the library, not
the showcase, is the real product):

```bash
pnpm run dev              # serves http://localhost:5173
```

Both block the terminal and are useless headless — Ctrl-C to stop.

## Test

```bash
pnpm vitest run --project storybook   # stories as browser tests (fast, used above)
pnpm run check                        # svelte-check
```

## Gotchas (battle scars from this session)

- **Storybook port auto-shifts.** If `6006` is busy, `storybook dev` silently moves
  to `6007` (then `6008`…). Read the banner for the actual URL; don't assume `6006`.
- **`svelte.config.ts is ignored when options are passed via your Vite config`** —
  harmless, printed on every vite/vitest/storybook invocation here. Ignore it.
- **`No story files found for the specified pattern: src\**\*.mdx`** — harmless; the
  project has no `.mdx` docs pages, only `.stories.svelte`.
- **First `pnpm run dev` is slow (~17s)** — Vite re-optimizes deps ("Re-optimizing
  dependencies because lockfile has changed"). Subsequent runs are fast.
- **`requireAssertions: true`** is set globally in `vite.config.ts` — every test
  (including any `play`) must make at least one assertion or it fails as "no
  assertions". The story smoke-tests already assert via the auto-generated render check.
- **Don't rely on Vitest's screenshot-on-failure for the `storybook` project.** The
  `@storybook/addon-vitest` plugin unmounts the story before Vitest's
  `onTaskFinished` screenshot hook runs, so `document.body.clientHeight` is 0 and no
  PNG is written. (Screenshot-on-failure only fires for the `client` project, where
  the rendered DOM is still mounted at failure time.) Use `play` assertions to verify
  state, not screenshots.

## Troubleshooting

- **`Tests: no test files found` for `--project storybook`** → `.svelte-kit/` missing
  or stale; run `pnpm run gen:svelte-kit`, then retry.
- **Browser project fails to launch / "Executable doesn't exist"** → run
  `pnpm exec playwright install chromium`.
