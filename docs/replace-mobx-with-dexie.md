# Replace MobX with Dexie

We currently use Mobx throughout the application to manage state. We should change this to use Dexie with React hooks. All updates should update this data model, and all fetched data should be pulled from here. 

## Phase 1: Create react hooks for each data type

Each data type that we manage should have a specific hook that handles retrieving and updating that data type. For example, `useProjectWeek`, `useSingleProject`, `useSingleProjectTask` etc -- for all of our persisted data types. We will call these 'Data Hooks

## Phase 2: Replace mobx integrations with 'Data Hooks'

Go through each portion of the application where persisted state is managed, and replace the mobx integrations with the newly created data hooks. 

Remove 'observer' tags from each component. 