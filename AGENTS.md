## Cursor Cloud specific instructions

### Overview

Toggl Calendar is a client-side-only React SPA (Vite 4 + TypeScript + Dexie). There is no backend — all API calls go directly from the browser to Toggl's external API (`api.track.toggl.com`). All data that is entered is persisted using Dexie. 

### Dev commands

See `package.json` scripts:

- `npm start` — starts Vite dev server on port 5173
- `npm run build` — production build to `dist/`

No lint or test scripts are configured in this repository.

### Environment variables

These variables are only used during development, to help the AI use this tool

Copy `.env.example` to `.env` and fill in values. The `VITE_TOGGL_API_KEY` secret is injected automatically when available:

```
VITE_TOGGL_API_KEY=<your-toggl-api-key>
VITE_TOGGL_WORKSPACE_NAME=<workspace-name>
```

On startup, create `.env` from the injected secret:
```bash
echo "VITE_TOGGL_API_KEY=$VITE_TOGGL_API_KEY" > .env
echo "VITE_TOGGL_WORKSPACE_NAME=${VITE_TOGGL_WORKSPACE_NAME:-}" >> .env
```

### CORS / dev proxy

The Toggl CORS whitelisting API is disabled (returns 404/410). A Vite dev proxy is configured in `vite.config.ts` to route API requests through the dev server:

- `/toggl-api/*` proxies to `https://api.track.toggl.com/*`
- `/toggl-reports/*` proxies to `https://track.toggl.com/*`

Source files (`Toggl.ts`, `useTogglProjects.ts`) use `import.meta.env.DEV` to switch between proxy paths (dev) and direct URLs (production). This means the app works fully end-to-end in dev mode without CORS issues.

### Known caveats

- **No ESLint / test runner**: The project has `eslintConfig` in `package.json` but no `lint` script and no test files. `@testing-library` packages are installed as devDependencies but unused.
- **Node version**: The CI config references Node 10.x but Vite 4 requires Node 14.18+. Node 18+ works fine.
