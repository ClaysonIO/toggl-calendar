import dayjs, {Dayjs} from "dayjs";

export interface IEntry {
    description: string;
    dur: number
    start: string;
}

export class Entry{
    description: string;
    dur: number;
    date: Dayjs;

    constructor({description, dur, start}: IEntry) {
        this.description = description;
        this.dur = dur;
        this.date = dayjs(start);
    }
}