import {useQuery} from "@tanstack/react-query";
import {useTogglApiKey} from "./useTogglApiKey";
import {ISingleProject} from "./Interfaces/ISingleProject";

const TOGGL_API = import.meta.env.DEV ? '/toggl-api' : 'https://api.track.toggl.com';

export function useTogglProjects({workspace_id}: {workspace_id: string}){

    const {togglApiKey} = useTogglApiKey();
    const result = useQuery({
        queryKey: ['togglProjects', workspace_id],
        enabled: !!togglApiKey && !!workspace_id,
        queryFn: async ({queryKey: [key, workspace_id]})=>{
            const response = await fetch(`${TOGGL_API}/api/v9/workspaces/${workspace_id}/projects`, {
                headers: {
                    'Authorization': `Basic ${btoa(`${togglApiKey}:api_token`)}`
                }
            });
            return response.json() as Promise<ISingleProject[]>;
        }
    })

    return result
}