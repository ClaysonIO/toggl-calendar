import dayjs, {Dayjs} from "dayjs";

export interface IEntry {
    description: string;
    dur: number
    start: string;
    tags: string[];
}

export class Entry{
    description: string;
    dur: number;
    date: Dayjs;
    tags: string;

    constructor({description, dur, start, tags}: IEntry) {
        this.description = description;
        this.dur = dur;
        this.date = dayjs(start);
        this.tags = tags.join(', ');
    }
}