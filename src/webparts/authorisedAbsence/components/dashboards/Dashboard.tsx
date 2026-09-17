import * as React from "react";

import {
  IRequest,
  UserRole
} from "../../models/Models";


interface Props {

  role: UserRole;

  items: IRequest[];

  loading: boolean;

  onNew: () => void;

  onOpen: (
    request: IRequest
  ) => void;

  onReview: (
    request: IRequest
  ) => void;

  onDelete: (
    request: IRequest
  ) => void;
}


export const Dashboard:
React.FC<Props> = (props) => {

  const [search, setSearch] =
    React.useState<string>("");

  const [filter, setFilter] =
    React.useState<string>("All");


  /* =====================================================
     CARDS
  ===================================================== */

  const studentCards:
    string[] = [
      "All",
      "Draft",
      "In Progress",
      "Approved",
      "Rejected"
    ];


  const approverCards:
    string[] = [
      "All",
      "Pending Approval",
      "In Review",
      "Approved",
      "Rejected"
    ];


  const adminCards:
    string[] = [
      "All",
      "Draft",
      "In Progress",
      "Pending Approval",
      "Approved",
      "Rejected"
    ];


  let cards:
    string[] = [];


  if (
    props.role === "Student"
  ) {

    cards =
      studentCards;

  } else if (
    props.role === "Approver"
  ) {

    cards =
      approverCards;

  } else {

    cards =
      adminCards;
  }


  /* =====================================================
     STATUS GROUP
  ===================================================== */

  const statusGroup = (
    request: IRequest,
    card: string
  ): boolean => {

    const status =
      (
        request.Status ||
        ""
      ).toLowerCase();


    if (
      card === "All"
    ) {
      return true;
    }


    if (
      card === "In Progress"
    ) {

      const statuses = [
        "submitted",
        "pending approval",
        "under review"
      ];

      return (
        statuses.indexOf(
          status
        ) !== -1
      );
    }


    if (
      card === "Pending Approval"
    ) {

      const statuses = [
        "submitted",
        "pending approval"
      ];

      return (
        statuses.indexOf(
          status
        ) !== -1
      );
    }


    if (
      card === "In Review"
    ) {

      return (
        status ===
        "under review"
      );
    }


    return (
      status ===
      card.toLowerCase()
    );
  };


  /* =====================================================
     STATUS CSS
  ===================================================== */

  const getStatusClass = (
    status?: string
  ): string => {

    const value =
      (
        status ||
        ""
      ).toLowerCase();


    if (
      value === "approved"
    ) {
      return (
        "pill statusApproved"
      );
    }


    if (
      value === "rejected"
    ) {
      return (
        "pill statusRejected"
      );
    }


    if (
      value ===
        "under review"
    ) {
      return (
        "pill statusReview"
      );
    }


    if (
      value === "submitted" ||
      value ===
        "pending approval"
    ) {
      return (
        "pill statusPending"
      );
    }


    return (
      "pill statusDraft"
    );
  };


  /* =====================================================
     CARD CSS
  ===================================================== */

  const getCardClass = (
    card: string
  ): string => {

    if (
      filter === card
    ) {
      return "card selected";
    }

    return "card";
  };


  /* =====================================================
     CARD COUNT
  ===================================================== */

  const getCardCount = (
    card: string
  ): number => {

    return props.items.filter(
      request =>
        statusGroup(
          request,
          card
        )
    ).length;
  };


  /* =====================================================
     SEARCH / FILTER
  ===================================================== */

  const searchValue =
    search
      .trim()
      .toLowerCase();


  const visible =
    props.items.filter(
      request => {

        if (
          filter !== "All" &&
          !statusGroup(
            request,
            filter
          )
        ) {
          return false;
        }


        if (!searchValue) {
          return true;
        }


        const requestReference =
          request.Id
            ? "AA-" +
              request.Id
            : "";


        const studentName =
          request.Student
            ? request.Student.Title
            : "";


        const reasons =
          (
            request.AbsenceReasons ||
            []
          ).join(" ");


        const programme =
          request.Programme ||
          "";


        const status =
          request.Status ||
          "";


        const searchableText =
          (
            requestReference +
            " " +
            request.Title +
            " " +
            studentName +
            " " +
            reasons +
            " " +
            programme +
            " " +
            status
          ).toLowerCase();


        return (
          searchableText.indexOf(
            searchValue
          ) !== -1
        );
      }
    );


  /* =====================================================
     DASHBOARD TITLE
  ===================================================== */

  const dashboardTitle =
    (): string => {

      if (
        props.role ===
        "Student"
      ) {
        return "My Requests";
      }


      if (
        props.role ===
        "Approver"
      ) {
        return (
          "Requests Assigned to Me"
        );
      }


      return "All Requests";
    };


  const dashboardDescription =
    (): string => {

      if (
        props.role ===
        "Student"
      ) {

        return (
          "View and manage your authorised absence requests."
        );
      }


      if (
        props.role ===
        "Approver"
      ) {

        return (
          "Review authorised absence requests assigned to you."
        );
      }


      return (
        "View and manage authorised absence requests."
      );
    };


  /* =====================================================
     REVIEW STATUS
  ===================================================== */

  const canReview = (
    request: IRequest
  ): boolean => {

    if (props.role === "Admin") {
      return true;
    }

    if (props.role !== "Approver") {
      return false;
    }


    const reviewStatuses =
      [
        "Submitted",
        "Pending Approval",
        "Under Review"
      ];


    return (
      reviewStatuses.indexOf(
        request.Status ||
        ""
      ) !== -1
    );
  };


  /* =====================================================
     DATE
  ===================================================== */

  const displayDate = (
    value?: string
  ): string => {

    if (!value) {
      return "-";
    }

    return value.substring(
      0,
      10
    );
  };


  /* =====================================================
     CLEAR
  ===================================================== */

  const clearFilters =
    (): void => {

      setSearch("");
      setFilter("All");
    };


  /* =====================================================
     RENDER
  ===================================================== */

  return (

    <div className="dashboard">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="aaHeader">

        <div>

          <h1>
            {dashboardTitle()}
          </h1>

          <p className="pageIntro">
            {
              dashboardDescription()
            }
          </p>

        </div>


        {
          (props.role === "Student" ||
           props.role === "Admin") &&
          (
            <button
              type="button"
              className="primary"
              onClick={
                props.onNew
              }
            >
              + New Request
            </button>
          )
        }

      </div>


      {/* =================================================
          STATUS CARDS
      ================================================= */}

      <div
        className="cards"
        aria-label={
          "Filter requests by status"
        }
      >

        {
          cards.map(
            card => (

              <button
                type="button"
                key={card}
                className={
                  getCardClass(
                    card
                  )
                }
                aria-pressed={
                  filter === card
                }
                onClick={
                  () =>
                    setFilter(
                      card
                    )
                }
              >

                <span>
                  {
                    getCardCount(
                      card
                    )
                  }
                </span>

                <strong>
                  {card}
                </strong>

              </button>
            )
          )
        }

      </div>


      {/* =================================================
          SEARCH
      ================================================= */}

      <div className="searchSection">

        <label
          htmlFor="requestSearch"
          className="searchLabel"
        >
          Search Requests
        </label>

        <p className="searchHint">
          Search by request ID,
          student, programme, reason
          or status.
        </p>


        <div className="toolbar">

          <input
            id="requestSearch"
            type="search"
            aria-label={
              "Search requests"
            }
            placeholder={
              "For example AA-102, Medical or Programme"
            }
            value={search}
            onChange={
              e =>
                setSearch(
                  e.target.value
                )
            }
          />


          <button
            type="button"
            onClick={
              clearFilters
            }
          >
            Clear filters
          </button>

        </div>

      </div>


      {/* =================================================
          RESULTS INFORMATION
      ================================================= */}

      <div className="resultSummary">

        <strong>
          {visible.length}
        </strong>

        {" "}

        {
          visible.length === 1
            ? "request"
            : "requests"
        }

        {
          filter !== "All" &&
          (
            <span>
              {" "}
              matching{" "}
              <strong>
                {filter}
              </strong>
            </span>
          )
        }

      </div>


      {/* =================================================
          LOADING
      ================================================= */}

      {
        props.loading
          ? (
            <div className="loadingPanel">
              Loading requests...
            </div>
          )
          : (

            /* =============================================
               TABLE
            ============================================= */

            <div className="tableWrap">

              <table>

                <thead>

                  <tr>

                    <th scope="col">
                      Request ID
                    </th>


                    {
                      props.role !==
                        "Student" &&
                      (
                        <th scope="col">
                          Student
                        </th>
                      )
                    }


                    <th scope="col">
                      Absence Dates
                    </th>

                    <th scope="col">
                      Reason
                    </th>

                    <th scope="col">
                      Status
                    </th>


                    {
                      props.role ===
                        "Admin" &&
                      (
                        <th scope="col">
                          Signatory
                        </th>
                      )
                    }


                    <th scope="col">
                      Actions
                    </th>

                  </tr>

                </thead>


                <tbody>

                  {
                    visible.length === 0
                      ? (

                        <tr>

                          <td
                            className="emptyResults"
                            colSpan={
                              props.role ===
                                "Student"
                                ? 5
                                : props.role ===
                                    "Admin"
                                  ? 7
                                  : 6
                            }
                          >

                            <strong>
                              No requests found
                            </strong>

                            <p>
                              Try changing the
                              status filter or
                              search term.
                            </p>

                          </td>

                        </tr>

                      )
                      : (

                        visible.map(
                          request => (

                            <tr
                              key={
                                request.Id
                              }
                            >

                              <td>

                                <strong>
                                  AA-
                                  {
                                    request.Id
                                  }
                                </strong>

                              </td>


                              {
                                props.role !==
                                  "Student" &&
                                (
                                  <td>

                                    {
                                      request
                                        .Student
                                        ? request
                                            .Student
                                            .Title
                                        : "-"
                                    }

                                  </td>
                                )
                              }


                              <td>

                                {
                                  displayDate(
                                    request
                                      .AbsenceStartDate
                                  )
                                }

                                <span className="dateSeparator">
                                  {" – "}
                                </span>

                                {
                                  displayDate(
                                    request
                                      .AbsenceEndDate
                                  )
                                }

                              </td>


                              <td>

                                {
                                  (
                                    request
                                      .AbsenceReasons ||
                                    []
                                  ).length >
                                    0
                                    ? (
                                      request
                                        .AbsenceReasons ||
                                      []
                                    ).join(", ")
                                    : "-"
                                }

                              </td>


                              <td>

                                <span
                                  className={
                                    getStatusClass(
                                      request.Status
                                    )
                                  }
                                >
                                  {
                                    request.Status ||
                                    "Draft"
                                  }
                                </span>

                              </td>


                              {
                                props.role ===
                                  "Admin" &&
                                (
                                  <td>

                                    {
                                      request
                                        .Signatory
                                        ? request
                                            .Signatory
                                            .Title
                                        : "-"
                                    }

                                  </td>
                                )
                              }


                              <td>

                                <div className="tableActions">

                                  {props.role === "Admin" && (
                                    <button
                                      type="button"
                                      onClick={() => props.onOpen(request)}
                                    >
                                      Edit
                                    </button>
                                  )}

                                  {canReview(request) && (
                                    <button
                                      type="button"
                                      className="tablePrimaryAction"
                                      onClick={() => props.onReview(request)}
                                    >
                                      Review
                                    </button>
                                  )}

                                  {props.role !== "Admin" && !canReview(request) && (
                                    <button
                                      type="button"
                                      onClick={() => props.onOpen(request)}
                                    >
                                      {request.Status === "Draft" && props.role === "Student"
                                        ? "Edit"
                                        : "View"}
                                    </button>
                                  )}

                                  {((props.role === "Student" && request.Status === "Draft") ||
                                    props.role === "Admin") && (
                                    <button
                                      type="button"
                                      className="linkDanger"
                                      onClick={() => props.onDelete(request)}
                                    >
                                      Delete
                                    </button>
                                  )}

                                </div>

                              </td>

                            </tr>
                          )
                        )
                      )
                  }

                </tbody>

              </table>

            </div>
          )
      }

    </div>
  );
};