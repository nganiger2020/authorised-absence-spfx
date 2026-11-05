# Student request withdrawal — latest update

## Behaviour
- The named student can withdraw their own saved absence request at any stage: Draft, Submitted, Administrator review, Signatory review, Supported or Rejected. A request already Withdrawn cannot be withdrawn again. New unsaved requests have no stored item to withdraw.
- Added Withdraw request to the three-dot Request ID action menu for the owner and a Withdraw request button above the open request form/view. Ownership is based on StudentId, not the Author who may have created the item on behalf of a student. The service independently rechecks the current user against the stored StudentId.
- A confirmation dialog explains the effect, preserves a cancel path and disables duplicate actions while saving. Unsaved edits are discarded if withdrawal is confirmed.
- Withdrawal saves Status=Withdrawn, Stage=Completed, clears the active RequestApproved decision flag, and appends Request withdrawn history with student identity, timestamp and previous status. Saved attachments, request details and previous history are retained.
- Uses the current SharePoint item ETag for a conditional update, preventing withdrawal from overwriting an intervening change. Conflicts ask the student to refresh/retry.
- Withdrawn is a terminal state: the application blocks assignment/decisions and prevents a saved withdrawn request being edited or resubmitted through its save paths. The request opens as a view instead of an edit form.
- Added a purple Withdrawn status card, badge and Status dropdown/filter value, plus readable withdrawal history. Existing features are retained.

## SharePoint and Power Automate setup
- Add Withdrawn to the requests list's Status choices. Stage must allow Completed. No new field is required; existing WorkflowHistory must be available for audit entries.
- Students need permission to update their own request item even after submission. Existing tenant/item permissions still apply; the app cannot bypass them. Test with a student account, not only a site owner.
- Update external Power Automate flows to treat Withdrawn as terminal, stop sending review reminders/notifications for withdrawn items, cancel outstanding approvals where applicable, and recheck the current item status before writing any later decision. Flow definitions were not supplied (PowerAutomateResult.json is a result sample), so no live external flows were modified here. Withdrawal does not automatically recall emails already sent.
- Previous SharePoint Admin lookup and Supported status setup requirements remain applicable.

## Verification
- Full dependency-aware TypeScript checking passed against the installed SPFx project.
- Lint passed with zero errors; existing unrelated style/unused-code warnings remain.
- Service tests covered withdrawal at all saved stages, non-owner rejection, duplicate withdrawal, missing item version, ETag conflict, malformed history, audit payload, terminal permissions and blocking a stale save after withdrawal.
- Rendered React tests covered the owner's menu action, hiding it from another student/already-withdrawn items, the Withdrawn badge and confirmation controls.
- Dashboard filtering/sorting regression checks and CSS parsing passed.

The ZIP contains updated web-part source. No live project, SharePoint list/data, permissions or flows were modified. Run the production build and role-based browser/workflow tests after setup before deployment.
