import {useTogglApiKey} from "./useTogglApiKey";
import {useTogglUser} from "./useTogglUser";
import {useQuery} from "@tanstack/react-query";
import {Toggl} from "./Toggl";
import dayjs from "dayjs";
import {ISingleProjectTasks} from "./Interfaces/ISingleProjectTasks";
import {DecimalToRoundedTime} from "./Functions/DecimalToRoundedTime";

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

    const simplifiedDetails = response.data
        ?.reduce((acc: {[key: number]: ISingleProjectTasks}, val)=>{

            if(!acc[val.pid]){
                acc[val.pid] = {
                    project_id: val.pid,
                    dates: {}
                }
            }

            const startDate = dayjs(val.start).format('YYYY-MM-DD');
            if(!acc[val.pid].dates[startDate]) {
                acc[val.pid].dates[startDate] = {
                    date: startDate,
                    hours: 0,
                    roundedHours: 0,
                    taskDescriptions: new Set<string>()
                }
            }

            acc[val.pid].dates[startDate].hours += val.dur / 1000 / 60 / 60;
            acc[val.pid].dates[startDate].roundedHours = +DecimalToRoundedTime(acc[val.pid].dates[startDate].hours)
            val.description.split(',').map((val: string)=>val.trim()).forEach(desc=>{
                acc[val.pid].dates[startDate].taskDescriptions.add(desc)
            });

            return acc;
    }, {})

    return {simpleData: simplifiedDetails, ...response};
}