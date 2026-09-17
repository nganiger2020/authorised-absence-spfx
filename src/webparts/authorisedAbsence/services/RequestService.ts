import { SPFI } from "@pnp/sp";

import "@pnp/sp/webs";
import "@pnp/sp/lists";
import "@pnp/sp/items";
import "@pnp/sp/attachments";
import "@pnp/sp/site-users/web";
import "@pnp/sp/site-groups/web";

import {
  IRequest,
  UserRole,
  IAttachmentInfo,
  IUserOption
} from "../models/Models";

import {
  AppConfig
} from "../config/AppConfig";


/* =========================================================
   SHAREPOINT TYPES
   ========================================================= */

interface ICurrentUser {
  Id: number;
  Title: string;
  Email?: string;
  LoginName?: string;
}

interface IGroupInfo {
  Id: number;
  Title: string;
}

interface IListItemAddResult {
  Id: number;
}


/* =========================================================
   REQUEST SERVICE
   ========================================================= */

export class RequestService {

  private readonly sp: SPFI;


  public constructor(
    sp: SPFI
  ) {

    this.sp = sp;
  }


  /* =====================================================
     REQUEST LIST
     ===================================================== */

  private get requestList() {

    return this.sp.web.lists
      .getByTitle(
        AppConfig.requestsListTitle
      );
  }


  /* =====================================================
     CURRENT USER
     ===================================================== */

  public async currentUser():
    Promise<ICurrentUser> {

    const user =
      await this.sp.web.currentUser();

    return {
      Id: user.Id,
      Title: user.Title,
      Email: user.Email,
      LoginName: user.LoginName
    };
  }


  public async getSiteUsers(): Promise<IUserOption[]> {
    const users = await this.sp.web.siteUsers
      .select("Id", "Title", "Email")();

    const result: IUserOption[] = [];
    for (let i = 0; i < users.length; i++) {
      if (users[i].Id && users[i].Title) {
        result.push({
          Id: users[i].Id,
          Title: users[i].Title,
          Email: users[i].Email
        });
      }
    }

    result.sort((a, b) => a.Title.localeCompare(b.Title));
    return result;
  }


  /* =====================================================
     RESOLVE USER ROLE
     ===================================================== */

  public async resolveRole():
    Promise<UserRole> {

    const groups:
      IGroupInfo[] =
      await this.sp.web.currentUser
        .groups
        .select(
          "Id",
          "Title"
        )();


    let isAdmin =
      false;

    let isApprover =
      false;


    for (
      let i = 0;
      i < groups.length;
      i++
    ) {

      const groupName =
        (
          groups[i].Title ||
          ""
        ).toLowerCase();


      if (
        groupName ===
        AppConfig.adminGroupName
          .toLowerCase()
      ) {

        isAdmin =
          true;
      }


      if (
        groupName ===
        AppConfig.approverGroupName
          .toLowerCase()
      ) {

        isApprover =
          true;
      }
    }


    /*
     * Admin takes precedence if
     * user belongs to both groups.
     */

    if (isAdmin) {
      return "Admin";
    }


    if (isApprover) {
      return "Approver";
    }


    return "Student";
  }


  /* =====================================================
     COMMON SELECT
     ===================================================== */

