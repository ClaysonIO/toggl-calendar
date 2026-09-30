import {useQuery} from "@tanstack/react-query";
import {useTogglApiKey} from "./useTogglApiKey";
import {ISingleProject} from "./Interfaces/ISingleProject";
import {Toggl} from "./Toggl";

export function useTogglProjects({workspace_id}: {workspace_id: string}){

    const {togglApiKey, togglApiVersion} = useTogglApiKey();
    const result = useQuery({
        queryKey: ['togglProjects', workspace_id, togglApiKey, togglApiVersion] as const,
        enabled: !!togglApiKey && !!workspace_id,
        queryFn: async ({queryKey: [, workspace_id, apiKey, apiVersion]})=>
            Toggl.fetchProjects({apiKey, apiVersion}, workspace_id) as Promise<ISingleProject[]>
    })

    return result
}
