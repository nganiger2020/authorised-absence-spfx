import * as React from "react";
import { createPortal } from "react-dom";

import {
  IRequest,
  UserRole
} from "../../models/Models";

interface Props {
  role: UserRole;
  items: IRequest[];
  loading: boolean;
  currentUserEmail: string;
  onNew: () => void;
  onOpen: (request: IRequest) => void;
  onReview: (request: IRequest) => void;
  onDelete: (request: IRequest) => void;
}

type SortField =
  | "Id"
  | "Student"
  | "AbsenceStartDate"
  | "Status";

type SortDirection = "asc" | "desc";

const normalize = (value?: string): string =>
  (value || "").trim().toLowerCase();

const isReviewableStatus = (status?: string): boolean => {
  const value = normalize(status);
  return (
    value === "submitted" ||
    value === "pending approval" ||
    value === "under review"
  );
};

const displayDate = (value?: string): string => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (isNaN(date.getTime())) {
    return value.substring(0, 10);
  }

  return date.toLocaleDateString("en-GB");
};

const getStatusClass = (status?: string): string => {
  switch (normalize(status)) {
    case "approved":
      return "pill statusApproved";
    case "rejected":
      return "pill statusRejected";
    case "under review":
    case "submitted":
    case "pending approval":
      return "pill statusReview";
    default:
      return "pill statusDraft";
  }
};

const displayStatus = (status?: string): string => {
  const value = normalize(status);

  if (
    value === "submitted" ||
    value === "pending approval" ||
    value === "under review"
  ) {
    return "Under Review";
  }

  return status || "Draft";
};

