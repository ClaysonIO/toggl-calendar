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

    constructor({id, name, api_token}: IWorkSpace, apiToken?: string) {
        this.id = id;
        this.name = name;
        this.api_token = apiToken || api_token;
        this.projectOrder = JSON.parse(window.localStorage.getItem(`workspaceOrder_${id}`) || '[]');
        this.getGroups();
    }

    public getGroups(){
        const serializedGroups = window.localStorage.getItem(`workspaceGroups_${this.id}`)

        this.groups = (JSON.parse(serializedGroups || "[]")).map((val: string)=>Group.deserialize(val))
    }

    public setGroups(){
        const serializedGroups = JSON.stringify(this.groups.map(val=>val.serialize()));

        window.localStorage.setItem(`workspaceGroups_${this.id}`, serializedGroups)
    }

    @action.bound public orderProject({ destination, source, reason }: any){
        if(source && destination){
            //Get all of the projects currently in a group
            const projectIdsInGroups = this.groups.reduce((acc: string[], val)=>acc.concat(val.projectIds), []);

            const currentOrder = this.orderedProjects.filter(val=>projectIdsInGroups.indexOf(val.rowId) === -1);
            const item = currentOrder.splice(source.index, 1).pop()!;

            currentOrder.splice(destination.index, 0, item);

            this.saveProjectOrder(currentOrder);

            //TODO: Work out an algorithm to merge the existing array, and the new array, in a manner that keeps both in sync (if possible)
        }
    }

    @action public saveProjectOrder(orderedRows: Row[]){
        const oldOrderedRowIds = this.projectOrder.slice();
        const newOrderedRowIds = orderedRows.map(val=>val.rowId);

        const finalOrderedRowIds: string[] = [];

        //If there is overlap, start with Current. If nothing is there,
        newOrderedRowIds.forEach((newId)=>{
            const index = oldOrderedRowIds.indexOf(newId);
            if(index === -1){
                addIfUnique(finalOrderedRowIds, newId);
            } else {
                oldOrderedRowIds
                    .splice(0, index + 1)
                    .forEach(oldId=>addIfUnique(finalOrderedRowIds, oldId));
            }
        })

        //Add any remaining values at the end
        oldOrderedRowIds.forEach(oldId=>{
            addIfUnique(finalOrderedRowIds, oldId);
        });

        function addIfUnique(stringArray: string[], newString: string){
            if(stringArray.indexOf(newString) === -1) stringArray.push(newString);
        }

        console.log("OLD", this.projectOrder.slice())
        console.log("NEW", finalOrderedRowIds)
        window.localStorage.setItem(`workspaceOrder_${this.id}`, JSON.stringify(finalOrderedRowIds));
        this.projectOrder = finalOrderedRowIds;
    }

    @computed public get orderedProjects(): Row[]{
        //Create a temporary array
        const projectIdsInGroups = this.groups.reduce((acc: string[], val)=>acc.concat(val.projectIds), []);
        const orderedArray: Row[] = [];
        const tempArray: Row[] = (this.projects as Row[]).filter(val=>projectIdsInGroups.indexOf(val.rowId) == -1).concat(this.groups);

        //Go through the Order list, pop out projects as they're found
        this.projectOrder.forEach(orderedId=>{
            const index = tempArray.findIndex(val=>val.rowId.toString() === orderedId);
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

    @action public createGroup(name: string){
        var newGroup = new Group({name});
        if(!this.groups.filter(val=>val.rowId === newGroup.rowId).length){
            this.groups = this.groups.concat(newGroup);
            this.setGroups();
        }
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