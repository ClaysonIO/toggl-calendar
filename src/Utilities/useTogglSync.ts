import {useCallback, useEffect, useRef, useState} from "react";
import dayjs from "dayjs";
import {useTogglApiKey} from "./useTogglApiKey";
import {useTogglUser} from "./useTogglUser";
import {syncProjects, syncWeekDetails} from "./togglSync";

/**
 * Provides background sync on mount/week change and a manual sync function
 * for the displayed week. Used by Calendar for Dexie population and sync button.
 */
export function useTogglSync(
    workspaceId: number,
    weekStartKey: string,
    weekEndKey: string
) {
    const {togglApiKey} = useTogglApiKey();
    const {data: user} = useTogglUser();
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncError, setSyncError] = useState(false);
    const hasInitialSync = useRef(false);

    const syncWeekRange = useCallback(
        async (startDate: string, endDate: string) => {
            if (!togglApiKey || !user?.id || !workspaceId) return;
            setIsSyncing(true);
            setSyncError(false);
            try {
                await syncWeekDetails(
                    togglApiKey,
                    user.id,
                    workspaceId,
                    dayjs(startDate, "YYYY-MM-DD"),
                    dayjs(endDate, "YYYY-MM-DD")
                );
            } catch {
                setSyncError(true);
            } finally {
                setIsSyncing(false);
            }
        },
        [togglApiKey, user?.id, workspaceId]
    );

    // Background sync on visit: projects + current week (once per session to avoid rate limits)
    useEffect(() => {
        if (hasInitialSync.current || !togglApiKey || !user?.id || !workspaceId || !weekStartKey || !weekEndKey) return;
        hasInitialSync.current = true;
        const run = async () => {
            try {
                await syncProjects(togglApiKey, workspaceId);
                await syncWeekDetails(
                    togglApiKey,
                    user.id,
                    workspaceId,
                    dayjs(weekStartKey, "YYYY-MM-DD"),
                    dayjs(weekEndKey, "YYYY-MM-DD")
                );
            } catch {
                // Background sync failure: leave data as-is; user can use manual sync
            }
        };
        void run();
    }, [togglApiKey, user?.id, workspaceId, weekStartKey, weekEndKey]);

    return {
        syncWeekRange,
        isSyncing,
        syncError,
        setSyncError
    };
}
