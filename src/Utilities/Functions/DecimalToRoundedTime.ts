export function DecimalToRoundedTime(decimalHours: number){
    if(decimalHours <= 0){
        return (0).toFixed(2);
    }
    //If the time is more than zero, round it up to 15 minutes.
    return ((Math.round(decimalHours / .25) * .25) || .25).toFixed(2)
}