import * as React from "react";

import {
  IRequest,
  IUserOption,
  IValidationError,
  emptyRequest,
  toSharePointUser,
  toUserOption
} from "../../models/Models";
import { PeoplePicker } from "../../controls/PeoplePicker";
import { IAdminTermOption } from "../../controls/AdminManagedMetadata";



interface Props {
  initial: IRequest;

  adminMode?: boolean;

  // Existing SharePoint users
  userOptions?: IUserOption[];

  // Administrator taxonomy options
  adminOptions?: IAdminTermOption[];

  adminOptionsLoading?: boolean;

  // Dynamic SharePoint AbsenceReasons choices
  absenceReasonOptions: string[];

  onSearchUsers: (
    searchText: string
  ) => Promise<IUserOption[]>;

  onResolveUser: (
    user: IUserOption
  ) => Promise<IUserOption>;

  onSaveDraft: (
    request: IRequest,
    files: File[],
    deletedFiles: string[]
  ) => Promise<void>;

  /** Used when an Admin edits an existing workflow item. */
  onAdminSave?: (
    request: IRequest,
    files: File[],
    deletedFiles: string[]
  ) => Promise<void>;

  onSubmit: (
    request: IRequest,
    files: File[],
    deletedFiles: string[]
  ) => Promise<void>;

  onCancel: () => void;
}


const createSafeRequest =
  (
    sourceRequest?: IRequest
  ):
  IRequest => {

    const source =
      sourceRequest ||
      emptyRequest();


    return {

      ...emptyRequest(),

      ...source,

      Title:
        source.Title || "",

      Stage:
        source.Stage || "Student",

      Status:
        source.Status || "Draft",

      AbsenceReasons:
        source.AbsenceReasons
          ? source.AbsenceReasons.slice()
          : [],

      AbsenceReasonsConfirm:
        source.AbsenceReasonsConfirm
          ? source.AbsenceReasonsConfirm.slice()
          : [],

      MonitoringConditions:
        source.MonitoringConditions
          ? source.MonitoringConditions.slice()
          : [],

      AttachmentFiles:
        source.AttachmentFiles
          ? source.AttachmentFiles.slice()
          : []
    };
  };


