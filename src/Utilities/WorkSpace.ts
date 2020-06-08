import {Project} from "./Project";
import {Dayjs} from "dayjs";
import {Toggl} from "./Toggl";
import {appState} from "../App";
import {action, computed, observable, runInAction} from "mobx";
import {ITaskResponse} from "./Interfaces/ITaskResponse";
import {Entry} from "./Entry";
import {DecimalToClockTime} from "./Functions/DecimalToClockTime";
import {DecimalToRoundedTime} from "./Functions/DecimalToRoundedTime";

export interface IWorkSpace{
    id: number;
    name: string;
    api_token: string;
}

export class WorkSpace{
    public id: number;
    public name: string;
    public api_token: string;
    @observable public projectOrder: string[] = [];
    @observable public loading: boolean = true;
    @observable public projects: Project[] = [];

    constructor({id, name, api_token}: IWorkSpace, apiToken?: string) {
        this.id = id;
        this.name = name;
        this.api_token = apiToken || api_token;
        this.projectOrder = JSON.parse(window.localStorage.getItem(`workspaceOrder_${id}`) || '[]');
    }

    @action.bound public orderProject({ destination, source, reason }: any){
        const currentOrder = this.orderedProjects.map(val=>val);
        const item = currentOrder.splice(source.index, 1).pop()!;

        currentOrder.splice(destination.index, 0, item);

        this.projectOrder = currentOrder.map(val=>val.pid.toString());
        window.localStorage.setItem(`workspaceOrder_${this.id}`, JSON.stringify(this.projectOrder));

        //TODO: Work out an algorithm to merge the existing array, and the new array, in a manner that keeps both in sync (if possible)
    }

    @computed public get orderedProjects(): Project[]{
        //Create a temporary array
        const orderedArray: Project[] = [];
        const tempArray = this.projects.map(val=>val);

        //Go through the Order list, pop out projects as they're found
        this.projectOrder.forEach(orderedId=>{
            const index = tempArray.findIndex(val=>val.pid.toString() === orderedId);
            if(index > -1){
                orderedArray.push(tempArray.splice(index, 1)[0])
            }
        })

        //Add any remaining projects to the end

        return orderedArray.concat(tempArray);
    }

    @action public setLoading(state: boolean){
        this.loading = state;
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
            if(!taskResponse.pid){
                taskResponse.pid = 0;
            }

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
        this.setLoading(true);
        return new Promise((resolve, reject)=>{
            if(appState.user?.id){
                Toggl.FetchDateRangeDetails(this.api_token, appState.user.id, this.id.toString(), startDate, endDate)
                    .then(result=>{
                        this.addTasksToProjects(result);
                        resolve(result)
                    })
                    .catch(err=>reject(err))
                    .finally(()=>this.setLoading(false));
            }
        })
    }

    private sumDay(day: Dayjs){
        return this.projects.reduce((acc, val)=>{
            return acc + (val.days.find(val=>val.date.isSame(day, 'day'))?.timeAsHours || 0);
        }, 0)
    }

    private sumWeek(startDate: Dayjs, endDate: Dayjs){
        return this.projects.reduce((acc, val)=>{
            return acc + val.timeAsHours(startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD'));
        }, 0)
    }

    public sumDayClockTime(day: Dayjs){
        return DecimalToClockTime(this.sumDay(day));
    }

    public sumDayRoundedHours(day: Dayjs){
        return DecimalToRoundedTime(this.sumDay(day));
    }

    public sumWeekClockTime(startDate: Dayjs, endDate: Dayjs){
        return DecimalToClockTime(this.sumWeek(startDate, endDate));
    }

    public sumWeekRoundedHours(startDate: Dayjs, endDate: Dayjs){
        return DecimalToRoundedTime(this.sumWeek(startDate, endDate));
    }

    public toInterface(): IWorkSpace{
        return {
            id: this.id,
            name: this.name,
            api_token: this.api_token,
        }
    }
}