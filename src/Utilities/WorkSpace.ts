import {Project} from "./Project";
import {Dayjs} from "dayjs";
import {Toggl} from "./Toggl";
import {appState} from "../App";
import {action, computed, observable, runInAction} from "mobx";
import {ITaskResponse} from "./Interfaces/ITaskResponse";
import {Entry} from "./Entry";
import {DecimalToClockTime} from "./Functions/DecimalToClockTime";
import {DecimalToRoundedTime} from "./Functions/DecimalToRoundedTime";
import {Row} from "./Row";
import {Group} from "./Group";

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
    @observable public groups: Group[] = [];
    @observable public expanded: string[] = [];

    constructor({id, name, api_token}: IWorkSpace, apiToken?: string) {
        this.id = id;
        this.name = name;
        this.api_token = apiToken || api_token;
        this.projectOrder = JSON.parse(window.localStorage.getItem(`workspaceOrder_${id}`) || '[]');
        this.getGroups();
        this.getExpanded();
    }

    @action setExpanded(expanded: string[]){
        this.expanded = expanded;
        window.localStorage.setItem(`workspaceExpanded_${this.id}`, JSON.stringify(expanded));
    }

    @action public getExpanded(){
        const serializedExpanded = window.localStorage.getItem(`workspaceExpanded_${this.id}`)
        this.expanded = (JSON.parse(serializedExpanded || "[]"));
    }


    public getGroups(){
        const serializedGroups = window.localStorage.getItem(`workspaceGroups_${this.id}`)

        this.groups = (JSON.parse(serializedGroups || "[]")).map((val: string)=>Group.deserialize(val, this))
    }

    public setGroups(){
        const serializedGroups = JSON.stringify(this.groups.map(val=>val.serialize()));

        window.localStorage.setItem(`workspaceGroups_${this.id}`, serializedGroups)
    }

    @action.bound public orderProject({ destination, source, reason }: any){
        console.log("SOURCE", source);
        console.log("DESTINATION", destination);
        console.log("REASON", reason);
        if(source && destination){

            const currentOrder = this.projectOrder.slice();
            const item = currentOrder.splice(source.index, 1).pop()!;

            currentOrder.splice(destination.index, 0, item);

            // this.saveProjectOrder(currentOrder);

            this.projectOrder = currentOrder;
            window.localStorage.setItem(`workspaceOrder_${this.id}`, JSON.stringify(currentOrder));

            //TODO: Work out an algorithm to merge the existing array, and the new array, in a manner that keeps both in sync (if possible)
        }
    }

    @computed public get orderedProjects(): (Row | null)[]{
        //Create a temporary array
        const projectIdsInGroups = this.groups
            .reduce((acc: string[], val)=>acc.concat(val.projectIds), []);

        //Go through the Order list, pop out projects as they're found
        return this.projectOrder.map(orderedId=>{
            if(projectIdsInGroups.indexOf(orderedId) > -1) return null;
            const project = this.projects.find(val=>val.rowId === orderedId);
            if(project) return project;
            const group = this.groups.find(val=>val.rowId === orderedId);
            if(group) return group;

            return null;
        })
    }

    @action public setLoading(state: boolean){
        this.loading = state;
    }

    @action public createGroup(name: string){
        var newGroup = new Group({name}, this);
        if(!this.groups.filter(val=>val.rowId === newGroup.rowId).length){
            this.groups = this.groups.concat(newGroup);
            this.setGroups();

            if(this.projectOrder.indexOf(newGroup.rowId) === -1){
                this.projectOrder = this.projectOrder.concat([newGroup.rowId]);
            }
        }
        return this.groups.find(val=>val.rowId === newGroup.rowId);
    }

    @action addTasksToProjects(taskResponses: ITaskResponse[]){
        let projectHash: {[key: number]: Project} = {};
        let projects: Project[] = []

        taskResponses.forEach(taskResponse=>{
            if(!taskResponse.pid){
                taskResponse.pid = 0;
            }

            if(!projectHash[taskResponse.pid]){
                const newProject = new Project(taskResponse, this)
                projects.push(newProject)
                projectHash[newProject.pid] = newProject;

                if(this.projectOrder.indexOf(newProject.rowId) === -1){
                    this.projectOrder = this.projectOrder.concat([newProject.rowId]);
                }
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
        return day ? this.projects.reduce((acc, val)=>{
            return acc + (val.days.find(val=>val.date.isSame(day, 'day'))?.timeAsHours || 0);
        }, 0) : 0;
    }

    private sumWeek(startDate: Dayjs, endDate: Dayjs){
        return startDate && endDate ? this.projects.reduce((acc, val)=>{
            return acc + val.timeAsHours(startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD'));
        }, 0): 0;
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