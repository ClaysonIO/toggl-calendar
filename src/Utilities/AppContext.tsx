import React, {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState} from "react";
import {useTogglApiKey} from "./useTogglApiKey";
import {useTogglUser} from "./useTogglUser";
import {TEST_TOGGL_WORKSPACE_NAME} from "./testingEnv";

interface WorkspaceSummary {
    id: number;
    name: string;
}

export type DataMode = "toggl" | "manual";
const DATA_MODE_STORAGE_KEY = "calendarDataMode";

interface AppContextValue {
    apiToken: string;
    setApiToken: (token: string) => void;
    workspaces: WorkspaceSummary[];
    selectedWorkspaceId: number | null;
    selectedWorkspace: WorkspaceSummary | undefined;
    selectWorkspace: (id: number | null) => void;
    refetchUser: () => void;
    isLoadingUser: boolean;
    dataMode: DataMode;
    setDataMode: (mode: DataMode) => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({children}: {children: React.ReactNode}) {
    const {togglApiKey, setTogglApiKey} = useTogglApiKey();
    const {data: user, isLoading: isLoadingUser, refetch: refetchUser} = useTogglUser();

    const [dataMode, setDataModeState] = useState<DataMode>(() => {
        const stored = localStorage.getItem(DATA_MODE_STORAGE_KEY);
        return stored === "manual" ? "manual" : "toggl";
    });
    const setDataMode = useCallback((mode: DataMode) => {
        setDataModeState(mode);
        localStorage.setItem(DATA_MODE_STORAGE_KEY, mode);
    }, []);

    const workspaces: WorkspaceSummary[] = useMemo(
        () => (user?.workspaces ?? [])
            .map(ws => ({id: ws.id, name: ws.name}))
            .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase(), "en", {numeric: true})),
        [user]
    );

    const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<number | null>(() => {
        const stored = localStorage.getItem("workSpaceId");
        return stored ? Number(stored) : null;
    });

    // When workspaces load, restore last selection or apply env-based auto-select.
    const autoSelectApplied = useRef(false);
    useEffect(() => {
        if (!workspaces.length || autoSelectApplied.current) return;
        autoSelectApplied.current = true;

        if (TEST_TOGGL_WORKSPACE_NAME) {
            const normalized = TEST_TOGGL_WORKSPACE_NAME.toLowerCase();
            const match =
                workspaces.find(ws => ws.name.toLowerCase() === normalized) ||
                workspaces.find(ws => ws.name.toLowerCase().includes(normalized));
            if (match) {
                setSelectedWorkspaceId(match.id);
                localStorage.setItem("workSpaceId", String(match.id));
                return;
            }
        }

        const stored = localStorage.getItem("workSpaceId");
        if (stored) {
            const found = workspaces.find(ws => ws.id === Number(stored));
            if (found) {
                setSelectedWorkspaceId(found.id);
            }
        }
    }, [workspaces]);

    // When the API token changes the user query re-runs; reset auto-select so the
    // new workspace list gets the same selection logic applied.
    useEffect(() => {
        autoSelectApplied.current = false;
    }, [togglApiKey]);

    const selectWorkspace = useCallback((id: number | null) => {
        setSelectedWorkspaceId(id);
        localStorage.setItem("workSpaceId", id != null ? String(id) : "");
    }, []);

    const selectedWorkspace = useMemo(
        () => workspaces.find(ws => ws.id === selectedWorkspaceId),
        [workspaces, selectedWorkspaceId]
    );

    const value: AppContextValue = {
        apiToken: togglApiKey,
        setApiToken: setTogglApiKey,
        workspaces,
        selectedWorkspaceId,
        selectedWorkspace,
        selectWorkspace,
        refetchUser: () => void refetchUser(),
        isLoadingUser,
        dataMode,
        setDataMode,
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext(): AppContextValue {
    const ctx = useContext(AppContext);
    if (!ctx) throw new Error("useAppContext must be used within an AppProvider");
    return ctx;
}
