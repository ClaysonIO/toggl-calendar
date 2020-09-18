import {DecimalToRoundedTime} from "./DecimalToRoundedTime";
import {DecimalToClockTime} from "./DecimalToClockTime";

export function DecimalToDisplayType(decimalHours: number, displayType: string){

    switch(displayType){
        case "description": return DecimalToRoundedTime(decimalHours);
        case "time": return DecimalToClockTime(decimalHours);
        case "roundedTime": return DecimalToRoundedTime(decimalHours);
        case "tasksAndTime": return DecimalToRoundedTime(decimalHours);
    }
}