# Repository Guidelines

## Project Structure & Module Organization

Stueradio is a tablet-oriented Danish radio PWA using vanilla JavaScript, CSS, and Bun.

- `index.html`: application markup and entry point.
- `src/app.js`: station selection, playback, weather, photos, and installation controls.
- `src/cover-art.js`: cover lookup client and local cache.
- `src/styles.css`: responsive layout and radio styling.
- `public/`: service worker, manifest, icon, and robots file.
- `docker/server.ts`: Bun HTTP server, metadata and cover APIs, and health endpoint.
- `scripts/build.ts`: copies frontend files into generated `dist/`.

Make source changes outside `dist/`; the build recreates that directory.

## Build, Test, and Development Commands

Run commands from the repository root with Bun installed:

- `bun run build`: recreate `dist/` from `index.html`, `public/`, and `src/`.
- `bun run start`: serve `dist/` and APIs at `http://localhost:3000`; build first and rebuild after frontend edits.
- `docker build -t stueradio .`: build the production image.
- `docker run --rm -p 3000:3000 stueradio`: run the container locally.

Set `PORT` to override the server's default port, 3000.

## Coding Style & Naming Conventions

Follow nearby code: two-space indentation for expanded blocks, double-quoted JavaScript strings, and semicolons. Existing files also use compact expressions; keep edits focused. Use camelCase for functions and variables, uppercase constants, kebab-case CSS classes, and explicit `.js` extensions in browser imports. Keep interface text in Danish. No formatter, linter, or TypeScript checking script is configured.

## Testing Guidelines

No automated test framework, test suite, or coverage threshold is configured. After changes, build and start the app; verify `/health` returns `{"status":"ok"}`. Check station switching, playback, volume, metadata and cover fallbacks, weather, photo persistence, and responsive tablet layout as applicable. For PWA changes, verify installation and offline shell loading. Update the cache version and shell list in `public/sw.js` when cached assets change.

## Commit & Pull Request Guidelines

History uses short imperative subjects such as `Add station logo styling and header clock`. Follow that style and keep commits focused. PRs should explain the behavior changed, list validation performed, link relevant issues, and include screenshots for visual changes. Identify any dependency on live station streams or external APIs when reporting verification limits.
