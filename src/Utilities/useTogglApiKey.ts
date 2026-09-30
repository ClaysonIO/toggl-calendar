import React from 'react';
import {TEST_TOGGL_API_KEY, TEST_TOGGL_API_VERSION} from "./testingEnv";

/**
 * Which Toggl API the key belongs to.
 * - "v1": Toggl Track (api.track.toggl.com, Basic auth with `<token>:api_token`)
 * - "v2": Toggl 2.0 / Focus (focus.toggl.com/api, Bearer auth)
 */
export type TogglApiVersion = "v1" | "v2";

export interface TogglCredentials {
    apiKey: string;
    apiVersion: TogglApiVersion;
}

const API_VERSION_STORAGE_KEY = "togglApiVersion";

function parseApiVersion(value: string | null | undefined): TogglApiVersion | null {
    return value === "v1" || value === "v2" ? value : null;
}

/*
 * The key and version are shared across every component that calls useTogglApiKey,
 * so changing them in the Config dialog immediately re-runs user/project/time-entry queries.
 */
let state: TogglCredentials = {
    apiKey: localStorage.getItem("togglApiKey")
        || localStorage.getItem("togglApiToken")
        || TEST_TOGGL_API_KEY
        || "",
    apiVersion: parseApiVersion(localStorage.getItem(API_VERSION_STORAGE_KEY))
        || parseApiVersion(TEST_TOGGL_API_VERSION)
        || "v1",
};
const listeners = new Set<() => void>();

function setState(next: Partial<TogglCredentials>) {
    state = {...state, ...next};
    localStorage.setItem('togglApiKey', state.apiKey);
    localStorage.setItem('togglApiToken', state.apiKey);
    localStorage.setItem(API_VERSION_STORAGE_KEY, state.apiVersion);
    listeners.forEach(listener => listener());
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export function useTogglApiKey(){
    const credentials = React.useSyncExternalStore(subscribe, () => state);

    const setTogglApiKey = React.useCallback((apiKey: string) => setState({apiKey: apiKey || ""}), []);
    const setTogglApiVersion = React.useCallback((apiVersion: TogglApiVersion) => setState({apiVersion}), []);

    return {
        togglApiKey: credentials.apiKey,
        togglApiVersion: credentials.apiVersion,
        /** Stable object (same reference until key or version changes) to pass to Toggl API calls */
        togglCredentials: credentials,
        setTogglApiKey,
        setTogglApiVersion,
    };
}
