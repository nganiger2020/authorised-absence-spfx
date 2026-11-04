import { RequestHistory } from "./RequestHistory";
import { canOpenWorkflow, workflowStage } from "../models/Workflow";
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
  ReviewForm
} from "./review/ReviewForm";
import {
  IAdminOption
} from "../controls/AdminLookup";
import StudentRequestForm from "./forms/StudentRequestForm";
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
    const [deleteCandidate, setDeleteCandidate] = React.useState<IRequest | undefined>(undefined);
    const deleteModalRef = React.useRef<HTMLDivElement>(null);
    const [linkedRequestId] = React.useState<string | null>(() =>
      new URLSearchParams(window.location.search).get("RequestId")
    );

    const [assignmentLink] = React.useState<boolean>(() =>
      (new URLSearchParams(window.location.search).get("STAGE") || "").trim().toLowerCase() === "1"
    );
    const [reviewLink] = React.useState<boolean>(() =>
      (new URLSearchParams(window.location.search).get("STAGE") || "").trim().toLowerCase() === "2"
    );

    const [readOnlyLink] = React.useState<boolean>(() =>
      (new URLSearchParams(window.location.search).get("STAGE") || "").trim().toLowerCase() === "3"
    );
    const [role, setRole] =
      React.useState<UserRole>("Student");
    const [view, setView] =
      React.useState<AppView>(readOnlyLink ? "view" : linkedRequestId !== null || assignmentLink || reviewLink ? "review" : "dashboard");
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
      React.useState<IAdminOption[]>([]);
    const [adminOptionsLoading, setAdminOptionsLoading] =
      React.useState<boolean>(false);
    const [absenceReasonOptions, setAbsenceReasonOptions] =
      React.useState<string[]>([]);
    const [absenceReasonConfirmOptions, setAbsenceReasonConfirmOptions] =
      React.useState<string[]>([]);
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
    React.useEffect(() => {
      if (!deleteCandidate) { return; }
      const previousFocus = document.activeElement as HTMLElement;
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      const modal = deleteModalRef.current;
      if (modal) { const cancel = modal.querySelector<HTMLButtonElement>("button"); if (cancel) { cancel.focus(); } }
      const handleKey = (event: KeyboardEvent): void => {
        if (event.key === "Escape" && !loading) { setDeleteCandidate(undefined); }
        if (event.key === "Tab" && modal) {
          const buttons = modal.querySelectorAll<HTMLButtonElement>("button:not(:disabled)");
          if (!buttons.length) { event.preventDefault(); return; }
          const first = buttons[0]; const last = buttons[buttons.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }
      };
      document.addEventListener("keydown", handleKey);
      return () => {
        document.removeEventListener("keydown", handleKey);
        document.body.style.overflow = previousOverflow;
        if (previousFocus && document.documentElement.contains(previousFocus)) { previousFocus.focus(); }
      };
    }, [deleteCandidate, loading]);
    const canReviewRequest = (request: IRequest, accessRole: UserRole = role, accessEmail: string = userEmail): boolean =>
      canOpenWorkflow(request, accessRole, accessEmail);
    /* =====================================================
       REVIEW REQUEST
       ===================================================== */
    const reviewRequest =
      async (
        request: IRequest,
        accessRole: UserRole = role,
        accessEmail: string = userEmail,
        requireAssignmentStage: boolean = false,
        requireReviewStage: boolean = false
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
          if (requireReviewStage && workflowStage(fullRequest) !== "Signatory") {
            setError("This request is not awaiting review by the Authorised Signatory.");
            return;
          }
          if (requireAssignmentStage && workflowStage(fullRequest) !== "Administrator") {
            setError("This request is no longer awaiting assignment by an Administrator.");
            return;
          }
          /*
           * SECURITY / WORKFLOW CHECK:
           *
           * Do not change the request to
           * "Under Review" unless the current
           * user is allowed to review it.
           */
          if (
            !canReviewRequest(
              fullRequest, accessRole, accessEmail
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
          const requestForReview:
            IRequest = {
            ...fullRequest
          };
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
          if (readOnlyLink && (assignmentLink || reviewLink)) {
            throw new Error("VIEW=true cannot be combined with AAS=true or RAA=true.");
          }
          if (readOnlyLink && linkedRequestId === null) {
            throw new Error("RequestId is required when VIEW=true.");
          }
          if (assignmentLink && reviewLink) {
            throw new Error("Use either AAS=true or RAA=true, not both.");
          }
          if ((assignmentLink || reviewLink) && linkedRequestId === null) {
            throw new Error("RequestId is required when AAS=true or RAA=true.");
          }
          let directRequestId: number | undefined;
          if (linkedRequestId !== null) {
            if (!/^[1-9]\d*$/.test(linkedRequestId) || !Number.isSafeInteger(Number(linkedRequestId))) {
              throw new Error("RequestId must be a positive list item ID.");
            }
            directRequestId = Number(linkedRequestId);
          }
          // Read-only links load only the requested item using existing service access.
          // Do not load editing options or enter the approval workflow.
          if (readOnlyLink && directRequestId !== undefined) {
            setUserId(user.Id);
            setUserName(user.Title);
            setUserEmail(user.Email || "");
            setRole(resolvedRole);
            const fullRequest = await props.service.get(directRequestId);
            setSelected(fullRequest);
            setView("view");
            return;
          }
          const dashboardItems = directRequestId !== undefined
            ? []
            : await props.service.getDashboard(resolvedRole, user.Id);
          try {
            const studentReasonChoices = await props.service.getAbsenceReasonsChoices();
            setAbsenceReasonOptions(studentReasonChoices || []);
          } catch (absenceReasonError) {
            console.error("Unable to load AbsenceReasons choices.", absenceReasonError);
            setAbsenceReasonOptions([]);
          }
          try {
            const reviewerReasonChoices = await props.service.getAbsenceReasonsConfirmChoices();
            setAbsenceReasonConfirmOptions(reviewerReasonChoices || []);
          } catch (absenceReasonConfirmError) {
            console.error("Unable to load AbsenceReasonsConfirm choices.", absenceReasonConfirmError);
            setAbsenceReasonConfirmOptions([]);
          }
          if (resolvedRole === "Admin") {
            const availableUsers = await props.service.getSiteUsers();
            setUserOptions(availableUsers);
          }
          /*
           * Load options from the Admins list separately.
           * An Admins list loading failure must not stop the
           * Authorised Absence application from loading.
           */
          setAdminOptionsLoading(true);
          try {
            const availableAdminTerms =
              await props.service.getAdmins();
            setAdminOptions(
              availableAdminTerms
            );
          } catch (adminTermsError) {
            console.error(
              "Unable to load Admins list options.",
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
          if (directRequestId !== undefined) {
            await reviewRequest({ ...emptyRequest(), Id: directRequestId }, resolvedRole, user.Email || "", assignmentLink, reviewLink);
          }
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
        comments: string,
        absenceReasonsConfirm: string[],
        reasonConfOtherComments: string,
        signatoryId?: number
      ): Promise<void> => {
        if (!selected) {
          return;
        }
        if (signatoryId && signatoryId !== selected.SignatoryId) {
          throw new Error("The assigned Signatory cannot be changed during final review.");
        }
        const requestToApprove: IRequest = {
          ...selected,
          AbsenceReasonsConfirm: absenceReasonsConfirm
            ? absenceReasonsConfirm.slice()
            : [],
          ReasonConfOtherComments: reasonConfOtherComments || "",
          SignatoryId: selected.SignatoryId
        };
        try {
          setError("");
          // Persist the approver's final reasons/comments before completion.
          await props.service.saveReview(
            requestToApprove,
            comments
          );
          await props.service.approve(
            requestToApprove,
            comments
          );
          await backToDashboard();
        } catch (err) {
          console.error("Approval failed.", err);
          setError(
            getErrorMessage(
              err,
              "Unable to approve the request."
            )
          );
          throw err;
        }
      };
    /* =====================================================
       REJECT REQUEST
       ===================================================== */
    const reject =
      async (
        comments: string,
        absenceReasonsConfirm: string[],
        reasonConfOtherComments: string,
        signatoryId?: number
      ): Promise<void> => {
        if (!selected) {
          return;
        }
        if (signatoryId && signatoryId !== selected.SignatoryId) {
          throw new Error("The assigned Signatory cannot be changed during final review.");
        }
        const requestToReject: IRequest = {
          ...selected,
          AbsenceReasonsConfirm: absenceReasonsConfirm
            ? absenceReasonsConfirm.slice()
            : [],
          ReasonConfOtherComments: reasonConfOtherComments || "",
          SignatoryId: selected.SignatoryId
        };
        try {
          setError("");
          await props.service.saveReview(
            requestToReject,
            comments
          );
          await props.service.reject(
            requestToReject,
            comments
          );
          await backToDashboard();
        } catch (err) {
          console.error("Rejection failed.", err);
          setError(
            getErrorMessage(
              err,
              "Unable to reject the request."
            )
          );
          throw err;
        }
      };
    /* =====================================================
       SAVE REVIEW FOR LATER
       ===================================================== */
    const saveReviewForLater =
      async (
        comments: string,
        absenceReasonsConfirm: string[],
        reasonConfOtherComments: string,
        signatoryId?: number
      ): Promise<void> => {
        if (!selected) {
          return;
        }
        if (signatoryId && signatoryId !== selected.SignatoryId) {
          throw new Error("The assigned Signatory cannot be changed during final review.");
        }
        const requestToSave: IRequest = {
          ...selected,
          Stage: "Signatory",
          Status: "Under Review with Signatory",
          AbsenceReasonsConfirm: absenceReasonsConfirm
            ? absenceReasonsConfirm.slice()
            : [],
          ReasonConfOtherComments: reasonConfOtherComments || "",
          SignatoryId: selected.SignatoryId
        };
        try {
          setError("");
          await props.service.saveReview(
            requestToSave,
            comments
          );
          await backToDashboard();
        } catch (err) {
          console.error("Unable to save review.", err);
          setError(
            getErrorMessage(
              err,
              "Unable to save the review."
            )
          );
          throw err;
        }
      };
    /* =====================================================
       CHANGE ADMINISTRATOR
       ===================================================== */
    const submitSignatoryAssignment = async (signatoryId: number, absenceReasonsConfirm: string[], reasonConfOtherComments: string): Promise<void> => {
      if (!selected || !selected.Id) { throw new Error("Select a request first."); }
      try {
        setError("");
        await props.service.submitSignatoryAssignment(selected.Id, signatoryId, absenceReasonsConfirm, reasonConfOtherComments);
        await backToDashboard();
      } catch (err) {
        setError(getErrorMessage(err, "Unable to submit the Signatory assignment."));
        throw err;
      }
    };
    const changeAdministrator =
      async (
        label?: string,
        id?: number
      ): Promise<void> => {
        if (!selected || !selected.Id || role !== "Admin") {
          return;
        }
        const adminLabel = label ? label.trim() : "";
        const adminId = id;
        if (!adminLabel || !adminId) {
          return;
        }
        try {
          setError("");
          await props.service.assignAdministrator(
            selected.Id,
            adminLabel,
            adminId
          );
          const updated = await props.service.get(selected.Id);
          setSelected(updated);
        } catch (err) {
          console.error("Unable to change administrator.", err);
          setError(
            getErrorMessage(
              err,
              "Unable to change the administrator."
            )
          );
          throw err;
        }
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
              {!readOnlyLink && (
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
              )}
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
              {!readOnlyLink && (
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
              )}
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
      !readOnlyLink && view === "dashboard"
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
          onDelete={(request: IRequest): void => { setDeleteCandidate(request); }}
        />
      );
    }
    /* =====================================================
       STUDENT FORM
       ===================================================== */
    if (
      !readOnlyLink && view === "studentForm" &&
      selected
    ) {
      content = (
        <StudentRequestForm
          initial={selected}
          adminMode={role === "Admin"}
          userOptions={userOptions}
          adminOptions={adminOptions}
          adminOptionsLoading={adminOptionsLoading}
          absenceReasonOptions={absenceReasonOptions}
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
      !readOnlyLink && view === "review" &&
      selected
    ) {
      content = (
        <ReviewForm
          request={selected}
          adminMode={role === "Admin"}
          assignmentMode={workflowStage(selected) === "Administrator"}
          onSubmitAssignment={submitSignatoryAssignment}
          userOptions={userOptions}
          adminOptions={adminOptions}
          adminOptionsLoading={
            adminOptionsLoading
          }
          absenceReasonOptions={
            absenceReasonConfirmOptions
          }
          onSearchUsers={
            searchUsers
          }
          onResolveUser={
            resolveUser
          }
          onSaveForLater={
            saveReviewForLater
          }
          onAdminChange={
            changeAdministrator
          }
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
      (readOnlyLink || view === "view") &&
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
        <header className="appHeader" style={{ padding: 0 }}>
          <div className="appHeaderInner" style={{ display: "flex", flexWrap: "nowrap", alignItems: "center", justifyContent: "space-between", gap: "20px", padding: "16px 24px", overflowX: "auto" }}>
            <div className="appHeaderText" style={{ display: "flex", alignItems: "baseline", gap: "16px", flexWrap: "nowrap", whiteSpace: "nowrap" }}>
              <h1 className="appHeaderTitle" style={{ margin: 0, whiteSpace: "nowrap" }}>Authorised Absence Requests</h1>
            </div>
            {userName && (
              <div className="welcomeUser" style={{ whiteSpace: "nowrap", flexShrink: 0 }}>
                <span>Welcome, <strong>{userName}</strong></span>
                <span className="welcomeUserRole" style={{ display: "none" }}>{roleLabel()}</span>
              </div>
            )}
          </div>
        </header>
        {/* =================================================
          MAIN CONTENT
         ================================================= */}
        {!readOnlyLink && deleteCandidate && (
          <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, left: 0, zIndex: 10000, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
            <div ref={deleteModalRef} role="dialog" aria-modal="true" aria-labelledby="deleteRequestTitle" aria-describedby="deleteRequestMessage"
              style={{ background: "white", color: "#222", borderRadius: "8px", padding: "24px", maxWidth: "520px", width: "100%" }}>
              <h2 id="deleteRequestTitle">Delete request?</h2>
              <p id="deleteRequestMessage">{role === "Admin" ? "Are you sure you want to delete this request? It will be moved to the SharePoint recycle bin." : "Are you sure you want to delete this draft request?"}</p>
              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                <button type="button" className="secondaryButton"
                  style={{ appearance: "none", minHeight: "42px", padding: "0.6875rem 1.5rem", border: "1px solid #0d0d0d", borderRadius: "3.75rem", background: "#ffffff", color: "#0d0d0d", fontFamily: '"Manrope", "Arial", sans-serif', fontWeight: 700, fontSize: "0.875rem", lineHeight: "1.225rem", boxShadow: "none", cursor: loading ? "default" : "pointer" }}
                  disabled={loading} onClick={() => setDeleteCandidate(undefined)}>Cancel</button>
                <button type="button" className="primary" style={{ backgroundColor: "#b10e1e", borderColor: "#b10e1e" }} disabled={loading}
                  onClick={() => { void deleteRequest(deleteCandidate).then(() => setDeleteCandidate(undefined)); }}>
                  {loading ? "Deleting..." : "Delete request"}
                </button>
              </div>
            </div>
          </div>
        )}
        <main className="appContent">
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
          {selected && selected.Id && view !== "dashboard" && !loading && (
            <RequestHistory key={selected.Id} service={props.service} requestId={selected.Id} />
          )}
        </main>
      </div>
    );
  };

