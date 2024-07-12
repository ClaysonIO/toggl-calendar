import {Project} from "./Project";
import {Dayjs} from "dayjs";
import {Toggl} from "./Toggl";
import {appState} from "../App";
import {action, computed, makeAutoObservable, observable, runInAction} from "mobx";
import {ITaskResponse} from "./Interfaces/ITaskResponse";
import {Entry} from "./Entry";
import {DecimalToClockTime} from "./Functions/DecimalToClockTime";
import {DecimalToRoundedTime} from "./Functions/DecimalToRoundedTime";
import {Row} from "./Row";
import {Group} from "./Group";
import {Tag} from "./Tag";

export interface IWorkSpace{
    id: number;
    name: string;
    api_token: string;
}

export class WorkSpace{
    public id: number;
    public name: string;
    public api_token: string;
    public projectOrder: string[] = [];
    public loading: boolean = true;
    public projects: Project[] = [];
    public groups: Group[] = [];
    public expanded: string[] = [];
    public rowToEmailHash: {[key: string]: string[]} = {};

    constructor({id, name, api_token}: IWorkSpace, apiToken?: string) {
        makeAutoObservable(this);
        this.id = id;
        this.name = name;
        this.api_token = apiToken || api_token;
        this.projectOrder = JSON.parse(window.localStorage.getItem(`workspaceOrder_${id}`) || '[]');
        this.getGroups();
        this.getExpanded();
        this.getRowToEmailHash();
    }

    setExpanded(expanded: string[]){
        this.expanded = expanded;
        window.localStorage.setItem(`workspaceExpanded_${this.id}`, JSON.stringify(expanded));
    }

    public getExpanded(){
        const serializedExpanded = window.localStorage.getItem(`workspaceExpanded_${this.id}`)
        this.expanded = (JSON.parse(serializedExpanded || "[]"));
    }

    setEmailItem({rowId, emails}: {rowId: string, emails: string[]}){
        this.rowToEmailHash[rowId] = emails;
        window.localStorage.setItem(`workspaceEmailHash_${this.id}`, JSON.stringify(this.rowToEmailHash));
    }

    public get emails(){
        return Object.values(this.rowToEmailHash)
            .reduce((acc, val)=>acc.concat(val), [])
            .reduce((acc: string[], val)=>{
                if(acc.indexOf(val)=== -1){
                    acc.push(val);
                }
                return acc;
            }, [])
            .sort((a,b)=>a.localeCompare(b, 'en'));
    }

    public getRowToEmailHash(){
        const serializedEmailHash = window.localStorage.getItem(`workspaceEmailHash_${this.id}`)
        this.rowToEmailHash = (JSON.parse(serializedEmailHash || "{}"));
    }

    public get emailToRowHash(){
        return Object.keys(this.rowToEmailHash)
            .reduce((acc: {[key: string]: string[]}, rowId)=>{
                this.rowToEmailHash[rowId].forEach(email=>{
                    if(!acc[email]){
                        acc[email] = [];
                    }
                    acc[email].push(rowId);
                })
                return acc;
            }, {})
    }

    public get emailRows(){
        return this.emails.map(email=>{

            return {
                email,
                rows: this.emailToRowHash[email]?.map(rowId=>{
                    if(this.GroupHash[rowId] && this.GroupHash[rowId].projects.length){
                        return this.GroupHash[rowId]
                    } else if(this.ProjectHash[rowId]){
                        return this.ProjectHash[rowId]
                    } else if(this.TagHash[rowId]){
                        return this.TagHash[rowId]
                    }
                })
                    .filter(val=>val) as Row[]
            }

        })
    }

    public get GroupHash(){
        return this.groups.reduce((acc: {[key: string]: Group}, val)=>{
            acc[val.rowId] = val;
            return acc;
        }, {})
    }

    public get ProjectHash(){
        const hash = this.projects.reduce((acc: {[key: string]: Project}, val)=>{
            acc[val.rowId] = val;
            return acc;
        }, {})
        return hash;
    }

    public get TagHash(){
        return this.projects.reduce((acc: {[key: string]: Tag}, val)=>{
            val.tags
                .filter(tag=>tag)
                .forEach(tag=>{
                    acc[tag.rowId] = tag;
                })
            return acc;
        }, {})
    }

    public getGroups(){
        const serializedGroups = window.localStorage.getItem(`workspaceGroups_${this.id}`)

        this.groups = (JSON.parse(serializedGroups || "[]")).map((val: string)=>Group.deserialize(val, this))
    }

    public setGroups(){
        const serializedGroups = JSON.stringify(this.groups.map(val=>val.serialize()));

        window.localStorage.setItem(`workspaceGroups_${this.id}`, serializedGroups)
    }

    public orderProject({ destination, source, reason }: any){
        if(source && destination){

            const currentOrder = this.projectOrder.slice();
            const item = currentOrder.splice(source.index, 1).pop()!;

            currentOrder.splice(destination.index, 0, item);

            this.projectOrder = currentOrder;
            window.localStorage.setItem(`workspaceOrder_${this.id}`, JSON.stringify(currentOrder));
        }
    }

    public get orderedProjects(): (Row | null)[]{
        //Create a temporary array
        const projectIdsInGroups = this.groups
            .reduce((acc: string[], val)=>acc.concat(val.projectIds), []);

        //Go through the Order list, pop out projects as they're found
        return this.projectOrder.map(orderedId=>{
            if(projectIdsInGroups.indexOf(orderedId) > -1) return null;
            const project = this.projects.find(val=>val.rowId === orderedId);
            if(project) return project;
            const group = this.groups.find(val=>val.rowId === orderedId);
            if(group && group.projects.length) return group;

            return null;
        })
    }

    public setLoading(state: boolean){
        this.loading = state;
    }

    public createGroup(name: string){
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

    addTasksToProjects(taskResponses: ITaskResponse[]){
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