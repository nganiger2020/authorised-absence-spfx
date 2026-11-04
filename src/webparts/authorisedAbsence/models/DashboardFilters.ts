import { IRequest } from "./Models";
import { workflowStatus } from "./Workflow";

export type DashboardColumn = "request" | "student" | "dates" | "reason" | "status" | "signatory" | "admin";
export type ColumnFilters = Partial<Record<DashboardColumn, string>>;
export const dashboardColumns: Array<{ key: DashboardColumn; label: string }> = [
  { key: "request", label: "Request ID" }, { key: "student", label: "Student" },
  { key: "dates", label: "Absence Dates" }, { key: "reason", label: "Reason" },
  { key: "status", label: "Status" }, { key: "signatory", label: "Signatory" },
  { key: "admin", label: "Administrator" }
];
const dateText = (value?: string): string => {
  if (!value) { return ""; }
  const date = new Date(value);
  return isNaN(date.getTime()) ? value.substring(0, 10) : date.toLocaleDateString("en-GB");
};
export const matchesColumnFilters = (request: IRequest, filters: ColumnFilters): boolean => {
  const values: Record<DashboardColumn, string> = {
    request: request.Id ? "AA-" + request.Id : "-",
    student: [request.Student ? request.Student.Title : request.Title || "-", request.Student && request.Student.EMail, request.Title].join(" "),
    dates: [dateText(request.AbsenceStartDate), dateText(request.AbsenceEndDate), request.AbsenceStartDate, request.AbsenceEndDate].join(" "),
    reason: (request.AbsenceReasons || []).join(", ") || "-",
    status: workflowStatus(request),
    signatory: request.Signatory ? [request.Signatory.Title, request.Signatory.EMail].join(" ") : "-",
    admin: [request.AdminTitle, request.AdminLabel || "-"].join(" ")
  };
  return dashboardColumns.every(column => values[column.key].toLowerCase().indexOf((filters[column.key] || "").trim().toLowerCase()) >= 0);
};
