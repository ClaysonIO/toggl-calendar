import React from 'react';
import { useQuery } from '@tanstack/react-query'
import {Toggl} from "./Toggl";
import {useTogglApiKey} from "./useTogglApiKey";

export function useTogglUser() {
  const {togglApiKey} = useTogglApiKey();

  const response = useQuery({
    queryKey: ['togglUser', togglApiKey],
    queryFn: ({ queryKey: [key, params] }: {queryKey: [string, string]})=>Toggl
        .GetUser(params as string),
  })

    return response;
}