export const Dashboard: React.FC<Props> = (props) => {
  const [search, setSearch] = React.useState<string>("");
  const [statusFilter, setStatusFilter] = React.useState<string>("All");
  const [sortField, setSortField] = React.useState<SortField>("Id");
  const [sortDirection, setSortDirection] = React.useState<SortDirection>("desc");
  const [page, setPage] = React.useState<number>(1);
  const [pageSize, setPageSize] = React.useState<number>(10);
  const [openActionMenuId, setOpenActionMenuId] =
    React.useState<number | undefined>(undefined);
  const [actionMenuPosition, setActionMenuPosition] =
    React.useState<{ top: number; left: number } | undefined>(undefined);

  const closeActionMenu = React.useCallback((): void => {
    setOpenActionMenuId(undefined);
    setActionMenuPosition(undefined);
  }, []);

  React.useEffect(() => {
    if (openActionMenuId === undefined) {
      return;
    }

    const handleDocumentClick = (event: MouseEvent): void => {
      const target = event.target as HTMLElement;
      if (
        target.closest(".requestActionsButton") ||
        target.closest(".requestActionsMenuPortal")
      ) {
        return;
      }
      closeActionMenu();
    };

    const handleScroll = (): void => closeActionMenu();
    const handleResize = (): void => closeActionMenu();

    document.addEventListener("click", handleDocumentClick);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);

    return (): void => {
      document.removeEventListener("click", handleDocumentClick);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
    };
  }, [openActionMenuId, closeActionMenu]);

  const showActionMenu = (
    event: React.MouseEvent<HTMLButtonElement>,
    requestId?: number
  ): void => {
    event.stopPropagation();

    if (!requestId) {
      return;
    }

    if (openActionMenuId === requestId) {
      closeActionMenu();
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 200;
    const menuHeight = 135;
    const gap = 6;
    const padding = 8;

    let left = rect.right - menuWidth;

    if (left < padding) {
      left = padding;
    }

    if (left + menuWidth > window.innerWidth - padding) {
      left = window.innerWidth - menuWidth - padding;
    }

    let top = rect.bottom + gap;

    if (window.innerHeight - rect.bottom < menuHeight) {
      top = Math.max(
        padding,
        rect.top - menuHeight - gap
      );
    }

    setActionMenuPosition({ top, left });
    setOpenActionMenuId(requestId);
  };

  const currentEmail = normalize(props.currentUserEmail);

  const canReview = React.useCallback(
    (request: IRequest): boolean => {
      if (!isReviewableStatus(request.Status)) {
        return false;
      }

      if (props.role === "Admin") {
        return true;
      }

      if (!currentEmail) {
        return false;
      }

      const signatoryEmail = normalize(
        request.Signatory && request.Signatory.EMail
          ? request.Signatory.EMail
          : ""
      );

      /*
       * Admin is Managed Metadata. AdminLabel contains
       * the administrator email address.
       */
      const administratorEmail = normalize(request.AdminLabel);

      return (
        currentEmail === signatoryEmail ||
        currentEmail === administratorEmail
      );
    },
    [props.role, currentEmail]
  );

  const counts = React.useMemo(() => {
    const result = {
      All: props.items.length,
      Draft: 0,
      "Under Review": 0,
      Approved: 0,
      Rejected: 0
    };

    props.items.forEach((item: IRequest) => {
      const status = normalize(item.Status);

      if (status === "draft") {
        result.Draft++;
      } else if (
        status === "submitted" ||
        status === "pending approval" ||
        status === "under review"
      ) {
        result["Under Review"]++;
      } else if (status === "approved") {
        result.Approved++;
      } else if (status === "rejected") {
        result.Rejected++;
      }
    });

    return result;
  }, [props.items]);

  const filteredItems = React.useMemo(() => {
    const query = normalize(search);

    const result = props.items.filter((request: IRequest) => {
      const status = normalize(request.Status);

      let statusMatches = true;

      if (statusFilter === "Draft") {
        statusMatches = status === "draft";
      } else if (statusFilter === "Under Review") {
        statusMatches =
          status === "submitted" ||
          status === "pending approval" ||
          status === "under review";
      } else if (statusFilter !== "All") {
        statusMatches = status === normalize(statusFilter);
      }

      if (!statusMatches) {
        return false;
      }

      if (!query) {
        return true;
      }

      const values = [
        request.Id ? "AA-" + request.Id : "",
        request.Title || "",
        request.Student ? request.Student.Title : "",
        request.Student ? request.Student.EMail : "",
        request.Programme || "",
        request.Status || "",
        request.Signatory ? request.Signatory.Title : "",
        request.Signatory ? request.Signatory.EMail : "",
        request.AdminLabel || "",
        (request.AbsenceReasons || []).join(" ")
      ];

      return values.some((value?: string) =>
        normalize(value).indexOf(query) >= 0
      );
    });

    result.sort((a: IRequest, b: IRequest): number => {
      let first: string | number = "";
      let second: string | number = "";

      if (sortField === "Id") {
        first = a.Id || 0;
        second = b.Id || 0;
      } else if (sortField === "Student") {
        first = a.Student ? a.Student.Title || "" : "";
        second = b.Student ? b.Student.Title || "" : "";
      } else if (sortField === "AbsenceStartDate") {
        first = a.AbsenceStartDate || "";
        second = b.AbsenceStartDate || "";
      } else {
        first = a.Status || "";
        second = b.Status || "";
      }

      let comparison = 0;

      if (typeof first === "number" && typeof second === "number") {
        comparison = first - second;
      } else {
        comparison = String(first).localeCompare(String(second));
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [props.items, search, statusFilter, sortField, sortDirection]);

  React.useEffect(() => {
    setPage(1);
  }, [search, statusFilter, pageSize]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredItems.length / pageSize)
  );

  React.useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const pageItems = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, page, pageSize]);

  const sort = (field: SortField): void => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortIndicator = (field: SortField): string => {
    if (sortField !== field) {
      return "";
    }
    return sortDirection === "asc" ? " ▲" : " ▼";
  };

  const cards: Array<{ label: string; count: number }> = [
    { label: "All", count: counts.All },
    { label: "Draft", count: counts.Draft },
    { label: "Under Review", count: counts["Under Review"] },
    { label: "Approved", count: counts.Approved },
    { label: "Rejected", count: counts.Rejected }
  ];

  return (
    <div className="dashboard">
      <div className="aaHeader">
        <div>
          <h1>Authorised Absence Requests</h1>
          <p className="pageIntro">
            Create a new request or manage requests available to you.
          </p>
        </div>

        <button
          type="button"
          className="primary"
          onClick={props.onNew}
        >
          + New Request
        </button>
      </div>

      <div className="cards" aria-label="Request status filters">
        {cards.map(card => {
          const cardStatusClass =
            "card" + card.label.replace(/\s+/g, "");

          return (
            <button
              type="button"
              key={card.label}
              className={
                "card " +
                cardStatusClass +
                (statusFilter === card.label ? " selected" : "")
              }
              aria-pressed={statusFilter === card.label}
              onClick={(): void => {
                closeActionMenu();
                setStatusFilter(card.label);
              }}
            >
              <span>{card.count}</span>
              <strong>{card.label}</strong>
            </button>
          );
        })}
      </div>

      <div className="toolbar">
        <div className="dashboardFilterField dashboardSearchField">
          <label htmlFor="dashboardSearch">
            Search requests
          </label>

          <input
            id="dashboardSearch"
            type="search"
            value={search}
            placeholder="Request ID, student, programme, status or email"
            onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
              setSearch(event.target.value);
            }}
          />
        </div>

        <div className="dashboardFilterField dashboardStatusField">
          <label htmlFor="dashboardStatus">
            Status
          </label>

          <select
            id="dashboardStatus"
            value={statusFilter}
            onChange={(event: React.ChangeEvent<HTMLSelectElement>): void => {
              closeActionMenu();
              setStatusFilter(event.target.value);
            }}
          >
            {cards.map(card => (
              <option
                key={card.label}
                value={card.label}
              >
                {card.label}
              </option>
            ))}
          </select>
        </div>

        <div className="dashboardFilterActions">
          <button
            type="button"
            className="secondaryButton"
            onClick={(): void => {
              closeActionMenu();
              setSearch("");
              setStatusFilter("All");
            }}
          >
            Clear filters
          </button>
        </div>
      </div>

      {props.loading ? (
        <div className="loadingPanel" role="status">
          Loading requests...
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="emptyState">
          <h2>No requests found</h2>
          <p>There are no requests matching the selected filters.</p>
        </div>
      ) : (
        <>
          <div className="resultToolbar">
            <div className="resultSummary">
              Showing {(page - 1) * pageSize + 1}–
              {Math.min(page * pageSize, filteredItems.length)} of {filteredItems.length}
            </div>

            <div className="pageSizeControl">
              <label htmlFor="pageSize">Rows per page</label>
              <select
                id="pageSize"
                value={pageSize}
                onChange={(event: React.ChangeEvent<HTMLSelectElement>): void =>
                  setPageSize(parseInt(event.target.value, 10))
                }
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>
                    <button type="button" className="sortButton" onClick={(): void => sort("Id")}>
                      Request ID{sortIndicator("Id")}
                    </button>
                  </th>
                  <th>
                    <button type="button" className="sortButton" onClick={(): void => sort("Student")}>
                      Student{sortIndicator("Student")}
                    </button>
                  </th>
                  <th>
                    <button type="button" className="sortButton" onClick={(): void => sort("AbsenceStartDate")}>
                      Absence Dates{sortIndicator("AbsenceStartDate")}
                    </button>
                  </th>
                  <th>Reason</th>
                  <th>
                    <button type="button" className="sortButton" onClick={(): void => sort("Status")}>
                      Status{sortIndicator("Status")}
                    </button>
                  </th>
                  <th style={{display:"none"}}>Signatory</th>
                  <th style={{display:"none"}}>Administrator</th>
                  <th className="actionsHeader">Actions</th>
                </tr>
              </thead>

              <tbody>
                {pageItems.map((request: IRequest) => {
                  const reviewAllowed = canReview(request);
                  const isDraft = normalize(request.Status) === "draft";

                  return (
                    <tr key={request.Id || request.Title}>
                      <td>{request.Id ? "AA-" + request.Id : "-"}</td>
                      <td>
                        {request.Student
                          ? request.Student.Title
                          : request.Title || "-"}
                      </td>
                      <td>
                        {displayDate(request.AbsenceStartDate)} – {displayDate(request.AbsenceEndDate)}
                      </td>
                      <td>{(request.AbsenceReasons || []).join(", ") || "-"}</td>
                      <td>
                        <span className={getStatusClass(request.Status)}>
                          {displayStatus(request.Status)}
                        </span>
                      </td>
                      <td style={{display:"none"}}>
                        {request.Signatory
                          ? request.Signatory.Title || request.Signatory.EMail || "-"
                          : "-"}
                      </td>
                      <td style={{display:"none"}}>{request.AdminLabel || "-"}</td>
                      <td className="actionsCell">
                        <div className="requestActions">
                          <button
                            type="button"
                            className={
                              openActionMenuId === request.Id
                                ? "requestActionsButton requestActionsButtonOpen"
                                : "requestActionsButton"
                            }
                            aria-haspopup="menu"
                            aria-expanded={openActionMenuId === request.Id}
                            aria-label={"More actions for request AA-" + (request.Id || "")}
                            title="More actions"
                            onClick={(event: React.MouseEvent<HTMLButtonElement>): void =>
                              showActionMenu(event, request.Id)
                            }
                          >
                            <span className="requestActionsDots" aria-hidden="true">
                              ⋮
                            </span>
                          </button>

                          {openActionMenuId === request.Id &&
                            actionMenuPosition &&
                            typeof document !== "undefined" &&
                            createPortal(
                              <div
                                className="requestActionsMenu requestActionsMenuPortal"
                                role="menu"
                                aria-label={"Actions for request AA-" + (request.Id || "")}
                                style={{
                                  top: actionMenuPosition.top,
                                  left: actionMenuPosition.left
                                }}
                                onClick={(event: React.MouseEvent<HTMLDivElement>): void => {
                                  event.stopPropagation();
                                }}
                              >
                                {reviewAllowed ? (
                                  <button
                                    type="button"
                                    role="menuitem"
                                    className="requestActionsItem"
                                    onClick={(): void => {
                                      closeActionMenu();
                                      props.onReview(request);
                                    }}
                                  >
                                    <span className="requestActionsIcon" aria-hidden="true">
                                      <svg viewBox="0 0 24 24" width="21" height="21" fill="none">
                                        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
                                        <path d="M8 12.2l2.5 2.5L16.5 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                      </svg>
                                    </span>
                                    <span className="requestActionsLabel">
                                      {isReviewableStatus(request.Status)
                                        ? "Continue Review"
                                        : "Review"}
                                    </span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    role="menuitem"
                                    className="requestActionsItem"
                                    onClick={(): void => {
                                      closeActionMenu();
                                      props.onOpen(request);
                                    }}
                                  >
                                    <span className="requestActionsIcon" aria-hidden="true">
                                      {isDraft ? (
                                        <svg viewBox="0 0 24 24" width="21" height="21" fill="none">
                                          <path d="M4 20h4l11-11a2.1 2.1 0 0 0-3-3L5 17v3Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                                          <path d="M14.5 7.5l3 3" stroke="currentColor" strokeWidth="1.7" />
                                        </svg>
                                      ) : (
                                        <svg viewBox="0 0 24 24" width="21" height="21" fill="none">
                                          <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                                          <circle cx="12" cy="12" r="2.7" stroke="currentColor" strokeWidth="1.7" />
                                        </svg>
                                      )}
                                    </span>
                                    <span className="requestActionsLabel">
                                      {isDraft ? "Edit" : "View"}
                                    </span>
                                  </button>
                                )}

                                {(props.role === "Admin" || isDraft) && (
                                  <>
                                    <div className="requestActionsDivider" aria-hidden="true" />
                                    <button
                                      type="button"
                                      role="menuitem"
                                      className="requestActionsItem requestActionsDelete"
                                      onClick={(): void => {
                                        closeActionMenu();
                                        props.onDelete(request);
                                      }}
                                    >
                                      <span className="requestActionsIcon" aria-hidden="true">
                                        <svg viewBox="0 0 24 24" width="21" height="21" fill="none">
                                          <path d="M4 7h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                                          <path d="M9 7V4h6v3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                                          <path d="M6 7l1 13h10l1-13" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                                          <path d="M10 11v5M14 11v5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                                        </svg>
                                      </span>
                                      <span className="requestActionsLabel">Delete</span>
                                    </button>
                                  </>
                                )}
                              </div>,
                              document.body
                            )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="paginationSection">
            <div className="paginationSummary">
              Page {page} of {totalPages}
            </div>

            <div className="pagination">
              <button
                type="button"
                className="paginationButton"
                disabled={page <= 1}
                onClick={(): void => setPage(page - 1)}
              >
                Previous
              </button>

              <button
                type="button"
                className="paginationButton"
                disabled={page >= totalPages}
                onClick={(): void => setPage(page + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