  private getSelectFields():
    string[] {

    return [

      "Id",
      "Title",

      "Stage",
      "Status",

      "LevelOfStudy",
      "DoB",
      "Programme",

      "VisaType",
      "VisaOtherComments",
      "VisaStartDate",
      "VisaEndDate",
      "VisaAttachment",
      "PassportAttachment",

      "AbsenceStartDate",
      "AbsenceEndDate",
      "AbsenceReasons",
      "ReasonOtherComments",

      "ConferenceAttachment",

      "FamilyIllnessDetails",
      "FamilyIllnessAttachment",

      "HolidayUGAttachment",
      "HolidayUGOtherAttachment",

      "OtherAttachment",

      "MedicalAttachment",
      "MedicalEvidenceDetails",

      "Returning",
      "ReasonsNotReturning",

      "TravelOutside",
      "TravelOutsideDetails",

      "AbsenceReasonsConfirm",

      "MissSessions",
      "MissSessionsRationale",

      "ReasonConfOtherComments",

      "MonitoringConditions",
      "AbsenceMonitoringDetails",

      "RequestApproved",
      "RequestRejectionDetails",

      "letterofconfirmationforauthorise",
      "Reasonforrequestingaletter",

      "Created",
      "Modified",

      "Attachments",

      "Student/Id",
      "Student/Title",
      "Student/EMail",

      "Signatory/Id",
      "Signatory/Title",
      "Signatory/EMail",

      "Administrator/Id",
      "Administrator/Title",
      "Administrator/EMail",

      "Author/Id",
      "Author/Title",
      "Author/EMail",

      "Editor/Id",
      "Editor/Title",
      "Editor/EMail"
    ];
  }


  /* =====================================================
     COMMON EXPAND
     ===================================================== */

  private getExpandFields():
    string[] {

    return [
      "Student",
      "Signatory",
      "Administrator",
      "Author",
      "Editor"
    ];
  }


  /* =====================================================
     GET DASHBOARD
     ===================================================== */

  public async getDashboard(
    role: UserRole,
    userId: number
  ): Promise<IRequest[]> {

    /*
     * STUDENT
     *
     * Student only sees requests where
     * the Student person field points
     * to the logged-in user.
     */

    if (
      role === "Student"
    ) {

      const studentItems =
        await this.requestList.items
          .select(
            ...this.getSelectFields()
          )
          .expand(
            ...this.getExpandFields()
          )
          .filter(
            "StudentId eq " +
            userId
          )
          .orderBy(
            "Modified",
            false
          )();


      return studentItems as
        unknown as IRequest[];
    }


    /*
     * APPROVER
     *
     * Signatory only sees requests
     * assigned through the Signatory
     * person field.
     */

    if (
      role === "Approver"
    ) {

      const approverItems =
        await this.requestList.items
          .select(
            ...this.getSelectFields()
          )
          .expand(
            ...this.getExpandFields()
          )
          .filter(
            "SignatoryId eq " +
            userId
          )
          .orderBy(
            "Modified",
            false
          )();


      return approverItems as
        unknown as IRequest[];
    }


    /*
     * ADMIN
     *
     * Admin sees all requests.
     */

    const adminItems =
      await this.requestList.items
        .select(
          ...this.getSelectFields()
        )
        .expand(
          ...this.getExpandFields()
        )
        .orderBy(
          "Modified",
          false
        )();


    return adminItems as
      unknown as IRequest[];
  }


  /* =====================================================
     GET REQUEST
     ===================================================== */

  public async get(
    id: number
  ): Promise<IRequest> {

    const item =
      await this.requestList.items
        .getById(id)
        .select(
          ...this.getSelectFields()
        )
        .expand(
          ...this.getExpandFields()
        )();


    const attachments =
      await this.requestList.items
        .getById(id)
        .attachmentFiles
        .select(
          "FileName",
          "ServerRelativeUrl"
        )();


    const request =
      item as unknown as IRequest;


    /*
     * Create a new object rather than
     * mutating the returned SharePoint
     * item.
     */

    return {
      ...request,

      AttachmentFiles:
        attachments as
          unknown as
          IAttachmentInfo[]
    };
  }


  /* =====================================================
     CREATE PAYLOAD
     ===================================================== */

