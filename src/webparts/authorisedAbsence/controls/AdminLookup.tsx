import { SearchableSelect } from "./SearchableSelect";
import * as React from "react";

export interface IAdminOption {
  id: number;
  label: string;
  title?: string;
  email?: string;
}
interface Props {
  id?: string;
  valueLabel?: string;
  valueId?: number;
  options: IAdminOption[];
  loading?: boolean;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  onChange: (value?: IAdminOption) => void;
}
export const AdminLookup: React.FC<Props> = props => {
  const id = props.id || "admin";
  const hasSelectedOption = props.options.some(option => option.id === props.valueId);
  return <div className="formGroup">
    <label htmlFor={id}>Admin{props.required && <span className="required"> *</span>}</label>
    <SearchableSelect id={id} value={props.valueId || ""} disabled={props.disabled || props.loading}
      aria-required={props.required} aria-invalid={!!props.error}
      aria-describedby={props.error ? id + "Error" : undefined}
      onValueChange={selectedValue => {
        const id = Number(selectedValue);
        props.onChange(props.options.filter(option => option.id === id)[0]);
      }}>
      <option value="">{props.loading ? "Loading Admins..." : "Select Admin"}</option>
      {props.valueId && !hasSelectedOption && <option value={props.valueId} disabled>{props.valueLabel || "Previously selected Admin"}</option>}
      {props.options.map(option => {

        const email = option.email || option.label;
        return <option key={option.id} value={option.id}>{email}</option>;
      })}
    </SearchableSelect>
    {!props.loading && props.options.length === 0 && <div className="hint">No administrators available. Check the Admins list and Email values.</div>}
    {props.error && <div id={id + "Error"} className="errorMessage" role="alert">{props.error}</div>}
  </div>;
};

