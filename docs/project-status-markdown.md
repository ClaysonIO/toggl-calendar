# Project Status Markdown

It's useful to keep an ongoing note related to projects within this tool. We want to do this using markdown. 

## Technologies

We will use that @mdxeditor/editor library to display our markdown.

All content will be stored in Dexie, and connected to the project entries in our database. 

## Implementation Steps

### Update Database

Add a new field for 'notes' to each project entry within the database. See the db.ts file.

### Add markdown dialog

We want to give users as much screenspace as possible to edit. The dialog should fill all available space. When the markdown dialog is open, it should show the project name, worked and projected weekly hours, and lifetime hours at the very top of the screen. Below should be a freetext field filling the remaining space, where users can type their notes. There should be an optional panel on the right side, showing a descending history of task descriptions for this particular project. It should not take more than 25% of the screen, at a maximum. On small screens, it should collapse unless explicitly opened. 

Using a simple debounce algorithm, we should auto-save the content shortly after a user pauses, or when the user closes the dialog. 

### Add button to open dialog. 

On the far-right of the weekly project row, we should have a button to open the dialog. If there are notes, it should show in color. If there are no notes, it should show in black/white.