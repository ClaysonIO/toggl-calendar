export interface ISingleProjectTasks{
    project_id: number,
    project_name?: string,
    client_name?: string,
    project_hex_color?: string,
    dates: { [key: string]: ISingleProjectTasksDate }
}

export interface ISingleProjectTasksDate{
    date: string,
    taskDescriptions: Set<string>,
    hours: number,
    roundedHours: number
}