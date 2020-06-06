
export interface IEntry {
    name: string;
    minutes: number
}

export class Entry{
    name: string;
    minutes: number;

    constructor({name, minutes}: IEntry) {
        this.name = name;
        this.minutes = minutes;
    }
}