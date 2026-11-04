# Absence form update — 4 November 2026

## Changes
- Four steps: Student Details, Absence Details, Evidence, Review.
- Moved the travel outside UK question and conditional travel details into Absence Details, including their existing validation and review summary.
- Removed the letter question, conditional letter reason, associated validation and letter sections from student and staff review screens. Removed the Travel / Letter step entirely.
- Required at least one retained, permitted evidence attachment before submission when any selected reason includes medical, family illness, bereavement or conference. Matching ignores case and supports combined choice labels. Pending deletions do not count; existing retained evidence does.
- Centralised upload formats in AppConfig: .pdf, .doc, .docx, .jpg, .jpeg, .png, .eml. The picker, browser validation and SharePoint upload service use the same list. Existing 10 MB limit retained; empty files rejected.
- Added guidance to upload relevant evidence only, avoid irrelevant or inappropriate files and unnecessary personal information, and use EML for relevant email evidence.
- Uploads are checked before draft/save/submission item mutations. The submission service independently enforces required evidence and reloads existing attachments from SharePoint.

## Assumptions and compatibility
- No separate agreed format list was supplied. The existing six formats are retained and EML is added for all reasons; no additional formats are assumed.
- At least one attachment per request is required for the specified reasons, rather than one attachment per selected reason. Staff assess whether its content supports all selected reasons.
- Incomplete drafts remain saveable. Existing administrator saves remain available without resetting workflow stage/status or imposing a new evidence requirement on historical requests. New uploads on these paths still receive format/size validation.
- Existing letter properties and SharePoint mappings/schema are retained for compatibility with stored records and integrations. No new letter values are collected and no historical letter data is erased.
- Existing assignment, approval, rejection, notification templates and workflow transitions were not changed.
- Restrictions validate filename extensions, file size and non-empty content in the app/service. They are not file-content inspection or malware scanning, and direct SharePoint uploads are outside this app's controls.

## Verification and deployment
- All 14 non-declaration TypeScript/TSX source files passed TypeScript transpilation syntax checks.
- Automated checks passed for required reason labels and combined labels, allowed/disallowed extensions, missing evidence, deletion of the last evidence file, retained evidence, EML, empty files and optional reasons. Submission checks used mocked SharePoint operations and confirmed invalid requests were rejected before writes.
- The supplied archive contains a web-part source folder, not a full SPFx project: no package.json, dependency lockfile, tsconfig or build scaffold was supplied. A full dependency-aware build and live SharePoint test could not be performed. This is an updated source ZIP, not a deployable .sppkg.
- Copy the updated folder into the existing SPFx project, run its normal build/package checks and verify draft save/reopen, each evidence reason, travel validation, administrator edits, assignment, approval and rejection in a test tenant before production deployment.

