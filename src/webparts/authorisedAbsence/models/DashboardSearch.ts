import { IRequest } from "./Models";
import { workflowStatus } from "./Workflow";

const dateText = (value?: string): string => {
  if (!value) { return ""; }
  const date = new Date(value);
  return isNaN(date.getTime()) ? value.substring(0, 10) : date.toLocaleDateString("en-GB");
};
/** Search all request columns before sorting and pagination. */
export const matchesDashboardSearch = (request: IRequest, search: string): boolean => {
  const query = search.trim().toLowerCase();
  if (!query) { return true; }
  return [
    request.Id ? "AA-" + request.Id : "", request.Title,
    request.Student && request.Student.Title, request.Student && request.Student.EMail,
    dateText(request.AbsenceStartDate), dateText(request.AbsenceEndDate),
    request.AbsenceStartDate, request.AbsenceEndDate,
    (request.AbsenceReasons || []).join(", "), workflowStatus(request),
    request.Signatory && request.Signatory.Title, request.Signatory && request.Signatory.EMail,
    request.AdminTitle, request.AdminLabel, request.Programme
  ].some(value => (value || "").toLowerCase().indexOf(query) >= 0);
};
