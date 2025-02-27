import axios from 'axios';
import {Dayjs} from 'dayjs';
import {IUser} from "./Interfaces/IUser";
import {appState} from "../App";
import {ITaskResponse} from "./Interfaces/ITaskResponse";


export class Toggl{

    static GetUser(apiKey: string): Promise<IUser>{
        return new Promise((resolve, reject)=>{
            Promise.all([
                axios.get('https://api.track.toggl.com/api/v9/me', {
                    headers: {
                        "Content-Type": "application/json"
                    },
                    auth: {username: apiKey, password: "api_token"}
                }),
                axios.get('https://api.track.toggl.com/api/v9/workspaces', {
                    headers: {
                        "Content-Type": "application/json"
                    },
                    auth: {username: apiKey, password: "api_token"}
                })
            ])
                .then(([user, workspaces])=>{
                    resolve({
                        ...user.data,
                        workspaces: workspaces.data
                    } as IUser)
                })
                .catch(err=>reject(err));
        })
    }

    static FetchDateRangeDetails(apiKey: string, user_id: number, workspace_id: string, startDate: Dayjs, endDate: Dayjs, page?: number): Promise<ITaskResponse[]>{
        return new Promise((resolve, reject)=>{
            let timeEntries: ITaskResponse[] = [];
            //Note that Pages in Toggl begin at 1, not 0
            const currentPage = page ? page : 1;

            axios.get('https://track.toggl.com/reports/api/v2/details', {
                params: {
                    since: startDate.isBefore(endDate) ? startDate.format('YYYY-MM-DD') : endDate.format('YYYY-MM-DD'),
                    until: startDate.isBefore(endDate) ? endDate.format('YYYY-MM-DD') : startDate.format('YYYY-MM-DD'),
                    user_agent: window.location.origin,
                    workspace_id: workspace_id.toString(),
                    user_ids: user_id.toString(),
                    page: currentPage
                },
                headers: {
                    "Content-Type": "application/json"
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
                            Toggl.FetchDateRangeDetails(apiKey, user_id, workspace_id, startDate, endDate, currentPage + 1 )
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

    static fetchProjects(apiKey: string, workspace_id: string): Promise<any[]>{
        return new Promise((resolve, reject)=>{

            axios.get(`https://api.track.toggl.com/api/v9/workspaces/${workspace_id}/projects`, {
                headers: {
                    "Content-Type": "application/json"
                },
                auth: {username: apiKey, password: "api_token"}
            })
                .then(result=> resolve(result.data))
                .catch(err=>{
                    reject(err)
                })
        })
    }
}