  private buildPayload(
    request: IRequest
  ): Record<string, unknown> {

    const payload:
      Record<string, unknown> = {

        Title:
          request.Title ||
          "",

        Stage:
          request.Stage ||
          "Student",

        Status:
          request.Status ||
          "Draft",

        LevelOfStudy:
          request.LevelOfStudy ||
          null,

        DoB:
          request.DoB ||
          null,

        Programme:
          request.Programme ||
          null,

        VisaType:
          request.VisaType ||
          null,

        VisaOtherComments:
          request.VisaOtherComments ||
          null,

        VisaStartDate:
          request.VisaStartDate ||
          null,

        VisaEndDate:
          request.VisaEndDate ||
          null,

        VisaAttachment:
          request.VisaAttachment ||
          null,

        PassportAttachment:
          request.PassportAttachment ||
          null,

        AbsenceStartDate:
          request.AbsenceStartDate ||
          null,

        AbsenceEndDate:
          request.AbsenceEndDate ||
          null,

        AbsenceReasons:
          request.AbsenceReasons ||
          [],

        ReasonOtherComments:
          request.ReasonOtherComments ||
          null,

        ConferenceAttachment:
          request.ConferenceAttachment ||
          null,

        FamilyIllnessDetails:
          request.FamilyIllnessDetails ||
          null,

        FamilyIllnessAttachment:
          request.FamilyIllnessAttachment ||
          null,

        HolidayUGAttachment:
          request.HolidayUGAttachment ||
          null,

        HolidayUGOtherAttachment:
          request.HolidayUGOtherAttachment ||
          null,

        OtherAttachment:
          request.OtherAttachment ||
          null,

        MedicalAttachment:
          request.MedicalAttachment ||
          null,

        MedicalEvidenceDetails:
          request.MedicalEvidenceDetails ||
          null,

        Returning:
          request.Returning ||
          null,

        ReasonsNotReturning:
          request.ReasonsNotReturning ||
          null,

        TravelOutside:
          request.TravelOutside ||
          null,

        TravelOutsideDetails:
          request.TravelOutsideDetails ||
          null,

        AbsenceReasonsConfirm:
          request.AbsenceReasonsConfirm ||
          [],

        MissSessions:
          request.MissSessions ||
          null,

        MissSessionsRationale:
          request.MissSessionsRationale ||
          null,

        ReasonConfOtherComments:
          request.ReasonConfOtherComments ||
          null,

        MonitoringConditions:
          request.MonitoringConditions ||
          [],

        AbsenceMonitoringDetails:
          request.AbsenceMonitoringDetails ||
          null,

        RequestApproved:
          request.RequestApproved ||
          null,

        RequestRejectionDetails:
          request.RequestRejectionDetails ||
          null,

        letterofconfirmationforauthorise:
          request
            .letterofconfirmationforauthorise ||
          null,

        Reasonforrequestingaletter:
          request
            .Reasonforrequestingaletter ||
          null
      };


    /*
     * SharePoint Person fields must use
     * <InternalName>Id.
     */

    if (
      request.StudentId
    ) {

      payload.StudentId =
        request.StudentId;
    }


    if (
      request.SignatoryId
    ) {

      payload.SignatoryId =
        request.SignatoryId;
    }


    if (
      request.AdministratorId
    ) {

      payload.AdministratorId =
        request.AdministratorId;
    }


    return payload;
  }


  /* =====================================================
     CREATE REQUEST
     ===================================================== */

  private async create(
    request: IRequest
  ): Promise<number> {

    const payload =
      this.buildPayload(
        request
      );


    const result =
      await this.requestList.items
        .add(
          payload
        );


    const addedItem =
      result as
        unknown as
        IListItemAddResult;


    if (
      !addedItem.Id
    ) {

      throw new Error(
        "SharePoint created the request but did not return an item ID."
      );
    }


    return addedItem.Id;
  }


  /* =====================================================
     UPDATE REQUEST
     ===================================================== */

  private async update(
    id: number,
    request: IRequest
  ): Promise<void> {

    const payload =
      this.buildPayload(
        request
      );


    await this.requestList.items
      .getById(id)
      .update(
        payload
      );
  }


  /* =====================================================
     SAVE DRAFT
     ===================================================== */

