import {Project} from "./Project";
import {Dayjs} from "dayjs";
import {Toggl} from "./Toggl";
import {appState} from "../App";
import {action, observable} from "mobx";
import {ITaskResponse} from "./Interfaces/ITaskResponse";

export interface IWorkSpace{
    id: number;
    name: string;
}

export class WorkSpace{
    public id: number;
    public name: string;
    @observable public projects: Project[] = [];

    constructor({id, name}: IWorkSpace, apiKey: string) {
        this.id = id;
        this.name = name;
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
        let projectHash = this.projectHash();
        let projects = this.projects;

        taskResponses.forEach(taskResponse=>{
            if(!projectHash[taskResponse.pid]){
                const newProject = new Project(taskResponse)
                projects.push(newProject)
                projectHash[newProject.pid] = newProject;
            }

            // projectHash[taskResponse.pid]
        })
    }

    public getTasks(startDate: Dayjs, endDate: Dayjs){
        return new Promise((resolve, reject)=>{
            Toggl.FetchDateRangeDetails(appState.settings.apiToken, this.id.toString(), startDate, endDate)
                .then(result=>resolve(result))
                .catch(err=>reject(err));
        })
    }

    public dehydrate(): IWorkSpace{
        return {
            id: this.id,
            name: this.name
        }
    }
}