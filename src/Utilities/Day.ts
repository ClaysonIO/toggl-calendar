import {Entry} from "./Entry";
import {action, computed, observable} from "mobx";
import dayjs, {Dayjs} from "dayjs";
import duration from "dayjs/plugin/duration";
import {DecimalToClockTime} from "./Functions/DecimalToClockTime";
import {DecimalToRoundedTime} from "./Functions/DecimalToRoundedTime";

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

    @computed public get tasksAndRoundedTime(){
        return this.entries.reduce((acc: {description: string, dur: number}[], val: Entry)=>{
            let current = acc.find(item=>item.description === val.description);
            if(!current){
                current = {description: val.description, dur: 0};
                acc.push(current);
            }
            current.dur += val.dur;
            return acc;
        }, [])
            .map(val=>`(${DecimalToRoundedTime(dayjs.duration(val.dur).asHours())}) ${val.description}`);
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

        return DecimalToClockTime(decimalHours);
    }

    @computed public get roundedHours(): string{
        return DecimalToRoundedTime(dayjs.duration(this.entries.reduce((acc: number, val: Entry)=>{
            return acc + val.dur;
        }, 0)).asHours())
    }
}