import * as React from "react";

import {
  IRequest,
  IUserOption
} from "../../models/Models";
import { PeoplePicker } from "../../controls/PeoplePicker";
import {
  AdminManagedMetadata,
  IAdminTermOption
} from "../../controls/AdminManagedMetadata";


interface Props {

  request: IRequest;

  adminMode?: boolean;

  userOptions?: IUserOption[];
  adminOptions?: IAdminTermOption[];
  adminOptionsLoading?: boolean;

  /** All choices configured on SharePoint AbsenceReasonsConfirm field. */
  absenceReasonOptions: string[];

  onSearchUsers: (
    searchText: string
  ) => Promise<IUserOption[]>;

  onResolveUser: (
    user: IUserOption
  ) => Promise<IUserOption>;

  onAdminChange?: (
    label?: string,
    termGuid?: string
  ) => Promise<void>;

  onSaveForLater: (
    comments: string,
    absenceReasonsConfirm: string[],
    reasonConfOtherComments: string,
    signatoryId?: number
  ) => Promise<void>;

  onAssignAdministrator?: (
    userId: number
  ) => Promise<void>;

  onBack: () => void;

  onApprove: (
    comments: string,
    absenceReasonsConfirm: string[],
    reasonConfOtherComments: string,
    signatoryId?: number
  ) => Promise<void>;

  onReject: (
    comments: string,
    absenceReasonsConfirm: string[],
    reasonConfOtherComments: string,
    signatoryId?: number
  ) => Promise<void>;
}


