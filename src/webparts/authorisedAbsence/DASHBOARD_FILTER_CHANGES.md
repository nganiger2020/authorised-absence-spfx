# Dashboard column filters update

- Removed the visible Search options labels above dropdown search fields. Search remains available, with accessible names.
- Added a filter row beneath the dashboard column headings for Request ID, Student, Absence Dates, Reason, Status, Signatory and Administrator.
- Filters are case insensitive and combine with each other, the main search and status filters. Dates match displayed UK dates or stored ISO dates. People columns also match email addresses; Administrator matches title or email.
- Filtering occurs before sorting and pagination and returns to page one. Filter controls remain available when no rows match. Clear columns resets column filters; Clear filters resets all filters.
- Actions has a Clear columns button because it contains commands rather than request data.
- Retains the Admin lookup and two-line options, searchable dropdowns and previous absence/evidence changes. Follow ADMIN_DROPDOWN_UPDATE.md for SharePoint lookup setup/migration.

Verification: all 15 TypeScript/TSX files passed syntax transpilation. Mocked regression checks passed for lookup persistence and evidence requirements. Column-filter checks passed for every data column, combined filters, case/whitespace handling, UK/ISO dates, missing data and no matches. A full SPFx build and live browser/SharePoint test remain necessary because the supplied source archive has no build scaffold or dependencies.