  public async saveDraft(
    request: IRequest,
    files: File[],
    deletedFiles: string[]
  ): Promise<number> {

    /*
     * Immutable request object.
     */

    const draftRequest:
      IRequest = {

        ...request,

        Stage:
          request.Stage ||
          "Student",

        Status:
          "Draft"
      };


    let itemId:
      number;


    if (
      draftRequest.Id
    ) {

      itemId =
        draftRequest.Id;


      await this.update(
        itemId,
        draftRequest
      );

    } else {

      itemId =
        await this.create(
          draftRequest
        );
    }


    await this.processAttachments(
      itemId,
      files,
      deletedFiles
    );


    return itemId;
  }




  /* =====================================================
     ADMIN SAVE - PRESERVE WORKFLOW STATUS
     ===================================================== */

  public async adminSave(
    request: IRequest,
    files: File[],
    deletedFiles: string[]
  ): Promise<number> {

    let itemId: number;

    if (request.Id) {
      itemId = request.Id;
      await this.update(itemId, request);
    } else {
      itemId = await this.create(request);
    }

    await this.processAttachments(itemId, files, deletedFiles);
    return itemId;
  }

  /* =====================================================
     SUBMIT REQUEST
     ===================================================== */

  public async submit(
    request: IRequest,
    files: File[],
    deletedFiles: string[]
  ): Promise<number> {

    /*
     * When submitted, the request moves
     * from the Student stage into the
     * Signatory approval stage.
     *
     * IMPORTANT:
     * SignatoryId must already have been
     * assigned, or must be resolved by
     * your programme/signatory mapping.
     */

    const submittedRequest:
      IRequest = {

        ...request,

        Stage:
          "Signatory",

        Status:
          "Pending Approval",

        RequestApproved:
          undefined,

        RequestRejectionDetails:
          undefined
      };


    let itemId:
      number;


    if (
      submittedRequest.Id
    ) {

      itemId =
        submittedRequest.Id;


      await this.update(
        itemId,
        submittedRequest
      );

    } else {

      itemId =
        await this.create(
          submittedRequest
        );
    }


    await this.processAttachments(
      itemId,
      files,
      deletedFiles
    );


    return itemId;
  }


  /* =====================================================
     ATTACHMENTS
     ===================================================== */

  private async processAttachments(
    itemId: number,
    files: File[],
    deletedFiles: string[]
  ): Promise<void> {

    const item =
      this.requestList.items
        .getById(
          itemId
        );


    /*
     * DELETE ATTACHMENTS
     */

    for (
      let i = 0;
      i < deletedFiles.length;
      i++
    ) {

      const fileName =
        deletedFiles[i];


      if (!fileName) {
        continue;
      }


      try {

        await item
          .attachmentFiles
          .getByName(
            fileName
          )
          .delete();

      } catch (err) {

        console.error(
          "Unable to delete attachment: " +
          fileName,
          err
        );


        throw new Error(
          "Unable to delete attachment '" +
          fileName +
          "'."
        );
      }
    }


    /*
     * ADD ATTACHMENTS
     */

    for (
      let i = 0;
      i < files.length;
      i++
    ) {

      const file =
        files[i];


      if (!file) {
        continue;
      }


      this.validateAttachment(
        file
      );


      try {

        /*
         * PnPjs accepts Blob/File as the
         * attachment content.
         */

        await item
          .attachmentFiles
          .add(
            file.name,
            file
          );

      } catch (err) {

        console.error(
          "Unable to upload attachment: " +
          file.name,
          err
        );


        throw new Error(
          "Unable to upload attachment '" +
          file.name +
          "'."
        );
      }
    }
  }


  /* =====================================================
     VALIDATE ATTACHMENT
     ===================================================== */

  private validateAttachment(
    file: File
  ): void {

    /*
     * File size
     */

    const maxSizeBytes =
      AppConfig.maxAttachmentSizeMb *
      1024 *
      1024;


    if (
      file.size >
      maxSizeBytes
    ) {

      throw new Error(
        "The file '" +
        file.name +
        "' exceeds the maximum file size of " +
        AppConfig.maxAttachmentSizeMb +
        " MB."
      );
    }


    /*
     * Extension
     */

    const fileName =
      file.name.toLowerCase();


    const lastDot =
      fileName.lastIndexOf(".");


    let extension =
      "";


    if (
      lastDot !== -1
    ) {

      extension =
        fileName.substring(
          lastDot
        );
    }


    const allowedExtensions =
      AppConfig.allowedExtensions ||
      [];


    if (
      allowedExtensions.indexOf(
        extension
      ) === -1
    ) {

      throw new Error(
        "The file type '" +
        extension +
        "' is not allowed."
      );
    }
  }


