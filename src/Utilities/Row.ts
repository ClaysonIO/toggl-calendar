import {action, computed, observable} from "mobx";
import {Entry} from "./Entry";
import {Day} from "./Day";
import dayjs from "dayjs";
import {WorkSpace} from "./WorkSpace";

//This class provides the functions to calculate
export abstract class Row{
    public rowId: string = (Math.random() * 1000000000).toString()
    @observable public entries: Entry[] = [];
    @observable public days: Day[] = [];
    @computed public get expanded(): boolean {return this.workSpace.expanded.indexOf(this.rowId) > -1};
    @observable public color: string = "#ff8330";
    public readonly workSpace: WorkSpace;
    public abstract readonly type: 'group' | 'project' | 'tag';

    constructor({workSpace}: {workSpace: WorkSpace}) {
        this.workSpace = workSpace;
        this.setExpanded = this.setExpanded.bind(this);
    }

    @computed public get emails(): string[]{
        return this.workSpace.emailHash[this.rowId] || [];
    }

    public setEmails(emails: string[]){
        this.workSpace.setEmailItem({rowId: this.rowId, emails});
    }

    @action.bound public createEmail(email: string){
        this.setEmails(this.emails.concat(email));
    }

    @computed public get dateHash(){
        return this.days.reduce((acc: {[key: string]: Day}, val)=>{
            acc[val.date.format('YYYYMMDD')] = val;
            return acc;
        }, {});
    }

    @action public setExpanded(state: boolean){
        if(this.expanded && !state){
            this.workSpace.setExpanded(this.workSpace.expanded.filter(val=>val !== this.rowId));
        } else if(!this.expanded && state){
            this.workSpace.setExpanded(this.workSpace.expanded.concat([this.rowId]));
        }
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