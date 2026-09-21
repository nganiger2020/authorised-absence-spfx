import * as React from "react";

export interface IAdminTermOption {
  label: string;
  termGuid: string;
}

interface Props {
  valueLabel?: string;
  valueTermGuid?: string;
  options: IAdminTermOption[];
  loading?: boolean;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  onChange: (
    value?: IAdminTermOption
  ) => void;
}

export const AdminManagedMetadata:
React.FC<Props> = (props) => {

  const selectedValue =
    props.valueTermGuid || "";

  return (
    <div className="formGroup">

      <label htmlFor="admin">

        Admin

        {
          props.required &&
          (
            <span className="required">
              {" *"}
            </span>
          )
        }

        <span className="hint">
          Select the administrator email address.
        </span>

      </label>

      <select
        id="admin"
        value={selectedValue}
        disabled={
          props.disabled ||
          props.loading
        }
        onChange={
          (
            event:
              React.ChangeEvent<
                HTMLSelectElement
              >
          ): void => {

            const termGuid =
              event.target.value;

            if (!termGuid) {
              props.onChange(undefined);
              return;
            }

            let selected:
              IAdminTermOption |
              undefined;

            for (
              let i = 0;
              i < props.options.length;
              i++
            ) {

              if (
                props.options[i].termGuid ===
                termGuid
              ) {
                selected =
                  props.options[i];
                break;
              }
            }

            props.onChange(selected);
          }
        }
      >

        <option value="">
          {
            props.loading
              ? "Loading Admin..."
              : "Select Admin"
          }
        </option>

        {
          props.options.map(
            option => (
              <option
                key={option.termGuid}
                value={option.termGuid}
              >
                {option.label}
              </option>
            )
          )
        }

      </select>

      {
        props.error &&
        (
          <div
            className="errorMessage"
            role="alert"
          >
            {props.error}
          </div>
        )
      }

    </div>
  );
};
