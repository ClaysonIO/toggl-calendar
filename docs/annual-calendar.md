# Annual Calendar

This tool currently helps us understand what we've done this week, and what we still need to complete. We want to expand this to cover an entire year. 

To do this, we will create a second page with an annual view. This view will let us document our target hours for the year, mark days and weeks when we will not be working, and calculate how many hours per week we need to work in order to hit our targets. 

## 1. Create annual page

Build a second route at /year. Move our current '/calendar' route to '/week'

### Features: 

- Show an annual calendar as a 4x3 grid of months. Each month should show each day of the month in a standard calendar view. Days outside of the current month shoudl be shown as grayed out.
- Similar to the /week calendar, we should have buttons for projected and actual time. We should also have a filter for billable/non billable
- In projected mode, we should be able to set the daily billable time projected
- If a day has a billable time of '0' hours, it should have a grey background in both projected and actual time modes

This daily billable projection will require edits to the data model, as it is not specific to a project

## 2. Set Start of Year

This tool is used to track based on the fiscal year, which does not necessarily align with the calendar year. In the configuration dialog, we should set the month for 'Start of Year'

## 4. Set a target worked hours per year

This is set manually as annual hours, or the user can put in their target percentage out of 2080 hours. Show a progress bar at the top of the screen, similiar to what we have on the /week page, that allows us to set this.

## 5. Show the necessary hours per week required to hit the target worked hours per year. 

Fetch the past days, then run the following calculations. Display both the Daily Target and the Weekly target at the top of the page. 

Hours remaining = ([Target hours] - [sum of billable hours to date])
Days available = [Remaining weekdays with no 'projected' time]

Daily Target = [Hours Remaining] / [Days Available]
Weekly Target = [Daily Target] * 5
