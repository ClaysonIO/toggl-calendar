import {action, computed, observable} from "mobx";
import {Entry} from "./Entry";
import {Day} from "./Day";
import dayjs from "dayjs";

//This class provides the functions to calculate
export abstract class Row{
    public rowId: string = (Math.random() * 1000000000).toString()
    @observable public entries: Entry[] = [];
    @observable public days: Day[] = [];
    @observable public expanded: boolean = false;
    @observable public color: string = "#ccc";
    public abstract readonly type: 'group' | 'project' | 'tag';

    constructor() {
        this.setExpanded = this.setExpanded.bind(this);
    }


    @computed public get dateHash(){
        return this.days.reduce((acc: {[key: string]: Day}, val)=>{
            acc[val.date.format('YYYYMMDD')] = val;
            return acc;
        }, {});
    }

    @action public setExpanded(state: boolean){
        console.log("Set Expanded", state)
        this.expanded = state;
    }

    protected getDates(startDate: string, endDate: string){
        const start = dayjs(startDate).startOf('day');
        const end = dayjs(endDate).endOf('day');

        return this.days.filter(val=> (
            val.date.isAfter(start)
            && val.date.isBefore(end))
            || val.date.isSame(start, 'day')
            || val.date.isSame(end, 'day')
        );
    }

    public timeAsHours(startDate: string, endDate: string): number{
        const dates = this.getDates(startDate, endDate);

        return dates.reduce((acc: number, val)=>{
            return acc + val.timeAsHours;
        }, 0)
    }


    public hours(startDate: string, endDate: string){
        const decimalHours = this.timeAsHours(startDate, endDate);

        const hours = Math.floor(decimalHours);
        const minutes = Math.round(60 * (decimalHours - hours));

        return `${hours}:${`0${minutes > 0 ? minutes : 0}`.slice(-2)}`;
    }

    public roundedHours(startDate: string, endDate: string): string{
        return (Math.round(this.timeAsHours(startDate, endDate) / .25) * .25).toFixed(2)
    }
}