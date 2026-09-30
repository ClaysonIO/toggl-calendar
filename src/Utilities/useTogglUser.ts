import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { calendarDb } from "./calendarDb";
import { Toggl } from "./Toggl";
import { useTogglApiKey } from "./useTogglApiKey";

export function useTogglUser() {
    const { togglApiKey, togglApiVersion } = useTogglApiKey();

    const response = useQuery({
        queryKey: ['togglUser', togglApiKey, togglApiVersion] as const,
        enabled: !!togglApiKey,
        queryFn: ({ queryKey: [, apiKey, apiVersion] }) =>
            Toggl.GetUser({ apiKey, apiVersion }),
    });

    useEffect(() => {
        const user = response.data;
        if (!user?.workspaces?.length) return;
        const list = user.workspaces.map(ws => ({ id: ws.id, name: ws.name, organization_id: ws.organization_id }));
        calendarDb.togglWorkspaces.clear().then(() => calendarDb.togglWorkspaces.bulkPut(list));
    }, [response.data]);

    return response;
}