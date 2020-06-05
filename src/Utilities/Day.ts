import {Entry} from "./Entry";

export class Day{
    public entries: Entry[] = [];
    public date: Date;

    constructor({date}: {date: Date}) {
        this.date = date;
    }
}