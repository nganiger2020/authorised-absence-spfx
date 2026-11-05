import * as React from "react";
import { createPortal } from "react-dom";

interface Props extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "onChange" | "multiple" | "value"> {
  value?: string | number;
  onValueChange: (value: string) => void;
}
interface Option { value: string; label: string; disabled?: boolean; }
const textOf = (nodes: React.ReactNode): string => React.Children.toArray(nodes).map(node =>
  React.isValidElement(node) ? textOf((node.props as { children?: React.ReactNode }).children) : String(node)
).join("");

/** Searchable checkbox-style picker with a single scalar selected value. */
export const SearchableSelect: React.FC<Props> = props => {
  const [position, setPosition] = React.useState<{ top: number; left: number; width: number; height: number } | undefined>(undefined);
  const [search, setSearch] = React.useState("");
  const trigger = React.useRef<HTMLButtonElement>(null);
  const popup = React.useRef<HTMLDivElement>(null);
  const searchInput = React.useRef<HTMLInputElement>(null);
  const options: Option[] = [];
  React.Children.forEach(props.children, child => {
    if (!React.isValidElement(child)) { return; }
    const option = child.props as React.OptionHTMLAttributes<HTMLOptionElement>;
    const label = textOf(option.children).trim();
    options.push({ value: String(option.value === undefined ? label : option.value), label, disabled: option.disabled });
  });
  const value = props.value === undefined ? "" : String(props.value);
  const selected = options.filter(option => option.value === value)[0];
  const visible = options.filter(option => option.label.toLowerCase().indexOf(search.trim().toLowerCase()) >= 0);
  const popupId = props.id ? props.id + "Choices" : undefined;
  const close = (focus: boolean): void => { setPosition(undefined); setSearch(""); if (focus && trigger.current) { trigger.current.focus(); } };
  React.useEffect(() => { if (props.disabled) { setPosition(undefined); } }, [props.disabled]);
  React.useEffect(() => {
    if (!position) { return; }
    if (searchInput.current) { searchInput.current.focus(); }
    const outside = (event: MouseEvent): void => {
      const target = event.target as Node;
      if (!(popup.current && popup.current.contains(target)) && !(trigger.current && trigger.current.contains(target))) { setPosition(undefined); }
    };
    const viewport = (event: Event): void => {
      if (popup.current && event.target instanceof Node && popup.current.contains(event.target)) { return; }
      setPosition(undefined);
    };
    document.addEventListener("mousedown", outside); window.addEventListener("scroll", viewport, true); window.addEventListener("resize", viewport);
    return () => { document.removeEventListener("mousedown", outside); window.removeEventListener("scroll", viewport, true); window.removeEventListener("resize", viewport); };
  }, [position]);
  return <div className="aaSingleSelect">
    <button id={props.id} ref={trigger} type="button" disabled={props.disabled} className="aaSingleSelectTrigger"
      aria-label={props["aria-label"]} aria-labelledby={props["aria-labelledby"]} aria-describedby={props["aria-describedby"]}
      aria-invalid={props["aria-invalid"]} aria-required={props["aria-required"] || props.required}
      aria-haspopup="dialog" aria-expanded={!!position} aria-controls={position ? popupId : undefined}
      onClick={event => {
        if (position) { close(false); return; }
        const rect = event.currentTarget.getBoundingClientRect();
        const width = Math.min(Math.max(rect.width, 240), window.innerWidth - 16);
        const height = Math.min(340, window.innerHeight - 24);
        setSearch("");
        setPosition({ width, height, left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
          top: rect.bottom + height + 6 <= window.innerHeight - 8 ? rect.bottom + 6 : Math.max(8, rect.top - height - 6) });
      }}><span>{selected ? selected.label : "Select"}</span><span aria-hidden="true">⌄</span></button>
    {position && createPortal(<div ref={popup} id={popupId} className="aaSingleSelectPopup" role="dialog"
      aria-label={"Choose " + (props["aria-label"] || props.id || "option")}
      style={{ top: position.top, left: position.left, width: position.width, maxHeight: position.height }}
      onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) { close(false); } }}
      onKeyDown={event => {
        if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(true); }
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          const inputs = popup.current ? Array.prototype.slice.call(popup.current.querySelectorAll('input:not(:disabled)')) as HTMLInputElement[] : [];
          const index = inputs.indexOf(document.activeElement as HTMLInputElement);
          const next = event.key === "ArrowDown" ? Math.min(index + 1, inputs.length - 1) : Math.max(index - 1, 0);
          if (inputs[next]) { event.preventDefault(); inputs[next].focus(); }
        }
      }}>
      <div className="aaSingleSelectSearch"><input ref={searchInput} type="search" value={search} aria-label="Search options" placeholder="Search options…" onChange={event => setSearch(event.target.value)} /></div>
      <div className="aaSingleSelectOptions" role="group" aria-label="Select one option">
        {visible.map((option, index) => <label key={option.value + index} className={option.value === value ? "isSelected" : ""}>
          <input type="checkbox" checked={option.value === value} disabled={option.disabled}
            onChange={() => { props.onValueChange(option.value); close(true); }} /><span>{option.label}</span>
        </label>)}
        {!visible.length && <p role="status">No matching options.</p>}
      </div>
    </div>, document.body)}
  </div>;
};
