[![Netlify Status](https://api.netlify.com/api/v1/badges/74dafb6e-12ff-47af-bef8-c9d19e404199/deploy-status)](https://app.netlify.com/sites/toggl-clayson-io/deploys)

# Toggl Calendar

This project was built to simplify the movement of data from Toggl to Tenrox. Every week, I go through a process of using Toggl's weekly report and transferring hours from Toggl into Tenrox. Once this is done, I then need to go through the individual tasks for each day, and add them to the notes section. It can take a while. 

So I built this tool. It gives me the familiar weekly table view, but speeds up the copy-paste process. Set it to hours, then click a cell to copy. Set it to description, then click a cell to copy all tasks done that day.   

## Concepts

This tool was built as a 100% client-side application. All requests are made by the client, all customizations are stored by the client (using `localStorage`). 

## Run Locally

It's a basic React application using Vite and Typescript. To run it locally, clone the repository, run `npm install`, followed by `npm run start`. 

### Optional testing env vars

For cloud-agent testing (non-production), you can add a `.env` file with:

```bash
VITE_TOGGL_API_KEY=your_toggl_api_key
VITE_TOGGL_WORKSPACE_NAME=Your Workspace Name
```

When set, the app will pre-populate the API key and try to auto-select the matching workspace name.
