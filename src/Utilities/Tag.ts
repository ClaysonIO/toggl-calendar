import {action, makeAutoObservable, observable} from "mobx";
import {Entry} from "./Entry";
import {Day} from "./Day";
import {Row} from "./Row";
import {Project} from "./Project";
import {WorkSpace} from "./WorkSpace";


interface ITag {
    name: string;
    project: Project;
}

export class Tag extends Row{
    public name: string;
    public project: Project;
    public readonly type = 'tag';
    public entries: Entry[] = [];
    public days: Day[] = [];

    constructor({name, project}: ITag, workSpace: WorkSpace) {
        super({workSpace});
        makeAutoObservable(this);
        this.name = name;
        this.project = project;
    }

    public addEntry(entry: Entry){
        this.entries.push(entry);

        let day = this.dateHash[entry.date.format('YYYYMMDD')];
        if(!day){
            day = new Day({date: entry.date});
            this.days.push(day)
        }
        day.addEntry(entry);
    }
}