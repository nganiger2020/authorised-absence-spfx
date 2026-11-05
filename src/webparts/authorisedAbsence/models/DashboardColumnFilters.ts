import { IRequest } from "./Models";
import { workflowStatus } from "./Workflow";

export type ColumnKey = "Id" | "Student" | "AbsenceStartDate" | "Reason" | "Status" | "Signatory" | "Admin";
export type CheckboxFilters = Partial<Record<ColumnKey, string[]>>;
export const columns: Array<{ key: ColumnKey; label: string }> = [
  { key: "Id", label: "Request ID" }, { key: "Student", label: "Student" },
  { key: "AbsenceStartDate", label: "Absence Dates" }, { key: "Reason", label: "Reason" },
  { key: "Status", label: "Status" }, { key: "Signatory", label: "Signatory" }, { key: "Admin", label: "Administrator" }
];
const dateLabel = (value?: string): string => {
  if (!value) { return "-"; }
  const date = new Date(value);
  return isNaN(date.getTime()) ? value.substring(0, 10) : date.toLocaleDateString("en-GB");
};
export const columnValues = (request: IRequest, key: ColumnKey): string[] => {
  switch (key) {
    case "Id": return [request.Id ? "AA-" + request.Id : "-"];
    case "Student": return [(request.Student ? request.Student.Title : request.Title) || "-"];
    case "AbsenceStartDate": return [dateLabel(request.AbsenceStartDate) + " – " + dateLabel(request.AbsenceEndDate)];
    case "Reason": return request.AbsenceReasons && request.AbsenceReasons.length ? request.AbsenceReasons : ["-"];
    case "Status": return [workflowStatus(request) || "-"];
    case "Signatory": return [(request.Signatory && (request.Signatory.Title || request.Signatory.EMail)) || "-"];
    case "Admin": return [[request.AdminTitle, request.AdminLabel].filter(Boolean).join(" — ") || "-"];
  }
};
export const matchesCheckboxFilters = (request: IRequest, filters: CheckboxFilters): boolean =>
  columns.every(column => {
    const selected = filters[column.key];
    return selected === undefined || columnValues(request, column.key).some(value => selected.indexOf(value) >= 0);
  });
export const compareColumn = (a: IRequest, b: IRequest, key: ColumnKey): number => {
  if (key === "Id") { return (a.Id || 0) - (b.Id || 0); }
  if (key === "AbsenceStartDate") { return (a.AbsenceStartDate || "").localeCompare(b.AbsenceStartDate || ""); }
  return columnValues(a, key).join(", ").localeCompare(columnValues(b, key).join(", "), undefined, { sensitivity: "base", numeric: true });
};
