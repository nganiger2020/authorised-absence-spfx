import { AppConfig } from "../../config/AppConfig";
import { requiresEvidence, isAllowedEvidenceName } from "../../models/Evidence";
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
import { AdminLookup, IAdminOption } from "../../controls/AdminLookup";
interface Props {
  initial: IRequest;
  adminMode?: boolean;
  // Existing SharePoint users
  userOptions?: IUserOption[];
  // Administrator lookup options
  adminOptions?: IAdminOption[];
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
  const validateAdditionalRequired = (validation: IValidationError[], page: number): void => {
    if (page === 1 && (!(request.AdminLabel || "").trim() || !request.AdminId)) {
      addError(validation, "Admin", "Select an administrator.");
    }
    if (page === 2) {
      const reasons = request.AbsenceReasons || [];
      if (reasons.indexOf("Other") >= 0 && !(request.ReasonOtherComments || "").trim()) {
        addError(validation, "ReasonOtherComments", "Enter the other reason details.");
      }
      if (reasons.indexOf("Family illness") >= 0 && !(request.FamilyIllnessDetails || "").trim()) {
        addError(validation, "FamilyIllnessDetails", "Enter family illness details.");
      }
      if (reasons.indexOf("Medical") >= 0 && !(request.MedicalEvidenceDetails || "").trim()) {
        addError(validation, "MedicalEvidenceDetails", "Enter medical evidence details.");
      }
    }
  };
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
      validateAdditionalRequired(validation, 1);
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
      validateAdditionalRequired(validation, 2);
      setErrors(
        validation
      );
      return (
        validation.length === 0
      );
    };
  const validateEvidence = (validation: IValidationError[]): void => {
    const retained = (request.AttachmentFiles || []).filter(file =>
      deletedFiles.indexOf(file.FileName) < 0 && isAllowedEvidenceName(file.FileName));
    if (requiresEvidence(request.AbsenceReasons) && retained.length + files.length === 0) {
      addError(validation, "AttachmentFiles", "Upload supporting evidence for medical, family illness, bereavement or conference absence.");
    }
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
      if (step === 3) {
        const validation: IValidationError[] = [];
        validateEvidence(validation);
        setErrors(validation);
        return validation.length === 0;
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
      validateEvidence(validation);
      [1, 2].forEach(page => validateAdditionalRequired(validation, page));
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
          firstField === "Programme" || firstField === "Admin"
        ) {
          setStep(
            1
          );
        } else if (
          firstField === "AbsenceStartDate" ||
          firstField === "AbsenceEndDate" ||
          firstField === "AbsenceReasons" ||
          firstField === "ReasonOtherComments" ||
          firstField === "FamilyIllnessDetails" ||
          firstField === "MedicalEvidenceDetails" ||
          firstField === "TravelOutside" || firstField === "TravelOutsideDetails"
        ) {
          setStep(
            2
          );
        } else if (firstField === "AttachmentFiles") {
          setStep(3);
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
        step < 4
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
  const [reasonNotice, setReasonNotice] = React.useState<string>("");
  const noticeRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!reasonNotice) { return; }
    const previousFocus = document.activeElement as HTMLElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const modal = noticeRef.current;
    if (modal) { modal.focus(); }
    const handleKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") { setReasonNotice(""); }
      if (event.key === "Tab" && modal) {
        const elements = modal.querySelectorAll<HTMLElement>('a[href], button');
        const first = elements[0];
        const last = elements[elements.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === modal)) {
          event.preventDefault(); last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === modal)) {
          event.preventDefault(); first.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
      if (previousFocus) { previousFocus.focus(); }
    };
  }, [reasonNotice]);
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
        const reasonKey = reason.trim().toLowerCase().replace(/[–—]/g, "-").replace(/\s+/g, " ");
        if (reasonKey === "extending visa") { setReasonNotice("visa"); }
        if (reasonKey === "thesis - writing up in home country") { setReasonNotice("thesis"); }
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
  const allowedExtensions = AppConfig.allowedExtensions;
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
            "Only PDF, DOC, DOCX, JPG, JPEG, PNG and EML files are allowed.";
          continue;
        }
        const maxSize =
          AppConfig.maxAttachmentSizeMb *
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
        if (file.size <= 0) {
          validationMessage = "Empty files cannot be uploaded.";
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
          <div className="formGroup">
            <AdminLookup
              required
              valueLabel={request.AdminLabel || ""}
              error={getFieldError("Admin")}
              valueId={request.AdminId}
              options={props.adminOptions || []}
              loading={props.adminOptionsLoading}
              disabled={saving}
              onChange={(value?: IAdminOption): void => {
                update({
                  AdminLabel: value ? value.label : "",
                  AdminId: value ? value.id : 0
                });
                clearFieldError("Admin");
              }}
            />
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
              <span className="required">{" *"}</span></label>
              <textarea
                id="otherReason"
                required
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
              <span className="required">{" *"}</span></label>
              <textarea
                id="familyIllnessDetails"
                required
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
              <span className="required">{" *"}</span></label>
              <textarea
                id="medicalEvidenceDetails"
                required
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
        </div>
      );
    };
  /* =====================================================
     STEP 3
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
          <div className="infoBox" id="evidenceGuidance">
            Evidence is required for medical, family illness, bereavement and conference reasons.
            Accepted file types: {AppConfig.allowedExtensions.join(", ")}.
            Maximum file size: {AppConfig.maxAttachmentSizeMb} MB per file. Upload only evidence relevant to this request. Do not upload irrelevant, inappropriate or unnecessary personal information. EML files may be used for relevant email evidence.
          </div>
          <div className="formGroup">
            <label htmlFor="evidenceFiles">
              {requiresEvidence(request.AbsenceReasons) ? "Supporting evidence required *" : "Add supporting evidence (optional)"}
            </label>
            <input
              id="evidenceFiles"
              type="file"
              multiple
              accept={AppConfig.allowedExtensions.join(",")}
              aria-describedby="evidenceGuidance"
              aria-invalid={!!getFieldError("AttachmentFiles")}
              onChange={
                addFiles
              }
            />
          </div>
          {getFieldError("AttachmentFiles") && <div className="errorMessage">{getFieldError("AttachmentFiles")}</div>}
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
     STEP 4
     ===================================================== */
  const displayDate = (value?: string): string => {
    if (!value) { return "—"; }
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
    return match ? match[3] + "/" + match[2] + "/" + match[1] : value;
  };
  const renderReview = (): JSX.Element => {
    return (
      <div className="formPage">
        <h2>Review your request</h2>
        <p className="sectionIntro">Check the information before submitting.</p>
          <section className="reviewSection">
            <h3>Student Details</h3>
            <dl className="summary">
              <div className="reviewRow"><dt className="reviewKey">Student</dt><dd className="reviewValue">{request.Student ? request.Student.Title : "—"}</dd></div>
              <div className="reviewRow"><dt className="reviewKey">Student ID</dt><dd className="reviewValue">{request.Title || "—"}</dd></div>
              <div className="reviewRow"><dt className="reviewKey">Date of birth</dt><dd className="reviewValue">{displayDate(request.DoB)}</dd></div>
              <div className="reviewRow"><dt className="reviewKey">Level of study</dt><dd className="reviewValue">{request.LevelOfStudy || "—"}</dd></div>
              <div className="reviewRow"><dt className="reviewKey">Programme</dt><dd className="reviewValue">{request.Programme || "—"}</dd></div>
              <div className="reviewRow"><dt className="reviewKey">Administrator</dt><dd className="reviewValue">{request.AdminLabel || "—"}</dd></div>
            </dl>
          </section>
          <section className="reviewSection">
            <h3>Absence Details</h3>
            <dl className="summary">
              <div className="reviewRow"><dt className="reviewKey">Absence start date</dt><dd className="reviewValue">{displayDate(request.AbsenceStartDate)}</dd></div>
              <div className="reviewRow"><dt className="reviewKey">Absence end date</dt><dd className="reviewValue">{displayDate(request.AbsenceEndDate)}</dd></div>
              <div className="reviewRow"><dt className="reviewKey">Reason(s) for absence</dt><dd className="reviewValue">{(request.AbsenceReasons || []).join(", ") || "—"}</dd></div>
              {(request.AbsenceReasons || []).indexOf("Other") >= 0 && (<div className="reviewRow"><dt className="reviewKey">Other reason details</dt><dd className="reviewValue">{request.ReasonOtherComments || "—"}</dd></div>)}
              {(request.AbsenceReasons || []).indexOf("Family illness") >= 0 && (<div className="reviewRow"><dt className="reviewKey">Family illness details</dt><dd className="reviewValue">{request.FamilyIllnessDetails || "—"}</dd></div>)}
              {(request.AbsenceReasons || []).indexOf("Medical") >= 0 && (<div className="reviewRow"><dt className="reviewKey">Medical evidence details</dt><dd className="reviewValue">{request.MedicalEvidenceDetails || "—"}</dd></div>)}
              <div className="reviewRow"><dt className="reviewKey">Travel outside UK</dt><dd className="reviewValue">{request.TravelOutside || "—"}</dd></div>
              {request.TravelOutside === "Yes" && (<div className="reviewRow"><dt className="reviewKey">Travel details</dt><dd className="reviewValue">{request.TravelOutsideDetails || "—"}</dd></div>)}
            </dl>
          </section>
          <section className="reviewSection">
            <h3>Evidence</h3>
            {(request.AttachmentFiles || []).filter(file => deletedFiles.indexOf(file.FileName) < 0).map(file => <div key={file.FileName}><a href={file.ServerRelativeUrl} target="_blank" rel="noreferrer">{file.FileName}</a></div>)}
            {files.map((file, index) => <div key={file.name + index}>{file.name}</div>)}
            {(request.AttachmentFiles || []).filter(file => deletedFiles.indexOf(file.FileName) < 0).length + files.length === 0 && <p>No supporting evidence attached.</p>}
          </section>
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
        return renderEvidence();
      }
      return renderReview();
    };
  return (
    <div className="studentRequestForm">
      {reasonNotice && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div ref={noticeRef} role="dialog" aria-modal="true" aria-labelledby="absenceNoticeTitle" aria-describedby="absenceNoticeMessage" tabIndex={-1}
            style={{ background: "#fff", color: "#222", borderRadius: "8px", padding: "24px", maxWidth: "640px", width: "100%", maxHeight: "80vh", overflowY: "auto", boxShadow: "0 12px 40px rgba(0,0,0,0.3)" }}>
            <h2 id="absenceNoticeTitle">{reasonNotice === "visa" ? "Extending Visa" : "Thesis – writing up in home country"}</h2>
            <p id="absenceNoticeMessage" style={{ lineHeight: 1.6 }}>
              {reasonNotice === "visa" ? (
                "If you are a PGR and will not be engaging with your studies for a period of 1 month or more, you may want to consider applying for leave of absence rather than authorised absence. If approved, your registration dates would be extended in line with the duration of your leave of absence. You are advised to discuss the most appropriate course of action with your supervisor"
              ) : (
                <React.Fragment>
                  IMPORTANT! Please be aware that if you take authorised absence for this purpose, the University will be required to withdraw immigration sponsorship, and you will not be allowed to return to the University on your current Student route visa. If you have any concerns about what this would mean for you, we recommend you contact the International Student Team (IST){" "}
                  <a href="https\://intranet.birmingham.ac.uk/student/international/index.aspx" target="_blank" rel="noopener noreferrer">https\://intranet.birmingham.ac.uk/student/international/index.aspx</a>{" "}
                  before submitting an application.
                </React.Fragment>
              )}
            </p>
            <button type="button" className="primary" onClick={() => setReasonNotice("")}>Close</button>
          </div>
        </div>
      )}
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
          step < 4
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


