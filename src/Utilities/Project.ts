import {Day} from "./Day";
import {Task} from "./Task";
import {Entry} from "./Entry";
import {action, computed, observable} from "mobx";
import dayjs from "dayjs";

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
    }

    @computed public get dateHash(){
        return this.days.reduce((acc: {[key: string]: Day}, val)=>{
            acc[val.date.format('YYYYMMDD')] = val;
            return acc;
        }, {});
    }

    private getDates(startDate: string, endDate: string){
        const start = dayjs(startDate).startOf('day');
        const end = dayjs(endDate).endOf('day');

        return this.days.filter(val=> (
            val.date.isAfter(start)
            && val.date.isBefore(end))
            || val.date.isSame(start, 'day')
            || val.date.isSame(end, 'day')
        );
    }

    private timeAsHours(startDate: string, endDate: string){
        const dates = this.getDates(startDate, endDate);

        return dates.reduce((acc: number, val)=>{
            return acc + val.timeAsHours;
        }, 0)
    }


    public hours(startDate: string, endDate: string){
        const decimalHours = this.timeAsHours(startDate, endDate);

        const hours = Math.floor(decimalHours);
        const minutes = Math.round(60 * (decimalHours - hours));

        return `${hours}:${`0${minutes > 0 ? minutes : 0}`.slice(-2)}`;
    }

    public roundedHours(startDate: string, endDate: string): string{
        return (Math.round(this.timeAsHours(startDate, endDate) / .25) * .25).toFixed(2)
    }
}