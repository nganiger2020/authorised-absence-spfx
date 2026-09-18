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


export interface IRequest {

  Id?: number;

  Title: string;

  Stage?: string;

  Status?: string;


  /* =========================
     STUDENT
     ========================= */

  StudentId?: number;

  Student?: ISharePointUser;

  LevelOfStudy?: string;

  DoB?: string;

  Programme?: string;


  /* =========================
     VISA
     ========================= */

  VisaType?: string;

  VisaOtherComments?: string;

  VisaStartDate?: string;

  VisaEndDate?: string;

  VisaAttachment?: string;

  PassportAttachment?: string;


  /* =========================
     ABSENCE
     ========================= */

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


  /* =========================
     RETURN / TRAVEL
     ========================= */

  Returning?: string;

  ReasonsNotReturning?: string;

  TravelOutside?: string;

  TravelOutsideDetails?: string;


  /* =========================
     SIGNATORY / APPROVER
     ========================= */

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


  /* =========================
     ADMINISTRATOR
     ========================= */

  AdministratorId?: number;

  Administrator?: ISharePointUser;


  /* =========================
     LETTER
     ========================= */

  letterofconfirmationforauthorise?: string;

  Reasonforrequestingaletter?: string;


  /* =========================
     SHAREPOINT SYSTEM FIELDS
     ========================= */

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

    AbsenceReasons: [],

    AbsenceReasonsConfirm: [],

    MonitoringConditions: [],

    AttachmentFiles: []
  });


/* =====================================================
   PEOPLE PICKER HELPERS
   ===================================================== */

export const toUserOption = (
  user?: ISharePointUser
): IUserOption | undefined => {

  if (!user) {
    return undefined;
  }

  return {
    Id: user.Id,
    Title: user.Title || "",
    Email: user.EMail || "",
    LoginName: user.LoginName || ""
  };
};


export const toSharePointUser = (
  user?: IUserOption
): ISharePointUser | undefined => {

  if (!user) {
    return undefined;
  }

  return {
    Id: user.Id,
    Title: user.Title || "",
    EMail: user.Email || "",
    LoginName: user.LoginName || ""
  };
};

export interface IUserOption {
  Id: number;
  Title: string;
  Email?: string;
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


export interface ISharePointUser {
  Id: number;
  Title: string;
  EMail?: string;
  LoginName?: string;
}