  /* =====================================================
     MARK UNDER REVIEW
     ===================================================== */

  public async markUnderReview(
    id: number
  ): Promise<void> {

    await this.requestList.items
      .getById(id)
      .update({

        Stage:
          "Signatory",

        Status:
          "Under Review"
      });
  }


  /* =====================================================
     APPROVE REQUEST
     ===================================================== */

  public async approve(
    request: IRequest,
    _comments: string
  ): Promise<void> {

    if (
      !request.Id
    ) {

      throw new Error(
        "Request ID is required to approve the request."
      );
    }


    const itemId =
      request.Id;


    /*
     * Approved requests move to the
     * completed stage.
     *
     * RequestApproved is the existing
     * SharePoint Choice column.
     */

    await this.requestList.items
      .getById(
        itemId
      )
      .update({

        Stage:
          "Completed",

        Status:
          "Approved",

        RequestApproved:
          "Yes",

        /* Clear any previous rejection reason when approved. */

        RequestRejectionDetails:
          null
      });
  }


  /* =====================================================
     REJECT REQUEST
     ===================================================== */

  public async reject(
    request: IRequest,
    comments: string
  ): Promise<void> {

    if (
      !request.Id
    ) {

      throw new Error(
        "Request ID is required to reject the request."
      );
    }


    const rejectionReason =
      comments.trim();


    if (
      !rejectionReason
    ) {

      throw new Error(
        "A rejection reason is required."
      );
    }


    const itemId =
      request.Id;


    await this.requestList.items
      .getById(
        itemId
      )
      .update({

        Stage:
          "Completed",

        Status:
          "Rejected",

        RequestApproved:
          "No",

        RequestRejectionDetails:
          rejectionReason
      });
  }


  /* =====================================================
     SAVE REVIEW FOR LATER
     ===================================================== */

  public async saveReview(
    request: IRequest,
    _comments: string
  ): Promise<void> {

    if (
      !request.Id
    ) {

      throw new Error(
        "Request ID is required."
      );
    }


    const itemId =
      request.Id;


    await this.requestList.items
      .getById(
        itemId
      )
      .update({

        Stage:
          "Signatory",

        Status:
          "Under Review"
      });
  }


  /* =====================================================
     ASSIGN SIGNATORY
     ===================================================== */

  public async assignSignatory(
    requestId: number,
    signatoryId: number
  ): Promise<void> {

    if (
      !requestId
    ) {

      throw new Error(
        "Request ID is required."
      );
    }


    if (
      !signatoryId
    ) {

      throw new Error(
        "Signatory is required."
      );
    }


    await this.requestList.items
      .getById(
        requestId
      )
      .update({

        SignatoryId:
          signatoryId,

        Stage:
          "Signatory",

        Status:
          "Pending Approval"
      });
  }


  /* =====================================================
     ASSIGN ADMINISTRATOR
     ===================================================== */

  public async assignAdministrator(
    requestId: number,
    administratorId: number
  ): Promise<void> {

    if (
      !requestId
    ) {

      throw new Error(
        "Request ID is required."
      );
    }


    if (
      !administratorId
    ) {

      throw new Error(
        "Administrator is required."
      );
    }


    await this.requestList.items
      .getById(
        requestId
      )
      .update({

        AdministratorId:
          administratorId
      });
  }


  /* =====================================================
     RECYCLE DRAFT
     ===================================================== */

  public async recycle(
    id: number
  ): Promise<void> {

    if (!id) {

      throw new Error(
        "Request ID is required."
      );
    }


    await this.requestList.items
      .getById(id)
      .recycle();
  }
}