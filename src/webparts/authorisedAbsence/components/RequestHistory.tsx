import * as React from "react";
import { RequestService, IRequestHistoryEntry } from "../services/RequestService";
interface Props { service: RequestService; requestId: number; }
export const RequestHistory: React.FC<Props> = ({ service, requestId }) => {
  const [entries, setEntries] = React.useState<IRequestHistoryEntry[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string>("");
  React.useEffect(() => {
    let active = true;
    setLoading(true); setEntries([]); setError("");
    void service.getRequestHistory(requestId).then(history => {
      if (active) { setEntries(history); }
    }).catch(() => {
      if (active) { setError("History is unavailable. Check that the WorkflowHistory column exists and you have permission to read this request."); }
    }).then(() => { if (active) { setLoading(false); } });
    return () => { active = false; };
  }, [service, requestId]);
  const displayDate = (value: string): string => {
    const date = new Date(value);
    return isNaN(date.getTime()) ? "—" : date.toLocaleString("en-GB", {
      timeZone: "Europe/London", day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: false
    });
  };
  const orderedEntries = entries.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const actionLabel = (entry: IRequestHistoryEntry): React.ReactNode => {
    if (entry.action === "Administrator reassigned") { return <React.Fragment>Administrative team reassigned by <strong>{entry.actor}</strong></React.Fragment>; }
    if (entry.action === "Signatory reassigned") { return <React.Fragment>Signatory reassigned by <strong>{entry.actor}</strong></React.Fragment>; }
    if (entry.action === "Request withdrawn") { return <React.Fragment>Withdrawn by <strong>{entry.actor}</strong></React.Fragment>; }
    if (entry.action === "Request submitted") { return <React.Fragment>Submitted by <strong>{entry.actor}</strong></React.Fragment>; }
    if (entry.action === "Signatory assigned") {
      const signatory = entry.details.replace(/^Assigned to\s*/i, "");
      return <React.Fragment>Assigned to <strong>{signatory || "Authorised Signatory"}</strong></React.Fragment>;
    }
    if ((entry.action === "Request supported" || entry.action === "Request approved")) { return <React.Fragment>Supported by <strong>{entry.actor}</strong></React.Fragment>; }
    if (entry.action === "Request rejected") { return <React.Fragment>Rejected by <strong>{entry.actor}</strong></React.Fragment>; }
    return <React.Fragment>{entry.action} by <strong>{entry.actor}</strong></React.Fragment>;
  };
  const actionIcon = (entry: IRequestHistoryEntry): React.ReactNode => {
    const path = entry.action === "Request submitted" ? "M12 18V6m-5 5 5-5 5 5" :
      (entry.action === "Request supported" || entry.action === "Request approved") ? "m6 12 4 4 8-8" :
      entry.action === "Request rejected" ? "m7 7 10 10M17 7 7 17" : "M12 6v6h5";
    return <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={path} /></svg>;
  };
  return (
    <section className="aaWorkflowHistory" aria-label="Approval history">
      <style>{`
        .aaWorkflowHistory { background:#fff; color:#0d0d0d; padding:24px; margin-top:24px; border:1px solid #d6d6d6; border-radius:3px; font-family:"Manrope", "Arial", sans-serif; }
        .aaWorkflowHistory h2 { color:#0d0d0d; font-size:24px; font-weight:700; margin:0 0 24px 10px; }
        .aaWorkflowHistory .aaHistoryList { list-style:none; margin:0; padding:0; }
        .aaWorkflowHistory .aaHistoryEntry { position:relative; background:#fff; border:1px solid #b3b3b3; border-left:4px solid #0d0d0d; padding:38px 12px 12px; margin:0 0 12px; }
        .aaWorkflowHistory .aaHistoryEntry:last-child { margin-bottom:0; }
        .aaWorkflowHistory .aaHistoryEntry + .aaHistoryEntry:before { content:"↑"; position:absolute; left:16px; top:-19px; color:#0d0d0d; font-size:18px; line-height:18px; }
        .aaWorkflowHistory .aaHistoryLatest { background:#faf6e8; border-color:#dcc266; border-left-color:#dcc266; }
        .aaWorkflowHistory .aaHistoryTime { position:absolute; top:8px; right:10px; color:#0d0d0d; font-size:14px; font-weight:600; }
        .aaWorkflowHistory .aaHistoryAction { display:flex; align-items:center; gap:7px; font-size:18px; line-height:1.5; }
        .aaWorkflowHistory .aaHistoryIcon { display:inline-flex; align-items:center; justify-content:center; width:26px; height:26px; flex-shrink:0; background:#0d0d0d; border-radius:50%; }
        .aaWorkflowHistory .aaHistoryDetails { margin:7px 0 0 33px; color:#333; font-size:14px; line-height:1.5; white-space:pre-wrap; overflow-wrap:anywhere; }
        @media(max-width:480px) { .aaWorkflowHistory { padding:14px; } .aaWorkflowHistory h2 { font-size:21px; margin-left:0; } .aaWorkflowHistory .aaHistoryAction { font-size:16px; } }
      `}</style>
      <h2>Approval History</h2>
      {loading ? <p role="status">Loading history...</p> : error ? <p role="status">{error}</p> : orderedEntries.length === 0 ?
        <p>No workflow history has been recorded for this request.</p> : (
          <ol className="aaHistoryList">
            {orderedEntries.map((entry, index) => (
              <li className={"aaHistoryEntry" + (index === 0 ? " aaHistoryLatest" : "")} key={entry.date + ":" + index}>
                <time className="aaHistoryTime" dateTime={entry.date}>{displayDate(entry.date).replace(",", "")}</time>
                <div className="aaHistoryAction"><span className="aaHistoryIcon">{actionIcon(entry)}</span><span>{actionLabel(entry)}</span></div>
                {entry.action === "Signatory assigned" ? <p className="aaHistoryDetails">Assigned by <strong>{entry.actor}</strong></p> :
                  entry.details && <p className="aaHistoryDetails">{entry.details}</p>}
              </li>
            ))}
          </ol>
        )}
    </section>
  );
};
