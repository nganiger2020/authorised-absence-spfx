/* =========================================================
   APPLICATION VIEWS
   ========================================================= */

export type AppView =
  | "dashboard"
  | "studentForm"
  | "review"
  | "view";


/* =========================================================
   USER ROLES
   ========================================================= */

export type UserRole =
  | "Student"
  | "Approver"
  | "Admin";


/* =========================================================
   FORM STEPS
   ========================================================= */

export type FormStep =
  | 1
  | 2
  | 3
  | 4
  | 5;


/* =========================================================
   ATTACHMENTS
   ========================================================= */

export interface IAttachmentInfo {
  FileName: string;
  ServerRelativeUrl: string;
}


/* =========================================================
   USERS
   ========================================================= */

/**
 * Used by People Picker controls.
 */
export interface IUserOption {
  Id: number;
  Title: string;
  Email?: string;
  LoginName?: string;
}


/**
 * Expanded SharePoint Person field.
 */
export interface ISharePointUser {
  Id: number;
  Title: string;
  EMail?: string;
  LoginName?: string;
}


/**
 * Current logged-in SharePoint user.
 */
export interface ICurrentUser {
  Id: number;
  Title: string;
  Email: string;
  LoginName: string;
}


/**
 * SharePoint group information.
 */
export interface IGroupInfo {
  Id: number;
  Title: string;
}


/* =========================================================
   VALIDATION
   ========================================================= */

/**
 * Used by StudentRequestForm and individual form steps
 * for displaying inline validation messages.
 */
export interface IValidationError {
  field: string;
  message: string;
}


/* =========================================================
   USER CONVERSION
   ========================================================= */

/**
 * Converts an expanded SharePoint user into the format
 * expected by the People Picker.
 */
export const toUserOption = (
  user?: ISharePointUser
): IUserOption | undefined => {

  if (!user) {
    return undefined;
  }

  return {
    Id: user.Id,
    Title: user.Title,
    Email: user.EMail,
    LoginName: user.LoginName
  };
};


/**
 * Converts a People Picker user option into the
 * SharePoint user structure used by IRequest.
 */
export const toSharePointUser = (
  user?: IUserOption
): ISharePointUser | undefined => {

  if (!user) {
    return undefined;
  }

  return {
    Id: user.Id,
    Title: user.Title,
    EMail: user.Email,
    LoginName: user.LoginName
  };
};

/* =========================================================
   REQUEST
   ========================================================= */

export interface IRequest {

  /* =====================================================
     SHAREPOINT ITEM
     ===================================================== */

  Id?: number;

  Title: string;

  Stage?: string;

  Status?: string;


  /* =====================================================
     STUDENT DETAILS
     ===================================================== */

  StudentId?: number;

  Student?: ISharePointUser;

  LevelOfStudy?: string;

  DoB?: string;

  Programme?: string;


  /* =====================================================
     ADMINISTRATOR

     SharePoint field:
     Admin

     Field type:
     Single-value Managed Metadata

     AdminLabel:
     Selected taxonomy term display label.

     AdminTermGuid:
     Selected taxonomy term GUID.
     ===================================================== */

  AdminLabel?: string;

  AdminTermGuid?: string;


  /* =====================================================
     VISA DETAILS
     ===================================================== */

  VisaType?: string;

  VisaOtherComments?: string;

  VisaStartDate?: string;

  VisaEndDate?: string;

  VisaAttachment?: string;

  PassportAttachment?: string;


  /* =====================================================
     ABSENCE DETAILS - STUDENT

     AbsenceReasons contains the student's original
     selections.

     Available choices are dynamically obtained from
     the SharePoint AbsenceReasons field.
     ===================================================== */

  AbsenceStartDate?: string;

  AbsenceEndDate?: string;

  AbsenceReasons?: string[];

  ReasonOtherComments?: string;


  /* =====================================================
     SUPPORTING EVIDENCE
     ===================================================== */

  ConferenceAttachment?: string;

  FamilyIllnessDetails?: string;

  FamilyIllnessAttachment?: string;

  HolidayUGAttachment?: string;

  HolidayUGOtherAttachment?: string;

  OtherAttachment?: string;

  MedicalAttachment?: string;

  MedicalEvidenceDetails?: string;


  /* =====================================================
     RETURN TO STUDY
     ===================================================== */

  Returning?: string;

  ReasonsNotReturning?: string;


  /* =====================================================
     TRAVEL
     ===================================================== */

  TravelOutside?: string;

  TravelOutsideDetails?: string;


  /* =====================================================
     ASSIGNED SIGNATORY

     SharePoint Person field.

     SignatoryId:
     SharePoint user ID used when saving.

     Signatory:
     Expanded SharePoint user information.
     ===================================================== */

  SignatoryId?: number;

  Signatory?: ISharePointUser;


  /* =====================================================
     APPROVER RECONFIRMATION

     IMPORTANT:

     AbsenceReasons
       = student's original selection.

     AbsenceReasonsConfirm
       = approver's final selection.

     ReviewForm should NEVER overwrite AbsenceReasons.

     ReviewForm obtains available choices from the
     SharePoint AbsenceReasonsConfirm field.
     ===================================================== */

  AbsenceReasonsConfirm?: string[];

  ReasonConfOtherComments?: string;


  /* =====================================================
     MISSED SESSIONS
     ===================================================== */

  MissSessions?: string;

  MissSessionsRationale?: string;


  /* =====================================================
     MONITORING CONDITIONS
     ===================================================== */

  MonitoringConditions?: string[];

  AbsenceMonitoringDetails?: string;


  /* =====================================================
     SIGNATORY DECISION
     ===================================================== */

  RequestApproved?: string;

  RequestRejectionDetails?: string;


  /* =====================================================
     LEGACY / OPTIONAL ADMINISTRATOR PERSON FIELD

     Retained for compatibility with existing components.

     The primary Administrator field is the Managed
     Metadata Admin field represented by:

       AdminLabel
       AdminTermGuid
     ===================================================== */

  AdministratorId?: number;

  Administrator?: ISharePointUser;


  /* =====================================================
     CONFIRMATION LETTER
     ===================================================== */

  letterofconfirmationforauthorise?: string;

  Reasonforrequestingaletter?: string;


  /* =====================================================
     SHAREPOINT SYSTEM FIELDS
     ===================================================== */

  Created?: string;

  Modified?: string;

  Attachments?: boolean;

  AttachmentFiles?: IAttachmentInfo[];
}


/* =========================================================
   EMPTY REQUEST
   ========================================================= */

/**
 * Creates a clean request for a new Student submission.
 */
export const emptyRequest = (): IRequest => ({

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