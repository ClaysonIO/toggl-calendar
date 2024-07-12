import {Day} from "./Day";
import {Entry} from "./Entry";
import {action, makeAutoObservable, observable} from "mobx";
import {Tag} from "./Tag";
import {Row} from "./Row";
import {WorkSpace} from "./WorkSpace";
import {Group} from "./Group";

interface IProject {
    pid: number;
    project: string;
    client: string;
    project_hex_color: string;
}

export class Project extends Row{
    public pid: number;
    public client: string;
    // public entries: Entry[] = [];
    // public days: Day[] = [];
    public tags: Tag[] = [];
    public readonly type = 'project';

    constructor({pid, project, client, project_hex_color}: IProject, workSpace: WorkSpace) {
        super({workSpace});
        makeAutoObservable(this);
        this.rowId = pid.toString();
        this.pid = pid;
        this.name = project || "Without Project";
        this.client = client;
        this.color = project_hex_color;
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
}