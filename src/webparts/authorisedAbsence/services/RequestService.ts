import { requiresEvidence, isAllowedEvidenceName } from "../models/Evidence";
import { canAssignSignatory, canDecideRequest, canOpenWorkflow, workflowStatus } from "../models/Workflow";
import { SPFI } from "@pnp/sp";
import { WebPartContext } from "@microsoft/sp-webpart-base";
import {
  SPHttpClient,
  SPHttpClientResponse
} from "@microsoft/sp-http";
import "@pnp/sp/webs";
import "@pnp/sp/lists";
import "@pnp/sp/items";
import "@pnp/sp/fields";
import "@pnp/sp/attachments";
import "@pnp/sp/site-users/web";
import "@pnp/sp/site-groups/web";
import {
  IAttachmentInfo,
  ICurrentUser,
  IGroupInfo,
  IRequest,
  IUserOption,
  UserRole
} from "../models/Models";
import { AppConfig } from "../config/AppConfig";
export interface IAdminOption {
  label: string;
  id: number;
  title?: string;
  email?: string;
}
interface IPeoplePickerEntity {
  Key?: string;
  DisplayText?: string;
  Description?: string;
  EntityType?: string;
  EntityData?: {
    Email?: string;
    AccountName?: string;
    PrincipalType?: string;
    SPUserID?: string;
  };
}
interface IPeoplePickerResponse {
  value?: string;
  d?: {
    ClientPeoplePickerSearchUser?: string;
  };
}
export interface IRequestHistoryEntry {
  action: string;
  actor: string;
  actorEmail: string;
  date: string;
  details: string;
}
export class RequestService {
  public async getRequestHistory(requestId: number): Promise<IRequestHistoryEntry[]> {
    this.validateRequestId(requestId);
    const item = await this.requestList.items.getById(requestId).select("WorkflowHistory")();
    if (!item.WorkflowHistory) { return []; }
    const entries: unknown = JSON.parse(item.WorkflowHistory);
    if (!Array.isArray(entries)) { throw new Error("The request history is invalid."); }
    return entries as IRequestHistoryEntry[];
  }
  private async historyPayload(requestId: number, action: string, details: string = ""): Promise<string> {
    const [history, user] = await Promise.all([this.getRequestHistory(requestId), this.currentUser()]);
    return JSON.stringify(history.concat([{
      action, actor: user.Title, actorEmail: user.Email,
      date: new Date().toISOString(), details
    }]));
  }
  private readonly sp: SPFI;
  private readonly context: WebPartContext;
  public constructor(
    sp: SPFI,
    context: WebPartContext
  ) {
    this.sp = sp;
    this.context = context;
  }
  /* =====================================================
     LIST
     ===================================================== */
  private get requestList() {
    return this.sp.web.lists.getByTitle(
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
      Id:
        user.Id,
      Title:
        user.Title || "",
      Email:
        user.Email || "",
      LoginName:
        user.LoginName || ""
    };
  }
  /* =====================================================
     ROLE
     ===================================================== */
  public async resolveRole():
  Promise<UserRole> {
    const groups =
      await this.sp.web.currentUser
        .groups
        .select(
          "Id",
          "Title"
        )();
    const currentGroups =
      groups as IGroupInfo[];
    const adminGroup =
      (
        AppConfig.adminGroupName ||
        ""
      )
        .trim()
        .toLowerCase();
    const approverGroup =
      (
        AppConfig.approverGroupName ||
        ""
      )
        .trim()
        .toLowerCase();
    let isAdmin =
      false;
    let isApprover =
      false;
    for (
      let i = 0;
      i < currentGroups.length;
      i++
    ) {
      const title =
        (
          currentGroups[i].Title ||
          ""
        )
          .trim()
          .toLowerCase();
      if (
        title === adminGroup
      ) {
        isAdmin = true;
      }
      if (
        title === approverGroup
      ) {
        isApprover = true;
      }
    }
    if (
      isAdmin
    ) {
      return "Admin";
    }
    if (
      isApprover
    ) {
      return "Approver";
    }
    return "Student";
  }
  /* =====================================================
     PEOPLE DIRECTORY SEARCH
     Searches SharePoint's server-side People Picker
     instead of siteUsers.
     This can resolve users from the tenant directory
     who are not yet present in the site's User
     Information List.
     ===================================================== */
  public async getSiteUsers():
  Promise<IUserOption[]> {
    const users =
      await this.sp.web.siteUsers
        .select(
          "Id",
          "Title",
          "Email",
          "LoginName"
        )();
    return users
      .filter(user => !!user.Id && !!user.Title)
      .map(user => ({
        Id: user.Id,
        Title: user.Title || "",
        Email: user.Email || "",
        LoginName: user.LoginName || ""
      }));
  }
  /* =====================================================
     DIRECTORY USER SEARCH
     ===================================================== */
  public async searchUsers(
    searchText: string
  ):
  Promise<IUserOption[]> {
    const query =
      searchText
        ? searchText.trim()
        : "";
    if (
      query.length < 2
    ) {
      return [];
    }
    const webUrl =
      this.context.pageContext.web.absoluteUrl;
    const endpoint =
      webUrl +
      "/_api/SP.UI.ApplicationPages.ClientPeoplePickerWebServiceInterface.clientPeoplePickerSearchUser";
    /*
     * PrincipalType values:
     *
     * User              = 1
     * DistributionList  = 2
     * SecurityGroup     = 4
     * SharePointGroup   = 8
     *
     * We only want individual users.
     */
    const queryParams = {
      AllowEmailAddresses:
        true,
      AllowMultipleEntities:
        false,
      AllUrlZones:
        false,
      MaximumEntitySuggestions:
        15,
      PrincipalSource:
        15,
      PrincipalType:
        1,
      QueryString:
        query,
      SharePointGroupID:
        0
    };
    const body =
      JSON.stringify({
        queryParams:
          queryParams
      });
    let response:
      SPHttpClientResponse;
    try {
      response =
        await this.context.spHttpClient.post(
          endpoint,
          SPHttpClient.configurations.v1,
          {
            headers: {
              "Accept":
                "application/json;odata=verbose",
              "Content-Type":
                "application/json;odata=verbose"
            },
            body:
              body
          }
        );
    } catch (error) {
      console.error(
        "People Picker HTTP request failed.",
        error
      );
      throw new Error(
        "Unable to search the SharePoint people directory."
      );
    }
    if (
      !response.ok
    ) {
      const responseText =
        await response.text();
      console.error(
        "People Picker search failed.",
        response.status,
        response.statusText,
        responseText
      );
      throw new Error(
        "People search failed with HTTP status " +
        response.status +
        "."
      );
    }
    const json =
      await response.json() as
        IPeoplePickerResponse;
    const encodedResults =
      json.value ||
      (
        json.d
          ? json.d.ClientPeoplePickerSearchUser
          : undefined
      );
    if (
      !encodedResults
    ) {
      return [];
    }
    let entities:
      IPeoplePickerEntity[] = [];
    try {
      entities =
        JSON.parse(
          encodedResults
        ) as IPeoplePickerEntity[];
    } catch (error) {
      console.error(
        "Unable to parse People Picker results.",
        error,
        encodedResults
      );
      return [];
    }
    const users:
      IUserOption[] = [];
    const seen:
      Record<string, boolean> = {};
    for (
      let i = 0;
      i < entities.length;
      i++
    ) {
      const entity =
        entities[i];
      if (
        entity.EntityType &&
        entity.EntityType.toLowerCase() !==
        "user"
      ) {
        continue;
      }
      const loginName =
        (
          entity.Key ||
          (
            entity.EntityData
              ? entity.EntityData.AccountName
              : ""
          ) ||
          ""
        ).trim();
      const title =
        (
          entity.DisplayText ||
          entity.Description ||
          ""
        ).trim();
      const email =
        (
          entity.EntityData &&
          entity.EntityData.Email
            ? entity.EntityData.Email
            : ""
        ).trim();
      if (
        !loginName
      ) {
        continue;
      }
      const uniqueKey =
        loginName.toLowerCase();
      if (
        seen[uniqueKey]
      ) {
        continue;
      }
      seen[uniqueKey] =
        true;
      /*
       * A directory search result may not yet
       * have a valid SharePoint user ID.
       * Id = 0 is intentional here.
       *
       * ensureUser() is called after selection
       * to obtain the actual SharePoint ID.
       */
      users.push({
        Id:
          0,
        Title:
          title ||
          email ||
          loginName,
        Email:
          email,
        LoginName:
          loginName
      });
    }
    return users;
  }
  /* =====================================================
     ENSURE USER
     Converts a directory result into an actual
     SharePoint user and gives us the ID needed
     by Person fields.
     ===================================================== */
  public async ensureUser(
    loginName: string
  ):
  Promise<IUserOption> {
    const value =
      loginName
        ? loginName.trim()
        : "";
    if (
      !value
    ) {
      throw new Error(
        "A login name is required."
      );
    }
    try {
      /*
       * PnPjs v4 returns ISiteUserInfo directly.
       */
      const user =
        await this.sp.web.ensureUser(
          value
        );
      return {
        Id:
          user.Id,
        Title:
          user.Title || value,
        Email:
          user.Email || "",
        LoginName:
          user.LoginName || value
      };
    } catch (error) {
      console.error(
        "Unable to ensure SharePoint user.",
        error
      );
      throw new Error(
        this.getErrorMessage(
          error,
          "Unable to resolve the selected user."
        )
      );
    }
  }
  /* =====================================================
     SELECT
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
      "AdminId",
      "Admin/Id",
      "Admin/Title",
      "Admin/Email",
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
      "StudentId",
      "Student/Id",
      "Student/Title",
      "Student/EMail",
      "SignatoryId",
      "Signatory/Id",
      "Signatory/Title",
      "Signatory/EMail",
      "AuthorId",
      "Author/Id",
      "Author/Title",
      "Author/EMail",
      "EditorId",
      "Editor/Id",
      "Editor/Title",
      "Editor/EMail"
    ];
  }
  private getExpandFields():
  string[] {
    return [
      "Admin",
      "Student",
      "Signatory",
      "Author",
      "Editor"
    ];
  }
  /* =====================================================
     NORMALISE
     ===================================================== */
  private normalizeRequest(
    request: IRequest
  ):
  IRequest {
    return {
      ...request,
      AdminId: request.AdminId || (request.Admin && request.Admin.Id) || undefined,
      AdminLabel: request.Admin ? (request.Admin.Email || "").trim() : request.AdminLabel || "",
      AdminTitle: request.Admin ? request.Admin.Title || "" : request.AdminTitle || "",
      Title:
        request.Title || "",
      Stage:
        request.Stage || "Student",
      Status:
        request.Status || "Draft",
      AbsenceReasons:
        request.AbsenceReasons
          ? request.AbsenceReasons.slice()
          : [],
      AbsenceReasonsConfirm:
        request.AbsenceReasonsConfirm
          ? request.AbsenceReasonsConfirm.slice()
          : [],
      MonitoringConditions:
        request.MonitoringConditions
          ? request.MonitoringConditions.slice()
          : [],
      AttachmentFiles:
        request.AttachmentFiles
          ? request.AttachmentFiles.slice()
          : []
    };
  }
  private normalizeRequests(
    requests: IRequest[]
  ):
  IRequest[] {
    const result:
      IRequest[] = [];
    for (
      let i = 0;
      i < requests.length;
      i++
    ) {
      result.push(
        this.normalizeRequest(
          requests[i]
        )
      );
    }
    return result;
  }
  /* =====================================================
     DASHBOARD
     ===================================================== */
  public async getDashboard(
    role: UserRole,
    userId: number
  ): Promise<IRequest[]> {
    if (!userId) {
      throw new Error(
        "Current SharePoint user ID is required."
      );
    }
    const currentUser = await this.currentUser();
    const currentEmail = this.normalizeEmail(
      currentUser.Email
    );
    const items =
      await this.requestList
        .items
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
    const normalizedRequests =
      this.normalizeRequests(
        items as unknown as IRequest[]
      );
    const requests = normalizedRequests;
    /*
     * Application Admin sees every request.
     */
    if (role === "Admin") {
      return requests;
    }
    /*
     * Every other authenticated user sees:
     *  - requests they raised;
     *  - requests where they are Signatory;
     *  - requests where Admin lookup email
     *    equals their email address.
     *
     * Admin is a lookup to the Admins list.
     */
    return requests.filter(
      (request: IRequest): boolean => {
        const isOwner =
          request.StudentId === userId ||
          (!!request.Student &&
            request.Student.Id === userId);
        const isSignatory =
          request.SignatoryId === userId ||
          this.normalizeEmail(
            request.Signatory &&
            request.Signatory.EMail
              ? request.Signatory.EMail
              : ""
          ) === currentEmail;
        const isAssignedAdmin =
          !!currentEmail &&
          this.normalizeEmail(
            request.AdminLabel
          ) === currentEmail;
        return (
          isOwner ||
          isSignatory ||
          isAssignedAdmin
        );
      }
    );
  }
  /* =====================================================
     GET REQUEST
     ===================================================== */
  public async get(
    id: number
  ):
  Promise<IRequest> {
    this.validateRequestId(
      id
    );
    const item =
      await this.requestList
        .items
        .getById(
          id
        )
        .select(
          ...this.getSelectFields()
        )
        .expand(
          ...this.getExpandFields()
        )();
    const attachments =
      await this.requestList
        .items
        .getById(
          id
        )
        .attachmentFiles
        .select(
          "FileName",
          "ServerRelativeUrl"
        )();
    const normalized =
      this.normalizeRequest({
        ...(
          item as unknown as IRequest
        ),
        AttachmentFiles:
          attachments as unknown as
            IAttachmentInfo[]
      });
    return normalized;
  }
  /* =====================================================
     ABSENCE REASONS CHOICES
     ===================================================== */
  public async getAbsenceReasonsChoices():
  Promise<string[]> {
    try {
      const field =
        await this.requestList.fields
          .getByInternalNameOrTitle(
            "AbsenceReasons"
          )();
      const fieldInfo =
        field as unknown as {
          Choices?: string[];
          TypeAsString?: string;
        };
      if (
        fieldInfo.TypeAsString &&
        fieldInfo.TypeAsString !== "MultiChoice" &&
        fieldInfo.TypeAsString !== "Choice"
      ) {
        throw new Error(
          "AbsenceReasons must be a SharePoint Choice or MultiChoice field."
        );
      }
      return fieldInfo.Choices
        ? fieldInfo.Choices.slice()
        : [];
    } catch (error) {
      console.error(
        "Unable to load AbsenceReasons choices.",
        error
      );
      throw error;
    }
  }
  /* =====================================================
     ABSENCE REASONS CONFIRM CHOICES
     ===================================================== */
  public async getAbsenceReasonsConfirmChoices():
  Promise<string[]> {
    try {
      const field =
        await this.requestList.fields
          .getByInternalNameOrTitle(
            "AbsenceReasonsConfirm"
          )();
      const fieldInfo =
        field as unknown as {
          Choices?: string[];
          TypeAsString?: string;
        };
      if (
        fieldInfo.TypeAsString &&
        fieldInfo.TypeAsString !== "MultiChoice" &&
        fieldInfo.TypeAsString !== "Choice"
      ) {
        throw new Error(
          "AbsenceReasonsConfirm must be a SharePoint Choice or MultiChoice field."
        );
      }
      return fieldInfo.Choices
        ? fieldInfo.Choices.slice()
        : [];
    } catch (error) {
      console.error(
        "Unable to load AbsenceReasonsConfirm choices.",
        error
      );
      throw error;
    }
  }
  /* =====================================================
     ADMIN LOOKUP
     ===================================================== */
  public async getAdmins(): Promise<IAdminOption[]> {
    const rows: Array<{ Id: number; Title?: string; Email?: string }> = [];
    let next: string | undefined = this.context.pageContext.web.absoluteUrl +
      "/_api/web/lists/getByTitle('" + encodeURIComponent(AppConfig.adminsListTitle.replace(/'/g, "''")) +
      "')/items?$select=Id,Title,Email&$orderby=Title&$top=5000";
    while (next) {
      const response = await this.context.spHttpClient.get(next, SPHttpClient.configurations.v1,
        { headers: { Accept: "application/json;odata=nometadata" } });
      if (!response.ok) { throw new Error("Unable to load the Admins list. Check list access and the Title and Email columns."); }
      const data = await response.json() as {
        value?: Array<{ Id: number; Title?: string; Email?: string }>;
        "@odata.nextLink"?: string;
        "odata.nextLink"?: string;
      };
      rows.push(...(data.value || []));
      next = data["@odata.nextLink"] || data["odata.nextLink"];
    }
    return rows.filter(row => (row.Email || "").trim()).map(row => ({
      id: row.Id, label: (row.Email || "").trim(), title: (row.Title || "").trim(), email: (row.Email || "").trim()
    }));
  }
  private async validateAdminSelection(request: IRequest): Promise<void> {
    if (request.AdminId === undefined || request.AdminId === null || request.AdminId === 0) { return; }
    if (!Number.isInteger(request.AdminId) || request.AdminId <= 0) { throw new Error("Select a valid Admin."); }
    const admin = await this.sp.web.lists.getByTitle(AppConfig.adminsListTitle).items.getById(request.AdminId)
      .select("Id", "Title", "Email")();
    if (!(admin.Email || "").trim()) { throw new Error("The selected Admin must have an Email in the Admins list."); }
    request.AdminLabel = admin.Email.trim();
    request.AdminTitle = admin.Title || "";
  }
  /* =====================================================
     PAYLOAD
     ===================================================== */
  private buildPayload(
    request: IRequest
  ):
  Record<string, unknown> {
    return {
      ...(request.AdminId !== undefined ? { AdminId: request.AdminId || null, SelectedAdmin: request.AdminId ? (request.AdminLabel || "").trim() : "" } : {}),
      SelectedReason: (request.AbsenceReasons || []).join(", "),
      Title:
        this.valueOrEmpty(
          request.Title
        ),
      Stage:
        request.Stage ||
        "Student",
      Status:
        request.Status ||
        "Draft",
      StudentId:
        request.StudentId ||
        null,
      LevelOfStudy:
        this.nullIfEmpty(
          request.LevelOfStudy
        ),
      DoB:
        this.nullIfEmpty(
          request.DoB
        ),
      Programme:
        this.nullIfEmpty(
          request.Programme
        ),
      VisaType:
        this.nullIfEmpty(
          request.VisaType
        ),
      VisaOtherComments:
        this.nullIfEmpty(
          request.VisaOtherComments
        ),
      VisaStartDate:
        this.nullIfEmpty(
          request.VisaStartDate
        ),
      VisaEndDate:
        this.nullIfEmpty(
          request.VisaEndDate
        ),
      VisaAttachment:
        this.nullIfEmpty(
          request.VisaAttachment
        ),
      PassportAttachment:
        this.nullIfEmpty(
          request.PassportAttachment
        ),
      AbsenceStartDate:
        this.nullIfEmpty(
          request.AbsenceStartDate
        ),
      AbsenceEndDate:
        this.nullIfEmpty(
          request.AbsenceEndDate
        ),
      AbsenceReasons:
        request.AbsenceReasons
          ? request.AbsenceReasons.slice()
          : [],
      ReasonOtherComments:
        this.nullIfEmpty(
          request.ReasonOtherComments
        ),
      ConferenceAttachment:
        this.nullIfEmpty(
          request.ConferenceAttachment
        ),
      FamilyIllnessDetails:
        this.nullIfEmpty(
          request.FamilyIllnessDetails
        ),
      FamilyIllnessAttachment:
        this.nullIfEmpty(
          request.FamilyIllnessAttachment
        ),
      HolidayUGAttachment:
        this.nullIfEmpty(
          request.HolidayUGAttachment
        ),
      HolidayUGOtherAttachment:
        this.nullIfEmpty(
          request.HolidayUGOtherAttachment
        ),
      OtherAttachment:
        this.nullIfEmpty(
          request.OtherAttachment
        ),
      MedicalAttachment:
        this.nullIfEmpty(
          request.MedicalAttachment
        ),
      MedicalEvidenceDetails:
        this.nullIfEmpty(
          request.MedicalEvidenceDetails
        ),
      Returning:
        this.nullIfEmpty(
          request.Returning
        ),
      ReasonsNotReturning:
        this.nullIfEmpty(
          request.ReasonsNotReturning
        ),
      TravelOutside:
        this.nullIfEmpty(
          request.TravelOutside
        ),
      TravelOutsideDetails:
        this.nullIfEmpty(
          request.TravelOutsideDetails
        ),
      SignatoryId:
        request.SignatoryId ||
        null,
      AbsenceReasonsConfirm:
        request.AbsenceReasonsConfirm
          ? request.AbsenceReasonsConfirm.slice()
          : [],
      MissSessions:
        this.nullIfEmpty(
          request.MissSessions
        ),
      MissSessionsRationale:
        this.nullIfEmpty(
          request.MissSessionsRationale
        ),
      ReasonConfOtherComments:
        this.nullIfEmpty(
          request.ReasonConfOtherComments
        ),
      MonitoringConditions:
        request.MonitoringConditions
          ? request.MonitoringConditions.slice()
          : [],
      AbsenceMonitoringDetails:
        this.nullIfEmpty(
          request.AbsenceMonitoringDetails
        ),
      RequestApproved:
        this.nullIfEmpty(
          request.RequestApproved
        ),
      RequestRejectionDetails:
        this.nullIfEmpty(
          request.RequestRejectionDetails
        ),
      letterofconfirmationforauthorise:
        this.nullIfEmpty(
          request
            .letterofconfirmationforauthorise
        ),
      Reasonforrequestingaletter:
        this.nullIfEmpty(
          request
            .Reasonforrequestingaletter
        )
    };
  }
  /* =====================================================
     CREATE
     ===================================================== */
  public async create(
    request: IRequest
  ):
  Promise<number> {
    // Always resolve the email from the selected Admins lookup item before writing.
    await this.validateAdminSelection(request);
    const result =
      await this.requestList
        .items
        .add(
          this.buildPayload(
            request
          )
        );
    if (
      !result.Id
    ) {
      throw new Error(
        "SharePoint did not return the new request ID."
      );
    }

    return result.Id;
  }
  /* =====================================================
     UPDATE
     ===================================================== */
  public async update(
    request: IRequest
  ):
  Promise<void> {
    if (
      !request.Id
    ) {
      throw new Error(
        "Request ID is required."
      );
    }
    await this.validateAdminSelection(request);
    await this.requestList
      .items
      .getById(
        request.Id
      )
      .update(
        this.buildPayload(
          request
        )
      );

  }
  /* =====================================================
     ATTACHMENTS
     ===================================================== */
  private validateAttachment(
    file: File
  ):
  void {
    if (
      !file ||
      !file.name
    ) {
      throw new Error(
        "Invalid attachment."
      );
    }
    if (
      file.size <= 0
    ) {
      throw new Error(
        "The file '" +
        file.name +
        "' is empty."
      );
    }
    const maxSize =
      AppConfig.maxAttachmentSizeMb *
      1024 *
      1024;
    if (
      file.size >
      maxSize
    ) {
      throw new Error(
        "The file '" +
        file.name +
        "' exceeds " +
        AppConfig.maxAttachmentSizeMb +
        " MB."
      );
    }
    const lowerName =
      file.name.toLowerCase();
    const dot =
      lowerName.lastIndexOf(".");
    const extension =
      dot >= 0
        ? lowerName.substring(dot)
        : "";
    if (
      AppConfig.allowedExtensions.indexOf(
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
  private fileToArrayBuffer(
    file: File
  ):
  Promise<ArrayBuffer> {
    return new Promise<ArrayBuffer>(
      (
        resolve,
        reject
      ) => {
        const reader =
          new FileReader();
        reader.onload =
          (): void => {
            if (
              reader.result instanceof
              ArrayBuffer
            ) {
              resolve(
                reader.result
              );
              return;
            }
            reject(
              new Error(
                "Unable to read '" +
                file.name +
                "'."
              )
            );
          };
        reader.onerror =
          (): void => {
            reject(
              new Error(
                "Unable to read '" +
                file.name +
                "'."
              )
            );
          };
        reader.readAsArrayBuffer(
          file
        );
      }
    );
  }
  private async processAttachments(
    itemId: number,
    files: File[],
    deletedFiles: string[]
  ):
  Promise<void> {
    const item =
      this.requestList
        .items
        .getById(
          itemId
        );
    const deletes =
      deletedFiles || [];
    for (
      let i = 0;
      i < deletes.length;
      i++
    ) {
      const fileName =
        deletes[i];
      if (
        !fileName
      ) {
        continue;
      }
      await item
        .attachmentFiles
        .getByName(
          fileName
        )
        .delete();
    }
    const uploads =
      files || [];
    for (
      let i = 0;
      i < uploads.length;
      i++
    ) {
      const file =
        uploads[i];
      this.validateAttachment(
        file
      );
      const content =
        await this.fileToArrayBuffer(
          file
        );
      await item
        .attachmentFiles
        .add(
          file.name,
          content
        );
    }
  }
  /* =====================================================
     SAVE DRAFT
     ===================================================== */
  public async saveDraft(
    request: IRequest,
    files: File[],
    deletedFiles: string[]
  ):
  Promise<IRequest> {
    await this.validateAdminSelection(request);
    (files || []).forEach(file => this.validateAttachment(file));
    const draft:
      IRequest = {
        ...request,
        Stage:
          request.Stage ||
          "Student",
        Status:
          "Draft"
      };
    let id =
      draft.Id;
    if (
      id
    ) {
      await this.update(
        draft
      );
    } else {
      id =
        await this.create(
          draft
        );
    }
    await this.processAttachments(
      id,
      files || [],
      deletedFiles || []
    );
    return this.get(
      id
    );
  }
  /* =====================================================
     GENERAL / ADMIN SAVE
     ===================================================== */
  public async save(
    request: IRequest,
    files: File[],
    deletedFiles: string[]
  ):
  Promise<IRequest> {
    await this.validateAdminSelection(request);
    (files || []).forEach(file => this.validateAttachment(file));
    let id =
      request.Id;
    if (
      id
    ) {
      await this.update(
        request
      );
    } else {
      id =
        await this.create(
          request
        );
    }
    await this.processAttachments(
      id,
      files || [],
      deletedFiles || []
    );
    return this.get(
      id
    );
  }
  /* =====================================================
     ADMIN SAVE
     ===================================================== */
  public async adminSave(
    request: IRequest,
    files: File[],
    deletedFiles: string[]
  ):
  Promise<IRequest> {
    return this.save(
      request,
      files || [],
      deletedFiles || []
    );
  }
  /* =====================================================
     SUBMIT
     ===================================================== */
  public async submit(request: IRequest, files: File[], deletedFiles: string[]): Promise<IRequest> {
    await this.validateAdminSelection(request);
    if (!request.StudentId || !request.Title.trim()) { throw new Error("Student and Student ID are required."); }
    if (!(request.AdminLabel || "").trim() || !request.AdminId) {
      throw new Error("Select an Administrator before submitting.");
    }
    (files || []).forEach(file => this.validateAttachment(file));
    let existingAttachments = request.AttachmentFiles || [];
    if (request.Id) {
      const current = await this.get(request.Id);
      existingAttachments = current.AttachmentFiles || [];
      if ((current.Status || "").toLowerCase() !== "draft") { throw new Error("Only a draft can be submitted by the student."); }
    }
    const retainedEvidence = existingAttachments.filter(file =>
      (deletedFiles || []).indexOf(file.FileName) < 0 && isAllowedEvidenceName(file.FileName));
    if (requiresEvidence(request.AbsenceReasons) && retainedEvidence.length + (files || []).length === 0) {
      throw new Error("Supporting evidence is required for medical, family illness, bereavement and conference absence.");
    }
    const submitted: IRequest = { ...request, Stage: "Student", Status: "Draft", SignatoryId: undefined, Signatory: undefined,
      AbsenceReasonsConfirm: [], ReasonConfOtherComments: "" };
    let id = submitted.Id;
    if (id) { await this.update(submitted); } else { id = await this.create(submitted); }
    await this.processAttachments(id, files || [], deletedFiles || []);
    await this.requestList.items.getById(id).update({ WorkflowHistory: await this.historyPayload(id, "Request submitted"), Stage: "Administrator", Status: "Under Review with Administrator", SignatoryId: null,
      RequestApproved: null, RequestRejectionDetails: null });
    return this.get(id);
  }
  /* =====================================================
     ASSIGN SIGNATORY
     ===================================================== */
  public async assignSignatory(requestId: number, signatoryId: number): Promise<void> {
    await this.ensureCanAssign(requestId);
    if (!signatoryId) { throw new Error("Select an Authorised Signatory."); }
    await this.requestList.items.getById(requestId).update({ SignatoryId: signatoryId });
  }
  public async submitSignatoryAssignment(requestId: number, signatoryId: number, absenceReasonsConfirm: string[], reasonConfOtherComments: string): Promise<IRequest> {
    await this.ensureCanAssign(requestId);
    if (!signatoryId) { throw new Error("Select an Authorised Signatory."); }
    if (!absenceReasonsConfirm || absenceReasonsConfirm.length === 0) { throw new Error("Select at least one Reason for Absence."); }
    if (absenceReasonsConfirm.indexOf("Other") >= 0 && !reasonConfOtherComments.trim()) { throw new Error("Enter details for the Other reason."); }
    const signatory = await this.sp.web.siteUsers.getById(signatoryId)();
    if (!(signatory.Email || "").trim()) { throw new Error("The selected Signatory must have an email address."); }
    await this.requestList.items.getById(requestId).update({ WorkflowHistory: await this.historyPayload(requestId, "Signatory assigned", "Assigned to " + (signatory.Title || signatory.Email)), SignatoryId: signatoryId, Stage: "Signatory", Status: "Under Review with Signatory",
      SelectedReason: absenceReasonsConfirm.join(", "),
      AbsenceReasonsConfirm: absenceReasonsConfirm.slice(),
      ReasonConfOtherComments: absenceReasonsConfirm.indexOf("Other") >= 0 ? this.nullIfEmpty(reasonConfOtherComments) : null });
    return this.get(requestId);
  }
  /* =====================================================
     ASSIGN ADMINISTRATOR
     ===================================================== */
  public async assignAdministrator(requestId: number, adminLabel: string, adminId: number): Promise<void> {
    await this.ensureCanAssign(requestId);
    if (!adminId) { throw new Error("Select an Admin."); }
    const selection = { AdminId: adminId, AdminLabel: adminLabel } as IRequest;
    await this.validateAdminSelection(selection);
    await this.requestList.items.getById(requestId).update({ AdminId: adminId, SelectedAdmin: selection.AdminLabel });
  }
  private isReviewableStatus(
    status?: string
  ): boolean {
    const value =
      (status || "")
        .trim()
        .toLowerCase();
    return (
      value === "submitted" ||
      value === "pending approval" ||
      value === "under review" ||
      value === "under review with administrator" ||
      value === "under review with signatory"
    );
  }
  private normalizeEmail(
    value?: string
  ): string {
    return (value || "")
      .trim()
      .toLowerCase();
  }
  private async ensureCanReview(requestId: number): Promise<void> {
    this.validateRequestId(requestId);
    const [request, user, role] = await Promise.all([this.get(requestId), this.currentUser(), this.resolveRole()]);
    if (!this.isReviewableStatus(request.Status) || !canOpenWorkflow(request, role, user.Email, user.Id)) {
      throw new Error("You are not authorised to act on this request at its current stage.");
    }
  }
  private async ensureCanAssign(requestId: number): Promise<void> {
    this.validateRequestId(requestId);
    const [request, user, role] = await Promise.all([this.get(requestId), this.currentUser(), this.resolveRole()]);
    if (!this.isReviewableStatus(request.Status) || !canAssignSignatory(request, role, user.Email)) {
      throw new Error("Only the Administrator can assign a signatory during the Administrator stage.");
    }
  }
  private async ensureCanDecide(requestId: number): Promise<void> {
    this.validateRequestId(requestId);
    const [request, user] = await Promise.all([this.get(requestId), this.currentUser()]);
    if (!this.isReviewableStatus(request.Status) || !canDecideRequest(request, user.Email, user.Id)) {
      throw new Error("Only the assigned Authorised Signatory can make the final decision.");
    }
  }
  /* =====================================================
     REVIEW
     ===================================================== */
  public async markUnderReview(requestId: number): Promise<void> {
    await this.ensureCanReview(requestId);
    await this.requestList.items.getById(requestId).update({ Status: workflowStatus(await this.get(requestId)) });
  }
  public async saveReview(
    request: IRequest,
    comments: string
  ):
  Promise<void> {
    if (
      !request.Id
    ) {
      throw new Error(
        "Request ID is required to save the review."
      );
    }
    this.validateRequestId(
      request.Id
    );
    await this.ensureCanDecide(request.Id);
    const payload:
      Record<string, unknown> = {
        Stage:
          "Signatory",
        Status:
          "Under Review with Signatory",
        SelectedReason: (request.AbsenceReasonsConfirm || []).join(", "),
        AbsenceReasonsConfirm:
          request.AbsenceReasonsConfirm
            ? request.AbsenceReasonsConfirm.slice()
            : [],
        ReasonConfOtherComments:
          this.nullIfEmpty(
            request.ReasonConfOtherComments
          )
      };
    /*
     * There is no dedicated review-comments field
     * in the current IRequest / SharePoint mapping.
     * Do not write temporary review comments into
     * RequestRejectionDetails.
     */
    if (
      comments &&
      comments.trim()
    ) {
      console.info(
        "Review comments supplied but no dedicated review comments field is configured."
      );
    }
    await this.requestList
      .items
      .getById(
        request.Id
      )
      .update(
        payload
      );
  }
  public async saveReviewForLater(
    requestId: number,
    signatoryId?: number
  ):
  Promise<void> {
    this.validateRequestId(
      requestId
    );
    await this.ensureCanDecide(requestId);
    if (signatoryId) {
      const current = await this.get(requestId);
      if (signatoryId !== current.SignatoryId) { throw new Error("The Signatory cannot be changed during final review."); }
    }
    const payload:
      Record<string, unknown> = {
        Stage:
          "Signatory",
        Status:
          "Under Review with Signatory"
      };
    await this.requestList
      .items
      .getById(
        requestId
      )
      .update(
        payload
      );
  }
  public async approve(
    request: IRequest | number,
    comments?: string
  ):
  Promise<void> {
    const requestId =
      typeof request === "number"
        ? request
        : request.Id;
    if (
      !requestId
    ) {
      throw new Error(
        "Request ID is required to approve the request."
      );
    }
    this.validateRequestId(
      requestId
    );
    await this.ensureCanDecide(requestId);
    await this.requestList
      .items
      .getById(
        requestId
      )
      .update({
        WorkflowHistory: await this.historyPayload(requestId, "Request approved", (comments || "").trim()),
        Stage:
          "Approved",
        Status:
          "Approved",
        RequestApproved:
          "Yes",
        RequestRejectionDetails:
          null
      });
    if (
      comments &&
      comments.trim()
    ) {
      console.info(
        "Approval comments supplied but no dedicated approval comments field is configured."
      );
    }
  }
  public async reject(
    request: IRequest | number,
    comments: string
  ):
  Promise<void> {
    const requestId =
      typeof request === "number"
        ? request
        : request.Id;
    if (
      !requestId
    ) {
      throw new Error(
        "Request ID is required to reject the request."
      );
    }
    this.validateRequestId(
      requestId
    );
    await this.ensureCanDecide(requestId);
    const reason =
      comments
        ? comments.trim()
        : "";
    if (
      !reason
    ) {
      throw new Error(
        "A rejection reason is required."
      );
    }
    await this.requestList
      .items
      .getById(
        requestId
      )
      .update({
        WorkflowHistory: await this.historyPayload(requestId, "Request rejected", reason),
        Stage:
          "Rejected",
        Status:
          "Rejected",
        RequestApproved:
          "No",
        RequestRejectionDetails:
          reason
      });
  }
  /* =====================================================
     DELETE / RECYCLE
     ===================================================== */
  public async recycle(
    requestId: number
  ):
  Promise<void> {
    this.validateRequestId(
      requestId
    );
    await this.requestList
      .items
      .getById(
        requestId
      )
      .recycle();
  }
  public async deleteRequest(
    requestId: number
  ):
  Promise<void> {
    this.validateRequestId(
      requestId
    );
    await this.requestList
      .items
      .getById(
        requestId
      )
      .delete();
  }
  /* =====================================================
     HELPERS
     ===================================================== */
  private validateRequestId(
    id: number
  ):
  void {
    if (
      !id ||
      id <= 0
    ) {
      throw new Error(
        "A valid request ID is required."
      );
    }
  }
  private nullIfEmpty(
    value?: string
  ):
  string | null {
    if (
      value === undefined ||
      value === null
    ) {
      return null;
    }
    const trimmed =
      value.trim();
    return trimmed
      ? trimmed
      : null;
  }
  private valueOrEmpty(
    value?: string
  ):
  string {
    return value
      ? value.trim()
      : "";
  }
  private getErrorMessage(
    error: unknown,
    fallback: string
  ):
  string {
    if (
      error instanceof Error &&
      error.message
    ) {
      return error.message;
    }
    return fallback;
  }
}

