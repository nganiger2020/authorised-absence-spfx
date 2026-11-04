# Latest update: SelectedAdmin email persistence

SelectedAdmin is saved as the trimmed Email from the Admins list record referenced by the Admin lookup. It is not the Admin title or lookup ID. The service reloads the selected record before create, update, draft save, normal/admin save, submission and administrator reassignment. Clearing the Admin lookup also clears SelectedAdmin; partial updates that omit AdminId preserve the existing value.

SelectedAdmin must be a Single line of text column with internal name SelectedAdmin on the requests list. The schema reference now includes that column. Admin remains a single-value lookup to Admins.

The email-only standard Admin dropdown, small square status cards and latest dashboard features are retained. All 14 TypeScript/TSX source files and existing mocked lookup/email persistence regression checks passed. Full SPFx build and live SharePoint tests remain required; no live tenant schema/data changes were made.
