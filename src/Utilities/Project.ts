import {Day} from "./Day";
import {Entry} from "./Entry";
import {action, observable} from "mobx";
import {Tag} from "./Tag";
import {Row} from "./Row";

interface IProject {
    pid: number;
    project: string;
    client: string;
    project_hex_color: string;
}

export class Project extends Row{
    public pid: number;
    public client: string;
    // @observable public entries: Entry[] = [];
    // @observable public days: Day[] = [];
    @observable public tags: Tag[] = [];
    public name: string;
    public project_hex_color: string;

    constructor({pid, project, client, project_hex_color}: IProject) {
        super();
        this.pid = pid;
        this.name = project || "Without Project";
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

        //Add entry to tag
        let currentTag = this.tags.find(val=>val.name === entry.tags);

        if(!currentTag){
           currentTag = new Tag({name: entry.tags, project: this});
           this.tags = this.tags
               .concat([currentTag])
               .sort((a,b)=>b.name.localeCompare(a.name, 'en', {numeric: true}));
        }
        currentTag.addEntry(entry);
    }
}