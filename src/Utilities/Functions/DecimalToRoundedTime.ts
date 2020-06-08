export function DecimalToRoundedTime(decimalHours: number){
    return (Math.round(decimalHours / .25) * .25).toFixed(2)
}