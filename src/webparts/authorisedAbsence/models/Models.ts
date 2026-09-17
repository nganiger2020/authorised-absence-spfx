export type AppView = "dashboard" | "studentForm" | "review" | "view";
export type UserRole = "Student" | "Approver" | "Admin";
export type FormStep = 1 | 2 | 3 | 4 | 5;

export interface IAttachmentInfo { FileName:string; ServerRelativeUrl:string; }

export interface IUserOption { Id:number; Title:string; Email?:string; }

export interface IRequest {
  Id?:number;
  Title:string;
  Stage?:string;
  Status?:string;
  StudentId?:number;
  Student?:{Id:number;Title:string;EMail?:string};
  LevelOfStudy?:string;
  DoB?:string;
  Programme?:string;
  VisaType?:string;
  VisaOtherComments?:string;
  VisaStartDate?:string;
  VisaEndDate?:string;
  VisaAttachment?:string;
  PassportAttachment?:string;
  AbsenceStartDate?:string;
  AbsenceEndDate?:string;
  AbsenceReasons?:string[];
  ReasonOtherComments?:string;
  ConferenceAttachment?:string;
  FamilyIllnessDetails?:string;
  FamilyIllnessAttachment?:string;
  HolidayUGAttachment?:string;
  HolidayUGOtherAttachment?:string;
  OtherAttachment?:string;
  MedicalAttachment?:string;
  MedicalEvidenceDetails?:string;
  Returning?:string;
  ReasonsNotReturning?:string;
  TravelOutside?:string;
  TravelOutsideDetails?:string;
  SignatoryId?:number;
  Signatory?:{Id:number;Title:string;EMail?:string};
  AbsenceReasonsConfirm?:string[];
  MissSessions?:string;
  MissSessionsRationale?:string;
  ReasonConfOtherComments?:string;
  MonitoringConditions?:string[];
  AbsenceMonitoringDetails?:string;
  RequestApproved?:string;
  RequestRejectionDetails?:string;
  AdministratorId?:number;
  Administrator?:{Id:number;Title:string;EMail?:string};
  letterofconfirmationforauthorise?:string;
  Reasonforrequestingaletter?:string;
  Created?:string;
  Modified?:string;
  Attachments?:boolean;
  AttachmentFiles?:IAttachmentInfo[];
}

export const emptyRequest = ():IRequest => ({
  Title:"",
  Stage:"Student",
  Status:"Draft",
  AbsenceReasons:[],
  AbsenceReasonsConfirm:[],
  MonitoringConditions:[]
});
