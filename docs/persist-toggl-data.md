# Persist Toggl Data

We currently fetch all data directly from Toggl, using react-query. Soon, we will be doing analytics across multiple weeks, and so we need to store time entry data across a much longer timespan. Fetching this from Toggl would be problematic, so instead we should store this locally in Dexie. 

# Task 1: Place all Toggl data into Dexie

When we fetch data from Toggl, we should store it in Dexie. This includes both time entries, and project data. 

# Task 2: Retrieve all Toggl data from local

Our display components should retrieve all information used in the display directly from Dexie, rather than react-query. 

# Task 3: Display a new sync status

When we visit a page, we should continue to fetch the data from Toggl. We should also have a button to manually retrieve the displayed week's data. If that retrieval fails, that button should show that we were unable to fetch that week's data, and have a tooltip that informs the user that they should try again in an hour. Toggl rate limits users to 30 requests per hour, which is why we need to wait.