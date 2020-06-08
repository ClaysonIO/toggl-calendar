export function DecimalToClockTime(decimalHours: number){

    let hours = Math.floor(decimalHours);
    let minutes = Math.round(60 * (decimalHours - hours));

    if(minutes === 60){
        hours += 1;
        minutes = 0;
    }

    return `${hours}:${`0${minutes > 0 ? minutes : 0}`.slice(-2)}`;
}