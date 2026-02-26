## Cursor Cloud specific instructions

### Overview

Toggl Calendar is a client-side-only React SPA (Vite 4 + TypeScript + MobX). There is no backend — all API calls go directly from the browser to Toggl's external API (`api.track.toggl.com`).

### Dev commands

See `package.json` scripts:

- `npm start` — starts Vite dev server on port 5173
- `npm run build` — production build to `dist/`

No lint or test scripts are configured in this repository.

### Environment variables

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

### Known caveats

- **CORS**: The Toggl Track API does not return `Access-Control-Allow-Origin` headers, so browser-based requests from `localhost` are blocked. The app renders and navigates correctly, but workspace fetching and calendar data loading will fail with network errors in the browser. To test API calls directly, use `curl` from the terminal with Basic Auth (`-u "$VITE_TOGGL_API_KEY:api_token"`).
- **No ESLint / test runner**: The project has `eslintConfig` in `package.json` but no `lint` script and no test files. `@testing-library` packages are installed as devDependencies but unused.
- **Node version**: The CI config references Node 10.x but Vite 4 requires Node 14.18+. Node 18+ works fine.
