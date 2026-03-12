import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { calendarDb } from "./calendarDb";
import { Toggl } from "./Toggl";
import { useTogglApiKey } from "./useTogglApiKey";

export function useTogglUser() {
    const { togglApiKey } = useTogglApiKey();

    const response = useQuery({
        queryKey: ['togglUser', togglApiKey],
        enabled: !!togglApiKey,
        queryFn: ({ queryKey: [key, params] }: { queryKey: [string, string] }) =>
            Toggl.GetUser(params as string),
    });

    useEffect(() => {
        const user = response.data;
        if (!user?.workspaces?.length) return;
        const list = user.workspaces.map(ws => ({ id: ws.id, name: ws.name }));
        calendarDb.togglWorkspaces.clear().then(() => calendarDb.togglWorkspaces.bulkPut(list));
    }, [response.data]);

    return response;
}