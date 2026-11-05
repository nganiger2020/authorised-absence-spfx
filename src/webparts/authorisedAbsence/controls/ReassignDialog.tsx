import * as React from "react";
import { IRequest, IUserOption } from "../models/Models";
import { AdminLookup, IAdminOption } from "./AdminLookup";
import { PeoplePicker } from "./PeoplePicker";
interface Props {
  request: IRequest;
  allowAdmin: boolean;
  allowSignatory: boolean;
  admins: IAdminOption[];
  adminsLoading: boolean;
  busy: boolean;
  error: string;
  onSearch: (text: string) => Promise<IUserOption[]>;
  onResolve: (user: IUserOption) => Promise<IUserOption>;
  onCancel: () => void;
  onConfirm: (kind: "administrator" | "signatory", id: number, reason: string) => void;
}
export const ReassignDialog: React.FC<Props> = props => {
  const [kind, setKind] = React.useState<"administrator" | "signatory">(props.allowAdmin ? "administrator" : "signatory");
  const [adminId, setAdminId] = React.useState<number | undefined>(undefined);
  const [signatory, setSignatory] = React.useState<IUserOption | undefined>(undefined);
  const [reason, setReason] = React.useState("");
  const dialog = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    if (dialog.current) { dialog.current.focus(); }
    return () => { if (previous && document.contains(previous)) { previous.focus(); } };
  }, []);
  const targetId = kind === "administrator" ? adminId : signatory && signatory.Id;
  return <div className="aaReassignOverlay"><div className="aaReassignDialog" ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="reassignTitle" aria-busy={props.busy}
    onKeyDown={event => {
      if (event.key === "Escape" && !props.busy) { event.preventDefault(); props.onCancel(); }
      if (event.key === "Tab" && dialog.current && dialog.current.contains(event.target as Node)) {
        const controls = dialog.current.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled)');
        const first = controls[0]; const last = controls[controls.length - 1];
        if (!first) { event.preventDefault(); return; }
        if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    }}>
    <h2 id="reassignTitle">Reassign request AA-{props.request.Id}</h2>
    <p>Correct the administrative team or signatory receiving this request. Reassignment is recorded in its history.</p>
    <p className="hint">This uses the saved request. Unsaved changes on the form will not be saved.</p>
    <fieldset disabled={props.busy} className="aaReassignKind"><legend>Reassign</legend>
      {props.allowAdmin && <label><input type="radio" name="reassignKind" checked={kind === "administrator"} onChange={() => setKind("administrator")} /> Administrative team</label>}
      {props.allowSignatory && <label><input type="radio" name="reassignKind" checked={kind === "signatory"} onChange={() => setKind("signatory")} /> Signatory</label>}
    </fieldset>
    {kind === "administrator" ? <>
      <p className="hint">Currently: {props.request.AdminLabel || "Unassigned"}. Changing the team returns the request to administrator review and clears the current signatory assignment.</p>
      <AdminLookup id="replacementAdministrator" valueId={adminId} options={props.admins} loading={props.adminsLoading} disabled={props.busy} required onChange={option => setAdminId(option && option.id)} />
    </> : <>
      <p className="hint">Currently: {(props.request.Signatory && (props.request.Signatory.Title || props.request.Signatory.EMail)) || "Unassigned"}. The new signatory receives the request at signatory review.</p>
      <PeoplePicker id="replacementSignatory" label="New authorised signatory" required value={signatory} disabled={props.busy} onSearch={props.onSearch} onResolve={props.onResolve} onChange={setSignatory} />
    </>}
    <div className="formGroup"><label htmlFor="reassignReason">Reason for reassignment <span className="required">*</span></label>
      <textarea id="reassignReason" value={reason} required rows={3} disabled={props.busy} onChange={event => setReason(event.target.value)} />
    </div>
    {props.error && <div className="errorMessage" role="alert">{props.error}</div>}
    <div className="aaReassignActions"><button type="button" className="secondaryButton" disabled={props.busy} onClick={props.onCancel}>Cancel</button>
      <button type="button" className="primary" disabled={props.busy || !targetId || !reason.trim()} onClick={() => { if (targetId) { props.onConfirm(kind, targetId, reason); } }}>{props.busy ? "Reassigning…" : "Reassign request"}</button></div>
  </div></div>;
};
