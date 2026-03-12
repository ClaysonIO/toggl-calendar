# Chrome Extension for Tenrox Support

Users of this tool manually upload their weekly time into Tenrox, a web-based time management tool at https://autodesk.tenrox.net. This is a time consuming process that is done every week, and must be manually completed because Tenrox does not have an API or import feature available for us to use. 

## Goals

Build a chrome extension that does the following actions: 

1. From an open Tenrox window, extract the list of project names
2. In toggl-calendar, pair the project names with calendar projects
3. With a button press, copy the time entries from the currently open toggl-calendar page into the currently open Tenrox window. 
4. With a button press, copy the taks descriptions fronm the currently open toggl-calendar page into the notes section of each Tenrox time entry

## Technologies

- Chrome Extension - Manifest v3
- Puppeteer for DOM manipulation


## Tasks

### Analyze Tenrox

To analyze Tenrox, open https://autodesk.tenrox.net, and let the user navigate to a sample page. Then document a strategy for how to get project names, and how to fill the daily time entries, and daily notes

### Create an extension

Create a basic extension, with icons, that will have access to tenrox and toggl calendar, and have two buttons: 

1. Tenrox --> Toggl, which will find the project names, and copy them over to Toggl. This should also let us match them with existing toggl projects
2. Toggl --> Tenrox, which will find matching projects, copy the time and notes into Tenrox, and report back if any items could not be found.