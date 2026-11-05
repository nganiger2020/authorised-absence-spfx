import * as React from "react";
import { createPortal } from "react-dom";

interface Props {
  label: string;
  values: string[];
  selected?: string[];
  onApply: (values?: string[]) => void;
}
export const ColumnFilter: React.FC<Props> = props => {
  const [position, setPosition] = React.useState<{ top: number; left: number; width: number; height: number } | undefined>(undefined);
  const [draft, setDraft] = React.useState<string[]>([]);
  const trigger = React.useRef<HTMLButtonElement>(null);
  const popup = React.useRef<HTMLDivElement>(null);
  const selectAll = React.useRef<HTMLInputElement>(null);
  const all = props.values.every(value => draft.indexOf(value) >= 0);
  const close = (focus: boolean): void => { setPosition(undefined); if (focus && trigger.current) { trigger.current.focus(); } };
  React.useEffect(() => {
    if (selectAll.current) { selectAll.current.indeterminate = draft.length > 0 && !all; }
  }, [draft, all, position]);
  React.useEffect(() => {
    if (!position) { return; }
    if (popup.current) { popup.current.focus(); }
    const outside = (event: MouseEvent): void => {
      const target = event.target as Node;
      if (!(popup.current && popup.current.contains(target)) && !(trigger.current && trigger.current.contains(target))) { setPosition(undefined); }
    };
    const dismiss = (event: Event): void => {
      if (popup.current && event.target instanceof Node && popup.current.contains(event.target)) { return; }
      setPosition(undefined);
    };
    document.addEventListener("mousedown", outside);
    window.addEventListener("resize", dismiss);
    window.addEventListener("scroll", dismiss, true);
    return () => { document.removeEventListener("mousedown", outside); window.removeEventListener("resize", dismiss); window.removeEventListener("scroll", dismiss, true); };
  }, [position]);
  return <>
    <button ref={trigger} type="button" className={"columnFilterButton" + (props.selected !== undefined ? " isFiltered" : "")}
      aria-label={"Filter " + props.label + (props.selected !== undefined ? " (active)" : "")}
      title={"Filter " + props.label} aria-haspopup="dialog" aria-expanded={!!position}
      onClick={event => {
        event.stopPropagation();
        if (position) { close(false); return; }
        const rect = event.currentTarget.getBoundingClientRect();
        const width = Math.min(290, window.innerWidth - 16);
        const height = Math.min(380, window.innerHeight - 24);
        const top = rect.bottom + 6 + height <= window.innerHeight - 8 ? rect.bottom + 6 : Math.max(8, rect.top - height - 6);
        setDraft(props.selected === undefined ? props.values.slice() : props.selected.filter(value => props.values.indexOf(value) >= 0));
        setPosition({ top, left: Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8)), width, height });
      }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M3 4h18l-7 8v7l-4 2v-9Z" /></svg>
    </button>
    {position && createPortal(<div ref={popup} className="aaColumnFilterPopup" role="dialog" aria-label={"Filter " + props.label} tabIndex={-1}
      style={{ top: position.top, left: position.left, width: position.width, maxHeight: position.height }}
      onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) { close(false); } }}
      onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(true); } }}>
      <div className="aaFilterTitle">{props.label}</div>
      <label className="aaFilterAll"><input ref={selectAll} type="checkbox" checked={all && props.values.length > 0} disabled={!props.values.length}
        onChange={event => setDraft(event.target.checked ? props.values.slice() : [])} /> Select all</label>
      <div className="aaFilterValues">
        {props.values.map(value => <label key={value}><input type="checkbox" checked={draft.indexOf(value) >= 0}
          onChange={event => { const checked = event.target.checked; setDraft(current => checked ? current.concat([value]) : current.filter(item => item !== value)); }} /><span>{value}</span></label>)}
        {!props.values.length && <p>No values available.</p>}
      </div>
      <div className="aaFilterFooter"><button type="button" onClick={() => close(true)}>Cancel</button><button type="button" className="aaFilterApply" onClick={() => { props.onApply(all ? undefined : draft.slice()); close(true); }}>Apply</button></div>
    </div>, document.body)}
  </>;
};
