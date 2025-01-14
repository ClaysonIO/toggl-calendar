export interface ISingleProjectTasks{
    project_id: number,
    dates: { [key: string]: ISingleProjectTasksDate }
}

interface ISingleProjectTasksDate{
    date: string,
    taskDescriptions: Set<string>,
    hours: number,
    roundedHours: number
}