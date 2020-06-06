import {Project} from "./Project";
import {Dayjs} from "dayjs";
import {Toggl} from "./Toggl";
import {appState} from "../App";
import {action, observable, runInAction} from "mobx";
import {ITaskResponse} from "./Interfaces/ITaskResponse";
import {Entry} from "./Entry";

export interface IWorkSpace{
    id: number;
    name: string;
    api_token: string;
}

export class WorkSpace{
    public id: number;
    public name: string;
    public api_token: string;
    @observable public projects: Project[] = [];

    constructor({id, name, api_token}: IWorkSpace, apiToken?: string) {
        this.id = id;
        this.name = name;
        this.api_token = apiToken || api_token
    }

    public getProjects(){

    }

    public projectHash(){
        return this.projects.reduce((acc: {[key: number]: Project}, val: Project)=>{
            acc[val.pid] = val;
            return acc;
        }, {})
    }

    @action addTasksToProjects(taskResponses: ITaskResponse[]){
        let projectHash: {[key: number]: Project} = {};
        let projects: Project[] = []

        taskResponses.forEach(taskResponse=>{
            if(!projectHash[taskResponse.pid]){
                const newProject = new Project(taskResponse)
                projects.push(newProject)
                projectHash[newProject.pid] = newProject;
            }

            projectHash[taskResponse.pid].addEntry(new Entry(taskResponse))
        })
        runInAction(()=>{
            this.projects = projects;
        })

    }

    public getTasks(startDate: Dayjs, endDate: Dayjs){
        return new Promise((resolve, reject)=>{
            if(appState.user?.id){
                Toggl.FetchDateRangeDetails(this.api_token, appState.user.id, this.id.toString(), startDate, endDate)
                    .then(result=>{
                        this.addTasksToProjects(result);
                        resolve(result)
                    })
                    .catch(err=>reject(err));
            }
        })
    }

    public toInterface(): IWorkSpace{
        return {
            id: this.id,
            name: this.name,
            api_token: this.api_token,
        }
    }
}