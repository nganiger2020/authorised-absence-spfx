import * as React from "react";

import {
  FormStep,
  IRequest,
  IUserOption
} from "../../models/Models";


interface Props {

  initial: IRequest;

  adminMode?: boolean;

  userOptions?: IUserOption[];

  onSaveDraft: (
    r: IRequest,
    files: File[],
    deleted: string[]
  ) => Promise<void>;

  onSubmit: (
    r: IRequest,
    files: File[],
    deleted: string[]
  ) => Promise<void>;

  onCancel: () => void;
}


const reasons: string[] = [
  "Conference",
  "Dissertation – writing up in home country",
  "Extending visa",
  "Family illness/bereavement",
  "Fieldwork",
  "Holiday: PG research students only",
  "Medical",
  "Thesis – writing up in home country",
  "Other"
];


const stepLabels: string[] = [
  "Student Details",
  "Absence Details",
  "Travel / Letter",
  "Evidence",
  "Review & Submit"
];


export const StudentRequestForm:
React.FC<Props> = (p) => {

  const [r, setR] =
    React.useState<IRequest>({
      ...p.initial
    });

  const [step, setStep] =
    React.useState<FormStep>(1);

  const [files, setFiles] =
    React.useState<File[]>([]);

  const [deleted, setDeleted] =
    React.useState<string[]>([]);

  const [error, setError] =
    React.useState<string>("");

  const [saving, setSaving] =
    React.useState<boolean>(false);


  /* =====================================================
     UPDATE
  ===================================================== */

  const patch = (
    values: Partial<IRequest>
  ): void => {

    setR(
      current => ({
        ...current,
        ...values
      })
    );
  };


  /* =====================================================
     REASONS
  ===================================================== */

  const hasReason = (
    reason: string
  ): boolean => {

    return (
      (r.AbsenceReasons || [])
        .indexOf(reason) !== -1
    );
  };


  const toggleReason = (
    reason: string
  ): void => {

    const currentReasons =
      r.AbsenceReasons || [];

    if (
      currentReasons.indexOf(
        reason
      ) !== -1
    ) {

      patch({
        AbsenceReasons:
          currentReasons.filter(
            value =>
              value !== reason
          )
      });

    } else {

      patch({
        AbsenceReasons: [
          ...currentReasons,
          reason
        ]
      });
    }
  };


  /* =====================================================
     VALIDATION
  ===================================================== */

  const validateStep =
    (): string => {

      if (step === 1) {

        if (!r.Title) {
          return "Enter your Student ID.";
        }

        if (!r.LevelOfStudy) {
          return "Select your Level of Study.";
        }

        if (!r.Programme) {
          return "Enter your Programme of Study.";
        }
      }


      if (step === 2) {

        if (!r.AbsenceStartDate) {
          return "Enter the absence start date.";
        }

        if (!r.AbsenceEndDate) {
          return "Enter the absence end date.";
        }

        if (
          r.AbsenceStartDate >
          r.AbsenceEndDate
        ) {
          return (
            "End date must be on or " +
            "after the start date."
          );
        }

        if (
          (r.AbsenceReasons || [])
            .length === 0
        ) {
          return (
            "Select at least one reason " +
            "for your absence."
          );
        }

        if (
          hasReason("Other") &&
          !r.ReasonOtherComments
        ) {
          return (
            "Enter details for the " +
            "Other absence reason."
          );
        }
      }


      if (step === 3) {

        if (!r.TravelOutside) {
          return (
            "Select whether you will " +
            "travel outside the UK."
          );
        }

        if (
          r.TravelOutside === "Yes" &&
          !r.TravelOutsideDetails
        ) {
          return "Enter your travel details.";
        }

        if (
          !r
            .letterofconfirmationforauthorise
        ) {
          return (
            "Select whether you need " +
            "an approval letter."
          );
        }

        if (
          r
            .letterofconfirmationforauthorise ===
            "Yes" &&
          !r
            .Reasonforrequestingaletter
        ) {
          return (
            "Enter the reason for " +
            "requesting the letter."
          );
        }
      }

      return "";
    };


  /* =====================================================
     NAVIGATION
  ===================================================== */

  const next = (): void => {

    const validationError =
      validateStep();

    if (validationError) {

      setError(validationError);

      window.scrollTo(
        0,
        0
      );

      return;
    }

    setError("");

    setStep(
      (step + 1) as FormStep
    );

    window.scrollTo(
      0,
      0
    );
  };


  const back = (): void => {

    setError("");

    setStep(
      (step - 1) as FormStep
    );

    window.scrollTo(
      0,
      0
    );
  };


  /* =====================================================
     FILES
  ===================================================== */

  const handleFileChange = (
    event:
      React.ChangeEvent<HTMLInputElement>
  ): void => {

    const fileList =
      event.target.files;

    if (!fileList) {
      return;
    }

    const selectedFiles:
      File[] = [];


    for (
      let i = 0;
      i < fileList.length;
      i++
    ) {

      const file =
        fileList.item(i);

      if (file) {
        selectedFiles.push(
          file
        );
      }
    }


    setFiles(
      current => [
        ...current,
        ...selectedFiles
      ]
    );

    event.target.value = "";
  };


  const removeNewFile = (
    index: number
  ): void => {

    setFiles(
      files.filter(
        (
          _file,
          fileIndex
        ) =>
          fileIndex !== index
      )
    );
  };


  const deleteExistingFile = (
    fileName: string
  ): void => {

    if (
      deleted.indexOf(
        fileName
      ) === -1
    ) {

      setDeleted([
        ...deleted,
        fileName
      ]);
    }
  };


  const undoDelete = (
    fileName: string
  ): void => {

    setDeleted(
      deleted.filter(
        value =>
          value !== fileName
      )
    );
  };


  /* =====================================================
     SAVE
  ===================================================== */

  const saveDraft =
    async (): Promise<void> => {

      try {

        setSaving(true);
        setError("");

        await p.onSaveDraft(
          r,
          files,
          deleted
        );

      } catch (err) {

        console.error(
          "Save draft failed.",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Unable to save your draft."
        );

      } finally {

        setSaving(false);
      }
    };


  /* =====================================================
     FINAL VALIDATION
  ===================================================== */

  const validateAll =
    (): FormStep | 0 => {

      if (
        !r.Title ||
        !r.LevelOfStudy ||
        !r.Programme ||
        (p.adminMode && !r.StudentId)
      ) {
        return 1;
      }


      if (
        !r.AbsenceStartDate ||
        !r.AbsenceEndDate ||
        (r.AbsenceReasons || [])
          .length === 0
      ) {
        return 2;
      }


      if (
        r.AbsenceStartDate >
        r.AbsenceEndDate
      ) {
        return 2;
      }


      if (
        hasReason("Other") &&
        !r.ReasonOtherComments
      ) {
        return 2;
      }


      if (
        !r.TravelOutside ||
        !r
          .letterofconfirmationforauthorise
      ) {
        return 3;
      }


      if (
        r.TravelOutside === "Yes" &&
        !r.TravelOutsideDetails
      ) {
        return 3;
      }


      if (
        r
          .letterofconfirmationforauthorise ===
          "Yes" &&
        !r
          .Reasonforrequestingaletter
      ) {
        return 3;
      }


      return 0;
    };


  const submitRequest =
    async (): Promise<void> => {

      const invalidStep =
        validateAll();

      if (invalidStep !== 0) {

        setStep(invalidStep);

        setError(
          "Please complete all required fields before submitting your request."
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

        await p.onSubmit(
          r,
          files,
          deleted
        );

      } catch (err) {

        console.error(
          "Submit failed.",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Unable to submit your request."
        );

      } finally {

        setSaving(false);
      }
    };


  /* =====================================================
     ATTACHMENTS
  ===================================================== */

  const existing =
    r.AttachmentFiles || [];


  const existingActive =
    existing.filter(
      attachment =>
        deleted.indexOf(
          attachment.FileName
        ) === -1
    );


  const evidenceCount =
    existingActive.length +
    files.length;


  /* =====================================================
     RENDER
  ===================================================== */

  return (

    <div className="formPage">

      <div className="formTitle">

        <h1>
          Authorised Absence Request
        </h1>

        <p className="pageIntro">
          Use this form to request an
          authorised period of absence.
          Complete all required fields and
          provide supporting evidence where
          appropriate.
        </p>

        <p className="requiredMessage">
          <span className="required">
            *
          </span>
          {" "}
          Required information
        </p>

      </div>


      {/* =================================================
          STEPPER
      ================================================= */}

      <div className="stepper">

        {
          [1, 2, 3, 4, 5].map(
            stepNumber => {

              let stepClass =
                "";

              if (
                stepNumber === step
              ) {

                stepClass =
                  "active";

              } else if (
                stepNumber < step
              ) {

                stepClass =
                  "done";
              }


              return (

                <div
                  key={stepNumber}
                  className={
                    stepClass
                  }
                >

                  <b>
                    {stepNumber}
                  </b>

                  <span>
                    {
                      stepLabels[
                        stepNumber - 1
                      ]
                    }
                  </span>

                </div>
              );
            }
          )
        }

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


      {/* =================================================
          STEP 1
      ================================================= */}

      {
        step === 1 &&
        (
          <section>

            <h2>
              Student Details
            </h2>

            <p className="sectionIntro">
              Tell us about your student
              record and programme.
            </p>

            {p.adminMode && (
              <div className="formGroup">
                <label htmlFor="adminStudent">
                  Student <span className="required"> *</span>
                  <span className="hint">Select the student this request belongs to.</span>
                </label>
                <select
                  id="adminStudent"
                  value={r.StudentId || ""}
                  onChange={e => patch({ StudentId: Number(e.target.value) || undefined })}
                >
                  <option value="">Select student</option>
                  {(p.userOptions || []).map(user => (
                    <option key={user.Id} value={user.Id}>
                      {user.Title}{user.Email ? " - " + user.Email : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}


            <div className="formGroup">

              <label htmlFor="studentId">

                Student ID

                <span className="required">
                  {" *"}
                </span>

                <span className="hint">
                  Enter your University
                  student ID.
                </span>

              </label>

              <input
                id="studentId"
                type="text"
                value={
                  r.Title || ""
                }
                onChange={
                  e =>
                    patch({
                      Title:
                        e.target.value
                    })
                }
              />

            </div>


            <div className="formGroup">

              <label htmlFor="dob">

                Date of Birth

                <span className="hint">
                  Enter your date of birth.
                </span>

              </label>

              <input
                id="dob"
                type="date"
                value={
                  r.DoB
                    ? r.DoB.substring(
                        0,
                        10
                      )
                    : ""
                }
                onChange={
                  e =>
                    patch({
                      DoB:
                        e.target.value
                    })
                }
              />

            </div>


            <div className="formGroup">

              <label htmlFor="level">

                Level of Study

                <span className="required">
                  {" *"}
                </span>

              </label>

              <select
                id="level"
                value={
                  r.LevelOfStudy ||
                  ""
                }
                onChange={
                  e =>
                    patch({
                      LevelOfStudy:
                        e.target.value
                    })
                }
              >

                <option value="">
                  Select level of study
                </option>

                <option value="Undergraduate">
                  Undergraduate
                </option>

                <option value="Postgraduate Taught">
                  Postgraduate Taught
                </option>

                <option value="Postgraduate Research">
                  Postgraduate Research
                </option>

              </select>

            </div>


            <div className="formGroup">

              <label htmlFor="programme">

                Programme of Study

                <span className="required">
                  {" *"}
                </span>

                <span className="hint">
                  Enter the name of your
                  programme.
                </span>

              </label>

              <input
                id="programme"
                type="text"
                value={
                  r.Programme ||
                  ""
                }
                onChange={
                  e =>
                    patch({
                      Programme:
                        e.target.value
                    })
                }
              />

            </div>

          </section>
        )
      }


      {/* =================================================
          STEP 2
      ================================================= */}

      {
        step === 2 &&
        (
          <section>

            <h2>
              Absence Details
            </h2>

            <p className="sectionIntro">
              Tell us when you will be
              absent and why.
            </p>


            <div className="formRow">

              <div className="formGroup">

                <label htmlFor="startDate">

                  Start Date

                  <span className="required">
                    {" *"}
                  </span>

                </label>

                <input
                  id="startDate"
                  type="date"
                  value={
                    r.AbsenceStartDate
                      ? r
                          .AbsenceStartDate
                          .substring(0, 10)
                      : ""
                  }
                  onChange={
                    e =>
                      patch({
                        AbsenceStartDate:
                          e.target.value
                      })
                  }
                />

              </div>


              <div className="formGroup">

                <label htmlFor="endDate">

                  End Date

                  <span className="required">
                    {" *"}
                  </span>

                </label>

                <input
                  id="endDate"
                  type="date"
                  value={
                    r.AbsenceEndDate
                      ? r
                          .AbsenceEndDate
                          .substring(0, 10)
                      : ""
                  }
                  onChange={
                    e =>
                      patch({
                        AbsenceEndDate:
                          e.target.value
                      })
                  }
                />

              </div>

            </div>


            <fieldset>

              <legend>
                Reason(s) for absence
                <span className="required">
                  {" *"}
                </span>
              </legend>

              <span className="hint">
                Select all options that apply.
              </span>


              {
                reasons.map(
                  reason => (

                    <label
                      className="check"
                      key={reason}
                    >

                      <input
                        type="checkbox"
                        checked={
                          (
                            r.AbsenceReasons ||
                            []
                          ).indexOf(
                            reason
                          ) !== -1
                        }
                        onChange={
                          () =>
                            toggleReason(
                              reason
                            )
                        }
                      />

                      <span>
                        {reason}
                      </span>

                    </label>
                  )
                )
              }

            </fieldset>


            {
              hasReason("Other") &&
              (
                <div className="formGroup">

                  <label htmlFor="otherReason">

                    Details of Absence

                    <span className="required">
                      {" *"}
                    </span>

                  </label>

                  <textarea
                    id="otherReason"
                    rows={5}
                    value={
                      r
                        .ReasonOtherComments ||
                      ""
                    }
                    onChange={
                      e =>
                        patch({
                          ReasonOtherComments:
                            e.target.value
                        })
                    }
                  />

                </div>
              )
            }

          </section>
        )
      }


      {/* =================================================
          STEP 3
      ================================================= */}

      {
        step === 3 &&
        (
          <section>

            <h2>
              Travel and Letter Details
            </h2>

            <p className="sectionIntro">
              Tell us about any international
              travel and whether you require
              confirmation of approval.
            </p>


            <div className="formGroup">

              <label htmlFor="travelOutside">

                Will you be travelling
                outside the UK?

                <span className="required">
                  {" *"}
                </span>

              </label>

              <select
                id="travelOutside"
                value={
                  r.TravelOutside ||
                  ""
                }
                onChange={
                  e =>
                    patch({
                      TravelOutside:
                        e.target.value
                    })
                }
              >

                <option value="">
                  Select an option
                </option>

                <option value="Yes">
                  Yes
                </option>

                <option value="No">
                  No
                </option>

              </select>

            </div>


            {
              r.TravelOutside ===
                "Yes" &&
              (
                <div className="formGroup">

                  <label htmlFor="travelDetails">

                    Travel Details

                    <span className="required">
                      {" *"}
                    </span>

                    <span className="hint">
                      Provide details of your
                      destination and travel.
                    </span>

                  </label>

                  <textarea
                    id="travelDetails"
                    rows={5}
                    value={
                      r
                        .TravelOutsideDetails ||
                      ""
                    }
                    onChange={
                      e =>
                        patch({
                          TravelOutsideDetails:
                            e.target.value
                        })
                    }
                  />

                </div>
              )
            }


            <div className="formGroup">

              <label htmlFor="letterRequired">

                Do you need a letter
                confirming approval?

                <span className="required">
                  {" *"}
                </span>

              </label>

              <select
                id="letterRequired"
                value={
                  r
                    .letterofconfirmationforauthorise ||
                  ""
                }
                onChange={
                  e =>
                    patch({
                      letterofconfirmationforauthorise:
                        e.target.value
                    })
                }
              >

                <option value="">
                  Select an option
                </option>

                <option value="Yes">
                  Yes
                </option>

                <option value="No">
                  No
                </option>

              </select>

            </div>


            {
              r
                .letterofconfirmationforauthorise ===
                "Yes" &&
              (
                <div className="formGroup">

                  <label htmlFor="letterReason">

                    Reason for Requesting
                    a Letter

                    <span className="required">
                      {" *"}
                    </span>

                  </label>

                  <textarea
                    id="letterReason"
                    rows={5}
                    value={
                      r
                        .Reasonforrequestingaletter ||
                      ""
                    }
                    onChange={
                      e =>
                        patch({
                          Reasonforrequestingaletter:
                            e.target.value
                        })
                    }
                  />

                </div>
              )
            }

          </section>
        )
      }


      {/* =================================================
          STEP 4
      ================================================= */}

      {
        step === 4 &&
        (
          <section>

            <h2>
              Supporting Evidence
            </h2>

            <p className="sectionIntro">
              Upload supporting documents
              where appropriate.
            </p>


            <div className="infoBox">

              <strong>
                Accepted file types
              </strong>

              <p>
                PDF, Word documents and
                JPG/PNG images.
              </p>

            </div>


            <div className="formGroup">

              <label htmlFor="evidence">

                Add Evidence

                <span className="hint">
                  You can select more than
                  one file.
                </span>

              </label>

              <input
                id="evidence"
                type="file"
                multiple
                accept={
                  ".pdf,.doc,.docx," +
                  ".jpg,.jpeg,.png"
                }
                onChange={
                  handleFileChange
                }
              />

            </div>


            {
              existing.length === 0 &&
              files.length === 0 &&
              (
                <div className="emptyEvidence">
                  No evidence files have
                  been added.
                </div>
              )
            }


            {
              existing.length > 0 &&
              (
                <div className="attachmentList">

                  <h3>
                    Existing Evidence
                  </h3>

                  <ul>

                    {
                      existing.map(
                        attachment => {

                          const isDeleted =
                            deleted.indexOf(
                              attachment
                                .FileName
                            ) !== -1;


                          return (

                            <li
                              key={
                                attachment
                                  .FileName
                              }
                            >

                              <div>

                                <span className="fileIcon">
                                  DOC
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


                              {
                                isDeleted
                                  ? (
                                    <button
                                      type="button"
                                      onClick={
                                        () =>
                                          undoDelete(
                                            attachment
                                              .FileName
                                          )
                                      }
                                    >
                                      Undo
                                    </button>
                                  )
                                  : (
                                    <button
                                      type="button"
                                      className="linkDanger"
                                      onClick={
                                        () =>
                                          deleteExistingFile(
                                            attachment
                                              .FileName
                                          )
                                      }
                                    >
                                      Remove
                                    </button>
                                  )
                              }

                            </li>
                          );
                        }
                      )
                    }

                  </ul>

                </div>
              )
            }


            {
              files.length > 0 &&
              (
                <div className="attachmentList">

                  <h3>
                    New Evidence
                  </h3>

                  <ul>

                    {
                      files.map(
                        (
                          file,
                          index
                        ) => (

                          <li
                            key={
                              file.name +
                              "-" +
                              index
                            }
                          >

                            <div>

                              <span className="fileIcon">
                                FILE
                              </span>

                              <span>
                                {file.name}
                              </span>

                            </div>

                            <button
                              type="button"
                              className="linkDanger"
                              onClick={
                                () =>
                                  removeNewFile(
                                    index
                                  )
                              }
                            >
                              Remove
                            </button>

                          </li>
                        )
                      )
                    }

                  </ul>

                </div>
              )
            }

          </section>
        )
      }


      {/* =================================================
          STEP 5
      ================================================= */}

      {
        step === 5 &&
        (
          <section>

            <h2>
              Review and Submit
            </h2>

            <p className="sectionIntro">
              Check the information below
              before submitting your request.
            </p>


            <div className="summary">

              <h3>
                Student Details
              </h3>

              <p>
                <b>Student ID:</b>
                {" "}
                {r.Title}
              </p>

              <p>
                <b>Date of Birth:</b>
                {" "}
                {r.DoB || "-"}
              </p>

              <p>
                <b>Level of Study:</b>
                {" "}
                {r.LevelOfStudy}
              </p>

              <p>
                <b>Programme:</b>
                {" "}
                {r.Programme}
              </p>

              <button
                type="button"
                onClick={
                  () =>
                    setStep(1)
                }
              >
                Change
              </button>

            </div>


            <div className="summary">

              <h3>
                Absence Details
              </h3>

              <p>
                <b>Start Date:</b>
                {" "}
                {r.AbsenceStartDate}
              </p>

              <p>
                <b>End Date:</b>
                {" "}
                {r.AbsenceEndDate}
              </p>

              <p>
                <b>Reason(s):</b>
                {" "}
                {
                  (
                    r.AbsenceReasons ||
                    []
                  ).join(", ")
                }
              </p>


              {
                hasReason("Other") &&
                (
                  <p>
                    <b>
                      Other Details:
                    </b>
                    {" "}
                    {
                      r
                        .ReasonOtherComments
                    }
                  </p>
                )
              }


              <button
                type="button"
                onClick={
                  () =>
                    setStep(2)
                }
              >
                Change
              </button>

            </div>


            <div className="summary">

              <h3>
                Travel / Letter
              </h3>

              <p>
                <b>
                  Travelling Outside UK:
                </b>
                {" "}
                {
                  r.TravelOutside
                }
              </p>


              {
                r.TravelOutside ===
                  "Yes" &&
                (
                  <p>
                    <b>
                      Travel Details:
                    </b>
                    {" "}
                    {
                      r
                        .TravelOutsideDetails
                    }
                  </p>
                )
              }


              <p>
                <b>
                  Approval Letter:
                </b>
                {" "}
                {
                  r
                    .letterofconfirmationforauthorise
                }
              </p>


              {
                r
                  .letterofconfirmationforauthorise ===
                  "Yes" &&
                (
                  <p>
                    <b>
                      Letter Reason:
                    </b>
                    {" "}
                    {
                      r
                        .Reasonforrequestingaletter
                    }
                  </p>
                )
              }


              <button
                type="button"
                onClick={
                  () =>
                    setStep(3)
                }
              >
                Change
              </button>

            </div>


            <div className="summary">

              <h3>
                Supporting Evidence
              </h3>

              <p>
                <b>Files:</b>
                {" "}
                {evidenceCount}
              </p>


              {
                evidenceCount > 0 &&
                (
                  <ul>

                    {
                      existingActive.map(
                        attachment => (

                          <li
                            key={
                              attachment
                                .FileName
                            }
                          >
                            {
                              attachment
                                .FileName
                            }
                          </li>
                        )
                      )
                    }


                    {
                      files.map(
                        (
                          file,
                          index
                        ) => (

                          <li
                            key={
                              file.name +
                              "-" +
                              index
                            }
                          >
                            {file.name}
                          </li>
                        )
                      )
                    }

                  </ul>
                )
              }


              <button
                type="button"
                onClick={
                  () =>
                    setStep(4)
                }
              >
                Change
              </button>

            </div>


            <div className="declarationBox">

              <h3>
                Before you submit
              </h3>

              <p>
                Please check that the
                information you have provided
                is accurate and that you have
                included any supporting
                evidence required for your
                request.
              </p>

            </div>

          </section>
        )
      }


      {/* =================================================
          ACTIONS
      ================================================= */}

      <div className="actions">

        <button
          type="button"
          className="secondaryButton"
          disabled={saving}
          onClick={
            p.onCancel
          }
        >
          Cancel
        </button>


        {
          step > 1 &&
          (
            <button
              type="button"
              className="secondaryButton"
              disabled={saving}
              onClick={back}
            >
              Back
            </button>
          )
        }


        <button
          type="button"
          className="secondaryButton"
          disabled={saving}
          onClick={
            () => {
              saveDraft().catch(
                console.error
              );
            }
          }
        >
          {
            saving
              ? "Saving..."
              : p.adminMode
                ? "Save Changes"
                : "Save Draft"
          }
        </button>


        {
          step < 5
            ? (
              <button
                type="button"
                className="primary"
                disabled={saving}
                onClick={next}
              >
                Continue
              </button>
            )
            : (
              p.adminMode && p.initial.Id
                ? null
                : (
                  <button
                    type="button"
                    className="primary"
                    disabled={saving}
                    onClick={() => {
                      submitRequest().catch(console.error);
                    }}
                  >
                    {saving ? "Submitting..." : "Submit Request"}
                  </button>
                )
            )
        }

      </div>

    </div>
  );
};