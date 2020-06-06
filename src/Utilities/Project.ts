import {Day} from "./Day";
import {Task} from "./Task";
import {Entry} from "./Entry";
import {action, computed, observable} from "mobx";

interface IProject {
    pid: number;
    project: string;
    client: string;
    project_hex_color: string;
}

export class Project{
    public pid: number;
    public client: string;
    public tasks: Task[] = [];
    @observable public entries: Entry[] = [];
    @observable public days: Day[] = [];
    public name: string;
    public project_hex_color: string;

    constructor({pid, project, client, project_hex_color}: IProject) {
        this.pid = pid;
        this.name = project;
        this.client = client;
        this.project_hex_color = project_hex_color;
    }

    @action public addEntry(entry: Entry){
        this.entries.push(entry);

        let day = this.dateHash[entry.date.format('YYYYMMDD')];
        if(!day){
            day = new Day({date: entry.date});
            this.days.push(day)
        }
        day.addEntry(entry);

        console.log(this.entries.slice())
    }

    @computed public get dateHash(){
        return this.days.reduce((acc: {[key: string]: Day}, val)=>{
            acc[val.date.format('YYYYMMDD')] = val;
            return acc;
        }, {});
    }

    public getDates(dateString: string){

    }
}