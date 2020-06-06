import {Entry} from "./Entry";
import {action, computed, observable} from "mobx";
import dayjs, {Dayjs} from "dayjs";
import duration from "dayjs/plugin/duration";

dayjs.extend(duration)


export class Day{
    @observable public entries: Entry[] = [];
    public date: Dayjs;

    constructor({date}: {date: Dayjs}) {
        this.date = date;
    }

    @action public addEntry(entry: Entry){
        this.entries.push(entry);
    }

    @computed public get tasks(){
        return this.entries.reduce((acc: string[], val: Entry)=>{
            if(acc.indexOf(val.description) === -1){
                acc.push(val.description);
            }
            return acc;
        }, [])
    }

    @computed public get timeAsHours() {
        return dayjs.duration(this.entries.reduce((acc: number, val: Entry) => {
            return acc + val.dur;
        }, 0)).asHours()
    }

    @computed public get hours(){
        const decimalHours = dayjs.duration(this.entries.reduce((acc: number, val: Entry)=>{
            return acc + val.dur;
        }, 0)).asHours()

        const hours = Math.round(decimalHours);
        const minutes = Math.round(60 * (decimalHours - hours));

        return `${hours}:${`0${minutes}`.slice(-2)}`;
    }

    @computed public get roundedHours(): string{
        return (Math.round(dayjs.duration(this.entries.reduce((acc: number, val: Entry)=>{
            return acc + val.dur;
        }, 0)).asHours() / .25) * .25).toFixed(2)
    }
}