const StudentRequestForm:
React.FC<Props> = (
  props
) => {

  const [
    request,
    setRequest
  ] =
    React.useState<IRequest>(
      () =>
        createSafeRequest(
          props.initial
        )
    );


  const [
    step,
    setStep
  ] =
    React.useState<number>(
      1
    );


  const [
    files,
    setFiles
  ] =
    React.useState<File[]>(
      []
    );


  const [
    deletedFiles,
    setDeletedFiles
  ] =
    React.useState<string[]>(
      []
    );


  const [
    errors,
    setErrors
  ] =
    React.useState<IValidationError[]>(
      []
    );


  const [
    saving,
    setSaving
  ] =
    React.useState<boolean>(
      false
    );


  const [
    pageError,
    setPageError
  ] =
    React.useState<string>(
      ""
    );


  React.useEffect(
    () => {

      setRequest(
        createSafeRequest(
          props.initial
        )
      );


      setFiles([]);


      setDeletedFiles([]);


      setErrors([]);


      setPageError("");


      setStep(
        1
      );

    },
    [
      props.initial
    ]
  );


  const update =
    (
      patch: Partial<IRequest>
    ):
    void => {

      setRequest(
        current => ({

          ...current,

          ...patch
        })
      );
    };


  const getFieldError =
    (
      field: string
    ):
    string | undefined => {

      for (
        let i = 0;
        i < errors.length;
        i++
      ) {

        if (
          errors[i].field === field
        ) {

          return errors[i].message;
        }
      }


      return undefined;
    };


  const clearFieldError =
    (
      field: string
    ):
    void => {

      setErrors(
        current =>
          current.filter(
            error =>
              error.field !== field
          )
      );
    };


  const addError =
    (
      target: IValidationError[],
      field: string,
      message: string
    ):
    void => {

      target.push({

        field:
          field,

        message:
          message
      });
    };


  const selectedStudent:
    IUserOption | undefined =
      toUserOption(
        request.Student
      );


  /* =====================================================
     VALIDATION
     ===================================================== */

  const validateStep1 =
    ():
    boolean => {

      const validation:
        IValidationError[] = [];


      if (
        !request.StudentId
      ) {

        addError(
          validation,
          "Student",
          "Select a student."
        );
      }


      if (
        !request.Title ||
        !request.Title.trim()
      ) {

        addError(
          validation,
          "Title",
          "Enter the Student ID."
        );
      }


      if (
        !request.DoB
      ) {

        addError(
          validation,
          "DoB",
          "Enter the student's date of birth."
        );
      }


      if (
        !request.LevelOfStudy
      ) {

        addError(
          validation,
          "LevelOfStudy",
          "Select the level of study."
        );
      }


      if (
        !request.Programme ||
        !request.Programme.trim()
      ) {

        addError(
          validation,
          "Programme",
          "Enter the programme."
        );
      }


      setErrors(
        validation
      );


      return (
        validation.length === 0
      );
    };


  const validateStep2 =
    ():
    boolean => {

      const validation:
        IValidationError[] = [];


      if (
        !request.AbsenceStartDate
      ) {

        addError(
          validation,
          "AbsenceStartDate",
          "Enter the absence start date."
        );
      }


      if (
        !request.AbsenceEndDate
      ) {

        addError(
          validation,
          "AbsenceEndDate",
          "Enter the absence end date."
        );
      }


      if (
        request.AbsenceStartDate &&
        request.AbsenceEndDate &&
        request.AbsenceEndDate <
          request.AbsenceStartDate
      ) {

        addError(
          validation,
          "AbsenceEndDate",
          "The absence end date cannot be before the start date."
        );
      }


      if (
        !request.AbsenceReasons ||
        request.AbsenceReasons.length === 0
      ) {

        addError(
          validation,
          "AbsenceReasons",
          "Select at least one reason for absence."
        );
      }


      setErrors(
        validation
      );


      return (
        validation.length === 0
      );
    };


  const validateStep3 =
    ():
    boolean => {

      const validation:
        IValidationError[] = [];


      if (
        !request.TravelOutside
      ) {

        addError(
          validation,
          "TravelOutside",
          "Select whether you will travel outside the UK."
        );
      }


      if (
        request.TravelOutside === "Yes" &&
        (
          !request.TravelOutsideDetails ||
          !request.TravelOutsideDetails.trim()
        )
      ) {

        addError(
          validation,
          "TravelOutsideDetails",
          "Enter details about travel outside the UK."
        );
      }


      if (
        !request
          .letterofconfirmationforauthorise
      ) {

        addError(
          validation,
          "letterofconfirmationforauthorise",
          "Select whether you require a letter of confirmation."
        );
      }


      if (
        request
          .letterofconfirmationforauthorise ===
          "Yes" &&
        (
          !request
            .Reasonforrequestingaletter ||
          !request
            .Reasonforrequestingaletter
            .trim()
        )
      ) {

        addError(
          validation,
          "Reasonforrequestingaletter",
          "Enter the reason for requesting a letter."
        );
      }


      setErrors(
        validation
      );


      return (
        validation.length === 0
      );
    };


  const validateCurrentStep =
    ():
    boolean => {

      if (
        step === 1
      ) {

        return validateStep1();
      }


      if (
        step === 2
      ) {

        return validateStep2();
      }


      if (
        step === 3
      ) {

        return validateStep3();
      }


      setErrors([]);


      return true;
    };


  const validateAll =
    ():
    boolean => {

      const validation:
        IValidationError[] = [];


      if (
        !request.StudentId
      ) {

        addError(
          validation,
          "Student",
          "Select a student."
        );
      }


      if (
        !request.Title ||
        !request.Title.trim()
      ) {

        addError(
          validation,
          "Title",
          "Enter the Student ID."
        );
      }


      if (
        !request.DoB
      ) {

        addError(
          validation,
          "DoB",
          "Enter the student's date of birth."
        );
      }


      if (
        !request.LevelOfStudy
      ) {

        addError(
          validation,
          "LevelOfStudy",
          "Select the level of study."
        );
      }


      if (
        !request.Programme ||
        !request.Programme.trim()
      ) {

        addError(
          validation,
          "Programme",
          "Enter the programme."
        );
      }


      if (
        !request.AbsenceStartDate
      ) {

        addError(
          validation,
          "AbsenceStartDate",
          "Enter the absence start date."
        );
      }


      if (
        !request.AbsenceEndDate
      ) {

        addError(
          validation,
          "AbsenceEndDate",
          "Enter the absence end date."
        );
      }


      if (
        request.AbsenceStartDate &&
        request.AbsenceEndDate &&
        request.AbsenceEndDate <
          request.AbsenceStartDate
      ) {

        addError(
          validation,
          "AbsenceEndDate",
          "The absence end date cannot be before the start date."
        );
      }


      if (
        !request.AbsenceReasons ||
        request.AbsenceReasons.length === 0
      ) {

        addError(
          validation,
          "AbsenceReasons",
          "Select at least one reason for absence."
        );
      }


      if (
        !request.TravelOutside
      ) {

        addError(
          validation,
          "TravelOutside",
          "Select whether you will travel outside the UK."
        );
      }


      if (
        request.TravelOutside === "Yes" &&
        (
          !request.TravelOutsideDetails ||
          !request.TravelOutsideDetails.trim()
        )
      ) {

        addError(
          validation,
          "TravelOutsideDetails",
          "Enter details about travel outside the UK."
        );
      }


      if (
        !request
          .letterofconfirmationforauthorise
      ) {

        addError(
          validation,
          "letterofconfirmationforauthorise",
          "Select whether you require a letter of confirmation."
        );
      }


      if (
        request
          .letterofconfirmationforauthorise ===
          "Yes" &&
        (
          !request
            .Reasonforrequestingaletter ||
          !request
            .Reasonforrequestingaletter
            .trim()
        )
      ) {

        addError(
          validation,
          "Reasonforrequestingaletter",
          "Enter the reason for requesting a letter."
        );
      }


      setErrors(
        validation
      );


      if (
        validation.length > 0
      ) {

        const firstField =
          validation[0].field;


        if (
          firstField === "Student" ||
          firstField === "Title" ||
          firstField === "DoB" ||
          firstField === "LevelOfStudy" ||
          firstField === "Programme"
        ) {

          setStep(
            1
          );

        } else if (
          firstField === "AbsenceStartDate" ||
          firstField === "AbsenceEndDate" ||
          firstField === "AbsenceReasons"
        ) {

          setStep(
            2
          );

        } else {

          setStep(
            3
          );
        }


        return false;
      }


      return true;
    };


  /* =====================================================
     NAVIGATION
     ===================================================== */

  const next =
    ():
    void => {

      setPageError("");


      if (
        !validateCurrentStep()
      ) {

        window.scrollTo(
          0,
          0
        );


        return;
      }


      if (
        step < 5
      ) {

        setStep(
          step + 1
        );


        setErrors([]);


        window.scrollTo(
          0,
          0
        );
      }
    };


  const back =
    ():
    void => {

      setPageError("");


      setErrors([]);


      if (
        step > 1
      ) {

        setStep(
          step - 1
        );


        window.scrollTo(
          0,
          0
        );

      } else {

        props.onCancel();
      }
    };


  /* =====================================================
     SAVE
     ===================================================== */

  const saveDraft =
    async ():
    Promise<void> => {

      if (
        saving
      ) {

        return;
      }


      try {

        setSaving(
          true
        );


        setPageError("");


        /*
         * Admin editing an existing workflow item
         * should not reset it to Draft.
         */
        if (
          props.adminMode &&
          request.Id &&
          props.onAdminSave
        ) {

          await props.onAdminSave(
            request,
            files,
            deletedFiles
          );

        } else {

          await props.onSaveDraft(
            request,
            files,
            deletedFiles
          );
        }


        props.onCancel();

      } catch (error) {

        console.error(
          "Unable to save request.",
          error
        );


        setPageError(
          error instanceof Error
            ? error.message
            : "Unable to save the request."
        );


        window.scrollTo(
          0,
          0
        );

      } finally {

        setSaving(
          false
        );
      }
    };


  const submit =
    async ():
    Promise<void> => {

      if (
        saving
      ) {

        return;
      }


      if (
        !validateAll()
      ) {

        window.scrollTo(
          0,
          0
        );


        return;
      }


      try {

        setSaving(
          true
        );


        setPageError("");


        await props.onSubmit(
          request,
          files,
          deletedFiles
        );


        props.onCancel();

      } catch (error) {

        console.error(
          "Unable to submit request.",
          error
        );


        setPageError(
          error instanceof Error
            ? error.message
            : "Unable to submit the request."
        );


        window.scrollTo(
          0,
          0
        );

      } finally {

        setSaving(
          false
        );
      }
    };


  /* =====================================================
     ABSENCE REASONS
     ===================================================== */

  const reasonOptions: string[] =
    props.absenceReasonOptions || [];


  const toggleReason =
    (
      reason: string
    ):
    void => {

      const current =
        request.AbsenceReasons
          ? request.AbsenceReasons.slice()
          : [];


      const index =
        current.indexOf(
          reason
        );


      if (
        index === -1
      ) {

        current.push(
          reason
        );

      } else {

        current.splice(
          index,
          1
        );
      }


      update({

        AbsenceReasons:
          current
      });


      clearFieldError(
        "AbsenceReasons"
      );
    };


  /* =====================================================
     FILES
     ===================================================== */

  const allowedExtensions =
    [
      ".pdf",
      ".doc",
      ".docx",
      ".jpg",
      ".jpeg",
      ".png"
    ];


  const addFiles =
    (
      event:
        React.ChangeEvent<HTMLInputElement>
    ):
    void => {

      const selected =
        event.target.files;


      if (
        !selected
      ) {

        return;
      }


      const newFiles:
        File[] = [];


      let validationMessage =
        "";


      for (
        let i = 0;
        i < selected.length;
        i++
      ) {

        const file =
          selected[i];


        const lowerName =
          file.name.toLowerCase();


        const dot =
          lowerName.lastIndexOf(".");


        const extension =
          dot >= 0
            ? lowerName.substring(
                dot
              )
            : "";


        if (
          allowedExtensions.indexOf(
            extension
          ) === -1
        ) {

          validationMessage =
            "Only PDF, DOC, DOCX, JPG, JPEG and PNG files are allowed.";


          continue;
        }


        const maxSize =
          10 *
          1024 *
          1024;


        if (
          file.size >
          maxSize
        ) {

          validationMessage =
            "Each attachment must be 10 MB or smaller.";


          continue;
        }


        newFiles.push(
          file
        );
      }


      if (
        validationMessage
      ) {

        setPageError(
          validationMessage
        );
      }


      if (
        newFiles.length > 0
      ) {

        setFiles(
          current =>
            current.concat(
              newFiles
            )
        );
      }


      event.target.value =
        "";
    };


  const removeNewFile =
    (
      index: number
    ):
    void => {

      setFiles(
        current =>
          current.filter(
            (
              unused,
              currentIndex
            ) =>
              currentIndex !== index
          )
      );
    };


  const markExistingFileDeleted =
    (
      fileName: string
    ):
    void => {

      if (
        deletedFiles.indexOf(
          fileName
        ) !== -1
      ) {

        return;
      }


      setDeletedFiles(
        current =>
          current.concat(
            [
              fileName
            ]
          )
      );
    };


  const undoExistingFileDelete =
    (
      fileName: string
    ):
    void => {

      setDeletedFiles(
        current =>
          current.filter(
            item =>
              item !== fileName
          )
      );
    };


  /* =====================================================
     STEPPER
     ===================================================== */

  const renderStepper =
    ():
    JSX.Element => {

      const labels =
        [
          "Student details",
          "Absence details",
          "Travel / Letter",
          "Evidence",
          "Review"
        ];


      return (

        <div
          className="stepper"
          aria-label="Request progress"
        >

          {
            labels.map(
              (
                label,
                index
              ) => {

                const number =
                  index + 1;


                let className =
                  "step";


                if (
                  number === step
                ) {

                  className +=
                    " active";

                } else if (
                  number < step
                ) {

                  className +=
                    " done";
                }


                return (

                  <div
                    className={className}
                    key={label}
                  >

                    <span>
                      {number}
                    </span>

                    <strong>
                      {label}
                    </strong>

                  </div>
                );
              }
            )
          }

        </div>
      );
    };


  /* =====================================================
     STEP 1
     ===================================================== */

  const renderStudentDetails =
    ():
    JSX.Element => {

      return (

        <div className="formPage">

          <h2>
            Student details
          </h2>


          <p className="sectionIntro">
            Enter the details of the student making the authorised absence request.
          </p>


          <PeoplePicker
            id="student"
            label="Student"
            required
            value={selectedStudent}
            disabled={false}
            error={
              getFieldError(
                "Student"
              )
            }
            onSearch={
              props.onSearchUsers
            }
            onResolve={
              props.onResolveUser
            }
            onChange={
              user => {

                update({

                  StudentId:
                    user
                      ? user.Id
                      : undefined,

                  Student:
                    user
                      ? toSharePointUser(
                          user
                        )
                      : undefined
                });


                clearFieldError(
                  "Student"
                );
              }
            }
          />


          <div className="formGroup">

            <label htmlFor="studentId">

              Student ID

              <span className="required">
                {" *"}
              </span>

            </label>


            <input
              id="studentId"
              type="text"
              value={
                request.Title || ""
              }
              aria-invalid={
                !!getFieldError(
                  "Title"
                )
              }
              onChange={
                event => {

                  update({

                    Title:
                      event.target.value
                  });


                  clearFieldError(
                    "Title"
                  );
                }
              }
            />


            {
              getFieldError(
                "Title"
              ) &&
              <div className="errorMessage">

                {
                  getFieldError(
                    "Title"
                  )
                }

              </div>
            }

          </div>


          <div className="formRow">

            <div className="formGroup">

              <label htmlFor="dob">

                Date of birth

                <span className="required">
                  {" *"}
                </span>

              </label>


              <input
                id="dob"
                type="date"
                value={
                  request.DoB || ""
                }
                aria-invalid={
                  !!getFieldError(
                    "DoB"
                  )
                }
                onChange={
                  event => {

                    update({

                      DoB:
                        event.target.value
                    });


                    clearFieldError(
                      "DoB"
                    );
                  }
                }
              />


              {
                getFieldError(
                  "DoB"
                ) &&
                <div className="errorMessage">

                  {
                    getFieldError(
                      "DoB"
                    )
                  }

                </div>
              }

            </div>


            <div className="formGroup">

              <label htmlFor="levelOfStudy">

                Level of study

                <span className="required">
                  {" *"}
                </span>

              </label>


              <select
                id="levelOfStudy"
                value={
                  request.LevelOfStudy ||
                  ""
                }
                aria-invalid={
                  !!getFieldError(
                    "LevelOfStudy"
                  )
                }
                onChange={
                  event => {

                    update({

                      LevelOfStudy:
                        event.target.value
                    });


                    clearFieldError(
                      "LevelOfStudy"
                    );
                  }
                }
              >

                <option value="">
                  Select
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


              {
                getFieldError(
                  "LevelOfStudy"
                ) &&
                <div className="errorMessage">

                  {
                    getFieldError(
                      "LevelOfStudy"
                    )
                  }

                </div>
              }

            </div>

          </div>


          <div className="formGroup">

            <label htmlFor="programme">

              Programme

              <span className="required">
                {" *"}
              </span>

            </label>


            <input
              id="programme"
              type="text"
              value={
                request.Programme ||
                ""
              }
              aria-invalid={
                !!getFieldError(
                  "Programme"
                )
              }
              onChange={
                event => {

                  update({

                    Programme:
                      event.target.value
                  });


                  clearFieldError(
                    "Programme"
                  );
                }
              }
            />


            {
              getFieldError(
                "Programme"
              ) &&
              <div className="errorMessage">

                {
                  getFieldError(
                    "Programme"
                  )
                }

              </div>
            }

          </div>

        </div>
      );
    };


  /* =====================================================
     STEP 2
     ===================================================== */

  const renderAbsenceDetails =
    ():
    JSX.Element => {

      return (

        <div className="formPage">

          <h2>
            Absence details
          </h2>


          <p className="sectionIntro">
            Enter the dates and reason for the requested absence.
          </p>


          <div className="formRow">

            <div className="formGroup">

              <label htmlFor="absenceStartDate">

                Start date

                <span className="required">
                  {" *"}
                </span>

              </label>


              <input
                id="absenceStartDate"
                type="date"
                value={
                  request.AbsenceStartDate ||
                  ""
                }
                aria-invalid={
                  !!getFieldError(
                    "AbsenceStartDate"
                  )
                }
                onChange={
                  event => {

                    update({

                      AbsenceStartDate:
                        event.target.value
                    });


                    clearFieldError(
                      "AbsenceStartDate"
                    );
                  }
                }
              />


              {
                getFieldError(
                  "AbsenceStartDate"
                ) &&
                <div className="errorMessage">

                  {
                    getFieldError(
                      "AbsenceStartDate"
                    )
                  }

                </div>
              }

            </div>


            <div className="formGroup">

              <label htmlFor="absenceEndDate">

                End date

                <span className="required">
                  {" *"}
                </span>

              </label>


              <input
                id="absenceEndDate"
                type="date"
                value={
                  request.AbsenceEndDate ||
                  ""
                }
                aria-invalid={
                  !!getFieldError(
                    "AbsenceEndDate"
                  )
                }
                onChange={
                  event => {

                    update({

                      AbsenceEndDate:
                        event.target.value
                    });


                    clearFieldError(
                      "AbsenceEndDate"
                    );
                  }
                }
              />


              {
                getFieldError(
                  "AbsenceEndDate"
                ) &&
                <div className="errorMessage">

                  {
                    getFieldError(
                      "AbsenceEndDate"
                    )
                  }

                </div>
              }

            </div>

          </div>


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
              reasonOptions.map(
                reason => (

                  <label
                    className="check"
                    key={reason}
                  >

                    <input
                      type="checkbox"
                      checked={
                        (
                          request.AbsenceReasons ||
                          []
                        ).indexOf(
                          reason
                        ) !== -1
                      }
                      onChange={
                        () => {

                          toggleReason(
                            reason
                          );
                        }
                      }
                    />

                    <span>
                      {reason}
                    </span>

                  </label>
                )
              )
            }


            {
              getFieldError(
                "AbsenceReasons"
              ) &&
              <div className="errorMessage">

                {
                  getFieldError(
                    "AbsenceReasons"
                  )
                }

              </div>
            }

          </fieldset>


          {
            (
              request.AbsenceReasons ||
              []
            ).indexOf(
              "Other"
            ) !== -1 &&
            <div className="formGroup">

              <label htmlFor="otherReason">
                Other reason
              </label>


              <textarea
                id="otherReason"
                rows={4}
                value={
                  request
                    .ReasonOtherComments ||
                  ""
                }
                onChange={
                  event => {

                    update({

                      ReasonOtherComments:
                        event.target.value
                    });
                  }
                }
              />

            </div>
          }


          {
            (
              request.AbsenceReasons ||
              []
            ).indexOf(
              "Family illness"
            ) !== -1 &&
            <div className="formGroup">

              <label htmlFor="familyIllnessDetails">
                Family illness details
              </label>


              <textarea
                id="familyIllnessDetails"
                rows={4}
                value={
                  request
                    .FamilyIllnessDetails ||
                  ""
                }
                onChange={
                  event => {

                    update({

                      FamilyIllnessDetails:
                        event.target.value
                    });
                  }
                }
              />

            </div>
          }


          {
            (
              request.AbsenceReasons ||
              []
            ).indexOf(
              "Medical"
            ) !== -1 &&
            <div className="formGroup">

              <label htmlFor="medicalEvidenceDetails">
                Medical evidence details
              </label>


              <textarea
                id="medicalEvidenceDetails"
                rows={4}
                value={
                  request
                    .MedicalEvidenceDetails ||
                  ""
                }
                onChange={
                  event => {

                    update({

                      MedicalEvidenceDetails:
                        event.target.value
                    });
                  }
                }
              />

            </div>
          }

        </div>
      );
    };


  /* =====================================================
     STEP 3
     ===================================================== */

  const renderTravelLetter =
    ():
    JSX.Element => {

      return (

        <div className="formPage">

          <h2>
            Travel and confirmation letter
          </h2>


          <div className="formGroup">

            <label htmlFor="travelOutside">

              Will you travel outside the UK during the absence?

              <span className="required">
                {" *"}
              </span>

            </label>


            <select
              id="travelOutside"
              value={
                request.TravelOutside ||
                ""
              }
              aria-invalid={
                !!getFieldError(
                  "TravelOutside"
                )
              }
              onChange={
                event => {

                  const value =
                    event.target.value;


                  update({

                    TravelOutside:
                      value,

                    TravelOutsideDetails:
                      value === "Yes"
                        ? request
                            .TravelOutsideDetails
                        : ""
                  });


                  clearFieldError(
                    "TravelOutside"
                  );


                  if (
                    value !== "Yes"
                  ) {

                    clearFieldError(
                      "TravelOutsideDetails"
                    );
                  }
                }
              }
            >

              <option value="">
                Select
              </option>

              <option value="Yes">
                Yes
              </option>

              <option value="No">
                No
              </option>

            </select>


            {
              getFieldError(
                "TravelOutside"
              ) &&
              <div className="errorMessage">

                {
                  getFieldError(
                    "TravelOutside"
                  )
                }

              </div>
            }

          </div>


          {
            request.TravelOutside ===
              "Yes" &&
            <div className="formGroup">

              <label htmlFor="travelOutsideDetails">

                Travel details

                <span className="required">
                  {" *"}
                </span>

              </label>


              <textarea
                id="travelOutsideDetails"
                rows={4}
                value={
                  request
                    .TravelOutsideDetails ||
                  ""
                }
                aria-invalid={
                  !!getFieldError(
                    "TravelOutsideDetails"
                  )
                }
                onChange={
                  event => {

                    update({

                      TravelOutsideDetails:
                        event.target.value
                    });


                    clearFieldError(
                      "TravelOutsideDetails"
                    );
                  }
                }
              />


              {
                getFieldError(
                  "TravelOutsideDetails"
                ) &&
                <div className="errorMessage">

                  {
                    getFieldError(
                      "TravelOutsideDetails"
                    )
                  }

                </div>
              }

            </div>
          }


          <div className="formGroup">

            <label htmlFor="confirmationLetter">

              Do you require a letter confirming the authorised absence?

              <span className="required">
                {" *"}
              </span>

            </label>


            <select
              id="confirmationLetter"
              value={
                request
                  .letterofconfirmationforauthorise ||
                ""
              }
              aria-invalid={
                !!getFieldError(
                  "letterofconfirmationforauthorise"
                )
              }
              onChange={
                event => {

                  const value =
                    event.target.value;


                  update({

                    letterofconfirmationforauthorise:
                      value,

                    Reasonforrequestingaletter:
                      value === "Yes"
                        ? request
                            .Reasonforrequestingaletter
                        : ""
                  });


                  clearFieldError(
                    "letterofconfirmationforauthorise"
                  );


                  if (
                    value !== "Yes"
                  ) {

                    clearFieldError(
                      "Reasonforrequestingaletter"
                    );
                  }
                }
              }
            >

              <option value="">
                Select
              </option>

              <option value="Yes">
                Yes
              </option>

              <option value="No">
                No
              </option>

            </select>


            {
              getFieldError(
                "letterofconfirmationforauthorise"
              ) &&
              <div className="errorMessage">

                {
                  getFieldError(
                    "letterofconfirmationforauthorise"
                  )
                }

              </div>
            }

          </div>


          {
            request
              .letterofconfirmationforauthorise ===
              "Yes" &&
            <div className="formGroup">

              <label htmlFor="letterReason">

                Reason for requesting a letter

                <span className="required">
                  {" *"}
                </span>

              </label>


              <textarea
                id="letterReason"
                rows={4}
                value={
                  request
                    .Reasonforrequestingaletter ||
                  ""
                }
                aria-invalid={
                  !!getFieldError(
                    "Reasonforrequestingaletter"
                  )
                }
                onChange={
                  event => {

                    update({

                      Reasonforrequestingaletter:
                        event.target.value
                    });


                    clearFieldError(
                      "Reasonforrequestingaletter"
                    );
                  }
                }
              />


              {
                getFieldError(
                  "Reasonforrequestingaletter"
                ) &&
                <div className="errorMessage">

                  {
                    getFieldError(
                      "Reasonforrequestingaletter"
                    )
                  }

                </div>
              }

            </div>
          }

        </div>
      );
    };


  /* =====================================================
     STEP 4
     ===================================================== */

  const renderEvidence =
    ():
    JSX.Element => {

      const existingAttachments =
        request.AttachmentFiles ||
        [];


      return (

        <div className="formPage">

          <h2>
            Supporting evidence
          </h2>


          <p className="sectionIntro">
            Upload supporting evidence relevant to the absence request.
          </p>


          <div className="infoBox">

            Accepted file types: PDF, DOC, DOCX, JPG, JPEG and PNG.
            Maximum file size: 10 MB per file.

          </div>


          <div className="formGroup">

            <label htmlFor="evidenceFiles">
              Add evidence
            </label>


            <input
              id="evidenceFiles"
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              onChange={
                addFiles
              }
            />

          </div>


          {
            existingAttachments.length > 0 &&
            <div className="attachmentList">

              <h3>
                Existing attachments
              </h3>


              {
                existingAttachments.map(
                  attachment => {

                    const deleted =
                      deletedFiles.indexOf(
                        attachment.FileName
                      ) !== -1;


                    return (

                      <div
                        className="attachmentItem"
                        key={
                          attachment.FileName
                        }
                      >

                        <span className="fileIcon">
                          File
                        </span>


                        <a
                          href={
                            attachment.ServerRelativeUrl
                          }
                          target="_blank"
                          rel="noreferrer"
                        >
                          {
                            attachment.FileName
                          }
                        </a>


                        {
                          deleted
                            ? (
                              <button
                                type="button"
                                className="secondaryButton"
                                onClick={
                                  () => {

                                    undoExistingFileDelete(
                                      attachment.FileName
                                    );
                                  }
                                }
                              >
                                Undo remove
                              </button>
                            )
                            : (
                              <button
                                type="button"
                                className="linkDanger"
                                onClick={
                                  () => {

                                    markExistingFileDeleted(
                                      attachment.FileName
                                    );
                                  }
                                }
                              >
                                Remove
                              </button>
                            )
                        }

                      </div>
                    );
                  }
                )
              }

            </div>
          }


          {
            files.length > 0 &&
            <div className="attachmentList">

              <h3>
                New attachments
              </h3>


              {
                files.map(
                  (
                    file,
                    index
                  ) => (

                    <div
                      className="attachmentItem"
                      key={
                        file.name +
                        "-" +
                        index
                      }
                    >

                      <span className="fileIcon">
                        File
                      </span>


                      <span>
                        {file.name}
                      </span>


                      <button
                        type="button"
                        className="linkDanger"
                        onClick={
                          () => {

                            removeNewFile(
                              index
                            );
                          }
                        }
                      >
                        Remove
                      </button>

                    </div>
                  )
                )
              }

            </div>
          }

        </div>
      );
    };


  /* =====================================================
     STEP 5
     ===================================================== */

  const renderReview =
    ():
    JSX.Element => {

      return (

        <div className="formPage">

          <h2>
            Review your request
          </h2>


          <p className="sectionIntro">
            Check the information before submitting.
          </p>


          <dl className="summary">

            <div className="reviewRow">

              <dt className="reviewKey">
                Student
              </dt>

              <dd className="reviewValue">
                {
                  request.Student
                    ? request.Student.Title
                    : "-"
                }
              </dd>

            </div>


            <div className="reviewRow">

              <dt className="reviewKey">
                Student ID
              </dt>

              <dd className="reviewValue">
                {
                  request.Title ||
                  "-"
                }
              </dd>

            </div>


            <div className="reviewRow">

              <dt className="reviewKey">
                Date of birth
              </dt>

              <dd className="reviewValue">
                {
                  request.DoB ||
                  "-"
                }
              </dd>

            </div>


            <div className="reviewRow">

              <dt className="reviewKey">
                Level of study
              </dt>

              <dd className="reviewValue">
                {
                  request.LevelOfStudy ||
                  "-"
                }
              </dd>

            </div>


            <div className="reviewRow">

              <dt className="reviewKey">
                Programme
              </dt>

              <dd className="reviewValue">
                {
                  request.Programme ||
                  "-"
                }
              </dd>

            </div>


            <div className="reviewRow">

              <dt className="reviewKey">
                Absence dates
              </dt>

              <dd className="reviewValue">

                {
                  request.AbsenceStartDate ||
                  "-"
                }

                {" to "}

                {
                  request.AbsenceEndDate ||
                  "-"
                }

              </dd>

            </div>


            <div className="reviewRow">

              <dt className="reviewKey">
                Reason for absence
              </dt>

              <dd className="reviewValue">

                {
                  request.AbsenceReasons &&
                  request.AbsenceReasons.length > 0
                    ? request.AbsenceReasons.join(
                        ", "
                      )
                    : "-"
                }

              </dd>

            </div>


            <div className="reviewRow">

              <dt className="reviewKey">
                Travel outside UK
              </dt>

              <dd className="reviewValue">
                {
                  request.TravelOutside ||
                  "-"
                }
              </dd>

            </div>


            {
              request.TravelOutside ===
                "Yes" &&
              <div className="reviewRow">

                <dt className="reviewKey">
                  Travel details
                </dt>

                <dd className="reviewValue">
                  {
                    request
                      .TravelOutsideDetails ||
                    "-"
                  }
                </dd>

              </div>
            }


            <div className="reviewRow">

              <dt className="reviewKey">
                Confirmation letter
              </dt>

              <dd className="reviewValue">
                {
                  request
                    .letterofconfirmationforauthorise ||
                  "-"
                }
              </dd>

            </div>


            <div className="reviewRow">

              <dt className="reviewKey">
                Evidence
              </dt>

              <dd className="reviewValue">

                {
                  (
                    request.AttachmentFiles ||
                    []
                  ).filter(
                    attachment =>
                      deletedFiles.indexOf(
                        attachment.FileName
                      ) === -1
                  ).length +
                  files.length
                }

                {" file(s)"}

              </dd>

            </div>

          </dl>


          <div className="declarationBox">

            By submitting this request, you confirm that the information provided is accurate and complete.

          </div>

        </div>
      );
    };


  /* =====================================================
     RENDER STEP
     ===================================================== */

  const renderStep =
    ():
    JSX.Element => {

      if (
        step === 1
      ) {

        return renderStudentDetails();
      }


      if (
        step === 2
      ) {

        return renderAbsenceDetails();
      }


      if (
        step === 3
      ) {

        return renderTravelLetter();
      }


      if (
        step === 4
      ) {

        return renderEvidence();
      }


      return renderReview();
    };


  return (

    <div className="studentRequestForm">

      <div className="aaHeader">

        <div>

          <h1>
            Authorised Absence Request
          </h1>


          {
            request.Id &&
            <p>
              Request #{request.Id}
            </p>
          }

        </div>


        <span className="pill">
          {
            request.Status ||
            "Draft"
          }
        </span>

      </div>


      {
        renderStepper()
      }


      {
        pageError &&
        <div
          className="errorSummary"
          role="alert"
        >

          <strong>
            There is a problem
          </strong>

          <p>
            {pageError}
          </p>

        </div>
      }


      {
        errors.length > 0 &&
        <div
          className="errorSummary"
          role="alert"
        >

          <strong>
            Check the information entered
          </strong>

          <ul>

            {
              errors.map(
                (
                  error,
                  index
                ) => (

                  <li
                    key={
                      error.field +
                      "-" +
                      index
                    }
                  >
                    {error.message}
                  </li>
                )
              )
            }

          </ul>

        </div>
      }


      {
        renderStep()
      }


      <div className="actions">

        <button
          type="button"
          className="secondaryButton"
          disabled={saving}
          onClick={
            back
          }
        >

          {
            step === 1
              ? "Cancel"
              : "Back"
          }

        </button>


        <button
          type="button"
          className="secondaryButton"
          disabled={saving}
          onClick={
            () => {

              void saveDraft();
            }
          }
        >
          {
            saving
              ? "Saving..."
              : (
                  props.adminMode &&
                  request.Id
                    ? "Save changes"
                    : "Save draft"
                )
          }
        </button>


        {
          step < 5
            ? (
              <button
                type="button"
                className="primary"
                disabled={saving}
                onClick={
                  next
                }
              >
                Continue
              </button>
            )
            : (
              <button
                type="button"
                className="primary"
                disabled={saving}
                onClick={
                  () => {

                    void submit();
                  }
                }
              >
                {
                  saving
                    ? "Submitting..."
                    : "Submit request"
                }
              </button>
            )
        }

      </div>

    </div>
  );
};


export default StudentRequestForm;