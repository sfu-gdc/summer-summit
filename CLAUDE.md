# CLAUDE.md

This is a **Svelte + SvelteKit web app** deployed to **Cloudflare Workers** via `@sveltejs/adapter-cloudflare`.

Styling is [UnoCSS](https://unocss.dev) (Wind4 preset); component primitives come from
[bits-ui](https://bits-ui.com). The `README.md` is stock `sv create` boilerplate.

Commit messages conforms to the conventional commit style.

Package manager is **pnpm**. DO NOT USE OTHER PACKAGE MANAGERS. **All meaningful pnpm config lives in `pnpm-workspace.yaml`**.

## Command Notes

- Before you try to run `pnpm exec ...`, check the scripts in `package.json` to see if you can use any of them instead.

Several scripts use pnpm's **regex-group form**: `pnpm run /^check:.*/` runs every
matching script. So `check` = `check:app` + `check:tools`; `lint` =
`lint:prettier` + `lint:eslint`; `gen` = `gen:wrangler` + `gen:svelte-kit`. To run just
one, call the leaf (`pnpm check:app`, `pnpm lint:eslint`).

If `.svelte-kit/` is missing (generated types absent, check/test failing), run
`pnpm gen:svelte-kit`.

## Architecture

- **Components** live in `src/lib/<Component>/<Component>.svelte` with a colocated
  `<Component>.stories.svelte` (Svelte CSF), re-exported from `src/lib/index.ts` (the
  `$lib` alias). Components wrap a bits-ui primitive with inline UnoCSS classes (see
  `src/lib/Button/Button.svelte`). bits-ui's prop types leak ~400 inherited HTML
  attributes into Storybook autodocs, so stories whitelist the real API via
  `parameters.controls.include` / `docs.argTypes.include` (Storybook #32171).
- **Design tokens** are in `uno.config.ts`: a `brand` palette (`primary`/`secondary`/
  `shade`) in oklch. Fonts `sans` (Work Sans) and `hero` (Syncopate) are
  **bundled by `unplugin-fonts`**, not fetched — `presetWebFonts` is `provider: 'none'`.
  Transformers: variant-group, directives, compile-class.
