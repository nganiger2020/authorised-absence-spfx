# Administrative team and signatory reassignment

## Actions
- Added Reassign request to the Request ID three-dot menu and active request forms/views for authorised staff. Intentional read-only links remain view-only for this action.
- The dialog lets staff select Administrative team or Signatory, choose a replacement through the existing searchable controls and enter a mandatory reason. Nothing is saved just by selecting a dropdown option. Unsaved edits on the underlying form are not saved by reassignment.
- Reassigning the administrative team changes the Admin lookup, refreshes SelectedAdmin from the new Admins record Email, returns Stage/Status to Administrator/Under Review with Administrator, clears the previous signatory and confirmed-reason selection, and requires the receiving team to review/assign again. Original student reasons and evidence are retained.
- Reassigning the signatory is available once the request is at Signatory review with an existing signatory. It changes SignatoryId, keeps Signatory/Under Review with Signatory and preserves the administrator's confirmed reasons and evidence. Initial signatory assignment still uses the existing administrator review process.
- Both actions append history including who reassigned the request, when, previous/new recipients and the reason. The former assignee no longer has the corresponding workflow authority, except where they independently have application-admin rights.
- Replaced the old immediate-save Admin Assignment control with the explicit reassignment dialog.

## Authorisation
Uses the existing application authorisation model, checked in both UI and service:
- Application administrators (Admin role) can correct active submitted requests.
- Staff whose email matches the assigned Admin record can correct their active requests.
- The currently assigned signatory can correct a request at Signatory review.
- Students and unrelated staff do not gain reassignment rights merely by owning or viewing a request.
- Draft, Supported, Rejected and Withdrawn requests cannot be rerouted through this action. Reassignment corrects active submitted requests; it does not reopen completed outcomes.

Team entries use the existing Admins list Email. Shared-mailbox/group membership is not inferred: additional team-member authorisation must be provided by the existing Admin role/group or exact assigned-email model.

## Consistency
Reassignment reads current assignments/permissions and uses the SharePoint item ETag for an atomic conditional write with audit history. Concurrent changes require refresh/retry. Initial signatory assignment and review/decision saves now also carry the version checked during authorisation, so a stale action cannot overwrite a reassignment or withdrawal. The existing internal RequestApproved field/API names are retained for compatibility.

## Deployment
No new SharePoint columns are required beyond the existing Admin lookup, SelectedAdmin, Signatory, Stage/Status and WorkflowHistory fields. Existing item/list permissions must permit authorised staff to update the request and read Admins/site users.

External Power Automate flow definitions were not included. Update flows to detect changes to AdminId/SelectedAdmin or SignatoryId even when Status stays the same, notify the replacement recipient, stop/cancel obsolete reminders/approval tasks, and verify the current recipient/status before writing results. This source update does not send notifications or change live flows. Previous Supported/Withdrawn choice setup and withdrawal requirements still apply.

## Verification
Dependency-aware TypeScript checking passed. Installed SPFx lint reported zero errors (existing unrelated warnings remain). Service tests cover staff permissions, student/unrelated/terminal rejection, routing/reset, canonical Admin email, history, missing reasons, duplicate assignments, ETag conflicts, former-assignee rejection and conditional decision/initial-assignment updates. Rendered React tests cover the staff-only action, searchable replacement team, required reason, explicit confirmation, signatory mode and Cancel. Withdrawal, SharePoint-choice and dashboard regression checks passed; CSS parsing passed.

No live project, list/data, permissions or flows were changed. Build/package and test in the target tenant before production deployment.
