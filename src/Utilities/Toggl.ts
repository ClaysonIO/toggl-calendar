import axios from 'axios';
import {Dayjs} from 'dayjs';
import {IWorkSpace, WorkSpace} from "./WorkSpace";


export class Toggl{

    static GetWorkSpaces(apiKey: string): Promise<WorkSpace[]>{
        return new Promise((resolve, reject)=>{
            axios.get('https://www.toggl.com/api/v8/workspaces', {
                auth: {username: apiKey, password: "api_token"}
            })
                .then((result)=>{
                    const workspaces = result.data.map((val: IWorkSpace)=>new WorkSpace(val, apiKey))
                    resolve(workspaces);
                })
                .catch(err=>reject(err));
        })
    }


    static GetDateRangeDetails(apiKey: string, workspace_id: string, startDate: Dayjs, endDate: Dayjs){
        return new Promise(async (resolve, reject)=>{
            let page = 0;
            let finished = false;
            let timeEntries: any[] = [];
            while(!finished){

                await axios.get('https://toggl.com/reports/api/v2/details', {
                    params: {
                        since: startDate.isBefore(endDate) ? startDate.format('YYYY-MM-DD') : endDate.format('YYYY-MM-DD'),
                        until: startDate.isBefore(endDate) ? endDate.format('YYYY-MM-DD') : startDate.format('YYYY-MM-DD'),
                        user_agent: "https://toggl.clayson.io",
                        workspace_id: workspace_id
                    },
                    auth: {username: apiKey, password: "api_key"}
                })
                    .then(result=>result.data)
                    .then((result: any)=> {
                        if(result.total_count < result.per_page){
                            finished = true;
                        }
                        timeEntries = timeEntries.concat(result.data);
                    })
                    .catch(err=>{
                        finished = true;
                        reject(err)
                    })
                    .finally(()=>{
                        page++;
                    })

            }

            console.log("TIME ENTRIES", timeEntries);

        })
    }
}