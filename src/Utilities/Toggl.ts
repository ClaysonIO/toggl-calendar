import axios from 'axios';
import {Dayjs} from 'dayjs';
import {IUser} from "./Interfaces/IUser";
import {ITaskResponse} from "./Interfaces/ITaskResponse";
import {TogglCredentials} from "./useTogglApiKey";
import * as TogglV2 from "./TogglV2";

const TOGGL_API = import.meta.env.DEV ? '/toggl-api' : 'https://api.track.toggl.com';
const TOGGL_REPORTS = import.meta.env.DEV ? '/toggl-reports' : 'https://track.toggl.com';

/**
 * Toggl API client. Every call takes TogglCredentials and is routed to the v1 (Toggl Track)
 * or v2 (Toggl 2.0 / Focus, see TogglV2.ts) API depending on the chosen apiVersion.
 */
export class Toggl{

    static GetUser({apiKey, apiVersion}: TogglCredentials): Promise<IUser>{
        return apiVersion === "v2" ? TogglV2.GetUser(apiKey) : Toggl.GetUserV1(apiKey);
    }

    static FetchDateRangeDetails({apiKey, apiVersion}: TogglCredentials, user_id: number, workspace_id: string, startDate: Dayjs, endDate: Dayjs): Promise<ITaskResponse[]>{
        return apiVersion === "v2"
            ? TogglV2.FetchDateRangeDetails(apiKey, user_id, workspace_id, startDate, endDate)
            : Toggl.FetchDateRangeDetailsV1(apiKey, user_id, workspace_id, startDate, endDate);
    }

    static fetchProjects({apiKey, apiVersion}: TogglCredentials, workspace_id: string): Promise<any[]>{
        return apiVersion === "v2" ? TogglV2.fetchProjects(apiKey, workspace_id) : Toggl.fetchProjectsV1(apiKey, workspace_id);
    }

    private static GetUserV1(apiKey: string): Promise<IUser>{
        return new Promise((resolve, reject)=>{
            Promise.all([
                axios.get(`${TOGGL_API}/api/v9/me`, {
                    headers: {
                        "Content-Type": "application/json"
                    },
                    auth: {username: apiKey, password: "api_token"}
                }),
                axios.get(`${TOGGL_API}/api/v9/workspaces`, {
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

    private static FetchDateRangeDetailsV1(apiKey: string, user_id: number, workspace_id: string, startDate: Dayjs, endDate: Dayjs, page?: number): Promise<ITaskResponse[]>{
        return new Promise((resolve, reject)=>{
            let timeEntries: ITaskResponse[] = [];
            //Note that Pages in Toggl begin at 1, not 0
            const currentPage = page ? page : 1;

            axios.get(`${TOGGL_REPORTS}/reports/api/v2/details`, {
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
                            Toggl.FetchDateRangeDetailsV1(apiKey, user_id, workspace_id, startDate, endDate, currentPage + 1 )
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

    /**
     * Fetch all projects for a workspace (Toggl API v9).
     * Response is { items: [...] }; supports pagination and includes archived (active=both).
     */
    private static fetchProjectsV1(apiKey: string, workspace_id: string): Promise<any[]>{
        const perPage = 200;
        return new Promise((resolve, reject)=>{
            const collect: any[] = [];
            const fetchPage = (page: number) => {
                axios.get(`${TOGGL_API}/api/v9/workspaces/${workspace_id}/projects`, {
                    params: {
                        active: "both",
                        per_page: perPage,
                        page
                    },
                    headers: {
                        "Content-Type": "application/json"
                    },
                    auth: {username: apiKey, password: "api_token"}
                })
                    .then(result => {
                        const data = result.data;
                        const items = Array.isArray(data) ? data : (data?.items ?? []);
                        collect.push(...items);
                        const total = typeof data?.total_count === "number" ? data.total_count : null;
                        const done = items.length < perPage || (total != null && collect.length >= total);
                        if (done) {
                            resolve(collect);
                        } else {
                            setTimeout(() => fetchPage(page + 1), 300);
                        }
                    })
                    .catch(err => reject(err));
            };
            fetchPage(1);
        });
    }
}
