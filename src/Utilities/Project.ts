import {Day} from "./Day";
import {Entry} from "./Entry";
import {action, makeAutoObservable, observable} from "mobx";
import {Tag} from "./Tag";
import {Row} from "./Row";
import {WorkSpace} from "./WorkSpace";
import {Group} from "./Group";
import dayjs from "dayjs";

interface IProject {
    pid: number;
    project: string;
    client: string;
    project_hex_color: string;
}

export class Project{
    public rowId: string = (Math.random() * 1000000000).toString()
    public name: string = '';
    public entries: Entry[] = [];
    public days: Day[] = [];
    public get expanded(): boolean {return this.workSpace.expanded.indexOf(this.rowId) > -1};
    public color: string = "#ff8330";
    public readonly workSpace: WorkSpace;
    public pid: number;
    public client: string;
    // public entries: Entry[] = [];
    // public days: Day[] = [];
    public tags: Tag[] = [];
    public readonly type = 'project';

    constructor({pid, project, client, project_hex_color}: IProject, workSpace: WorkSpace) {
        makeAutoObservable(this);
        this.rowId = pid.toString();
        this.pid = pid;
        this.name = project || "Without Project";
        this.client = client;
        this.color = project_hex_color;
        this.workSpace = workSpace;
    }


    public addEntry(entry: Entry){
        this.entries.push(entry);

        let day = this.dateHash[entry.date.format('YYYYMMDD')];
        if(!day){
            day = new Day({date: entry.date});
            this.days.push(day)
        }
        day.addEntry(entry);

        //Add entry to tag
        let currentTag = this.tags.find(val=>val.name === entry.tags);

        if(!currentTag){
           currentTag = new Tag({name: entry.tags, project: this}, this.workSpace);
           this.tags = this.tags
               .concat([currentTag])
               .sort((a,b)=>b.name.localeCompare(a.name, 'en', {numeric: true}));
        }
        currentTag.addEntry(entry);
    }

    public setGroup({group}: {group?: Group}){
        this.workSpace.groups.forEach(workspaceGroup=>{
            const projectIds = workspaceGroup.projectIds.filter(val=>val !== this.rowId);
            if(workspaceGroup === group){
                projectIds.push(this.rowId);
            }
            workspaceGroup.setProjectIds(projectIds);
        })
        this.workSpace.setGroups();
    }

    public get emails(): string[]{
        return this.workSpace.rowToEmailHash[this.rowId] || [];
    }

    public setEmails(emails: string[]){
        this.workSpace.setEmailItem({rowId: this.rowId, emails});
    }

    public createEmail(email: string){
        this.setEmails(this.emails.concat(email));
    }

    public get dateHash(){
        return this.days.reduce((acc: {[key: string]: Day}, val)=>{
            acc[val.date.format('YYYYMMDD')] = val;
            return acc;
        }, {});
    }

    public setExpanded(state: boolean){
        if(this.expanded && !state){
            this.workSpace.setExpanded(this.workSpace.expanded.filter(val=>val !== this.rowId));
        } else if(!this.expanded && state){
            this.workSpace.setExpanded(this.workSpace.expanded.concat([this.rowId]));
        }
    }

    protected getDates(startDate: string, endDate: string){
        const start = dayjs(startDate).startOf('day');
        const end = dayjs(endDate).endOf('day');

        return this.days.filter(val=> (
                val.date.isAfter(start)
                && val.date.isBefore(end))
            || val.date.isSame(start, 'day')
            || val.date.isSame(end, 'day')
        );
    }

    public timeAsHours(startDate: string, endDate: string): number{
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

    public tasks(startDate: string, endDate: string): string[]{
        const dates = this.getDates(startDate, endDate);
        const entries = dates.reduce((acc: Entry[], val)=>acc.concat(val.entries), [])

        return entries.reduce((acc: string[], val: Entry)=>{
            if(acc.indexOf(val.description) === -1){
                acc.push(val.description);
            }
            return acc;
        }, [])
            .sort((a,b)=>a.localeCompare(b, 'en'))
    }
}