export const ReviewForm:
React.FC<Props> = (props) => {

  const [decision, setDecision] =
    React.useState<string>("");

  const [comments, setComments] =
    React.useState<string>(
      props.request
        .RequestRejectionDetails ||
      ""
    );

  const [confirmedAbsenceReasons, setConfirmedAbsenceReasons] =
    React.useState<string[]>(
      props.request.AbsenceReasonsConfirm &&
      props.request.AbsenceReasonsConfirm.length > 0
        ? props.request.AbsenceReasonsConfirm.slice()
        : (props.request.AbsenceReasons || []).slice()
    );

  const [reasonConfOtherComments, setReasonConfOtherComments] =
    React.useState<string>(
      props.request.ReasonConfOtherComments || ""
    );

  const [error, setError] =
    React.useState<string>("");

  const [saving, setSaving] =
    React.useState<boolean>(false);

  const [selectedSignatory, setSelectedSignatory] =
    React.useState<IUserOption | undefined>(
      props.request.SignatoryId
        ? {
            Id: props.request.SignatoryId,
            Title: props.request.Signatory ? props.request.Signatory.Title || "" : "",
            Email: props.request.Signatory ? props.request.Signatory.EMail || "" : "",
            LoginName: props.request.Signatory ? props.request.Signatory.LoginName || "" : ""
          }
        : undefined
    );

  const [adminLabel, setAdminLabel] =
    React.useState<string>(
      props.request.AdminLabel || ""
    );

  const [adminTermGuid, setAdminTermGuid] =
    React.useState<string>(
      props.request.AdminTermGuid || ""
    );


  /* =====================================================
     DATE FORMAT
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
     DISPLAY VALUE
     ===================================================== */

  const displayValue = (
    value?: string
  ): string => {

    if (!value) {
      return "-";
    }

    return value;
  };


  const displayStatus = (
    value?: string
  ): string => {

    const status =
      (value || "")
        .trim()
        .toLowerCase();

    if (
      status === "submitted" ||
      status === "pending approval" ||
      status === "under review"
    ) {
      return "Under Review";
    }

    return value || "Under Review";
  };


  /* =====================================================
     ERROR MESSAGE
     ===================================================== */

  const getErrorMessage = (
    err: unknown,
    fallback: string
  ): string => {

    if (err instanceof Error) {
      return err.message;
    }

    return fallback;
  };


  /* =====================================================
     APPROVE
     ===================================================== */

  const approve =
    async (): Promise<void> => {

      try {

        setSaving(true);
        setError("");

        await props.onApprove(
          comments.trim(),
          confirmedAbsenceReasons.slice(),
          confirmedAbsenceReasons.indexOf("Other") >= 0
            ? reasonConfOtherComments.trim()
            : "",
          selectedSignatory ? selectedSignatory.Id : undefined
        );

      } catch (err) {

        console.error(
          "Unable to approve request.",
          err
        );

        setError(
          getErrorMessage(
            err,
            "Unable to approve the request."
          )
        );

        window.scrollTo(
          0,
          0
        );

      } finally {

        setSaving(false);
      }
    };


  /* =====================================================
     REJECT
     ===================================================== */

  const reject =
    async (): Promise<void> => {

      if (!comments.trim()) {

        setError(
          "Enter the reason for rejecting this request."
        );

        window.scrollTo(
          0,
          0
        );

        return;
      }


      try {

        setSaving(true);
        setError("");

        await props.onReject(
          comments.trim(),
          confirmedAbsenceReasons.slice(),
          confirmedAbsenceReasons.indexOf("Other") >= 0
            ? reasonConfOtherComments.trim()
            : "",
          selectedSignatory ? selectedSignatory.Id : undefined
        );

      } catch (err) {

        console.error(
          "Unable to reject request.",
          err
        );

        setError(
          getErrorMessage(
            err,
            "Unable to reject the request."
          )
        );

        window.scrollTo(
          0,
          0
        );

      } finally {

        setSaving(false);
      }
    };


  /* =====================================================
     SAVE FOR LATER
     ===================================================== */

  const saveForLater =
    async (): Promise<void> => {

      try {

        setSaving(true);
        setError("");

        if (confirmedAbsenceReasons.length === 0) {
          throw new Error("Select at least one Reason for Absence.");
        }

        if (
          confirmedAbsenceReasons.indexOf("Other") >= 0 &&
          !reasonConfOtherComments.trim()
        ) {
          throw new Error("Enter details for the Other reason.");
        }

        if (!selectedSignatory) {
          throw new Error("Select an Assigned Signatory.");
        }

        await props.onSaveForLater(
          comments.trim(),
          confirmedAbsenceReasons.slice(),
          confirmedAbsenceReasons.indexOf("Other") >= 0
            ? reasonConfOtherComments.trim()
            : "",
          selectedSignatory.Id
        );

      } catch (err) {

        console.error(
          "Unable to save review.",
          err
        );

        setError(
          getErrorMessage(
            err,
            "Unable to save review."
          )
        );

        window.scrollTo(
          0,
          0
        );

      } finally {

        setSaving(false);
      }
    };


  /* =====================================================
     SUBMIT DECISION
     ===================================================== */

  const submitDecision =
    async (): Promise<void> => {

      if (!decision) {

        setError(
          "Select Approve or Reject."
        );

        window.scrollTo(
          0,
          0
        );

        return;
      }


      if (confirmedAbsenceReasons.length === 0) {

        setError(
          "Select at least one Reason for Absence."
        );

        window.scrollTo(0, 0);
        return;
      }

      if (
        confirmedAbsenceReasons.indexOf("Other") >= 0 &&
        !reasonConfOtherComments.trim()
      ) {

        setError(
          "Enter details for the Other reason."
        );

        window.scrollTo(0, 0);
        return;
      }

      if (!selectedSignatory) {

        setError(
          "Select an Assigned Signatory."
        );

        window.scrollTo(0, 0);
        return;
      }

      try {

        setSaving(true);
        setError("");

        if (
          decision === "Approve"
        ) {

          await props.onApprove(
            comments.trim(),
            confirmedAbsenceReasons.slice(),
            confirmedAbsenceReasons.indexOf("Other") >= 0
              ? reasonConfOtherComments.trim()
              : "",
            selectedSignatory.Id
          );

          return;
        }


        if (!comments.trim()) {

          setError(
            "Enter the reason for rejecting this request."
          );

          window.scrollTo(
            0,
            0
          );

          return;
        }


        await props.onReject(
          comments.trim(),
          confirmedAbsenceReasons.slice(),
          confirmedAbsenceReasons.indexOf("Other") >= 0
            ? reasonConfOtherComments.trim()
            : "",
          selectedSignatory ? selectedSignatory.Id : undefined
        );

      } catch (err) {

        console.error(
          "Unable to submit decision.",
          err
        );

        setError(
          getErrorMessage(
            err,
            "Unable to submit the decision."
          )
        );

        window.scrollTo(
          0,
          0
        );

      } finally {

        setSaving(false);
      }
    };


  /* =====================================================
     ATTACHMENTS
     ===================================================== */

  const attachments =
    props.request
      .AttachmentFiles ||
    [];


  /* =====================================================
     RENDER
     ===================================================== */

  return (

    <div className="review">
      <style>{`
        .reasonOptionsGrid { display:flex; flex-direction:column; gap:10px; margin-top:12px; }
        .reasonOption { display:flex; align-items:center; gap:10px; padding:0; border:0; background:transparent; cursor:pointer; }
        .reasonOptionStudent { border:0; background:transparent; }
        .reasonOption input { width:20px; height:20px; margin:0; flex:0 0 auto; }
        .reasonOptionText { display:flex; flex-wrap:wrap; align-items:center; gap:8px; font-weight:400; }
        .studentSelectedBadge { display:inline-block; padding:2px 7px; border-radius:10px; background:#e8f1f8; color:#1d70b8; font-size:12px; font-weight:700; }
        .reasonHelp { margin:0 0 10px; }
        .otherReasonReview { margin-top:20px; max-width:760px; }
        .otherReasonReview textarea { width:100%; box-sizing:border-box; border:2px solid #0b0c0c; padding:10px; font:inherit; }
        .warningMessage { border-left:5px solid #d4351c; padding:12px 15px; background:#f3f2f1; }
      `}</style>


      {/* ===============================================
          HEADER
         =============================================== */}

      <div className="aaHeader">

        <div>

          <h1>
            Review Authorised Absence
          </h1>

          <p className="pageIntro">
            Review the student's request,
            supporting information and
            evidence before making a
            decision.
          </p>

        </div>


        <div>

          <span className="pill statusReview">

            {
              displayStatus(
                props.request.Status
              )
            }

          </span>

        </div>

      </div>


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
          REQUEST INFORMATION
         =============================================== */}

      <div className="reviewSection">

        <h2>
          Request Details
        </h2>


        <div className="reviewRow">

          <div className="reviewKey">
            Request ID
          </div>

          <div className="reviewValue">
            AA-{props.request.Id}
          </div>

        </div>


        <div className="reviewRow">

          <div className="reviewKey">
            Status
          </div>

          <div className="reviewValue">

            {
              displayStatus(
                props.request.Status
              )
            }

          </div>

        </div>


        <div className="reviewRow">

          <div className="reviewKey">
            Submitted
          </div>

          <div className="reviewValue">

            {
              displayDate(
                props.request.Created
              )
            }

          </div>

        </div>

      </div>


      {/* ===============================================
          STUDENT DETAILS
         =============================================== */}

      <div className="reviewSection">

        <h2>
          Student Details
        </h2>


        <div className="reviewRow">

          <div className="reviewKey">
            Student
          </div>

          <div className="reviewValue">

            {
              props.request.Student
                ? props.request.Student.Title
                : "-"
            }

          </div>

        </div>


        <div className="reviewRow">

          <div className="reviewKey">
            Student ID
          </div>

          <div className="reviewValue">

            {
              displayValue(
                props.request.Title
              )
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
                props.request.DoB
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
              displayValue(
                props.request.LevelOfStudy
              )
            }

          </div>

        </div>


        <div className="reviewRow">

          <div className="reviewKey">
            Programme
          </div>

          <div className="reviewValue">

            {
              displayValue(
                props.request.Programme
              )
            }

          </div>

        </div>

        <div className="reviewRow">
          <div className="reviewKey">
            Administrator
          </div>
          <div className="reviewValue">
            {props.request.AdminLabel || adminLabel || "-"}
          </div>
        </div>

      </div>


      {/* ===============================================
          VISA / IMMIGRATION DETAILS
         =============================================== */}

      {
        (props.request.VisaType ||
          props.request.VisaOtherComments ||
          props.request.VisaStartDate ||
          props.request.VisaEndDate ||
          props.request.VisaAttachment ||
          props.request.PassportAttachment) &&
        (
          <div className="reviewSection">
            <h2>Visa / Immigration Details</h2>

            {props.request.VisaType && (
              <div className="reviewRow">
                <div className="reviewKey">Visa Type</div>
                <div className="reviewValue">{props.request.VisaType}</div>
              </div>
            )}

            {props.request.VisaOtherComments && (
              <div className="reviewRow">
                <div className="reviewKey">Visa Other Details</div>
                <div className="reviewValue">{props.request.VisaOtherComments}</div>
              </div>
            )}

            {props.request.VisaStartDate && (
              <div className="reviewRow">
                <div className="reviewKey">Visa Start Date</div>
                <div className="reviewValue">{displayDate(props.request.VisaStartDate)}</div>
              </div>
            )}

            {props.request.VisaEndDate && (
              <div className="reviewRow">
                <div className="reviewKey">Visa End Date</div>
                <div className="reviewValue">{displayDate(props.request.VisaEndDate)}</div>
              </div>
            )}

            {props.request.VisaAttachment && (
              <div className="reviewRow">
                <div className="reviewKey">Visa Evidence</div>
                <div className="reviewValue">{props.request.VisaAttachment}</div>
              </div>
            )}

            {props.request.PassportAttachment && (
              <div className="reviewRow">
                <div className="reviewKey">Passport Evidence</div>
                <div className="reviewValue">{props.request.PassportAttachment}</div>
              </div>
            )}
          </div>
        )
      }


      {/* ===============================================
          ABSENCE DETAILS
         =============================================== */}

      <div className="reviewSection">

        <h2>
          Absence Details
        </h2>


        <div className="reviewRow">

          <div className="reviewKey">
            Start Date
          </div>

          <div className="reviewValue">

            {
              displayDate(
                props.request.AbsenceStartDate
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
                props.request.AbsenceEndDate
              )
            }

          </div>

        </div>


        <div className="reviewRow reasonReviewRow">

          <div className="reviewKey">
            Reason(s) for Absence
            <span className="required">{" *"}</span>
          </div>

          <div className="reviewValue">

            <fieldset className="formGroup">

              <legend>
                Reason for absence
                <span className="required">
                  {" *"}
                </span>
              </legend>

              <p className="hint">
                Select all that apply.
              </p>

              {
                props.absenceReasonOptions &&
                props.absenceReasonOptions.length > 0
                  ? (
                      props.absenceReasonOptions.map(
                        (reason: string) => (

                          <label
                            className="check"
                            key={reason}
                          >

                            <input
                              type="checkbox"
                              checked={
                                confirmedAbsenceReasons.indexOf(
                                  reason
                                ) !== -1
                              }
                              disabled={saving}
                              onChange={(): void => {

                                setConfirmedAbsenceReasons(
                                  current => {

                                    const updated =
                                      current.slice();

                                    const index =
                                      updated.indexOf(
                                        reason
                                      );

                                    if (index === -1) {

                                      updated.push(
                                        reason
                                      );

                                    } else {

                                      updated.splice(
                                        index,
                                        1
                                      );

                                      if (reason === "Other") {
                                        setReasonConfOtherComments(
                                          ""
                                        );
                                      }
                                    }

                                    return updated;
                                  }
                                );

                                setError("");
                              }}
                            />

                            <span>
                              {reason}
                            </span>

                          </label>
                        )
                      )
                    )
                  : (
                      <div className="warningMessage">
                        No choices are configured on the AbsenceReasonsConfirm SharePoint field.
                      </div>
                    )
              }

            </fieldset>

            {
              confirmedAbsenceReasons.indexOf(
                "Other"
              ) !== -1 &&
              (
                <div className="formGroup">

                  <label htmlFor="reasonConfOtherComments">
                    Other reason
                    <span className="required">
                      {" *"}
                    </span>
                  </label>

                  <textarea
                    id="reasonConfOtherComments"
                    rows={4}
                    value={
                      reasonConfOtherComments
                    }
                    disabled={saving}
                    onChange={(event): void => {
                      setReasonConfOtherComments(
                        event.target.value
                      );
                      setError("");
                    }}
                  />

                </div>
              )
            }

          </div>

        </div>

        {
          props.request.ReasonOtherComments &&
          (
            <div className="reviewRow">
              <div className="reviewKey">
                Student Other Reason Details
              </div>
              <div className="reviewValue">
                {props.request.ReasonOtherComments}
              </div>
            </div>
          )
        }


        {
          props.request
            .FamilyIllnessDetails &&
          (
            <div className="reviewRow">

              <div className="reviewKey">
                Family Illness Details
              </div>

              <div className="reviewValue">

                {
                  props.request
                    .FamilyIllnessDetails
                }

              </div>

            </div>
          )
        }


        {
          props.request
            .MedicalEvidenceDetails &&
          (
            <div className="reviewRow">

              <div className="reviewKey">
                Medical Evidence Details
              </div>

              <div className="reviewValue">

                {
                  props.request
                    .MedicalEvidenceDetails
                }

              </div>

            </div>
          )
        }

      </div>


      {/* ===============================================
          RETURN TO STUDY
         =============================================== */}

      {
        props.request.Returning &&
        (
          <div className="reviewSection">

            <h2>
              Return to Study
            </h2>


            <div className="reviewRow">

              <div className="reviewKey">
                Returning
              </div>

              <div className="reviewValue">

                {
                  props.request.Returning
                }

              </div>

            </div>


            {
              props.request
                .ReasonsNotReturning &&
              (
                <div className="reviewRow">

                  <div className="reviewKey">
                    Reason Not Returning
                  </div>

                  <div className="reviewValue">

                    {
                      props.request
                        .ReasonsNotReturning
                    }

                  </div>

                </div>
              )
            }

          </div>
        )
      }


      {/* ===============================================
          TRAVEL DETAILS
         =============================================== */}

      <div className="reviewSection">

        <h2>
          Travel Details
        </h2>


        <div className="reviewRow">

          <div className="reviewKey">
            Travelling Outside UK
          </div>

          <div className="reviewValue">

            {
              displayValue(
                props.request.TravelOutside
              )
            }

          </div>

        </div>


        {
          props.request
            .TravelOutsideDetails &&
          (
            <div className="reviewRow">

              <div className="reviewKey">
                Travel Details
              </div>

              <div className="reviewValue">

                {
                  props.request
                    .TravelOutsideDetails
                }

              </div>

            </div>
          )
        }

      </div>


      {/* ===============================================
          CONFIRMATION LETTER
         =============================================== */}

      <div className="reviewSection">

        <h2>
          Confirmation Letter
        </h2>


        <div className="reviewRow">

          <div className="reviewKey">
            Letter Required
          </div>

          <div className="reviewValue">

            {
              displayValue(
                props.request
                  .letterofconfirmationforauthorise
              )
            }

          </div>

        </div>


        {
          props.request
            .Reasonforrequestingaletter &&
          (
            <div className="reviewRow">

              <div className="reviewKey">
                Reason for Letter
              </div>

              <div className="reviewValue">

                {
                  props.request
                    .Reasonforrequestingaletter
                }

              </div>

            </div>
          )
        }

      </div>


      {/* ===============================================
          SUPPORTING EVIDENCE
         =============================================== */}

      <div className="reviewSection">

        <h2>
          Supporting Evidence
        </h2>

        {
          attachments.length === 0
            ? (
                <div className="infoBox">
                  No supporting evidence has been attached.
                </div>
              )
            : (
                <div className="evidenceTableWrap">

                  <table className="evidenceTable">

                    <thead>
                      <tr>
                        <th scope="col">
                          File Name
                        </th>
                        <th scope="col">
                          Action
                        </th>
                      </tr>
                    </thead>

                    <tbody>

                      {
                        attachments.map(
                          (attachment, index) => (

                            <tr key={attachment.FileName}>

                              <td>

                                <span className="fileIcon">
                                  FILE
                                </span>

                                <span className="evidenceFileName">
                                  {attachment.FileName}
                                </span>

                              </td>

                              <td className="evidenceActionCell">

                                <a
                                  href={attachment.ServerRelativeUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="evidenceViewLink"
                                >
                                  View
                                </a>

                              </td>

                            </tr>
                          )
                        )
                      }

                    </tbody>

                  </table>

                </div>
              )
        }

      </div>


      {/* ===============================================
          AUTHORISED SIGNATORY / ASSIGNMENT
         =============================================== */}

      <div className="reviewSection">

        <h2>
          Authorised Signatory
        </h2>

        <div className="reviewRow">

          <div className="reviewKey">
            Administrator
          </div>

          <div className="reviewValue">
            {
              props.request.AdminLabel ||
              adminLabel ||
              "-"
            }
          </div>

        </div>

        <div className="reviewAssignmentControl">

          <PeoplePicker
            id="assignedSignatory"
            label="Assigned Signatory"
            required
            value={selectedSignatory}
            disabled={saving}
            onSearch={props.onSearchUsers}
            onResolve={props.onResolveUser}
            onChange={(user?: IUserOption): void => {
              setSelectedSignatory(user);
              setError("");
            }}
          />

          <p className="hint">
            Search by name or email address. Select the
            authorised signatory for this request.
          </p>

        </div>

      </div>


      {/* ===============================================
          ADMIN ASSIGNMENT
         =============================================== */}

      {
        props.adminMode &&
        (
          <div className="reviewSection adminSection">

            <h2>Admin Assignment</h2>

            <AdminManagedMetadata
              valueLabel={adminLabel}
              valueTermGuid={adminTermGuid}
              options={props.adminOptions || []}
              loading={props.adminOptionsLoading}
              required
              disabled={saving}
              onChange={(value?: IAdminTermOption): void => {
                const label = value ? value.label : "";
                const termGuid = value ? value.termGuid : "";

                setAdminLabel(label);
                setAdminTermGuid(termGuid);
                setError("");

                if (props.onAdminChange) {
                  void props.onAdminChange(
                    label,
                    termGuid
                  );
                }
              }}
            />


            

          </div>
        )
      }


      {/* ===============================================
          DECISION
         =============================================== */}

      <div className="reviewSection decisionSection">

        <h2>
          Signatory Decision
        </h2>

        <p className="sectionIntro">
          Review all information and
          supporting evidence before
          making your decision.
        </p>


        <fieldset>

          <legend>

            Decision

            <span className="required">
              {" *"}
            </span>

          </legend>


          <label className="check">

            <input
              type="radio"
              name="decision"
              value="Approve"
              checked={
                decision === "Approve"
              }
              onChange={
                () => {

                  setDecision(
                    "Approve"
                  );

                  setError("");
                }
              }
            />

            <span>
              Approve request
            </span>

          </label>


          <label className="check">

            <input
              type="radio"
              name="decision"
              value="Reject"
              checked={
                decision === "Reject"
              }
              onChange={
                () => {

                  setDecision(
                    "Reject"
                  );

                  setError("");
                }
              }
            />

            <span>
              Reject request
            </span>

          </label>

        </fieldset>


        <div className="formGroup">

          <label htmlFor="decisionComments">

            Comments

            {
              decision === "Reject" &&
              (
                <span className="required">
                  {" *"}
                </span>
              )
            }

            <span className="hint">

              {
                decision === "Reject"
                  ? "Explain why the request is being rejected."
                  : "Add any relevant comments about your decision."
              }

            </span>

          </label>


          <textarea
            id="decisionComments"
            rows={6}
            value={comments}
            onChange={
              e =>
                setComments(
                  e.target.value
                )
            }
          />

        </div>

      </div>


      {/* ===============================================
          ACTIONS
         =============================================== */}

      <div className="actions">

        <button
          type="button"
          className="secondaryButton"
          disabled={saving}
          onClick={
            props.onBack
          }
        >
          Back to Dashboard
        </button>


        <button
          type="button"
          className="secondaryButton"
          disabled={saving}
          onClick={
            () => {
              void saveForLater();
            }
          }
        >

          {
            saving
              ? "Saving..."
              : "Save for Later"
          }

        </button>


        <button
          type="button"
          className="primary"
          disabled={
            saving ||
            !decision
          }
          onClick={(): void => {
            void submitDecision();
          }}
        >

          {
            saving
              ? "Saving..."
              : decision === "Reject"
                ? "Reject Request"
                : decision === "Approve"
                  ? "Approve Request"
                  : "Submit Decision"
          }

        </button>

      </div>

    </div>
  );
};