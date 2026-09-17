import * as React from "react";

import {
  IRequest,
  IUserOption
} from "../../models/Models";


interface Props {

  request: IRequest;

  adminMode?: boolean;

  userOptions?: IUserOption[];

  onSaveForLater: (
    comments: string
  ) => Promise<void>;

  onAssignSignatory?: (
    userId: number
  ) => Promise<void>;

  onAssignAdministrator?: (
    userId: number
  ) => Promise<void>;

  onBack: () => void;

  onApprove: (
    comments: string
  ) => Promise<void>;

  onReject: (
    comments: string
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

  const [error, setError] =
    React.useState<string>("");

  const [saving, setSaving] =
    React.useState<boolean>(false);

  const [signatoryId, setSignatoryId] =
    React.useState<number>(
      props.request.SignatoryId || 0
    );

  const [
    administratorId,
    setAdministratorId
  ] =
    React.useState<number>(
      props.request.AdministratorId || 0
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
          comments.trim()
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
          comments.trim()
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

        await props.onSaveForLater(
          comments.trim()
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
     ASSIGN SIGNATORY
     ===================================================== */

  const assignSignatory =
    async (): Promise<void> => {

      if (
        !props.onAssignSignatory ||
        !signatoryId
      ) {
        return;
      }


      try {

        setSaving(true);
        setError("");

        await props.onAssignSignatory(
          signatoryId
        );

      } catch (err) {

        console.error(
          "Unable to assign signatory.",
          err
        );

        setError(
          getErrorMessage(
            err,
            "Unable to assign signatory."
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
     ASSIGN ADMINISTRATOR
     ===================================================== */

  const assignAdministrator =
    async (): Promise<void> => {

      if (
        !props.onAssignAdministrator ||
        !administratorId
      ) {
        return;
      }


      try {

        setSaving(true);
        setError("");

        await props.onAssignAdministrator(
          administratorId
        );

      } catch (err) {

        console.error(
          "Unable to assign administrator.",
          err
        );

        setError(
          getErrorMessage(
            err,
            "Unable to assign administrator."
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
    (): void => {

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


      if (
        decision === "Approve"
      ) {

        void approve();

        return;
      }


      void reject();
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
              props.request.Status ||
              "Under Review"
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
              displayValue(
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

      </div>


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


        <div className="reviewRow">

          <div className="reviewKey">
            Reason(s) for Absence
          </div>

          <div className="reviewValue">

            {
              (
                props.request.AbsenceReasons ||
                []
              ).length > 0
                ? (
                    props.request.AbsenceReasons ||
                    []
                  ).join(", ")
                : "-"
            }

          </div>

        </div>


        {
          props.request
            .ReasonOtherComments &&
          (
            <div className="reviewRow">

              <div className="reviewKey">
                Additional Details
              </div>

              <div className="reviewValue">

                {
                  props.request
                    .ReasonOtherComments
                }

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
                  No supporting evidence
                  has been attached.
                </div>
              )
            : (
                <ul className="attachmentList">

                  {
                    attachments.map(
                      attachment => (

                        <li
                          key={
                            attachment.FileName
                          }
                        >

                          <div>

                            <span className="fileIcon">
                              FILE
                            </span>

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

                          </div>

                        </li>
                      )
                    )
                  }

                </ul>
              )
        }

      </div>


      {/* ===============================================
          AUTHORISED SIGNATORY
         =============================================== */}

      <div className="reviewSection">

        <h2>
          Authorised Signatory
        </h2>


        <div className="reviewRow">

          <div className="reviewKey">
            Assigned Signatory
          </div>

          <div className="reviewValue">

            {
              props.request.Signatory
                ? props.request
                    .Signatory.Title
                : "-"
            }

          </div>

        </div>

      </div>


      {/* ===============================================
          ADMIN ASSIGNMENT
         =============================================== */}

      {
        props.adminMode &&
        (
          <div className="reviewSection adminSection">

            <h2>
              Admin Assignment
            </h2>

            <p className="sectionIntro">
              Administrators can reassign
              the request at any workflow
              stage.
            </p>


            <div className="formGroup">

              <label htmlFor="adminSignatory">
                Authorised Signatory
              </label>

              <select
                id="adminSignatory"
                value={
                  signatoryId || ""
                }
                onChange={
                  e =>
                    setSignatoryId(
                      Number(
                        e.target.value
                      ) || 0
                    )
                }
              >

                <option value="">
                  Select signatory
                </option>

                {
                  (
                    props.userOptions ||
                    []
                  ).map(
                    user => (

                      <option
                        key={user.Id}
                        value={user.Id}
                      >

                        {user.Title}

                        {
                          user.Email
                            ? " - " +
                              user.Email
                            : ""
                        }

                      </option>
                    )
                  )
                }

              </select>


              <button
                type="button"
                className="secondaryButton"
                disabled={
                  saving ||
                  !signatoryId
                }
                onClick={
                  () => {
                    void assignSignatory();
                  }
                }
              >
                Save Signatory
              </button>

            </div>


            <div className="formGroup">

              <label htmlFor="adminAdministrator">
                Administrator
              </label>

              <select
                id="adminAdministrator"
                value={
                  administratorId || ""
                }
                onChange={
                  e =>
                    setAdministratorId(
                      Number(
                        e.target.value
                      ) || 0
                    )
                }
              >

                <option value="">
                  Select administrator
                </option>

                {
                  (
                    props.userOptions ||
                    []
                  ).map(
                    user => (

                      <option
                        key={user.Id}
                        value={user.Id}
                      >

                        {user.Title}

                        {
                          user.Email
                            ? " - " +
                              user.Email
                            : ""
                        }

                      </option>
                    )
                  )
                }

              </select>


              <button
                type="button"
                className="secondaryButton"
                disabled={
                  saving ||
                  !administratorId
                }
                onClick={
                  () => {
                    void assignAdministrator();
                  }
                }
              >
                Save Administrator
              </button>

            </div>

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
          onClick={
            submitDecision
          }
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