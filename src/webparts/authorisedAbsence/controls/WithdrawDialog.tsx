import * as React from "react";
interface Props { requestId: number; busy: boolean; error: string; onCancel: () => void; onConfirm: () => void; }
export const WithdrawDialog: React.FC<Props> = props => {
  const dialog = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    if (dialog.current) { dialog.current.focus(); }
    return () => { if (previous && document.contains(previous)) { previous.focus(); } };
  }, []);
  return <div className="aaWithdrawOverlay">
    <div ref={dialog} tabIndex={-1} className="aaWithdrawDialog" role="dialog" aria-modal="true" aria-labelledby="withdrawTitle" aria-describedby="withdrawMessage" aria-busy={props.busy}
      onKeyDown={event => {
        if (event.key === "Escape" && !props.busy) { event.preventDefault(); props.onCancel(); }
        if (event.key === "Tab" && dialog.current) {
          const buttons = dialog.current.querySelectorAll<HTMLButtonElement>("button:not(:disabled)");
          const first = buttons[0]; const last = buttons[buttons.length - 1];
          if (!first) { event.preventDefault(); return; }
          if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }
      }}>
      <h2 id="withdrawTitle">Withdraw request AA-{props.requestId}?</h2>
      <p id="withdrawMessage">This closes the absence request at its current stage. The saved request, evidence and history will be kept. Any unsaved changes will be discarded. It cannot be edited or resubmitted after withdrawal.</p>
      {props.error && <p className="errorMessage" role="alert">{props.error}</p>}
      <div className="aaWithdrawActions"><button type="button" className="secondaryButton" disabled={props.busy} onClick={props.onCancel}>Keep request</button><button type="button" className="primary" disabled={props.busy} onClick={props.onConfirm}>{props.busy ? "Withdrawing…" : "Withdraw request"}</button></div>
    </div>
  </div>;
};
