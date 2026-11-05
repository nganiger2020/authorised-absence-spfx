import { IRequest, UserRole } from "./Models";

export const workflowStage = (request: IRequest): "Student" | "Administrator" | "Signatory" | "Completed" => {
  const stage = (request.Stage || "").trim().toLowerCase();
  const status = (request.Status || "").trim().toLowerCase();
  if (status === "withdrawn" || stage === "withdrawn" || status === "supported" || status === "approved" || status === "rejected" || stage === "completed" || stage === "supported" || stage === "approved" || stage === "rejected") { return "Completed"; }
  if (status === "draft") { return "Student"; }
  if (status === "under review with administrator") { return "Administrator"; }
  if (status === "under review with signatory") { return "Signatory"; }
  if (stage === "administrator" || stage === "admin") { return "Administrator"; }
  if (stage === "signatory") { return "Signatory"; }
  // Compatibility for previously submitted requests.
  return request.SignatoryId ? "Signatory" : "Administrator";
};
const emailKey = (value?: string): string => (value || "").trim().toLowerCase();
export const canWithdrawRequest = (request: IRequest, userId?: number): boolean =>
  !!request.Id && !!userId && (request.StudentId === userId || (!!request.Student && request.Student.Id === userId)) &&
  (request.Status || "").trim().toLowerCase() !== "withdrawn";
export const canReassignAdministrator = (request: IRequest, role: UserRole, email: string, userId?: number): boolean => {
  const status = (request.Status || "").trim().toLowerCase();
  if (["submitted", "pending approval", "under review", "under review with administrator", "under review with signatory"].indexOf(status) < 0) { return false; }
  const stage = workflowStage(request);
  if (stage !== "Administrator" && stage !== "Signatory") { return false; }
  return role === "Admin" || (!!emailKey(email) && emailKey(email) === emailKey(request.AdminLabel)) ||
    (stage === "Signatory" && ((!!userId && request.SignatoryId === userId) ||
      (!!emailKey(email) && emailKey(email) === emailKey(request.Signatory ? request.Signatory.EMail : ""))));
};
export const canReassignSignatory = (request: IRequest, role: UserRole, email: string, userId?: number): boolean =>
  workflowStage(request) === "Signatory" && !!request.SignatoryId && canReassignAdministrator(request, role, email, userId);
export const canAssignSignatory = (request: IRequest, role: UserRole, email: string): boolean => {
  if (workflowStage(request) !== "Administrator") { return false; }
  return role === "Admin" || (!!emailKey(email) && emailKey(email) === emailKey(request.AdminLabel));
};
export const canDecideRequest = (request: IRequest, email: string, userId?: number): boolean => {
  if (workflowStage(request) !== "Signatory") { return false; }
  return (!!userId && request.SignatoryId === userId) ||
    (!!emailKey(email) && emailKey(email) === emailKey(request.Signatory ? request.Signatory.EMail : ""));
};
export const canOpenWorkflow = (request: IRequest, role: UserRole, email: string, userId?: number): boolean =>
  canAssignSignatory(request, role, email) || canDecideRequest(request, email, userId);

export const workflowStatus = (request: IRequest): string => {
  const status = (request.Status || "").trim().toLowerCase();
  if (status === "withdrawn") { return "Withdrawn"; }
  if (status === "supported" || status === "approved") { return "Supported"; }
  if (status === "rejected") { return "Rejected"; }
  if (status === "draft") { return "Draft"; }
  if (status === "submitted" || status === "pending approval" || status === "under review" ||
      status === "under review with administrator" || status === "under review with signatory") {
    return workflowStage(request) === "Signatory" ? "Under Review with Signatory" : "Under Review with Administrator";
  }
  return request.Status || "Draft";
};
