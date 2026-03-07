# Improvements to Annual Calendar

While the calendar is overall working well, there are a number of improvements that we can make. All of these improvements are directly related to the annual view.

## Dialog Close issues

If I click and drag to select an input in one of the two dialogs, and my mouse ends up outside of the dialog, the view closes. This makes it difficult to select the input field. If a user begins their click within the dialog, it should not close on mouse up.

## Edit Target Dialog

Filling out the 'Annual Target' dialog, editing the percentage does not update the hours per year. It should be possible to update either field, and have it update the other in realtime.

## Default for editing a day's time

Currently, clicking a day shows 8 hours if the time has not been edited. Most of the time, when we click a day, we're changing it zero hours. 

Change the default value, if the current value is 8 hours, to be 0.