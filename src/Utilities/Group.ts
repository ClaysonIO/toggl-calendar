import {Project} from "./Project";
import {Row} from "./Row";
import {action, computed, makeAutoObservable, observable} from "mobx";
import {Entry} from "./Entry";
import {WorkSpace} from "./WorkSpace";
import {Day} from "./Day";

interface IGroup {
    rowId?: string,
    name: string,
    projectIds?: string[],
    color?: string
}

export class Group extends Row{
    public projectIds: string[] = [];
    public name: string = '';
    public readonly type = 'group';

    constructor({name, rowId, projectIds, color}: IGroup, workSpace: WorkSpace) {
        super({workSpace});
        makeAutoObservable(this);
        this.name = name;
        this.projectIds = projectIds || this.projectIds;
        this.rowId = rowId || `Group_${name}`
        this.color = color || this.color;
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
}

