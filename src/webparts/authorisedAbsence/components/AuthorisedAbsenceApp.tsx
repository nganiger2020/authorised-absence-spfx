import * as React from "react";

import {
  IRequest,
  UserRole,
  IUserOption,
  AppView,
  emptyRequest
} from "../models/Models";

import {
  RequestService
} from "../services/RequestService";

import {
  Dashboard
} from "./dashboards/Dashboard";

import {
  StudentRequestForm
} from "./forms/StudentRequestForm";

import {
  ReviewForm
} from "./review/ReviewForm";

import {
  IAdminTermOption
} from "../controls/AdminManagedMetadata";


/* =========================================================
   PROPS
   ========================================================= */

interface Props {
  service: RequestService;
}


/* =========================================================
   COMPONENT
   ========================================================= */

export const AuthorisedAbsenceApp:
React.FC<Props> = (props) => {

  const [role, setRole] =
    React.useState<UserRole>("Student");

  const [view, setView] =
    React.useState<AppView>("dashboard");

  const [items, setItems] =
    React.useState<IRequest[]>([]);

  const [selected, setSelected] =
    React.useState<IRequest | undefined>(
      undefined
    );

  const [userId, setUserId] =
    React.useState<number>(0);

  const [userName, setUserName] =
    React.useState<string>("");

  const [userEmail, setUserEmail] =
    React.useState<string>("");

  const [loading, setLoading] =
    React.useState<boolean>(true);

  const [error, setError] =
    React.useState<string>("");

  const [userOptions, setUserOptions] =
    React.useState<IUserOption[]>([]);

  const [adminOptions, setAdminOptions] =
    React.useState<IAdminTermOption[]>([]);

  const [adminOptionsLoading, setAdminOptionsLoading] =
    React.useState<boolean>(false);


  /* =====================================================
     ERROR MESSAGE
     ===================================================== */

  const getErrorMessage = (
    err: unknown,
    fallback: string
  ): string => {

    if (
      err instanceof Error &&
      err.message
    ) {
      return err.message;
    }

    return fallback;
  };


  /* =====================================================
     LOAD APPLICATION
     ===================================================== */

  const load =
    async (): Promise<void> => {

      try {

        setLoading(true);
        setError("");

        const user =
          await props.service.currentUser();

        const resolvedRole =
          await props.service.resolveRole();

        const dashboardItems =
          await props.service.getDashboard(
            resolvedRole,
            user.Id
          );

        if (resolvedRole === "Admin") {
          const availableUsers = await props.service.getSiteUsers();
          setUserOptions(availableUsers);
        }

        /*
         * Load Admin managed metadata options separately.
         * A taxonomy loading failure must not stop the
         * Authorised Absence application from loading.
         */

        setAdminOptionsLoading(true);

        try {

          const availableAdminTerms =
            await props.service.getAdminTerms();

          setAdminOptions(
            availableAdminTerms
          );

        } catch (adminTermsError) {

          console.error(
            "Unable to load Admin managed metadata options.",
            adminTermsError
          );

          setAdminOptions([]);

        } finally {

          setAdminOptionsLoading(false);
        }

        setUserId(
          user.Id
        );

        setUserName(
          user.Title
        );

        setUserEmail(
          user.Email || ""
        );

        setRole(
          resolvedRole
        );

        setItems(
          dashboardItems
        );

      } catch (err) {

        console.error(
          "Failed to load Authorised Absence application.",
          err
        );

        setError(
          getErrorMessage(
            err,
            "Unable to load the Authorised Absence application."
          )
        );

      } finally {

        setLoading(false);
      }
    };


  /* =====================================================
     INITIAL LOAD
     ===================================================== */

  React.useEffect(
    () => {

      load().catch(
        (err: unknown) => {

          console.error(
            "Application initialisation failed.",
            err
          );
        }
      );

    },
    []
  );


  /* =====================================================
     REFRESH DASHBOARD
     ===================================================== */

  const refreshDashboard =
    async (): Promise<void> => {

      const dashboardItems =
        await props.service.getDashboard(
          role,
          userId
        );

      setItems(
        dashboardItems
      );
    };


  /* =====================================================
     RETURN TO DASHBOARD
     ===================================================== */

  const backToDashboard =
    async (): Promise<void> => {

      try {

        setLoading(true);
        setError("");

        const dashboardItems =
          await props.service.getDashboard(
            role,
            userId
          );

        setItems(
          dashboardItems
        );

        setSelected(
          undefined
        );

        setView(
          "dashboard"
        );

      } catch (err) {

        console.error(
          "Failed to refresh dashboard.",
          err
        );

        setError(
          getErrorMessage(
            err,
            "Unable to refresh the dashboard."
          )
        );

      } finally {

        setLoading(false);
      }
    };


  /* =====================================================
     NEW REQUEST
     ===================================================== */

  const newRequest =
    (): void => {

      /*
       * Create a new object rather than
       * modifying the object returned by
       * emptyRequest().
       */

      const request:
        IRequest = {
          ...emptyRequest(),
          StudentId: undefined
        };

      setSelected(
        request
      );

      setError("");

      setView(
        "studentForm"
      );
    };


  /* =====================================================
     OPEN REQUEST
     ===================================================== */

  const openRequest =
    async (
      request: IRequest
    ): Promise<void> => {

      if (!request.Id) {
        return;
      }

      const requestId =
        request.Id;

      try {

        setLoading(true);
        setError("");

        const fullRequest =
          await props.service.get(
            requestId
          );

        setSelected(
          fullRequest
        );


        /*
         * Students can edit their
         * own Draft requests.
         */

        const status =
          (fullRequest.Status || "")
            .trim()
            .toLowerCase();

        const isOwner =
          fullRequest.StudentId === userId ||
          (!!fullRequest.Student &&
            fullRequest.Student.Id === userId);

        if (
          role === "Admin" ||
          (status === "draft" && isOwner)
        ) {

          setView(
            "studentForm"
          );

        } else {

          setView(
            "view"
          );
        }

      } catch (err) {

        console.error(
          "Failed to open request.",
          err
        );

        setError(
          getErrorMessage(
            err,
            "Unable to open the request."
          )
        );

      } finally {

        setLoading(false);
      }
    };


  /* =====================================================
     REVIEW ACCESS

     Admin users can review/reassign requests.

     For non-admin users, the logged-in email must
     match the assigned Signatory email.
     ===================================================== */

  const canReviewRequest = (
    request: IRequest
  ): boolean => {

    const status =
      (request.Status || "")
        .trim()
        .toLowerCase();

    const reviewable =
      status === "submitted" ||
      status === "pending approval" ||
      status === "under review";

    if (!reviewable) {
      return false;
    }

    if (role === "Admin") {
      return true;
    }

    const loggedInEmail =
      (userEmail || "")
        .trim()
        .toLowerCase();

    if (!loggedInEmail) {
      return false;
    }

    const signatoryEmail =
      (
        request.Signatory &&
        request.Signatory.EMail
          ? request.Signatory.EMail
          : ""
      )
        .trim()
        .toLowerCase();

    /*
     * Admin is a single-value Managed Metadata field.
     * The taxonomy term label contains the administrator
     * email address.
     */
    const administratorEmail =
      (request.AdminLabel || "")
        .trim()
        .toLowerCase();

    return (
      loggedInEmail === signatoryEmail ||
      loggedInEmail === administratorEmail
    );
  };

  /* =====================================================
     REVIEW REQUEST
     ===================================================== */

  const reviewRequest =
    async (
      request: IRequest
    ): Promise<void> => {

      if (!request.Id) {
        return;
      }

      const requestId =
        request.Id;

      try {

        setLoading(true);
        setError("");

        const fullRequest =
          await props.service.get(
            requestId
          );


        /*
         * SECURITY / WORKFLOW CHECK:
         *
         * Do not change the request to
         * "Under Review" unless the current
         * user is allowed to review it.
         */

        if (
          !canReviewRequest(
            fullRequest
          )
        ) {

          setError(
            "You are not authorised to review this request."
          );

          return;
        }


        /*
         * Create a new object instead of
         * changing fullRequest after an
         * awaited operation.
         */

        let requestForReview:
          IRequest = {
            ...fullRequest
          };


        if (
          fullRequest.Status === "Submitted" ||
          fullRequest.Status === "Pending Approval"
        ) {

          await props.service
            .markUnderReview(
              requestId
            );


          requestForReview = {
            ...fullRequest,
            Status: "Under Review",
            Stage: "Signatory"
          };
        }


        setSelected(
          requestForReview
        );

        setView(
          "review"
        );

      } catch (err) {

        console.error(
          "Failed to open review.",
          err
        );

        setError(
          getErrorMessage(
            err,
            "Unable to open the request for review."
          )
        );

      } finally {

        setLoading(false);
      }
    };


  /* =====================================================
     SAVE DRAFT
     ===================================================== */

  const saveDraft =
    async (
      request: IRequest,
      files: File[],
      deleted: string[]
    ): Promise<void> => {

      try {

        setError("");


        /*
         * IMPORTANT:
         *
         * Do not do:
         *
         * request.StudentId = userId;
         *
         * or:
         *
         * request.Id = id;
         *
         * Create a new immutable object
         * instead.
         */

        const requestToSave:
          IRequest = {
            ...request,

            StudentId:
              request.StudentId
          };


        if (role === "Admin") {
          await props.service.adminSave(
            requestToSave,
            files,
            deleted
          );
        } else {
          await props.service.saveDraft(
            requestToSave,
            files,
            deleted
          );
        }


        /*
         * We do not need to assign the
         * returned ID to request.Id.
         *
         * The dashboard is reloaded from
         * SharePoint immediately.
         */

        await backToDashboard();

      } catch (err) {

        console.error(
          "Failed to save draft.",
          err
        );

        const message =
          getErrorMessage(
            err,
            "Unable to save the draft."
          );

        setError(
          message
        );

        throw err;
      }
    };


  /* =====================================================
     SUBMIT REQUEST
     ===================================================== */

  const submitRequest =
    async (
      request: IRequest,
      files: File[],
      deleted: string[]
    ): Promise<void> => {

      try {

        setError("");


        /*
         * Immutable request object.
         *
         * This avoids the ESLint
         * require-atomic-updates warning.
         */

        const requestToSubmit:
          IRequest = {
            ...request,

            StudentId:
              request.StudentId
          };


        await props.service.submit(
          requestToSubmit,
          files,
          deleted
        );


        /*
         * No:
         *
         * request.Id = id;
         *
         * is required.
         */

        await backToDashboard();

      } catch (err) {

        console.error(
          "Failed to submit request.",
          err
        );

        const message =
          getErrorMessage(
            err,
            "Unable to submit the request."
          );

        setError(
          message
        );

        throw err;
      }
    };


  /* =====================================================
     APPROVE REQUEST
     ===================================================== */

  const approve =
    async (
      comments: string
    ): Promise<void> => {

      if (!selected) {
        return;
      }


      /*
       * Capture the current request
       * before any awaited operation.
       */

      const requestToApprove:
        IRequest = {
          ...selected
        };


      try {

        setError("");

        await props.service.approve(
          requestToApprove,
          comments
        );

        await backToDashboard();

      } catch (err) {

        console.error(
          "Approval failed.",
          err
        );

        setError(
          getErrorMessage(
            err,
            "Unable to approve the request."
          )
        );
      }
    };


  /* =====================================================
     REJECT REQUEST
     ===================================================== */

  const reject =
    async (
      comments: string
    ): Promise<void> => {

      if (!selected) {
        return;
      }


      const requestToReject:
        IRequest = {
          ...selected
        };


      try {

        setError("");

        await props.service.reject(
          requestToReject,
          comments
        );

        await backToDashboard();

      } catch (err) {

        console.error(
          "Rejection failed.",
          err
        );

        setError(
          getErrorMessage(
            err,
            "Unable to reject the request."
          )
        );
      }
    };


  const saveReviewForLater = async (comments: string): Promise<void> => {
    if (!selected) { return; }
    try {
      setError("");
      await props.service.saveReview({ ...selected }, comments);
      await backToDashboard();
    } catch (err) {
      setError(getErrorMessage(err, "Unable to save the review."));
      throw err;
    }
  };

  const assignSignatory = async (signatoryId: number): Promise<void> => {
    if (!selected || !selected.Id || role !== "Admin") { return; }
    await props.service.assignSignatory(selected.Id, signatoryId);
    const updated = await props.service.get(selected.Id);
    setSelected(updated);
  };

  const changeAdministrator = async (
    label?: string,
    termGuid?: string
  ): Promise<void> => {

    if (!selected || !selected.Id || role !== "Admin") {
      return;
    }

    const adminLabel = label ? label.trim() : "";
    const adminTermGuid = termGuid ? termGuid.trim() : "";

    if (!adminLabel || !adminTermGuid) {
      return;
    }

    await props.service.assignAdministrator(
      selected.Id,
      adminLabel,
      adminTermGuid
    );

    const updated =
      await props.service.get(selected.Id);

    setSelected(updated);
  };


  /* =====================================================
     DELETE DRAFT
     ===================================================== */

  const deleteRequest =
    async (
      request: IRequest
    ): Promise<void> => {

      if (!request.Id) {
        return;
      }


      const requestStatus =
        (request.Status || "")
          .trim()
          .toLowerCase();

      const isOwner =
        request.StudentId === userId ||
        (!!request.Student &&
          request.Student.Id === userId);

      if (
        role !== "Admin" &&
        (requestStatus !== "draft" || !isOwner)
      ) {
        return;
      }


      const requestId =
        request.Id;


      const confirmed =
        window.confirm(
          role === "Admin"
            ? "Are you sure you want to delete this request? It will be moved to the SharePoint recycle bin."
            : "Are you sure you want to delete this draft request?"
        );


      if (!confirmed) {
        return;
      }


      try {

        setLoading(true);
        setError("");

        await props.service.recycle(
          requestId
        );

        await refreshDashboard();

      } catch (err) {

        console.error(
          "Failed to delete draft.",
          err
        );

        setError(
          getErrorMessage(
            err,
            "Unable to delete the draft."
          )
        );

      } finally {

        setLoading(false);
      }
    };


  /* =====================================================
     ROLE DISPLAY
     ===================================================== */

  const roleLabel =
    (): string => {

      if (
        role === "Admin"
      ) {
        return "Administrator";
      }


      if (
        role === "Approver"
      ) {
        return "Authorised Signatory";
      }


      return "Student";
    };


  /* =====================================================
     DATE DISPLAY
     ===================================================== */

  const displayDate = (
    value?: string
  ): string => {

    if (!value) {
      return "-";
    }

    return value.substring(
      0,
      10
    );
  };


  /* =====================================================
     READ-ONLY VIEW
     ===================================================== */

  const renderReadOnlyView =
    (): React.ReactNode => {

      if (!selected) {
        return null;
      }


      const attachments =
        selected.AttachmentFiles ||
        [];


      return (

        <div className="review">

          <div className="aaHeader">

            <div>

              <h1>
                Request AA-
                {selected.Id}
              </h1>

              <p className="pageIntro">
                View the details of this
                authorised absence request.
              </p>

            </div>


            <button
              type="button"
              className="secondaryButton"
              onClick={
                () => {

                  backToDashboard()
                    .catch(
                      (err: unknown) => {

                        console.error(
                          "Unable to return to dashboard.",
                          err
                        );
                      }
                    );
                }
              }
            >
              Back to Dashboard
            </button>

          </div>


          {/* =============================================
              REQUEST STATUS
             ============================================= */}

          <div className="reviewSection">

            <h3>
              Request Status
            </h3>


            <div className="reviewRow">

              <div className="reviewKey">
                Request ID
              </div>

              <div className="reviewValue">
                AA-{selected.Id}
              </div>

            </div>


            <div className="reviewRow">

              <div className="reviewKey">
                Status
              </div>

              <div className="reviewValue">

                <span className="pill">
                  {
                    selected.Status ||
                    "Draft"
                  }
                </span>

              </div>

            </div>

          </div>


          {/* =============================================
              STUDENT DETAILS
             ============================================= */}

          <div className="reviewSection">

            <h3>
              Student Details
            </h3>


            <div className="reviewRow">

              <div className="reviewKey">
                Student ID
              </div>

              <div className="reviewValue">
                {
                  selected.Title ||
                  "-"
                }
              </div>

            </div>


            <div className="reviewRow">

              <div className="reviewKey">
                Student
              </div>

              <div className="reviewValue">

                {
                  selected.Student
                    ? selected.Student.Title
                    : "-"
                }

              </div>

            </div>


            <div className="reviewRow">

              <div className="reviewKey">
                Date of Birth
              </div>

              <div className="reviewValue">
                {
                  displayDate(
                    selected.DoB
                  )
                }
              </div>

            </div>


            <div className="reviewRow">

              <div className="reviewKey">
                Level of Study
              </div>

              <div className="reviewValue">
                {
                  selected.LevelOfStudy ||
                  "-"
                }
              </div>

            </div>


            <div className="reviewRow">

              <div className="reviewKey">
                Programme
              </div>

              <div className="reviewValue">
                {
                  selected.Programme ||
                  "-"
                }
              </div>

            </div>

          </div>


          {/* =============================================
              ABSENCE DETAILS
             ============================================= */}

          <div className="reviewSection">

            <h3>
              Absence Details
            </h3>


            <div className="reviewRow">

              <div className="reviewKey">
                Start Date
              </div>

              <div className="reviewValue">
                {
                  displayDate(
                    selected
                      .AbsenceStartDate
                  )
                }
              </div>

            </div>


            <div className="reviewRow">

              <div className="reviewKey">
                End Date
              </div>

              <div className="reviewValue">
                {
                  displayDate(
                    selected
                      .AbsenceEndDate
                  )
                }
              </div>

            </div>


            <div className="reviewRow">

              <div className="reviewKey">
                Reason(s)
              </div>

              <div className="reviewValue">

                {
                  (
                    selected.AbsenceReasons ||
                    []
                  ).length > 0
                    ? (
                      selected.AbsenceReasons ||
                      []
                    ).join(", ")
                    : "-"
                }

              </div>

            </div>


            {
              selected
                .ReasonOtherComments &&
              (
                <div className="reviewRow">

                  <div className="reviewKey">
                    Additional Details
                  </div>

                  <div className="reviewValue">
                    {
                      selected
                        .ReasonOtherComments
                    }
                  </div>

                </div>
              )
            }

          </div>


          {/* =============================================
              TRAVEL / LETTER
             ============================================= */}

          <div className="reviewSection">

            <h3>
              Travel / Letter
            </h3>


            <div className="reviewRow">

              <div className="reviewKey">
                Travelling Outside UK
              </div>

              <div className="reviewValue">
                {
                  selected.TravelOutside ||
                  "-"
                }
              </div>

            </div>


            {
              selected
                .TravelOutsideDetails &&
              (
                <div className="reviewRow">

                  <div className="reviewKey">
                    Travel Details
                  </div>

                  <div className="reviewValue">
                    {
                      selected
                        .TravelOutsideDetails
                    }
                  </div>

                </div>
              )
            }


            <div className="reviewRow">

              <div className="reviewKey">
                Approval Letter
              </div>

              <div className="reviewValue">
                {
                  selected
                    .letterofconfirmationforauthorise ||
                  "-"
                }
              </div>

            </div>


            {
              selected
                .Reasonforrequestingaletter &&
              (
                <div className="reviewRow">

                  <div className="reviewKey">
                    Letter Reason
                  </div>

                  <div className="reviewValue">
                    {
                      selected
                        .Reasonforrequestingaletter
                    }
                  </div>

                </div>
              )
            }

          </div>


          {/* =============================================
              EVIDENCE
             ============================================= */}

          <div className="reviewSection">

            <h3>
              Supporting Evidence
            </h3>


            {
              attachments.length === 0
                ? (
                  <p>
                    No supporting evidence
                    has been attached.
                  </p>
                )
                : (
                  <ul>

                    {
                      attachments.map(
                        attachment => (

                          <li
                            key={
                              attachment.FileName
                            }
                          >

                            <a
                              href={
                                attachment
                                  .ServerRelativeUrl
                              }
                              target="_blank"
                              rel="noreferrer"
                            >
                              {
                                attachment
                                  .FileName
                              }
                            </a>

                          </li>
                        )
                      )
                    }

                  </ul>
                )
            }

          </div>


          {/* =============================================
              APPROVAL INFORMATION
             ============================================= */}

          {
            (
              selected.Status ===
                "Approved" ||
              selected.Status ===
                "Rejected"
            ) &&
            (
              <div className="reviewSection">

                <h3>
                  Decision
                </h3>


                <div className="reviewRow">

                  <div className="reviewKey">
                    Decision
                  </div>

                  <div className="reviewValue">
                    {
                      selected.Status
                    }
                  </div>

                </div>


                {
                  selected
                    .RequestRejectionDetails &&
                  (
                    <div className="reviewRow">

                      <div className="reviewKey">
                        Comments
                      </div>

                      <div className="reviewValue">
                        {
                          selected
                            .RequestRejectionDetails
                        }
                      </div>

                    </div>
                  )
                }

              </div>
            )
          }


          <div className="actions">

            <button
              type="button"
              className="secondaryButton"
              onClick={
                () => {

                  backToDashboard()
                    .catch(
                      (err: unknown) => {

                        console.error(
                          "Unable to return to dashboard.",
                          err
                        );
                      }
                    );
                }
              }
            >
              Back to Dashboard
            </button>

          </div>

        </div>
      );
    };


  /* =====================================================
     PEOPLE PICKER
     ===================================================== */

  const searchUsers =
    async (
      searchText: string
    ): Promise<IUserOption[]> => {

      const query = searchText ? searchText.trim() : "";

      if (query.length < 2) {
        return [];
      }

      return props.service.searchUsers(query);
    };


  const resolveUser =
    async (
      user: IUserOption
    ): Promise<IUserOption> => {

      const loginName =
        user.LoginName
          ? user.LoginName.trim()
          : "";

      if (!loginName) {
        throw new Error(
          "The selected user does not have a valid SharePoint login."
        );
      }

      return props.service.ensureUser(loginName);
    };


  /* =====================================================
     SELECT CONTENT
     ===================================================== */

  let content:
    React.ReactNode = null;


  /* =====================================================
     DASHBOARD
     ===================================================== */

  if (
    view === "dashboard"
  ) {

    content = (

      <Dashboard
        role={role}
        items={items}
        loading={loading}
        currentUserEmail={userEmail}
        onNew={
          newRequest
        }
        onOpen={
          (
            request: IRequest
          ) => {

            openRequest(
              request
            ).catch(
              (err: unknown) => {

                console.error(
                  "Unable to open request.",
                  err
                );
              }
            );
          }
        }
        onReview={
          (
            request: IRequest
          ) => {

            reviewRequest(
              request
            ).catch(
              (err: unknown) => {

                console.error(
                  "Unable to review request.",
                  err
                );
              }
            );
          }
        }
        onDelete={
          (
            request: IRequest
          ) => {

            deleteRequest(
              request
            ).catch(
              (err: unknown) => {

                console.error(
                  "Unable to delete request.",
                  err
                );
              }
            );
          }
        }
      />
    );
  }


  /* =====================================================
     STUDENT FORM
     ===================================================== */

  if (
    view === "studentForm" &&
    selected
  ) {

    content = (

      <StudentRequestForm
        initial={selected}
        adminMode={role === "Admin"}
        userOptions={userOptions}
        adminOptions={adminOptions}
        adminOptionsLoading={adminOptionsLoading}
        onSearchUsers={searchUsers}
        onResolveUser={resolveUser}
        onSaveDraft={
          saveDraft
        }
        onSubmit={
          submitRequest
        }
        onCancel={
          () => {

            backToDashboard()
              .catch(
                (err: unknown) => {

                  console.error(
                    "Unable to return to dashboard.",
                    err
                  );
                }
              );
          }
        }
      />
    );
  }


  /* =====================================================
     APPROVER REVIEW
     ===================================================== */

  if (
    view === "review" &&
    selected
  ) {

    content = (

      <ReviewForm
        request={selected}
        adminMode={role === "Admin"}
        userOptions={userOptions}
        adminOptions={adminOptions}
        adminOptionsLoading={adminOptionsLoading}
        onSearchUsers={searchUsers}
        onResolveUser={resolveUser}
        onSaveForLater={saveReviewForLater}
        onAssignSignatory={assignSignatory}
        onAdminChange={changeAdministrator}
        onBack={
          () => {

            backToDashboard()
              .catch(
                (err: unknown) => {

                  console.error(
                    "Unable to return to dashboard.",
                    err
                  );
                }
              );
          }
        }
        onApprove={
          approve
        }
        onReject={
          reject
        }
      />
    );
  }


  /* =====================================================
     READ ONLY VIEW
     ===================================================== */

  if (
    view === "view" &&
    selected
  ) {

    content =
      renderReadOnlyView();
  }


  /* =====================================================
     APPLICATION
     ===================================================== */

  return (

    <div className="authorisedAbsenceApp">

      {/* =================================================
          UNIVERSITY APPLICATION HEADER
         ================================================= */}

      <header className="appHeader">

        <div className="appHeaderInner">

          <div className="appHeaderText">

            <h1 className="appHeaderTitle">
              Authorised Absence
            </h1>

            <p className="appHeaderSubTitle">
              University student absence
              request service
            </p>

          </div>

          {
            userName &&
            (
              <div className="welcomeUser">
                <span>
                  Welcome, <strong>{userName}</strong>
                </span>

                <span className="welcomeUserRole" style={{display:"none"}}>
                  {roleLabel()}
                </span>
              </div>
            )
          }

        </div>

      </header>


      {/* =================================================
          MAIN CONTENT
         ================================================= */}

      <main className="appContent">


        {/* ===============================================
            USER CONTEXT
           =============================================== */}




        {/* ===============================================
            APPLICATION ERROR
           =============================================== */}

        {
          error &&
          (
            <div
              className="error"
              role="alert"
            >

              <strong>
                There is a problem
              </strong>

              <div>
                {error}
              </div>

            </div>
          )
        }


        {/* ===============================================
            LOADING
           =============================================== */}

        {
          loading &&
          view !== "dashboard"
            ? (
              <div
                className="loadingPanel"
                role="status"
              >
                Loading request...
              </div>
            )
            : content
        }

      </main>

    </div>
  );
};