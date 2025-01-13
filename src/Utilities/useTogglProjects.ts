import {useQuery} from "@tanstack/react-query";
import {useTogglApiKey} from "./useTogglApiKey";
import {ISingleProject} from "./Interfaces/ISingleProject";

export function useTogglProjects({workspace_id}: {workspace_id: string}){

    const {togglApiKey} = useTogglApiKey();
    const result = useQuery({
        queryKey: ['togglProjects', workspace_id],
        queryFn: async ({queryKey: [key, workspace_id]})=>{
            const response = await fetch(`https://api.track.toggl.com/api/v9/workspaces/${workspace_id}/projects`, {
                headers: {
                    'Authorization': `Basic ${btoa(`${togglApiKey}:api_token`)}`
                }
            });
            return response.json() as Promise<ISingleProject[]>;
        }
    })

    return result
}