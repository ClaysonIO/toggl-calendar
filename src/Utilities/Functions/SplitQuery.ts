export function splitQuery(query: string){
    return query
        .slice(1)
        .split('&')
        .map(val=>(
            val.split('=')
        ))
        .reduce((acc: {[key: string]: string}, val)=>{
            acc[val[0]] = val[1];
            return acc;
        }, {})
}