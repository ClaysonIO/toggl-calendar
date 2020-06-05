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

    static FetchDateRangeDetails(apiKey: string, workspace_id: string, startDate: Dayjs, endDate: Dayjs, page?: number){
        return new Promise((resolve, reject)=>{
            const response = {timeEntries: []};

            axios.get('https://toggl.com/reports/api/v2/details', {
                params: {
                    since: startDate.isBefore(endDate) ? startDate.format('YYYY-MM-DD') : endDate.format('YYYY-MM-DD'),
                    until: startDate.isBefore(endDate) ? endDate.format('YYYY-MM-DD') : startDate.format('YYYY-MM-DD'),
                    user_agent: "https://toggl.clayson.io",
                    workspace_id: workspace_id,
                    page: page === undefined ? 0 : page
                },
                auth: {username: apiKey, password: "api_token"}
            })
                .then(result=>result.data)
                .then((result: any)=> {
                    response.timeEntries = response.timeEntries.concat(result.data);
                    if(result.total_count < result.per_page){
                        resolve(response);
                    } else {
                        const newPage = page ? page + 1 : 1;
                        Toggl.FetchDateRangeDetails(apiKey, workspace_id, startDate, endDate, newPage)
                            .then(result=>resolve(result))
                            .catch(err=>reject(err));
                    }
                })
                .catch(err=>{
                    reject(err)
                })
        })
    }
}