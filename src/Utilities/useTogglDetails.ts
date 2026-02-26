import {useMemo} from "react";
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
        queryKey: ['togglDetails', {togglApiKey, workspace_id, startDate, endDate}],
        enabled: !!togglApiKey && !!workspace_id && !!user?.id && !!startDate && !!endDate,
        queryFn: async () => Toggl.FetchDateRangeDetails(
            togglApiKey,
            user?.id ?? 0,
            workspace_id,
            dayjs(startDate, 'YYYY-MM-DD'),
            dayjs(endDate, 'YYYY-MM-DD'))
    })

    const rawData = response.data;

    const simplifiedDetails = useMemo(() => {
        if (!rawData) return undefined;
        return rawData.reduce((acc: {[key: number]: ISingleProjectTasks}, val) => {
            if(!Number.isFinite(val?.pid)) return acc;

            if(!acc[val.pid]){
                acc[val.pid] = {
                    project_id: val.pid,
                    project_name: val.project || undefined,
                    client_name: val.client || undefined,
                    project_hex_color: val.project_hex_color || undefined,
                    dates: {}
                }
            }

            const projectSummary = acc[val.pid];
            if (!projectSummary.project_name && val.project) {
                projectSummary.project_name = val.project;
            }
            if (!projectSummary.client_name && val.client) {
                projectSummary.client_name = val.client;
            }
            if (!projectSummary.project_hex_color && val.project_hex_color) {
                projectSummary.project_hex_color = val.project_hex_color;
            }

            const entryDate = dayjs(val.start).format('YYYY-MM-DD');
            if(!projectSummary.dates[entryDate]) {
                projectSummary.dates[entryDate] = {
                    date: entryDate,
                    hours: 0,
                    roundedHours: 0,
                    taskDescriptions: new Set<string>()
                }
            }

            projectSummary.dates[entryDate].hours += val.dur / 1000 / 60 / 60;
            projectSummary.dates[entryDate].roundedHours = +DecimalToRoundedTime(projectSummary.dates[entryDate].hours)

            const descriptionChunks = (val.description || "")
                .split(',')
                .map((description: string)=>description.trim())
                .filter((description: string)=>!!description);

            descriptionChunks.forEach(description=>{
                projectSummary.dates[entryDate].taskDescriptions.add(description)
            });

            return acc;
        }, {});
    }, [rawData]);

    return {simpleData: simplifiedDetails, ...response};
}