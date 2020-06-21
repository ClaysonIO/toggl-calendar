import dayjs, {Dayjs} from "dayjs";

export interface IEntry {
    description: string;
    dur: number
    start: string;
    project: string;
    client: string;
    tags: string[];
}

export class Entry{
    project: string;
    client: string;
    tags: string[];
    description: string;
    dur: number;
    date: Dayjs;

    constructor({description, dur, start, project, client, tags}: IEntry) {
        this.description = description;
        this.dur = dur;
        this.date = dayjs(start);
        this.project = project;
        this.client = client;
        this.tags = tags;

    }
}