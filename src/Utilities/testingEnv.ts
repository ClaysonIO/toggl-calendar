const viteEnv = (import.meta as any).env || {};

export const TEST_TOGGL_API_KEY = String(viteEnv.VITE_TOGGL_API_KEY || "").trim();
export const TEST_TOGGL_WORKSPACE_NAME = String(viteEnv.VITE_TOGGL_WORKSPACE_NAME || "").trim();
