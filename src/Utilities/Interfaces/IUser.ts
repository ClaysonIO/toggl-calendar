export interface IUser {
    "id":number,
    "api_token":string;
    "default_wid": number;
    "email":string;
    "fullname":string;
    "jquery_timeofday_format":string;
    "jquery_date_format":string;
    "timeofday_format":string;
    "date_format":string;
    "store_start_and_stop_time":true,
    "beginning_of_week": number;
    "language":string;
    "image_url":string;
    "new_blog_post":{},
    "projects": [],
    "tags": [],
    "tasks": [],
    "workspaces": {
        id: number;
        name: string;
        /** Only set by the v2 (Toggl 2.0) API, where workspaces are nested under organizations */
        organization_id?: number;
        api_token: string;
        at: string;
    }[],
    "clients": string[]
}