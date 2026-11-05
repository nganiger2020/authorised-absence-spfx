import { AppConfig } from "../config/AppConfig";

/** Match configured choice labels, including combined labels such as Family illness/Bereavement. */
export const requiresEvidence = (reasons?: string[]): boolean =>
  (reasons || []).some(reason => reason.trim().toLowerCase() === "other" || /\b(medical|family\s+illness|bereavement|conference)\b/i.test(reason));

export const isAllowedEvidenceName = (name: string): boolean => {
  const dot = (name || "").lastIndexOf(".");
  return dot >= 0 && AppConfig.allowedExtensions.indexOf(name.substring(dot).toLowerCase()) >= 0;
};
