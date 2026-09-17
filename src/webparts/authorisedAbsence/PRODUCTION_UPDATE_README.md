# Authorised Absence - Admin Permission Update

Updated 17 September 2026.

## Behaviour

- Student: own requests; edit/delete own Drafts; submit for approval.
- Approver: dashboard restricted by `SignatoryId`; review assigned requests; Save for Later; Approve; Reject.
- Admin: dashboard is unfiltered and Admin can create, edit any request regardless of status, review/approve/reject any request, assign/reassign Signatory, assign Administrator, and recycle any request.
- Admin edits preserve the current Stage/Status through `adminSave`; editing a completed request does not silently return it to Draft.
- Admin new-request form requires selection of a Student from SharePoint site users.
- Approval clears `RequestRejectionDetails`; rejection alone writes to that rejection-specific field.
- Save for Later changes Stage/Status to Signatory/Under Review. Review comments are not persisted because the supplied SharePoint schema does not contain a dedicated signatory-comments field.

## Configuration

Confirm these values match the tenant exactly before deployment:

- Requests list: `Authorised Absence Requests`
- Admin group: `Authorised Absence Admins`
- Approver group: `Authorised Absence Approvers`
- Stage choices: `Student`, `Signatory`, `Completed`
- Status choices: `Draft`, `Pending Approval`, `Under Review`, `Approved`, `Rejected`
- RequestApproved choices: `Yes`, `No`

## Security

UI role checks are not the security boundary. SharePoint list/item permissions and membership of the configured SharePoint groups must be configured appropriately.

## Build note

The uploaded ZIP contained only the web-part source folder, not the complete SPFx scaffold (`package.json`, `node_modules`, `config`, `sharepoint`, etc.). A TypeScript syntax pass was run against the edited files; it reported only expected unresolved external modules because the scaffold/dependencies were not supplied. Run `npm run build` in the full SPFx 1.23 project after copying this folder into the project.
