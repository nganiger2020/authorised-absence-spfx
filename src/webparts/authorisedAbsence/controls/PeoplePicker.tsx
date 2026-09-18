import * as React from "react";

import {
  IUserOption
} from "../models/Models";


interface Props {

  id: string;

  label: string;

  required?: boolean;

  value?: IUserOption;

  disabled?: boolean;

  error?: string;

  onSearch: (
    searchText: string
  ) => Promise<IUserOption[]>;

  onResolve: (
    user: IUserOption
  ) => Promise<IUserOption>;

  onChange: (
    user?: IUserOption
  ) => void;
}


export const PeoplePicker:
React.FC<Props> = (
  props: Props
) => {

  const [
    search,
    setSearch
  ] =
    React.useState<string>(
      props.value
        ? props.value.Title || ""
        : ""
    );


  const [
    results,
    setResults
  ] =
    React.useState<IUserOption[]>(
      []
    );


  const [
    loading,
    setLoading
  ] =
    React.useState<boolean>(
      false
    );


  const [
    resolving,
    setResolving
  ] =
    React.useState<boolean>(
      false
    );


  const [
    open,
    setOpen
  ] =
    React.useState<boolean>(
      false
    );


  const [
    searchError,
    setSearchError
  ] =
    React.useState<string>(
      ""
    );


  const requestNumber =
    React.useRef<number>(
      0
    );


  /*
   * Keep textbox synchronized when an
   * existing request/student is loaded.
   *
   * Do not clear typed search text simply
   * because value becomes undefined.
   */
  React.useEffect(
    () => {

      if (
        props.value
      ) {

        setSearch(
          props.value.Title || ""
        );
      }

    },
    [
      props.value
        ? props.value.Id
        : undefined,

      props.value
        ? props.value.LoginName
        : undefined,

      props.value
        ? props.value.Title
        : undefined
    ]
  );


  /*
   * Directory search.
   *
   * Nothing is displayed until at least
   * two characters have been entered.
   */
  React.useEffect(
    () => {

      const query =
        search
          ? search.trim()
          : "";


      /*
       * Selected student:
       * don't search again just because
       * the selected student's name is
       * displayed in the textbox.
       */
      if (
        props.value &&
        query ===
          (
            props.value.Title ||
            ""
          ).trim()
      ) {

        setResults(
          []
        );

        setOpen(
          false
        );

        setLoading(
          false
        );

        setSearchError(
          ""
        );

        return;
      }


      /*
       * Before search:
       * no results card.
       */
      if (
        query.length < 2
      ) {

        requestNumber.current += 1;

        setResults(
          []
        );

        setOpen(
          false
        );

        setLoading(
          false
        );

        setSearchError(
          ""
        );

        return;
      }


      const currentRequest =
        requestNumber.current + 1;

      requestNumber.current =
        currentRequest;


      const timer =
        window.setTimeout(
          () => {

            setLoading(
              true
            );

            setSearchError(
              ""
            );

            /*
             * We now have a valid search,
             * so the results card can open.
             */
            setOpen(
              true
            );


            void props
              .onSearch(
                query
              )
              .then(
                (
                  users:
                  IUserOption[]
                ): void => {

                  /*
                   * Ignore old responses if
                   * the user has typed another
                   * search meanwhile.
                   */
                  if (
                    requestNumber.current !==
                    currentRequest
                  ) {

                    return;
                  }


                  setResults(
                    users || []
                  );

                  setLoading(
                    false
                  );

                  setOpen(
                    true
                  );
                }
              )
              .catch(
                (
                  error:
                  unknown
                ): void => {

                  if (
                    requestNumber.current !==
                    currentRequest
                  ) {

                    return;
                  }


                  console.error(
                    "PEOPLE PICKER REAL ERROR:",
                    error
                  );


                  let message =
                    "Unable to search for users.";


                  if (
                    error instanceof Error &&
                    error.message
                  ) {

                    message =
                      error.message;
                  }


                  setResults(
                    []
                  );

                  setLoading(
                    false
                  );

                  setSearchError(
                    message
                  );

                  setOpen(
                    true
                  );
                }
              );

          },
          350
        );


      return (): void => {

        window.clearTimeout(
          timer
        );
      };

    },
    [
      search,
      props.value,
      props.onSearch
    ]
  );


  /*
   * Text changed.
   */
  const onTextChange =
    (
      event:
      React.ChangeEvent<HTMLInputElement>
    ): void => {

      const value =
        event.target.value;


      setSearch(
        value
      );


      setSearchError(
        ""
      );


      /*
       * If the user edits the selected
       * student's name, clear the existing
       * selected Person value.
       */
      if (
        props.value &&
        value !==
          (
            props.value.Title ||
            ""
          )
      ) {

        props.onChange(
          undefined
        );
      }


      /*
       * Do not show card for 0/1 characters.
       */
      if (
        value.trim().length < 2
      ) {

        setOpen(
          false
        );

        setResults(
          []
        );

      } else {

        setOpen(
          true
        );
      }
    };


  /*
   * Select and resolve a directory user.
   */
  const selectUser =
    async (
      directoryUser:
      IUserOption
    ): Promise<void> => {

      if (
        resolving ||
        props.disabled
      ) {

        return;
      }


      const loginName =
        directoryUser.LoginName
          ? directoryUser.LoginName.trim()
          : "";


      if (
        !loginName
      ) {

        setSearchError(
          "The selected user does not have a valid SharePoint login."
        );

        setOpen(
          true
        );

        return;
      }


      try {

        setResolving(
          true
        );

        setSearchError(
          ""
        );


        const resolvedUser =
          await props.onResolve(
            directoryUser
          );


        if (
          !resolvedUser ||
          !resolvedUser.Id
        ) {

          throw new Error(
            "SharePoint did not return a valid user ID."
          );
        }


        props.onChange(
          resolvedUser
        );


        setSearch(
          resolvedUser.Title ||
          directoryUser.Title ||
          ""
        );


        setResults(
          []
        );


        setOpen(
          false
        );


      } catch (
        error
      ) {

        console.error(
          "PEOPLE PICKER REAL ERROR:",
          error
        );


        let message =
          "Unable to resolve the selected user.";


        if (
          error instanceof Error &&
          error.message
        ) {

          message =
            error.message;
        }


        setSearchError(
          message
        );


        setOpen(
          true
        );


      } finally {

        setResolving(
          false
        );
      }
    };


  /*
   * Clear selected student.
   *
   * This button is only rendered when
   * props.value exists.
   */
  const clearSelection =
    (): void => {

      requestNumber.current += 1;


      setSearch(
        ""
      );


      setResults(
        []
      );


      setSearchError(
        ""
      );


      setLoading(
        false
      );


      setOpen(
        false
      );


      props.onChange(
        undefined
      );
    };


  /*
   * Initial for avatar.
   */
  const getInitial =
    (
      title?: string
    ): string => {

      const value =
        title
          ? title.trim()
          : "";


      if (
        !value
      ) {

        return "";
      }


      return value
        .substring(
          0,
          1
        )
        .toUpperCase();
    };


  const hasSearch =
    search.trim().length >= 2;


  const showResultsCard =
    open &&
    hasSearch &&
    !props.value;


  return (

    <div
      className="formGroup peoplePicker"
    >

      <label
        htmlFor={props.id}
      >

        {props.label}

        {props.required && (
          <span
            aria-hidden="true"
          >
            {" *"}
          </span>
        )}

      </label>


      {/*
        Search textbox
      */}
      <div
        className="peoplePickerControl"
      >

        <input
          id={props.id}
          type="text"
          value={search}
          disabled={
            props.disabled ||
            resolving
          }
          placeholder="Start typing a name or email"
          autoComplete="off"
          aria-required={
            props.required
              ? "true"
              : undefined
          }
          aria-invalid={
            props.error ||
            searchError
              ? "true"
              : undefined
          }
          onChange={
            onTextChange
          }
          onFocus={
            (): void => {

              /*
               * Do not open an empty card
               * just because the textbox
               * received focus.
               */
              if (
                !props.value &&
                search.trim().length >= 2
              ) {

                setOpen(
                  true
                );
              }
            }
          }
        />


        {/*
          CLEAR IS HIDDEN BEFORE SELECTION.

          It only appears when a valid
          student has been selected.
        */}
        {props.value && (
          <button
            type="button"
            className="peoplePickerClear"
            disabled={
              props.disabled ||
              resolving
            }
            onClick={
              clearSelection
            }
          >
            Clear
          </button>
        )}

      </div>


      {/*
        Selected student card.

        This is only shown AFTER a student
        has actually been selected.
      */}
      {props.value && (
        <div
          className="peoplePickerSelected"
        >

          <span
            className="peoplePickerAvatar"
          >
            {
              getInitial(
                props.value.Title
              )
            }
          </span>


          <span
            className="peoplePickerPerson"
          >

            <strong>
              {props.value.Title}
            </strong>


            {props.value.Email && (
              <span
                className="peoplePickerEmail"
              >
                {props.value.Email}
              </span>
            )}

          </span>

        </div>
      )}


      {/*
        RESULTS CARD

        Important:
        This does NOT exist before the user
        has typed at least two characters.
      */}
      {showResultsCard && (
        <div
          className="peoplePickerResults"
        >

          {loading && (
            <div
              className="peoplePickerEmpty"
            >
              Searching University directory...
            </div>
          )}


          {!loading &&
            searchError && (
              <div
                className="peoplePickerEmpty"
              >
                {searchError}
              </div>
            )}


          {!loading &&
            !searchError &&
            results.length === 0 && (
              <div
                className="peoplePickerEmpty"
              >
                No matching users found.
              </div>
            )}


          {!loading &&
            !searchError &&
            results.map(
              (
                user:
                IUserOption,
                index:
                number
              ): JSX.Element => {

                const key =
                  user.LoginName ||
                  user.Email ||
                  user.Title ||
                  String(index);


                return (

                  <button
                    key={key}
                    type="button"
                    className="peoplePickerOption"
                    disabled={
                      resolving
                    }
                    onClick={
                      (): void => {

                        void selectUser(
                          user
                        );
                      }
                    }
                  >

                    <span
                      className="peoplePickerAvatar"
                    >
                      {
                        getInitial(
                          user.Title
                        )
                      }
                    </span>


                    <span
                      className="peoplePickerPerson"
                    >

                      <strong>
                        {user.Title}
                      </strong>


                      {user.Email && (
                        <span
                          className="peoplePickerEmail"
                        >
                          {user.Email}
                        </span>
                      )}

                    </span>

                  </button>
                );
              }
            )}

        </div>
      )}


      {/*
        Resolving selected directory user
        into a SharePoint user.
      */}
      {resolving && (
        <div
          className="peoplePickerEmpty"
        >
          Selecting user...
        </div>
      )}


      {/*
        Search / resolution error
        outside the dropdown if the
        dropdown has already closed.
      */}
      {searchError &&
        !showResultsCard && (
          <div
            className="errorMessage"
          >
            {searchError}
          </div>
        )}


      {props.error && (
        <div
          className="errorMessage"
        >
          {props.error}
        </div>
      )}

    </div>
  );
};