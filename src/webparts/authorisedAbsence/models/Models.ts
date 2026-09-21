export type AppView =
  | "dashboard"
  | "studentForm"
  | "review"
  | "view";

export type UserRole =
  | "Student"
  | "Approver"
  | "Admin";

export type FormStep =
  | 1
  | 2
  | 3
  | 4
  | 5;

export interface IAttachmentInfo {
  FileName: string;
  ServerRelativeUrl: string;
}

export interface IUserOption {
  Id: number;
  Title: string;
  Email?: string;
  LoginName?: string;
}

export interface ISharePointUser {
  Id: number;
  Title: string;
  EMail?: string;
  LoginName?: string;
}

export interface ICurrentUser {
  Id: number;
  Title: string;
  Email: string;
  LoginName: string;
}

export interface IGroupInfo {
  Id: number;
  Title: string;
}

export interface IRequest {
  Id?: number;
  Title: string;
  Stage?: string;
  Status?: string;

  StudentId?: number;
  Student?: ISharePointUser;

  LevelOfStudy?: string;
  DoB?: string;
  Programme?: string;

  /*
   * Admin is a single-value Managed Metadata field.
   * AdminLabel is the displayed term label/email address.
   * AdminTermGuid is the selected taxonomy term GUID.
   */
  AdminLabel?: string;
  AdminTermGuid?: string;

  VisaType?: string;
  VisaOtherComments?: string;
  VisaStartDate?: string;
  VisaEndDate?: string;
  VisaAttachment?: string;
  PassportAttachment?: string;

  AbsenceStartDate?: string;
  AbsenceEndDate?: string;
  AbsenceReasons?: string[];
  ReasonOtherComments?: string;

  ConferenceAttachment?: string;
  FamilyIllnessDetails?: string;
  FamilyIllnessAttachment?: string;
  HolidayUGAttachment?: string;
  HolidayUGOtherAttachment?: string;
  OtherAttachment?: string;
  MedicalAttachment?: string;
  MedicalEvidenceDetails?: string;

  Returning?: string;
  ReasonsNotReturning?: string;

  TravelOutside?: string;
  TravelOutsideDetails?: string;

  SignatoryId?: number;
  Signatory?: ISharePointUser;

  AbsenceReasonsConfirm?: string[];
  MissSessions?: string;
  MissSessionsRationale?: string;
  ReasonConfOtherComments?: string;
  MonitoringConditions?: string[];
  AbsenceMonitoringDetails?: string;

  RequestApproved?: string;
  RequestRejectionDetails?: string;

  AdministratorId?: number;
  Administrator?: ISharePointUser;

  letterofconfirmationforauthorise?: string;
  Reasonforrequestingaletter?: string;

  Created?: string;
  Modified?: string;

  Attachments?: boolean;
  AttachmentFiles?: IAttachmentInfo[];
}

export const emptyRequest =
  (): IRequest => ({
    Title: "",
    Stage: "Student",
    Status: "Draft",
    AdminLabel: "",
    AdminTermGuid: "",
    AbsenceReasons: [],
    AbsenceReasonsConfirm: [],
    MonitoringConditions: [],
    AttachmentFiles: []
  });
