import axios from 'axios';
import {Dayjs} from 'dayjs';
// import {IWorkSpace, WorkSpace} from "./WorkSpace";
import {IUser} from "./Interfaces/IUser";
import {appState} from "../App";
import {ITaskResponse} from "./Interfaces/ITaskResponse";


export class Toggl{

    static GetUser(apiKey: string): Promise<IUser>{
        return new Promise((resolve, reject)=>{
            axios.get('https://www.toggl.com/api/v8/me', {
                auth: {username: apiKey, password: "api_token"}
            })
                .then((result)=>{
                    resolve(result.data.data as IUser);
                })
                .catch(err=>reject(err));
        })
    }

    // static GetWorkSpaces(apiKey: string): Promise<WorkSpace[]>{
    //     return new Promise((resolve, reject)=>{
    //         axios.get('https://www.toggl.com/api/v8/workspaces', {
    //             auth: {username: apiKey, password: "api_token"}
    //         })
    //             .then((result)=>{
    //                 const workspaces = result.data.map((val: IWorkSpace)=>new WorkSpace(val, apiKey))
    //                 resolve(workspaces);
    //             })
    //             .catch(err=>reject(err));
    //     })
    // }

    static FetchDateRangeDetails(apiKey: string, user_id: number, workspace_id: string, startDate: Dayjs, endDate: Dayjs, page?: number): Promise<ITaskResponse[]>{
        return new Promise((resolve, reject)=>{
            let timeEntries: ITaskResponse[] = [];

            axios.get('https://toggl.com/reports/api/v2/details', {
                params: {
                    since: startDate.isBefore(endDate) ? startDate.format('YYYY-MM-DD') : endDate.format('YYYY-MM-DD'),
                    until: startDate.isBefore(endDate) ? endDate.format('YYYY-MM-DD') : startDate.format('YYYY-MM-DD'),
                    user_agent: "https://toggl.clayson.io",
                    workspace_id: workspace_id.toString(),
                    user_ids: appState.user?.id,
                    page: page === undefined ? 0 : page
                },
                auth: {username: apiKey, password: "api_token"}
            })
                .then(result=>result.data)
                .then((result: any)=> {
                    timeEntries = timeEntries.concat(result.data);
                    if(result.data.length < result.per_page){
                        resolve(timeEntries);
                    } else {
                        /* Toggl rate limits calls at 1 per second. We'll add an extra second on each call
                           to avoid running into trouble */
                        setTimeout(()=>{
                            const newPage = page ? page + 1 : 1;
                            Toggl.FetchDateRangeDetails(apiKey, user_id, workspace_id, startDate, endDate, newPage)
                                .then((result: ITaskResponse[])=>resolve(timeEntries.concat(result)))
                                .catch(err=>reject(err));
                        }, 1000)
                    }
                })
                .catch(err=>{
                    reject(err)
                })
        })
    }
}