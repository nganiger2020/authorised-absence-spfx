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


export interface IAdminTermOption {
  label: string;
  termGuid: string;
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


export class RequestService {

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
      "Admin",

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

      "Student",
      "Signatory",
      "Author",
      "Editor"
    ];
  }


  /* =====================================================
     NORMALISE
     ===================================================== */

  private normalizeTaxonomyValue(
    value: unknown
  ): { label: string; termGuid: string } {

    if (value === undefined || value === null) {
      return { label: "", termGuid: "" };
    }

    if (typeof value === "object") {
      const taxonomyValue = value as {
        Label?: unknown;
        TermGuid?: unknown;
        WssId?: unknown;
      };

      const label =
        taxonomyValue.Label !== undefined &&
        taxonomyValue.Label !== null
          ? String(taxonomyValue.Label).trim()
          : "";

      const termGuid =
        taxonomyValue.TermGuid !== undefined &&
        taxonomyValue.TermGuid !== null
          ? String(taxonomyValue.TermGuid).trim()
          : "";

      return { label, termGuid };
    }

    let raw = String(value).trim();

    if (!raw) {
      return { label: "", termGuid: "" };
    }

    const hashIndex = raw.indexOf(";#");
    if (hashIndex >= 0) {
      raw = raw.substring(hashIndex + 2);
    }

    const pipeIndex = raw.lastIndexOf("|");
    if (pipeIndex >= 0) {
      return {
        label: raw.substring(0, pipeIndex).trim(),
        termGuid: raw.substring(pipeIndex + 1).trim()
      };
    }

    return { label: raw, termGuid: "" };
  }


  private normalizeRequest(
    request: IRequest
  ):
  IRequest {

    const rawRequest =
      request as IRequest & { Admin?: unknown };

    const adminValue =
      this.normalizeTaxonomyValue(rawRequest.Admin);

    return {

      ...request,

      AdminLabel:
        adminValue.label ||
        request.AdminLabel || "",

      AdminTermGuid:
        adminValue.termGuid ||
        request.AdminTermGuid || "",

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


  private async resolveAdminLabels(
    requests: IRequest[]
  ): Promise<IRequest[]> {

    const needsResolution = requests.some(
      (request: IRequest): boolean => {
        const label = (request.AdminLabel || "").trim();
        return !!request.AdminTermGuid &&
          (!label || /^\d+$/.test(label));
      }
    );

    if (!needsResolution) {
      return requests;
    }

    let options: IAdminTermOption[] = [];

    try {
      options = await this.getAdminTerms();
    } catch (error) {
      console.error(
        "Unable to resolve Admin managed metadata labels.",
        error
      );
      return requests;
    }

    const labelsByGuid: { [key: string]: string } = {};

    options.forEach((option: IAdminTermOption): void => {
      if (option.termGuid) {
        labelsByGuid[option.termGuid.toLowerCase()] = option.label || "";
      }
    });

    return requests.map((request: IRequest): IRequest => {
      const guid = (request.AdminTermGuid || "").trim().toLowerCase();
      const resolvedLabel = guid ? labelsByGuid[guid] : "";

      if (!resolvedLabel) {
        return request;
      }

      return {
        ...request,
        AdminLabel: resolvedLabel
      };
    });
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

    const requests =
      await this.resolveAdminLabels(
        normalizedRequests
      );

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
     *  - requests where Admin managed-metadata label
     *    equals their email address.
     *
     * Admin is a taxonomy field, not a Person field.
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

        const isManagedMetadataAdmin =
          !!currentEmail &&
          this.normalizeEmail(
            request.AdminLabel
          ) === currentEmail;

        return (
          isOwner ||
          isSignatory ||
          isManagedMetadataAdmin
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

    const resolved =
      await this.resolveAdminLabels([
        normalized
      ]);

    return resolved[0];
  }


  /* =====================================================
     ADMIN MANAGED METADATA
     ===================================================== */

  public async getAdminTerms():
  Promise<IAdminTermOption[]> {

    const field =
      await this.requestList.fields
        .getByInternalNameOrTitle(
          "Admin"
        )();

    const fieldInfo =
      field as unknown as {
        TermSetId?: string;
        TypeAsString?: string;
      };

    if (
      fieldInfo.TypeAsString &&
      fieldInfo.TypeAsString !==
        "TaxonomyFieldType"
    ) {
      throw new Error(
        "Admin is not a single-value Managed Metadata field."
      );
    }

    const termSetId =
      fieldInfo.TermSetId || "";

    if (!termSetId) {
      throw new Error(
        "The Admin managed metadata field does not have a Term Set configured."
      );
    }

    const endpoint =
      this.context.pageContext.web.absoluteUrl +
      "/_api/v2.1/termStore/sets/" +
      termSetId +
      "/terms?$select=id,labels";

    const response =
      await this.context.spHttpClient.get(
        endpoint,
        SPHttpClient.configurations.v1,
        {
          headers: {
            Accept: "application/json"
          }
        }
      );

    if (!response.ok) {
      throw new Error(
        "Unable to load Admin managed metadata terms."
      );
    }

    const data =
      await response.json() as {
        value?: Array<{
          id?: string;
          labels?: Array<{
            name?: string;
            isDefault?: boolean;
          }>;
        }>;
      };

    const values =
      data.value || [];

    const options:
      IAdminTermOption[] = [];

    for (
      let i = 0;
      i < values.length;
      i++
    ) {

      const labels =
        values[i].labels || [];

      let label = "";

      for (
        let j = 0;
        j < labels.length;
        j++
      ) {

        if (
          labels[j].isDefault === true &&
          labels[j].name
        ) {
          label =
            labels[j].name || "";
          break;
        }
      }

      if (
        !label &&
        labels.length > 0
      ) {
        label =
          labels[0].name || "";
      }

      if (
        label &&
        values[i].id
      ) {
        options.push({
          label: label,
          termGuid:
            values[i].id || ""
        });
      }
    }

    options.sort(
      (
        first,
        second
      ) =>
        first.label.localeCompare(
          second.label
        )
    );

    return options;
  }


  private async saveAdminTaxonomy(
    itemId: number,
    request: IRequest
  ): Promise<void> {

    if (
      !request.AdminLabel ||
      !request.AdminTermGuid
    ) {
      return;
    }

    await this.requestList
      .items
      .getById(
        itemId
      )
      .validateUpdateListItem([
        {
          FieldName: "Admin",
          FieldValue:
            request.AdminLabel +
            "|" +
            request.AdminTermGuid
        }
      ]);
  }


  /* =====================================================
     PAYLOAD
     ===================================================== */

  private buildPayload(
    request: IRequest
  ):
  Record<string, unknown> {

    return {

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


    await this.saveAdminTaxonomy(
      result.Id,
      request
    );


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


    await this.saveAdminTaxonomy(
      request.Id,
      request
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

  public async submit(
    request: IRequest,
    files: File[],
    deletedFiles: string[]
  ):
  Promise<IRequest> {

    if (
      !request.StudentId
    ) {

      throw new Error(
        "A student must be selected before submitting."
      );
    }


    if (
      !request.Title ||
      !request.Title.trim()
    ) {

      throw new Error(
        "Student ID is required."
      );
    }


    const submitted:
      IRequest = {

        ...request,

        Stage:
          "Approval",

        Status:
          "Pending Approval"
      };


    let id =
      submitted.Id;


    if (
      id
    ) {

      await this.update(
        submitted
      );

    } else {

      id =
        await this.create(
          submitted
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
     ASSIGN SIGNATORY
     ===================================================== */

  public async assignSignatory(
    requestId: number,
    signatoryId: number
  ):
  Promise<void> {

    this.validateRequestId(
      requestId
    );


    if (
      !signatoryId
    ) {

      throw new Error(
        "An authorised signatory is required."
      );
    }


    await this.requestList
      .items
      .getById(
        requestId
      )
      .update({

        SignatoryId:
          signatoryId
      });
  }


  /* =====================================================
     ASSIGN ADMINISTRATOR
     ===================================================== */

  public async assignAdministrator(
    requestId: number,
    adminLabel: string,
    adminTermGuid: string
  ): Promise<void> {

    this.validateRequestId(requestId);

    const label =
      adminLabel ? adminLabel.trim() : "";

    const termGuid =
      adminTermGuid ? adminTermGuid.trim() : "";

    if (!label || !termGuid) {
      throw new Error(
        "An administrator managed-metadata term is required."
      );
    }

    await this.requestList
      .items
      .getById(requestId)
      .validateUpdateListItem([
        {
          FieldName: "Admin",
          FieldValue: label + "|" + termGuid
        }
      ]);
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
      value === "under review"
    );
  }


  private normalizeEmail(
    value?: string
  ): string {

    return (value || "")
      .trim()
      .toLowerCase();
  }


  private async ensureCanReview(
    requestId: number
  ): Promise<void> {

    this.validateRequestId(requestId);

    const currentUser =
      await this.currentUser();

    const role =
      await this.resolveRole();

    const item =
      await this.requestList
        .items
        .getById(requestId)
        .select(
          "Id",
          "Status",
          "Admin",
          "SignatoryId",
          "Signatory/Id",
          "Signatory/EMail"
        )
        .expand(
          "Signatory"
        )();

    const normalizedRequest =
      this.normalizeRequest(
        item as unknown as IRequest
      );

    const resolvedRequests =
      await this.resolveAdminLabels([
        normalizedRequest
      ]);

    const request =
      resolvedRequests[0];

    if (!this.isReviewableStatus(request.Status)) {
      throw new Error(
        "This request cannot be reviewed in its current status."
      );
    }

    if (role === "Admin") {
      return;
    }

    const currentEmail =
      this.normalizeEmail(currentUser.Email);

    const signatoryEmail =
      this.normalizeEmail(
        request.Signatory &&
        request.Signatory.EMail
          ? request.Signatory.EMail
          : ""
      );

    const administratorEmail =
      this.normalizeEmail(
        request.AdminLabel
      );

    const isSignatory =
      request.SignatoryId === currentUser.Id ||
      (!!currentEmail &&
        currentEmail === signatoryEmail);

    const isAdministrator =
      !!currentEmail &&
      currentEmail === administratorEmail;

    if (isSignatory || isAdministrator) {
      return;
    }

    throw new Error(
      "You are not authorised to review this request."
    );
  }

  /* =====================================================
     REVIEW
     ===================================================== */

  public async markUnderReview(
    requestId: number
  ):
  Promise<void> {

    this.validateRequestId(
      requestId
    );

    await this.ensureCanReview(requestId);

    await this.requestList
      .items
      .getById(
        requestId
      )
      .update({

        Stage:
          "Signatory",

        Status:
          "Under Review"
      });
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

    await this.ensureCanReview(request.Id);

    const payload:
      Record<string, unknown> = {

        Stage:
          request.Stage ||
          "Signatory",

        Status:
          request.Status ||
          "Under Review"
      };

    if (
      request.SignatoryId
    ) {

      payload.SignatoryId =
        request.SignatoryId;
    }


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

    await this.ensureCanReview(requestId);

    const payload:
      Record<string, unknown> = {

        Stage:
          "Signatory",

        Status:
          "Under Review"
      };

    if (
      signatoryId
    ) {

      payload.SignatoryId =
        signatoryId;
    }

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


    await this.ensureCanReview(requestId);
    await this.requestList
      .items
      .getById(
        requestId
      )
      .update({

        Stage:
          "Completed",

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


    await this.ensureCanReview(requestId);
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

        Stage:
          "Completed",

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