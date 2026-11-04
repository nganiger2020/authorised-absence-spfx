# Admin lookup update — 4 November 2026

This document supersedes earlier Admin metadata setup notes.

## Behaviour
- Admin choices come exclusively from the same site's Admins list: Id, Title, Email. No term-store calls or metadata mapping remain.
- Each searchable option shows Title on the first line and Email on the second. Blank titles show Email alone. The selected value uses the same layout. Search matches both fields; arrow keys, Enter and Escape are supported.
- The request stores the selected Admins item ID in a single-value lookup with internal name Admin (REST payload AdminId). No taxonomy GUID is stored.
- Reading requests expands Admin to obtain Title and Email. Administrator access compares the expanded Email with the current user's email. Existing SelectedAdmin text is maintained as the canonical email for notification templates. Save/assignment verifies the selected list item and takes the email from SharePoint.
- All other dropdowns remain searchable. Earlier travel, letter-removal and evidence changes are retained.

## SharePoint setup required before deployment
1. Use an Admins list on the app's site with internal columns Title and Email (single line of text). Email is required for selectable entries; Title is optional. Allow users to read this list.
2. On Authorised Absence Requests, create a single-value Lookup column with display and internal name Admin. Source list: Admins; displayed lookup field: Title. Keep SharePoint-level requiredness optional for incomplete drafts; the app enforces Admin on submission. The picker independently displays Title and Email, including email-only entries.
3. Retain the existing SelectedAdmin text column used by email templates. The updated lists.json is a schema reference, not an executable provisioning script. Admin.lookup.xml is an optional field definition: replace its list-ID placeholder before provisioning into a list without an Admin field.
4. Build and package in the existing full SPFx project, then test in a tenant.

## Existing taxonomy column and historical data
SharePoint cannot convert an existing managed metadata column into a lookup or free its internal name merely by renaming its display name. If an Admin taxonomy field already exists, back up its values and dependencies, then plan a controlled replacement with the new lookup Admin. Map historical administrator emails to matching Admins item IDs and populate the new lookup. Resolve unmatched or duplicate emails explicitly. Do not deploy this version against the old field type.

Existing Power Automate flows reading taxonomy Admin.Label or term GUIDs must be updated to use the lookup ID and get the corresponding Admins item Email. Templates using SelectedAdmin remain compatible because the app maintains that email field. The supplied HTML templates do not include complete flow definitions, so external flow changes cannot be made from this ZIP. No live SharePoint schema, data or flows have been modified here.

## Verification
All 14 TypeScript/TSX files passed transpilation syntax checks. Mocked tests passed for paginated Admins loading, title/email-only entries, canonical email resolution, lookup payloads, expanded reads, reassignment, clearing a draft selection, preserving Admin on partial updates, and required-evidence regression cases. No Admin term-store calls or taxonomy save methods remain.

The original upload lacks the complete SPFx scaffold and dependencies. A full dependency-aware build and live UI/SharePoint/Power Automate tests were not possible. Verify two-line rendering, search, email-only selection, save/reopen, assignment, administrator access, notification recipients and decisions after schema and flow migration.
