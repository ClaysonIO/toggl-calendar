import {Project} from "./Project";
import {Row} from "./Row";
import {action, computed, makeAutoObservable, observable} from "mobx";
import {Entry} from "./Entry";
import {WorkSpace} from "./WorkSpace";
import {Day} from "./Day";
import dayjs from "dayjs";

interface IGroup {
    rowId?: string,
    name: string,
    projectIds?: string[],
    color?: string
}

export class Group{
    public rowId: string = (Math.random() * 1000000000).toString()
    public name: string = '';
    public get expanded(): boolean {return this.workSpace.expanded.indexOf(this.rowId) > -1};
    public color: string = "#ff8330";
    public readonly workSpace: WorkSpace;
    public projectIds: string[] = [];
    public readonly type = 'group';

    constructor({name, rowId, projectIds, color}: IGroup, workSpace: WorkSpace) {
        // makeAutoObservable(this);
        this.name = name;
        this.projectIds = projectIds || this.projectIds;
        this.rowId = rowId || `Group_${name}`
        this.color = color || this.color;
        this.workSpace = workSpace;
    }

    public get projects(){
        return this.workSpace.projects.filter(val=>this.projectIds.indexOf(val.rowId) > -1)
    }

    public get days(){
        //Sort into buckets of days

        //Add all entries into date

        return Object.values(this.projects.reduce((acc: {[key: string]: Day}, project)=>{
            project.days.forEach(day=>{
                if(!acc[day.date.format('YYYYMMDD')]){
                    acc[day.date.format('YYYYMMDD')] = new Day({date: day.date});
                }
                day.entries.forEach(entry=>{
                    acc[day.date.format('YYYYMMDD')].addEntry(new Entry({
                        description: [project.client, project.name, entry.description].filter(v=>v).join(' / '),
                        dur: entry.dur,
                        start: entry.date.toISOString(),
                        tags: entry.tags.split(', ')
                    }));
                })
            })

            return acc;
        }, {}));
    }

    public setColor(color: string){
        this.color = color;
        this.workSpace.setGroups();
    }

    public setName(name: string){
        this.name = name;
        this.workSpace.setGroups();
    }

    public get entries(){
        return this.projects.reduce((acc: Entry[], val: Project)=>{
            return acc.concat(val.entries);
        }, [])
    }

    public setProjectIds(projectIds: string[]){
        this.projectIds = projectIds;
    }

    public serialize(){
        return JSON.stringify({
            rowId: this.rowId,
            name: this.name,
            projectIds: this.projectIds,
            color: this.color
        })
    }

    public static deserialize(serialized: string, workSpace: WorkSpace){
        const deserialized = JSON.parse(serialized) as IGroup;

        return new Group(deserialized, workSpace)
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

