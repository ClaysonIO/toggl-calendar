import {useTogglApiKey} from "./useTogglApiKey";
import {useTogglUser} from "./useTogglUser";
import {useQuery} from "@tanstack/react-query";
import {Toggl} from "./Toggl";
import dayjs from "dayjs";

export function useTogglDetails(workspace_id: string, startDate: string, endDate: string){
    const { togglApiKey } = useTogglApiKey();
    const {data: user} = useTogglUser();

    const response = useQuery({
        queryKey: ['togglDetails', {togglApiKey, startDate, endDate}],
        queryFn: async () => Toggl.FetchDateRangeDetails(
            togglApiKey,
            user?.id ?? 0,
            workspace_id,
            dayjs(startDate, 'YYYY-MM-DD'),
            dayjs(endDate, 'YYYY-MM-DD'))
    })

    return response;
}