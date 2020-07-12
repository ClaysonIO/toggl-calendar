import {action, observable} from "mobx";
import {Entry} from "./Entry";
import {Day} from "./Day";
import {Row} from "./Row";
import {Project} from "./Project";


interface ITag {
    name: string;
    project: Project;
}

export class Tag extends Row{
    public name: string;
    public project: Project;
    public readonly type = 'tag';
    @observable public entries: Entry[] = [];
    @observable public days: Day[] = [];

    constructor({name, project}: ITag) {
        super();
        this.name = name;
        this.project = project;
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
}