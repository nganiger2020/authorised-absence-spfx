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
      return "pill statusReview";

    case "submitted":
      return "pill statusReview";

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



  const cards: Array<{ label: string; count: number; icon: React.ReactNode }> = [
    {
      label: "All",
      count: counts.All,
      icon: (
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" focusable="false">
          <path d="M7 3h8l4 4v14H7V3Z" /><path d="M15 3v5h4M10 12h6M10 16h6" />
        </svg>
      )
    },
    {
      label: "Draft",
      count: counts.Draft,
      icon: (
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" focusable="false">
          <path d="M4 20h4l11-11a2.1 2.1 0 0 0-3-3L5 17v3Z" /><path d="M14.5 7.5l3 3" />
        </svg>
      )
    },
    {
      label: "Under Review",
      count: counts["Under Review"],
      icon: (
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" focusable="false">
          <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
        </svg>
      )
    },
    {
      label: "Approved",
      count: counts.Approved,
      icon: (
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" focusable="false">
          <circle cx="12" cy="12" r="9" /><path d="M8 12.2l2.5 2.5L16.5 9" />
        </svg>
      )
    },
    {
      label: "Rejected",
      count: counts.Rejected,
      icon: (
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" focusable="false">
          <circle cx="12" cy="12" r="9" /><path d="M9 9l6 6M15 9l-6 6" />
        </svg>
      )
    }
  ];



  return (

    <div className="dashboard">

      <div className="aaHeader">



        <div className="appHeaderLogoRow" style={{ backgroundColor: "#f7f7f7", padding: "20px 24px", display: "flex", alignItems: "center" }}>
          <img
            src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyODAiIGhlaWdodD0iOTIiIGZpbGw9Im5vbmUiIHZpZXdCb3g9IjAgMCAyODAgOTIiPjxwYXRoIGZpbGw9IiMwMDAiIGQ9Ik0xNzUuNTU0IDMxLjI1NXYtNy42aDEuMzI1YzMuMTYyIDAgNC4zOTUgMS4xMjMgNC4zOTUgNC4wMDMgMCAyLjUyMS0xLjM3MyAzLjU5Ni00LjU5MyAzLjU5NnptMi44MTUgMTAuMDY0aC0uMzc4Yy0yLjMyNCAwLTIuNDM3LTEuNTg2LTIuNDM3LTYuNTk4di0yLjIxNGguODY4Yy4wNTcgMCAuMTA5IDAgLjE2Ni4wMDIgMi4wODguMDI3IDIuNjM3LjQgMy45MTYgMi42Ny4yNDEuNDM2LjUwMiAxLjAzLjgwNCAxLjcyLjM0OS43OTUuNzQ1IDEuNjk4IDEuMjUyIDIuNjk0YTQuNTEgNC41MSAwIDAgMCA0LjAzOSAyLjQ2NGgyLjkzMnYtLjczOWgtLjI0NWMtMS40NjkgMC0yLjMwNC0xLjA1MS0zLjcyOS0zLjU2Ny0uMjQtLjQzNy0uNDY1LS44Ny0uNjgyLTEuMjktMS4xMjQtMi4xNzEtMi4xMTUtNC4wODgtNC4zODYtNC42NCAzLjkxOC0uODg3IDQuNTQtMy4yNjIgNC41NC00LjY3OCAwLTEuNzctLjg1MS00Ljc0MS02LjU0Ni00Ljc0MWgtOS4wOXYuNzUyaC40NGMyLjI0NiAwIDIuMzUzIDEuNTA3IDIuMzUzIDYuMjcydjUuNTU3YzAgNC44MTItLjEwNyA2LjMzNS0yLjM1MyA2LjMzNWgtLjQ0di43NGg4Ljk3NnpNMTkxLjc0MSA0MS44NDdjLjA0Ny0uMzg5LjI1MS0uNjA0LjU3NS0uNjA0LjMxMiAwIC42OC4xNTIgMS4xNDUuMzQ1LjkwMy4zNzMgMi4xMzcuODg1IDQuMjAxLjg4NSAzLjk4MSAwIDYuNzU5LTIuNDYgNi43NTktNS45OCAwLTMuNzAyLTIuNDI4LTQuODUtNS4yNDItNi4xNzlxLS41MTctLjI0Mi0xLjA0NS0uNWMtMi40Mi0xLjE3Ny0zLjg4OS0yLjAyNi0zLjg4OS0zLjg3MyAwLTEuNDg4IDEuNDE1LTIuNjUzIDMuMjIxLTIuNjUzIDIuNjc1IDAgNC41NjkgMS44MSA1LjA2NyA0Ljg0bC4wMjQuMTUxaC42OTR2LTYuMDNoLS43MTNsLS4wMzUuMTM3Yy0uMTQxLjU2NC0uMjUyLjcxLS41NDMuNzEtLjI2NCAwLS41ODItLjEzLS45ODMtLjI5NS0uNzg4LS4zMjQtMS44NjYtLjc2NS0zLjY0My0uNzY1LTMuMjc5IDAtNi4wNDkgMi40NDctNi4wNDkgNS4zNDQgMCAzLjQ5NiAyLjM0NiA0LjYwNSA1LjkwOCA2LjI5IDIuNjM1IDEuMjIyIDMuOTcyIDIuMjA3IDMuOTcyIDQuMTk1IDAgMi4xMTItMS40MzIgMy4zNzMtMy44MzEgMy4zNzMtMy4wNTYgMC00LjkwNi0xLjg2Ni01LjY2Mi01LjcwM2wtLjAyOS0uMTQ3aC0uNjg3djYuNjE4aC43NjV6TTE2OC4wNTIgMzUuODk1aC0uNzM2bC0uMDIyLjE1NGMtLjUwMiAzLjUyNC0yLjA0MiA0Ljc3NC01Ljg4NSA0Ljc3NC0zLjczNyAwLTMuOTIxLS4yMjMtMy45MjEtNC43NDh2LTMuNTYyYzMuMTMuMDc0IDQuMTQ1LjU4NSA0LjMzMyAzLjM4MmwuMDEyLjE2OGguNzQyVjI4LjA3aC0uNzQ5bC0uMDA1LjE3N2MtLjA2NCAyLjUzLTEuMDkyIDIuOTkxLTQuMzMzIDMuMDY3di03LjY1N2gyLjYxNGMzLjUwNiAwIDUuMTc4LjUyIDUuODIyIDMuNjA0bC4wMy4xNDRoLjcyOGwtLjIxMS01LjAwM2gtMTUuMTQ1di43NTRoLjQyOGMyLjI1OSAwIDIuMzY3IDEuNTA3IDIuMzY3IDYuMjd2NS41NTdjMCA0LjgxNC0uMTA4IDYuMzM3LTIuMzY3IDYuMzM3aC0uNDI4di43MzdoMTYuNTE4ek0yNjEuNTQzIDI1Ljk1Yy40MjMgMCAuNTM2IDAgLjkwNy4wODJsLjIyLjA1di0uODUybC0uMTExLS4wNDZjLS4zNDktLjE0Ny0xLjAxOS0uMTc5LTEuMTY3LS4xNzktMy41MjcgMC01Ljk5IDIuMzQ5LTUuOTkgNS43MSAwIDMuNzk3IDIuNTIzIDYuMTU3IDYuNTgzIDYuMTU3IDMuOTY0IDAgNi45NTEtMy4xMzUgNi45NTEtNy4yOTEgMC00LjQ2Mi0zLjUzOS03LjU4MS04LjYwNC03LjU4MS04Ljc0OSAwLTEzLjk3NyA3LjMyMy0xNS41OSA5Ljk5NmwtMy41ODYtNi4yOTZjLS4zMDUtLjU1NS0uNDMzLTEuMjM3LS40MzMtMS40NzggMC0uNjIuMzAzLS45OTMgMS44NTItMS4wNjRsLjE3My0uMDA3di0uNzQ2aC04LjE5NnYuNzQ2bC4xNy4wMDhjMS4yMTEuMDU4IDEuNzMuOTY2IDIuNTkxIDIuNDdxLjE5My4zMzguNDA3LjcwNGw0LjI3MiA3LjQ2djIuNTQ3YzAgMy44LS4zMjUgNC45ODQtMi4zNjYgNC45ODRoLS40NDF2LjczN2g4Ljk3N3YtLjczOGgtLjM4M2MtMi4wMjEgMC0yLjM0NS0xLjE4My0yLjM0NS00Ljk4NHYtMi45MzhjMS40NjUtMi40MTYgNi43MjMtMTAuMDUgMTQuNTUyLTEwLjA1IDMuOTgyIDAgNi4wMDEgMi4xMzkgNi4wMDEgNi4zNTcgMCAzLjk2OS0xLjQ1OSA2LjI0NS00IDYuMjQ1LTIuNDQzIDAtMy43ODctMS44NjktMy43ODctNS4yNi0uMDAyLTIuOTMgMS43MzUtNC43NDQgMy4zNDMtNC43NDRNMTAxLjQ3MiAzNi4zNHYtOS44NTJsMTIuNTQ4IDE1LjcwMy4wNTQuMDY4aDEuMDk4di0xNC4xMWMwLTMuNzY0LjYyNS00LjkyOCAyLjY4MS00Ljk4NWwuMTc2LS4wMDV2LS43NDloLTcuMTI2di43NDlsLjE3Ny4wMDVjMi4wNzEuMDU2IDIuNzAyIDEuMjIgMi43MDIgNC45ODR2Ny44NzZsLTEwLjgzNy0xMy41NDYtLjA1NC0uMDY4aC01LjYxNnYuNzVsLjE3Ni4wMDVjMi4yMzYuMDU3IDIuNjM1IDEuMzA1IDIuNjM1IDQuNzg4djguMzg3YzAgMy43Ni0uNjMyIDQuOTI0LTIuNzAzIDQuOTg0bC0uMTc2LjAwNXYuNzMyaDcuMTIzdi0uNzMybC0uMTc2LS4wMDVjLTIuMzA5LS4wNjUtMi42ODItMS41MjMtMi42ODItNC45ODRNMjE0LjQ3NiA0MS4zMmgtLjQ0M2MtMi4zNjQgMC0yLjM2NC0xLjY2Mi0yLjM2NC02LjZ2LTQuOTY5YzAtMi40OTQgMC00LjE0MS4zMS01LjE5Mi4zLTEuMDEuODc1LTEuNDAzIDIuMDU0LTEuNDAzaC40NDN2LS43NTRoLTguOTl2Ljc1NGguNDM5YzIuMzA0IDAgMi4zMDQgMS41OCAyLjMwNCA2LjI3djUuNTU3YzAgNC43NCAwIDYuMzM3LTIuMzA0IDYuMzM3aC0uNDM5di43MzdoOC45OXpNMjc2LjM1MiAzNS42OWgtLjM3NGMtMS45MTQgMC0xLjk3NC0uNzMyLTEuOTc0LTQuNjIzVjI5LjY4YzEuOTQuMDc1IDIuMzEyLjQ1MiAyLjQzMSAyLjI4NWwuMDExLjE2OWguNzI5di01LjczMWgtLjczNGwtLjAwNi4xNzNjLS4wNTkgMS42NzctLjQwNyAyLTIuNDMxIDIuMDd2LTUuMTI2aDEuMjhjMi41NDQgMCAzLjQ3My4zMzggMy45NTEgMi4zNDNsLjAzMy4xNGguN2wtLjEzNi0zLjU5NWgtMTAuNDI1di44MDRoLjMxMWMxLjU5NSAwIDEuNjYxLjg4NCAxLjY2MSA0LjI2djQuMDRjMCAzLjMxLS4wNjYgNC4xNzctMS42NjEgNC4xNzdoLS4zMTF2Ljg2NWg2Ljk0NXpNMTMzLjE5NCAyNi4zODFsNi4xNCAxNS45NTkuMDQ0LjExNWguODQxbDUuNTI2LTE0LjEzYzEuMjc0LTMuMjU2IDIuMjI0LTQuODYgNC4xNjctNS4xNjNsLjE1NC0uMDI1di0uNzI3aC03LjI1MXYuNzQ3bC4xNzQuMDA2YzEuNTUxLjA2MiAyLjEwMS41NDYgMi4xMDEgMS44NDggMCAuOTIzLS4zNTQgMi4zNTUtLjk1IDMuODMzbC0zLjExNCA3Ljg4OC0zLjk4My0xMC4wMjRjLS40ODgtMS4yNS0uNTA5LTIuMDgzLS41MDktMi4wOTEgMC0uOTA1LjYxLTEuMzI3IDIuMTA2LTEuNDUzbC4xNjctLjAxNXYtLjczOGgtOC44MTJ2Ljc0N2wuMTc0LjAwN2MxLjY0NC4wNiAyLjE4NSAxLjAyNiAzLjAyNSAzLjIxNk0yMTYuMTAyIDI4LjM3M2guNzI3bC4wMjktLjE0N2MuNzE3LTMuOCAxLjUxNi00LjU2OCA0LjczOS00LjU2OGgxLjMxMXYxMS4zMjZjMCA0LjgxNC0uMTA3IDYuMzM3LTIuMzY3IDYuMzM3aC0uNDQ4di43MzdoOS4xMXYtLjczN2gtLjM3OGMtMi4yNjEgMC0yLjM3LTEuNTIzLTIuMzctNi4zMzdWMjMuNjU3aDEuMjM3YzMuMjc3IDAgNC4wODYuNzY3IDQuODA5IDQuNTY4bC4wMjcuMTQ3aC43MjR2LTUuOTdoLTE3LjE1MXY1Ljk3ek05NS41MzQgMjMuMTU1bC4xNzctLjAwNXYtLjc0N2gtNy4xOHYuNzQ3bC4xNzUuMDA1YzIuMzExLjA2MyAyLjY4MyAxLjUyIDIuNjgzIDQuOTg0djYuMjNsLjAwMi4zMThjLjAwNi41NzguMDEzIDEuNDUzLS4wNzggMS45NzktLjM1OCAyLjY2Mi0yLjEyNiA0LjI1Mi00LjcyNiA0LjI1Mi0zLjgzMiAwLTQuNjk5LTIuMjMtNS4wMTctMy45MDgtLjE0Ni0uNzczLS4xNDUtMS41MzctLjE0NS0yLjIxVjI5LjQzYzAtNC43NjYuMTA3LTYuMjcyIDIuMzUyLTYuMjcyaC40NDR2LS43NTNoLTguOTYydi43NTNoLjM2M2MyLjMyMyAwIDIuNDMyIDEuNTg0IDIuNDMyIDYuNTk1djQuOTcxYzAgMi42OTcuNDU1IDQuMjU3IDEuNjI0IDUuNTYzLjYxMS42NzUgMS41MTIgMS4yNDQgMi42MDMgMS42NDdhOS41IDkuNSAwIDAgMCAzLjE5Ny41ODFjNS44IDAgNy4wNTYtMy42MjggNy4yODgtNS43OTMuMDcyLS42OTMuMDcxLTEuNTEzLjA2OC0yLjE3MnYtNi40MWMuMDAxLTMuNzYzLjYzMi00LjkyNyAyLjctNC45ODRNMTI4LjYyIDQxLjMyaC0uNDQyYy0yLjM3IDAtMi4zNy0xLjY2Mi0yLjM3LTYuNnYtNC45NjljMC00LjkzMyAwLTYuNTk1IDIuMzctNi41OTVoLjQ0MnYtLjc1NGgtOC45OTJ2Ljc1NGguNDM4YzIuMzA2IDAgMi4zMDYgMS41OCAyLjMwNiA2LjI3djUuNTU3YzAgNC43NCAwIDYuMzM3LTIuMzA2IDYuMzM3aC0uNDM4di43MzdoOC45OTJ6TTExOC45MDEgNTUuNzQ0YzAgMi41MjktMS4zNyAzLjYwOC00LjU3NyAzLjYwOGgtMS4xMjZ2LTcuNTk1aDEuMzI0YzMuMTUyIDAgNC4zNzkgMS4xMTggNC4zNzkgMy45ODdtNC4yODUgMTAuMDk1Yy0uMjM1LS40MjktLjQ1NS0uODU2LS42NjgtMS4yNjYtMS4xMjYtMi4xNzctMi4xMTktNC4wOTctNC4zOTEtNC42NTEgMy44OTMtLjg4NiA0LjUxMS0zLjI2MSA0LjUxMS00LjY3NiAwLTEuNzcxLS44NDctNC43NDEtNi41MTItNC43NDFoLTkuMDg5di43NTNoLjQ0YzIuMjQ1IDAgMi4zNTIgMS41MDYgMi4zNTIgNi4yN3Y1LjUyYzAgNC44MTQtLjEwNyA2LjMzOC0yLjM1MiA2LjMzOGgtLjQ0di43NTZoOC45NTd2LS43NTZoLS4zNzdjLTIuMzE1IDAtMi40MTktMS40NzctMi40MTktNi41OTh2LTIuMTgxYy4zODIgMCAxLjAzMiAwIDEuMDg3LjAwMyAyLjA1Mi4wMzggMi41OTIuNDEgMy44NTMgMi42NTYuMjI2LjQwOS40NjkuOTYuNzUgMS41OTguMzU2LjgwNi43OTggMS44MSAxLjM2NyAyLjg4MmE0LjUyIDQuNTIgMCAwIDAgMy45OTggMi40MDVsMi41NzYuMDA2LjAwNy0uNzY2LS4xNzYtLjAwN2MtMS4yNjMtLjA0OC0yLjE2Mi0xLjIzMi0zLjQ3NC0zLjU0NU0yMDAuNTAzIDYwLjg1NGwuMTc0LjAwNWMyLjA4MS4wNiAyLjgxNi43NDQgMi44MTYgMi42MXYyLjI5MWMwIDIuMzMxLTEuNDM4IDMuNjE0LTQuMDUyIDMuNjE0LTMuODk0IDAtNi40MDktMy4zOTUtNi40MDktOC42NSAwLTUuODA2IDIuMzgxLTkuNDEzIDYuMjE0LTkuNDEzIDMuMzA2IDAgNS43MTkgMi4xOTcgNi4xNSA1LjU5OGwuMDE5LjE1OGguNzMxdi02LjQ4M2gtLjc1NGwtLjA1LjFjLS4xMjUuMjUxLS4zMzQuNTUtLjYyMi41NS0uMzcyIDAtLjg1OC0uMTY2LTEuNDcyLS4zNzgtLjk4Mi0uMzM3LTIuMzI1LS43OTktNC4wMDMtLjc5OS01Ljg4IDAtMTAuMTQ3IDQuNDU3LTEwLjE0NyAxMC41OTcgMCA1Ljc3OSAzLjk4OSA5Ljk3MyA5LjQ4OCA5Ljk3MyAyLjUzMSAwIDQuNDM3LS43MyA2LjEyMS0xLjUxOC42MjctLjI5NCAxLjIzOC0uNTQ3IDEuODA4LS40MjhsLjIzNC4wNDktLjAxOC0uMjRjLS4wNjQtLjkwNi0uMDY0LTEuNjI5LS4wNjQtMi4yMXYtMi4yODVjMC0yLjQ5Ni4xOTUtMi45NTUgMi42NDEtMy4xMzZsLjE2Ny0uMDEzdi0uNzM4aC04Ljk3M3pNMTgwLjg5IDUxLjI2NmwuMTc3LjAwNWMyLjA4LjA1OCAyLjY4MyAxLjE3MiAyLjY4MyA0Ljk2M3Y3Ljg5N2wtMTAuODQtMTMuNTQ3LS4wNTQtLjA2OGgtNS42MDN2Ljc1bC4xNzUuMDA2YzIuMjIyLjA1OSAyLjYxOSAxLjMgMi42MTkgNC43NjV2OC4zOTljMCAzLjc5My0uNjA0IDQuOTA2LTIuNjg3IDQuOTZsLS4xNzYuMDA2di43NTFoNy4xMjd2LS43NTFsLS4xNzYtLjAwNWMtMi4xMjEtLjA1NS0yLjcwMy0xLjEyMS0yLjcwMy00Ljk2MXYtOS44MzhsMTIuNTUyIDE1LjcuMDU1LjA2OGgxLjA5NFY1Ni4yMzRjMC0zLjc0Ni42MzEtNC45MDUgMi43MDMtNC45NjRsLjE3Ny0uMDA1di0uNzVoLTcuMTIzek0xNTUuNDE2IDUxLjI3MmguNDQxYzIuMjg5IDAgMi4yODkgMS41OCAyLjI4OSA2LjI3MnY1LjUzNmMwIDUuMDExLS4wOTIgNi4zMjEtMi4yODkgNi4zMjFoLS40NDF2Ljc1NWg4Ljk3NFY2OS40aC0uNDQ1Yy0yLjI1OCAwLTIuMzUtMS4zNjQtMi4zNS02LjU4di00Ljk1YzAtNC45MzcgMC02LjYgMi4zNS02LjZoLjQ0NXYtLjc1NGgtOC45NzR6TTIyMi43NzYgNTEuMjY1aC4zNzRjMi4yNTggMCAyLjM2NSAxLjUwNiAyLjM2NSA2LjI3MXYxLjY2aC05LjI5NHYtMS4zMzNjMC01LjAxMy4xMS02LjU5OSAyLjQzNS02LjU5OWguMzc4di0uNzU1aC04LjkxM3YuNzU1aC4zOGMyLjI1OSAwIDIuMzY3IDEuNTA3IDIuMzY3IDYuMjcydjUuNTI0YzAgNC45MTctLjEwMSA2LjMzNS0yLjM2NyA2LjMzNWgtLjM4di43NTdoOC45MTN2LS43NTdoLS4zNzhjLTIuMzMyIDAtMi40MzUtMS40NzctMi40MzUtNi41OTl2LTIuMjgxaDkuMjk0djIuNTQ1YzAgNC45MTctLjEgNi4zMzUtMi4zNjUgNi4zMzVoLS4zNzR2Ljc1N2g4LjkwOXYtLjc1N2gtLjM3N2MtMi4yNSAwLTIuMzUtMS40MTgtMi4zNS02LjMzNXYtNS41MjRjMC00Ljc2NS4xMDUtNi4yNzIgMi4zNS02LjI3MmguMzc3di0uNzU1aC04LjkwOXpNMjc5LjU1NyA1MS4yN0gyODB2LS43NTRsLTUuODgzLS4wMDUtNi4xNzMgMTQuMzAxLTUuNzc3LTE0LjMwMWgtNi40MDl2Ljc0NmwuMTcyLjAwN2MxLjQ5Mi4wNjcgMi4xMDQuMjggMi4yNjIuOC4yNTEuNjI5LjM3NiAyLjY5LjM3NiA2LjEyNXY2LjIzOGMwIDMuNjI5LS40MTEgNC45MjUtMi43MTYgNC45NmwtLjE3OS4wMDJ2Ljc3bDcuNDgyLS4wMDh2LS43NWwtLjE3My0uMDA4Yy0yLjY0Ny0uMTItMy4wOTMtMS4zNDYtMy4wOTMtNC45NjZWNTQuMjU1bDYuMzU1IDE1Ljg5NGguNzY0bDYuODEzLTE1Ljc0MnY4LjQzOGMwIDQuODk5IDAgNi41NDktMi42MTYgNi41NDloLS4xOHYuNzU1bDguOTc0LjAwNlY2OS40aC0uNDQ0Yy0yLjI1NiAwLTIuMzQ5LTEuMzY3LTIuMzQ5LTYuNTk3VjU3Ljg3Yy4wMDItNC45MzcuMDAyLTYuNiAyLjM1MS02LjZNODEuNDI3IDY0LjU2OXYtMy45NjZoMi40MTZjMy40IDAgNS4wNTMgMS4zNCA1LjA1MyA0LjA5NCAwIDIuODctMS41MjIgNC4yMDktNC43OTEgNC4yMDktMi40NjQgMC0yLjY3OC0uNzEtMi42NzgtNC4zMzdtMS4xMjgtNS4yMTljLS4wNTUuMDAyLS43MzMuMDAyLTEuMTI4LjAwMnYtNy41OTZoMS4yNGMzLjEzMiAwIDQuNTI1IDEuMTU1IDQuNTI1IDMuNzQ2IDAgMi42NDMtMS4zODYgMy43OTQtNC42MzcgMy44NDhtNC41Mi4yMTVjMi40NjYtLjgwNyAzLjgxLTIuMzU0IDMuODEtNC40MjYgMC0yLjk0Ni0yLjM0NS00LjYzNS02LjQzMi00LjYzNWgtOS4xOXYuNzU0aC40MjNjMi4yNiAwIDIuMzY3IDEuNTA3IDIuMzY3IDYuMjd2NS41MzRjMCA0LjkyMi0uMSA2LjM0MS0yLjM2NyA2LjM0MWgtLjQyM3YuNzU1aDguOTc0YzIuMDczIDAgMy43MSAwIDUuMzU4LS44MDIgMS44MDItLjc2OCAzLjAxMi0yLjU4OCAzLjAxMi00LjUyNiAwLTIuODgxLTIuMTM2LTQuODctNS41MzItNS4yNjVNOTQuODc2IDUxLjI1OGguNDRjMi4zMDQgMCAyLjMwNCAxLjU4IDIuMzA0IDYuMjd2NS41MzNjMCA1LjAyMy0uMDkgNi4zMzctMi4zMDQgNi4zMzdoLS40NHYuNzU0aDguOTk0di0uNzU0aC0uNDQzYy0yLjI1NyAwLTIuMzUxLTEuMzY4LTIuMzUxLTYuNTk4di00Ljk0MmMwLTIuNDk1IDAtNC4xNDQuMzA5LTUuMTk2LjI5OC0xLjAxLjg3MS0xLjQwNCAyLjA0Mi0xLjQwNGguNDQzdi0uNzUzaC04Ljk5NHpNMTQwLjY5NiA2NC42OTdsLTUuNzM3LTE0LjA3NS0uMDQ2LS4xMTNoLTYuNDA4di43NDZsLjE3Mi4wMDhjMS40NzguMDY3IDIuMDg1LjI4IDIuMjQ0LjgwMS4yNTEuNjI2LjM3OCAyLjY4Ny4zNzggNi4xMjR2Ni4yMzdjMCAzLjYzLS40MDkgNC45MjUtMi43MDEgNC45NmwtLjE3Ny4wMDItLjAwNy43NyA3LjQ4Ni0uMDA3di0uNzVsLS4xNzItLjAwOWMtMi42NS0uMTItMy4wOTgtMS4zNDUtMy4wOTgtNC45NjZWNTQuMjQ3bDYuMzIzIDE1LjY3NS4wNDYuMTE0aC43NjRsNi44MjYtMTUuNjM2djguNDQ0YzAgNC44OTkgMCA2LjU0OS0yLjYzOSA2LjU0OWgtLjE4MXYuNzU2bDkuMDA0LjAwNVY2OS40aC0uNDQyYy0yLjI1OCAwLTIuMzUyLTEuMzY4LTIuMzUyLTYuNTk4di00LjkzNGMwLTQuOTM2IDAtNi41OTkgMi4zNTItNi41OTloLjQ0MnYtLjc1M2wtNS44ODktLjAwN3pNMjQ1LjI2MyA2MS44MzRoLTUuMDc5bDIuNTg5LTYuMzZ6bTUuMDQgMi45NzctNS45MjgtMTQuNjU3LS4wNDYtLjExM2gtLjgyOGwtNS4zOTIgMTMuMjA0LS4xMS4yNmMtMS4zMSAzLjA5OS0yLjQ0IDUuNzc2LTQuMjM2IDUuODkzbC0uMTU5LjAxMS0uMDM5Ljc0Nmg2LjkzNmwuMDMtLjc0My0uMTcyLS4wMTNjLTEuMzkyLS4xMTUtMi4yNjQtLjgyNy0yLjIyMy0xLjgxNy4wMzEtLjc1MS41NDctMi4wNDYgMS4yNzItMy44MDJsLjIzOS0uNjQxaDYuMTM3bDEuMDAxIDIuNTM2Yy4zOTEgMS4wNjIuNjY0IDEuODUyLjY0MiAyLjM1LS4wMzUuODM5LS43MDEgMS4yNS0yLjIyNiAxLjM3NGwtLjE1OS4wMTMtLjAzMy43NDNoOC45MDdsLjA0NS0uNzUtLjE4Ni0uMDA3Yy0xLjY3LS4wNTUtMi41ODYtMi4zNTktMy40NzItNC41ODdNMjguODMyIDUzLjUuMTEgNzAuMTg5YzEuNTc3IDE2LjI0IDI1LjMzMiAxNi40MjggMjguNDIyIDIxLjYzaC41OTJjMy4wMjUtNS4yMDMgMjYuODUtNS4zOSAyOC40My0yMS42MzJ6Ii8+PHBhdGggZmlsbD0iIzI1ODFjNCIgZD0iTTI4Ljc4IDIyLjQxNWgyOC44MDR2NDYuMDQzcTAgLjg5Ni0uMDgyIDEuNzMzTDI4Ljc3OSA1My41MDN6Ii8+PHBhdGggZmlsbD0iI2UzMDYxMyIgZD0iTTAgMjIuNDE1aDI4LjgwNXYzMS4wODhMLjA4MyA3MC4xOTNBMTggMTggMCAwIDEgMCA2OC40NTd6Ii8+PHBhdGggZmlsbD0iI2ZjYzIwMCIgZD0iTTI3LjQyMiAzMy4wMDVjLS4wNi0uMTM4LS4xMzQtLjI2NS0uMTgyLS40MDctLjE1Ni0uNDEzLS4yMDgtLjg3LS4wOTItMS4zLS41MDcuMDYzLS43OTQuNjMtLjgzNiAxLjA5N2wtLjAxLjEzMmMtLjEwMy0uNDgtLjE5NC0xLjAxMS4wNS0xLjQzMi4yMjQtLjM5Ljc2OC0uNTYuODc1LTEuMDQuMDk3LS40NzgtLjE1NC0uOTA4LS4xODQtMS4zNjlhLjk0Ljk0IDAgMCAxIC4zMDUtLjc4LjQuNCAwIDAgMC0uMTM5LjAzNGMtLjQzMS4xMTgtLjY5Ni41NjgtLjc3Ljk5NC0uMDQyLjI4Mi0uMDguNTY3LS4yMTEuODE4LS4xMjUuMjUtLjMzMS40MTEtLjU3Ni41NDNsLS4xOTMuMTA1Yy0uMzU2LjE4Ny0uNjQ4LjUyOC0uNzIzLjkzMS0uMTA3LjU3Mi4xNDYgMS4wNzEuMjYzIDEuNjA0YTEgMSAwIDAgMC0uMTEtLjE5NWMtLjIwMS0uMjk5LS40NjctLjU3Ny0uNTgtLjkyMWEuNTUuNTUgMCAwIDEgLjAxNS0uMzU0LjYuNiAwIDAgMC0uMjUxLjI4Yy0uMTU0LjM1OS0uMDk4Ljc3MS0uMDI4IDEuMTQxLjA0NS4yMzcuMTI3LjQ3NS4xMjguNzEuMDA3LjQ3Mi0uNDMyLjc3LS43OTcgMS4wMDktLjIxMS4xMzItLjQ0NS4yNDgtLjYzMy40MTYtLjI3MS4yMTctLjQ0OS41MjgtLjQ0My44MzdsLS4wMS0uMDEyYy0uMDExLjAxLTEuMTk2IDEuMDI4LS43NDggMi40Ny4yNzUuODg0LjY5IDEuMjMxIDEuMTMgMS42LjQ1My4zNzguOTIyLjc2OCAxLjMxNSAxLjgzMi4zMi44NjguMjkyIDEuNjgtLjA3NSAyLjEyLS4yNy4zMjItLjcxNy40MzctMS4yOS4zMy0uNjM5LS4xMTktMS4wNjgtLjU3NC0xLjQ4My0xLjAxNC0uNDcxLS40OTktLjk1Ny0xLjAxMS0xLjcyNy0uOTczYTMgMyAwIDAgMC0uMTI0LTEuNTg2Yy0uMi0uNTU2LS41LTEuMDg2LS44MzktMS41NjgtLjM3NC0uNTc3LS45MzItMS40ODUtLjgzNC0yLjE4M3EuMTk1LS4wOTkuMzY1LS4yMDRjLS4wNTQuMjYxLjA1LjU1NS4yNTUuNzgxLjE1NC4xOS4zOC4zNS41Ny41LS4wNTEtLjYxNC0uMDI3LS44OS40NzktMS4yODUuMjM4LS4yMDEuMzY0LS40NzEuMzk2LS43NThhMSAxIDAgMCAwIC4wMjguMDg0Yy4xNjEuNDM2LjY2Mi42MjMgMS4wOTYuNmEuOC44IDAgMCAwIC4wODYtLjI3NGMuMDUtLjQwNC0uMDU1LS44MTUtLjE4Mi0xLjE4OC0uMTE2LS4zMzktLjE3OS0uNzI5LS4wMS0xLjA1My4xNjYuMTM4LjM1NS4yNDMuNTcuMjk3LjIzOC4wNi41MzIuMDExLjY4OC0uMjAyLjA5OS0uMTI5LjEwOS0uMjk3LjA4Ny0uNDVsLS4wOC4wMWMtLjIzLjAxNy0uNTc1LjA5Ny0uNjMtLjItLjA1MS0uMjYuMDEtLjU2My4wMjUtLjgzMWExLjUzIDEuNTMgMCAwIDAtLjM5LTEuMTEzYy4zNTIuMTIzLjY3LjMyNC44OC42NDYuMTEyLjE2My4xODEuMzMuMjk3LjUwM2wuMTIuMTc0Yy4yNTItLjM4OC40ODItLjc5Ni4yOTMtMS4yNzEtLjE2Ni0uNDQyLS41OTgtLjcyNC0uNjM1LTEuMi0uMDEzLS43MTYtLjIxNC0xLjA5NC0uNzc1LTEuNDg5LjE2LS4yNzUuMjAzLS42MS4xNi0uOTUxLS4wMjYtLjI0My0uMTAyLS40NjctLjA0Mi0uNzEuMDU3LS4zMDQuMi0uNi4zNTctLjg2My0uMzg0LS4wMTYtLjc4My4wMTMtMS4xMzYuMTY2di0uMDE1YS44LjggMCAwIDEgLjIxNy0uNTQ1Yy0uOTM4LS40LTEuNjQzLjMyNC0yLjQ0Ny42NjYtLjU4Mi4yMDMtMS4yMzIuMTY1LTEuODM2LjA4N2wtLjA2LS4wMS0uMDQ3LjAzN2MtLjIyMy4xOC0uNDczLjM0My0uNzI5LjQ3NmwtLjA2OS4wMzNjLS4yMDQtLjM5Ny4wMS0uOTI1LjI5NC0xLjI0bC4wNDgtLjA1NmMtLjg0OS0uNjYyLTEuNzUtLjAwOC0yLjU1NC4zNzItLjU5Ny4yMzgtMS4yOC4xOTQtMS45MDYuMTE1bC0uMDYtLjAxLS4wNDcuMDM4YTQuNCA0LjQgMCAwIDEtLjcyOC40NzRjLS4yOS4xNDYtLjU5LjI3LS45MDMuMjU4LS41OC0uMDUtMS4xNzguMDMtMS42OTYuMzA0LS4yMzIuMzk5LS4xMzcuNzg0LjEyNiAxLjA2OWEyIDIgMCAwIDAtLjA0NS4yMDdjLS4wNDYuMjc3LS4wMjYuNTgzLjExNC44MzEtLjYxNS0uMjk5LTEuMDcyLS4zNzMtMS4zNTgtLjIxOGEuNS41IDAgMCAwLS4yNjEuMzZsLS4wMi4xOC4xNzctLjAyNmMuMzk0LS4wNi42MzQuMTM1LjkxMi4zNTguMTg2LjE1LjM3OS4zMDMuNjI3LjM5MmExLjkgMS45IDAgMCAxLS4wNDQuODRjLS4xMjIuNC0uMDkuNzUuMDkxIDEuMDQuMjMzLjM3NC43MS42MjYgMS4zNzcuNzI5bC4wOTIuMDE0LjA0OC0uMDhjLjE5NC0uMzIxLjU2NC0uNjcuOTUtLjcyNnEuMzM0LS4wNDUuNjMuMjAyYy4wMDcuMTc1LS4wMS42MDgtLjM0NC44NzUtMS44MzUuNTg0LTIuNDUyLjI4My0zLjEwNS0uMDM1LS40Ni0uMjI3LS45MzctLjQ2LTEuODIyLS4zOS0uMDU3LS4yMzItLjE1NS0uODg4LjEyNi0xLjk5MXEuMTE0LS40NDctLjExOS0uNzUzYy0uMjc1LS4zNjEtLjgzNC0uNDMzLTEuMDMzLS40NDctLjA1NC0uMjY5LS4zMDQtLjQ4Ny0uNTUzLS41OC0uNDEtLjE1LS44OTIuMDY3LTEuMTEyLjQyNS4zMS0uMDU1LjQ4LjE2My42Mi4zODZhLjQuNCAwIDAgMS0uMDYuMTM5LjY0LjY0IDAgMCAxLS4zMDIuMjI4LjkzLjkzIDAgMCAwLS41MTctLjI3N2MtLjQyMi0uMDctLjgzNy4yMS0uOTk0LjU4Ny4zMTItLjEwNS41MTcuMTEuNy4zMTVhLjkyLjkyIDAgMCAwLS4xNzUuNzYgMSAxIDAgMCAwLS4yOTctLjAwOWMtLjQyNC4wNi0uNzM3LjQ1LS43NzcuODU1LjI3NC0uMTk3LjUzOC0uMDM5Ljc3OC4xMDVhLjcuNyAwIDAgMCAuMzQ5LjA5MWMuMDAxLjEuMDE1LjIzLjA2MS4zNWExIDEgMCAwIDAtLjA5Ni4wMjNjLS4zOTUuMTItLjYyNC41NzgtLjU2Ljk3LjA4OS0uMTA2LjItLjE0My4zMTctLjE0My4xNDMgMCAuMjk1LjA1NS40MjguMTA3LjExMi4wMzguMjQzLjA1LjM2NC4wMjQuMDYzLjE1Ni4xOS4yODUuMzQyLjM2My0uMTMyLjEtLjI4MS4xOS0uNDIuMjY3LjE2LjEyOC4zNDMuMjY1LjUzMy4zMzcuMjYuMTExLjYyOS4xMzUuODM4LS4wOTRhLjcuNyAwIDAgMCAuMDkxLS4xMjZjLS4wNjQuMTc1LS4yMS4zMjUtLjM1LjQzOGwtLjA1NC4wNDVhLjcuNyAwIDAgMCAuMjQ5LjIxNmMuMTQ0LjA3LjMuMTA4LjQ1Ny4xMjVhLjc5Ljc5IDAgMCAwLS4zNTEuNTg2bC0uMDA2LjE5MS4xNTctLjA3NWMuMTUzLS4wNi4zODYuMDA2LjU1Ni4wNDQuNDA4LjA4NyAxLjE3Mi40MiAxLjY0Ny4zMTZhMiAyIDAgMCAwIC4xODMtLjAzMmMtLjAyLjIyMi0uMTE3LjQyMy0uMzI2LjUzMS0uMS4wNTYtLjIxMy4wODYtLjMzMi4xMDhhNSA1IDAgMCAwLS43NTcuMTgxIDEuMDggMS4wOCAwIDAgMC0uNjQ5LjUybC0uMTE5LjIuMjM1LjAwNWMuMy4wMDcuNTk3LjA4NS44OTguMTg2LjE2OC4wNTQuMzUzLjEyMi41NDUuMTQ4cS4yODkuMDI2LjUyNC0uMDI1Yy0uMTk1LjM1NS0uNjcuOTYtMS42Ljg1NmE4IDggMCAwIDEtLjc4OC0uMTM3Yy0uNjYyLS4xNC0xLjE4Ni0uMjUtMS42ODEuNDE2YS44Ni44NiAwIDAgMC0uNTgyLjE2N2MtLjMyNS4yNC0uNDA0LjcyNi0uMjM1IDEuMDc1YS40Mi40MiAwIDAgMSAuMjg4LS4yNDJjLjAwMi4xNDMuMDI1LjM1NC4xMjUuNTM4YTEuMSAxLjEgMCAwIDAtLjUwOC40ODljLS4yMi40MzctLjA4MS45ODQuMjQ4IDEuMzEydi0uMDI0YzAtLjM3Ny4zMi0uNTQ1LjYxNy0uNjczYTEgMSAwIDAgMCAuMTEtLjA2NWMuMTE1LjA4LjI4OC4xNi40NzguMTZhLjcuNyAwIDAgMCAuMTM4LS4wMTVjLS4wMzYuNDQzLjIzMi44NzYuNjA0IDEuMDg1YS42LjYgMCAwIDEtLjAyOC0uMTc4YzAtLjI4MS4yMjMtLjQ4Ny40MzYtLjY2YS45LjkgMCAwIDAgLjE5Ny0uMjU2LjcuNyAwIDAgMCAuMjIuMjA0Yy4zMTcuMTguNjMuMDI0LjgtLjI0cS4wMjguMTk0LjEzOC4zNjVhLjc3NC43NzQgMCAwIDAgLjgxOC0uNTAyIDEgMSAwIDAgMCAuMDQ4LS4xOTZjLjA2LjI1NS0uMDA3LjUwOC0uMTg4Ljc2NmwuMTIzLjA2NWMuMTk3LjExLjQ0OS4wMzUuNjEyLS4wOTIuMTg0LS4xNC4zMS0uMzM4LjM3OC0uNTU0YS43Ny43NyAwIDAgMCAuNjU1LS40MzdjLjI5MiAwIC41MjQtLjE4NC42ODctLjQ0My40NC0uMDA1Ljc2Ny0uMjc5Ljk1OC0uNjUxLjM1Mi4wMzUuNzI0LS4xNDYuOTItLjQ0N2ExLjI0IDEuMjQgMCAwIDAgLjE4OS0uNTA3Yy40NjkuMjgyLjU3NS43NjkuNTQ2IDEuMzIuMDc4LS4wMjIuMjM1LS4wNTMuMjkxLS4xMDYuMjQtLjE4OC4zNzYtLjQ4NS40MDQtLjc5LjE1My4zOS40NTcuNzI1LjgzNi44OTYuMjkyLjE1OC42NjcuMTgxLjk4LjE3OHEuMTI1IDAgLjI0My4wM2MwIC4zNjEtLjM5My4zODctLjY5My4zMTgtLjE1Mi0uMDI4LS4zODgtLjEwOC0uNTM3LS4xNTNhNSA1IDAgMCAwLS41NjUtLjEzNGMtLjc3OC0uMTM0LTEuNjE0LS4xMDItMi4zMzUuMjQ5YTMuNCAzLjQgMCAwIDAtLjIyOS44NTJjLS4wOC41NS0uMDYzIDEuMTEzLjAzMyAxLjY2LjA0Mi4yNjcuMTI0LjUyNS4xNDguNzk0LjA2LjUyMS0uMDA0IDEuMDYzLS4yMjIgMS41MzUtLjE5My40MjItLjU5Ljg2MS0xLjA4NS43NjRhNCA0IDAgMCAwLS40MDYtLjU1MmMtLjQ5NC0uNTc4LTEuMjQ3LTEuMDExLTEuOTY3LS41NjYtLjIyMS0uMTQ0LS41MzMtLjE1NC0uNzc4LS4wNzYtLjQ0OC4xNDItLjcxMS42NDktLjY2NiAxLjA5N2EuNDcuNDcgMCAwIDEgLjM4Ny0uMTgxcS4wOTUgMCAuMTkxLjAyM2MtLjA5Ni4xMjYtLjE4Mi4zMjgtLjE2NC42NDMtLjI0Mi4wMy0uNDc3LjE4Mi0uNjMuMzYyLS4zMDcuMzY4LS4yNzQuOTQ2LS4wMDYgMS4zMmEuNTIuNTIgMCAwIDEgLjI3LS4zOTFjLjEzNi0uMDc5LjMwNS0uMTE3LjQ2My0uMTQ5YTEgMSAwIDAgMCAuMjI1LS4wOSAyLjYgMi42IDAgMCAwLS4wNDkuODUyIDEgMSAwIDAgMC0uMDg0LjEzOWMtLjIyNC40NTgtLjA3OCAxLjAyNy4yNjUgMS4zNzFhLjYuNiAwIDAgMSAuMTk1LS40N2MuMTgtLjE4LjQ0NC0uMjI4LjYzNS0uMzkzbC4wMjguMDRxLjE3NS4yMTYuNTMuMjc5YTEgMSAwIDAgMC0uMDMuMDk5Yy0uMTIuNDkuMjIgMS4wMDEuNjU2IDEuMTg4YS41LjUgMCAwIDEgLjA0Ny0uNDc4Yy4xMjEtLjE5OS4zMzUtLjMxLjQ3OC0uNDg4LjE4Ny4wODguNDQuMTYuNzA2LjE2cS4xNTQuMDAxLjMwOC0uMDM0Yy4yNDItLjA1Ni41NTgtLjIwOC43OTctLjYuMDc3LjIzNS4wMzguNTEtLjAxMi43NDYuOTIzLS4zMzcgMS4zNy0xLjE5OCAxLjI1NS0yLjEyNi4yNC4zNDcuMjcuODIuMjY1IDEuMjQ4bC4xNC0uMDI1Yy42NDctLjExNC44NTQtLjkwMS44Ni0xLjQ2My4wMDctLjI4Mi0uMDUtLjU2LS4xNTUtLjgxOC4zNTItLjIxMy43MzktLjQ1My45MDUtLjg1NS4yMTEtLjQ5Ny4wMjctMS4wMTQtLjI5MS0xLjQxOC40OTcuMjc1IDEuMDYzLjEzNiAxLjI4OS0uNDQybC4wMDUtLjAwMWMtLjA5Ni45ODUuMzY0IDEuOTY2IDEuMjcyIDIuNDQuNjQ4LjM0IDEuMzk4LjQyNiAyLjAwNC44MzkuOTM3LjYwNyAxLjMxMiAxLjcwMSAxLjEyNyAyLjc3Ni0uMzU3LS4zMDMtLjc5OS0uNjI4LTEuMjU2LS42MjQtLjQzNC4wMy0uODQ2LjI3Ny0xLjA0Ny42NzVhLjgzLjgzIDAgMCAwLS41MzUuMjkxYy0uMjU0LjMwOC0uMjIuNzczLjAxNiAxLjA2N2EuNDIuNDIgMCAwIDEgLjE4LS4yNjYuOS45IDAgMCAxIC4yOTQtLjExIDEuNSAxLjUgMCAwIDAtLjExLjY5IDEgMSAwIDAgMC0uMzIyLjQzM2MtLjE0NC40LjAxLjg1OS4zMjMgMS4xMTdhLjUzLjUzIDAgMCAxIC4xNC0uMzk2Yy4xMjQtLjE0Ni4zMTItLjIxLjQ1MS0uMzM2LjExLjEwOC4yODQuMjUzLjQ4NS4zMWwtLjAzLjA4Yy0uMTMyLjQ0Ny4wNzMuOTQuNDI5IDEuMjA2YTEgMSAwIDAgMS0uMDA5LS4xYzAtLjMxLjI0NS0uNTAxLjQ4Ni0uNjU4YS44LjggMCAwIDAgLjI0MS0uMjgxYy4xMzctLjAwNS40NjItLjA0Ljg5Mi0uMjQuMDU0LjI1MS4xOS40ODYuMzkyLjYzOWwtLjAwMy0uMDY1YzAtLjMwMS4yMjEtLjQ4Mi40NS0uNjM1YS43LjcgMCAwIDAgLjEyMi0uMTE1Yy4wNy4wMjIuMTY5LjA0Ny4yOC4wNDdhLjY0LjY0IDAgMCAwIC4zNTMtLjFxLjI2My0uMTcxLjM3My0uNjE1LjE2My4xMzYuNDIuMTE2Yy4xNy0uMjkzLjI0LS42NDYuMjEyLS45ODYuMjc4LS4zMzguMjg3LS43OTkuMTM1LTEuMjEzLjMxMS0uMTAyLjU2Ni0uNDA3LjYwOS0uNjc2bC4wMTQtLjA5My0uMDczLS4wNTljLS40MzgtLjM2MS0uNDM1LS45MjYtLjQxOS0xLjEyNGEuNi42IDAgMCAwIC41NTctLjI3NmMuMS0uMTYuMTgzLS4zODYuMDM4LS41NmwtLjA1Ny0uMDU3LS4wODMuMDI2Yy0uMzI2LjEwMy0uODE0LjEyMi0uOTEyLS4yODMtLjExLS4zNzYtLjAzNy0uODI1LjA3LTEuMjAxbC4wMjctLjA4Ni0uMDYyLS4wNTZjLS40NDItLjMzNy0xLjA4My0uMTg4LTEuNTYtLjAyNC0uNTgzLjIyLS42NjQtLjA5MS0uNTUyLS42MDQuMTA3LS4wMjQuMjY2LS4xMjguMzAxLS4yNzItLjI5LjA5My0uNTY0LjEzMy0uODQ2LjA4LjIzLS40ODkuMjMtLjk5OC4xLTEuNTI3bC4wNzUuMTMzYy4yOTguNDc2LjY5MS45NzYgMS4yNTkgMS4xNTYuMzg2LjEyLjczLS4wMi45OS0uMjc0IDEuMTA3Ljc3IDIuNTQ2LS4xOTQgMy4xMDMtMS4yMjVhMy4yIDMuMiAwIDAgMCAuNDEtMS43OTVjLS4wMzctLjYxLS4xNjEtMS4yMzItLjQ1OS0xLjc3NS0uMzAxLS41NC0uNzIyLS45OTEtMS4xOC0xLjM5NS0uMjMyLS4xOTYtLjQ3Ni0uMzcyLS43MDctLjU1LS4yMTUtLjE3LS40NC0uMzUzLS41NjYtLjU5My0uMTI0LS4yMzMtLjEwNC0uNTA0LS4wMjYtLjc1NC4yODQtLjgyOSAxLjQ4MS0uNzIyIDIuMTczLS41NzcgMS4wMTUuMTkgMS45NzUtLjE4IDIuNDY3LTEuMTI0LjQ0LS44NS41MTUtMS44ODQuMTY0LTIuNzc4Ii8+PHBhdGggZmlsbD0iIzc0NDkwYyIgZD0iTTE4LjIxOSA1NS41OWEuMDMuMDMgMCAwIDEtLjAyMS0uMDA2Yy0uMzktLjI5Mi0uNTcyLS44MDMtLjQ0LTEuMjQ0cS4wMDctLjAyNS4wMTYtLjA0OWExLjIgMS4yIDAgMCAxLS40NC0uMjg0IDIgMiAwIDAgMS0uMTguMTIzIDEgMSAwIDAgMC0uMjQ0LjE5LjUuNSAwIDAgMC0uMTMxLjM3LjA0LjA0IDAgMCAxLS4wMi4wMzMuMDMuMDMgMCAwIDEtLjAzNy0uMDA0Yy0uMzQxLS4yODEtLjQ3OS0uNzU3LS4zMzQtMS4xNTZhMS4wNCAxLjA0IDAgMCAxIC4zMTgtLjQzN3EtLjAxNy0uMzMzLjA5LS42MjNhLjcuNyAwIDAgMC0uMjE3LjA5LjM5LjM5IDAgMCAwLS4xNjYuMjQ0LjAzLjAzIDAgMCAxLS4wMjcuMDI2LjA0LjA0IDAgMCAxLS4wMzQtLjAxMmMtLjI2My0uMzI2LS4yNy0uODA0LS4wMTctMS4xMWEuODYuODYgMCAwIDEgLjU0LS4zMDNjLjIwMy0uMzg1LjYxLS42NDQgMS4wNjctLjY3Ni40NDctLjAwNC44NzMuMjkgMS4yMzMuNTkxLjE2OC0xLjA5OS0uMjU5LTIuMTItMS4xMi0yLjY4LS4zNC0uMjMyLS43MzMtLjM2Mi0xLjExMy0uNDg4LS4yOTctLjA5OS0uNjA1LS4yLS44OS0uMzUtLjgzNi0uNDM2LTEuMzM0LTEuMzI4LTEuMy0yLjMwNGEuODYuODYgMCAwIDEtLjQ1OC4zOTcuOTQuOTQgMCAwIDEtLjY4LS4wMjhjLjIxLjMwMy40NC44MDMuMjEzIDEuMzM5LS4xNy40MDktLjU2Ny42NTgtLjg5NC44NTdxLjE1NS4zOTguMTQ3LjgwNGMtLjAwOC42Mi0uMjQ1IDEuMzgzLS44ODkgMS40OTZsLS4xNC4wMjVxLS4wMTcuMDA0LS4wMy0uMDA4YS4wNC4wNCAwIDAgMS0uMDEyLS4wMjdjLjAwNS0uMzY0LS4wMTYtLjc3Mi0uMTgxLTEuMDk4LjA1NC45Mi0uNDQgMS42OTktMS4yOTEgMi4wMWEuMDQuMDQgMCAwIDEtLjAzNS0uMDA3LjAzLjAzIDAgMCAxLS4wMTEtLjAzM2MuMDQtLjE5NS4wOC0uNDQuMDMyLS42NTRhMS4yOCAxLjI4IDAgMCAxLTEuMDkxLjU4M2MtLjMwOSAwLS41Ni0uMDktLjY5Ny0uMTUxLS4wNi4wNy0uMTMuMTMxLS4yLjE5LS4wOTkuMDg2LS4xOTMuMTY1LS4yNTguMjc0YS40NTguNDU4IDAgMCAwLS4wNDQuNDQ2LjAzNC4wMzQgMCAwIDEtLjAwOC4wMzguMDQuMDQgMCAwIDEtLjAzOC4wMDhjLS40MjUtLjE4MS0uODA0LS43MDMtLjY3Ni0xLjIyOWwuMDE5LS4wNjRxLS4zNC0uMDcyLS41MTItLjI4NGwtLjAwOC0uMDExYy0uMDg2LjA2Ny0uMTgzLjExNC0uMjc5LjE2LS4xMi4wNi0uMjMzLjExNS0uMzI1LjIwOGEuNTcuNTcgMCAwIDAtLjE4NS40NDMuMDMuMDMgMCAwIDEtLjAyLjAzMy4wMzQuMDM0IDAgMCAxLS4wMzktLjAwOGMtLjM3NC0uMzc1LS40ODgtLjk2OC0uMjcxLTEuNDExcS4wMzUtLjA2Ni4wNzktLjEzM2EyLjcgMi43IDAgMCAxIC4wMzUtLjc3OCAxIDEgMCAwIDEtLjE2OC4wNmMtLjE1LjAzLS4zMi4wNjctLjQ1NC4xNDRhLjQ5LjQ5IDAgMCAwLS4yNTMuMzY2LjA0LjA0IDAgMCAxLS4wMjYuMDI5LjAzNC4wMzQgMCAwIDEtLjAzNi0uMDE0Yy0uMjk3LS40MTUtLjI5NC0xLjAwMS4wMDgtMS4zNjMuMTY3LS4xOTcuMzk2LS4zMzQuNjItLjM3YTEgMSAwIDAgMSAuMTQxLS41OWMtLjIyLS4wMzgtLjM3Ni4wMTItLjQ5Mi4xNTZhLjA0LjA0IDAgMCAxLS4wMzcuMDEyLjA0LjA0IDAgMCAxLS4wMjUtLjAzYy0uMDQ0LS40MzcuMjAzLS45OC42OS0xLjEzNC4yNzItLjA4NS41NzktLjA1OC43ODkuMDY4LjkxNy0uNTQ4IDEuNzU3LjMwOCAxLjk5My41ODUuMTUyLjE3NS4yODQuMzUyLjQwMi41NDQuNDcuMDgyLjg0OC0uMzUgMS4wMzEtLjc0OC4yMDUtLjQ0My4yODEtLjk2OC4yMi0xLjUxNi0uMDE1LS4xNTctLjA1LS4zMTMtLjA4My0uNDY1LS4wMjQtLjEwNy0uMDQ5LS4yMTgtLjA2Ni0uMzI5YTUuMyA1LjMgMCAwIDEtLjAzMy0xLjY3Yy4wNDQtLjI3My4xMDItLjU2Ni4yMzItLjg2YS4wMy4wMyAwIDAgMSAuMDE3LS4wMThjLjY1LS4zMTcgMS40NjUtLjQwNCAyLjM1NS0uMjUyYTQuNSA0LjUgMCAwIDEgLjcwNy4xNzhjLjEzNC4wNDIuMjg3LjA5LjM5NS4xMS4yMzcuMDUzLjQ0NC4wMzIuNTU0LS4wNTVhLjI3LjI3IDAgMCAwIC4wOTgtLjIwMyAxIDEgMCAwIDAtLjIwOC0uMDIzYy0uMjc3LjAwNC0uNjg0LS4wMTItLjk5Ni0uMTgxYTEuNjYgMS42NiAwIDAgMS0uODAxLS44IDEuMTMgMS4xMyAwIDAgMS0uNC42OWMtLjA1LjA0Ni0uMTYuMDc2LS4yNDkuMWwtLjA1NC4wMTRhLjAzLjAzIDAgMCAxLS4wMzItLjAwNy4wMy4wMyAwIDAgMS0uMDEzLS4wMjljLjAzMy0uNjE4LS4xMjItMS4wMi0uNDg2LTEuMjZxLS4wNDcuMjU2LS4xODYuNDY4Yy0uMi4zMDYtLjU3LjQ5LS45MjkuNDYzLS4yMTYuNDA4LS41NTYuNjM4LS45NTguNjQ5LS4xODMuMjgzLS40Mi40MzUtLjY4Ni40NDNhLjgxLjgxIDAgMCAxLS42NS40MzYgMS4xNCAxLjE0IDAgMCAxLS4zODMuNTQ4Yy0uMTcuMTM0LS40MzguMjE1LS42NS4wOTVsLS4xMjMtLjA2NWEuMDQuMDQgMCAwIDEtLjAxNy0uMDIycS0uMDA0LS4wMTYuMDA1LS4wMjhhMSAxIDAgMCAwIC4yMDQtLjU0M2wtLjAwMi4wMDVhLjgxLjgxIDAgMCAxLS44NTYuNTI0LjAzLjAzIDAgMCAxLS4wMjMtLjAxNS45LjkgMCAwIDEtLjEyOS0uMjk4Yy0uMTguMjI4LS40OC4zNjQtLjc5OC4xODVhLjguOCAwIDAgMS0uMTk4LS4xNjkuOS45IDAgMCAxLS4xNzguMjE2Yy0uMjA2LjE2Ny0uNDI1LjM2Ni0uNDI1LjYzNHEwIC4wOC4wMjcuMTY3YS4wMzUuMDM1IDAgMCAxLS4wNS4wNGMtLjM4Ny0uMjE3LS42MzgtLjY1My0uNjI0LTEuMDcyYTEgMSAwIDAgMS0uMTAxLjAwOC45LjkgMCAwIDEtLjQ3OS0uMTUzcS0uMDQ4LjAzLS4wOTQuMDU1Yy0uMjkuMTI1LS41OTcuMjg2LS41OTcuNjQydi4wMjNhLjA0LjA0IDAgMCAxLS4wMjEuMDMyLjAzLjAzIDAgMCAxLS4wMzgtLjAwN2MtLjM2MS0uMzYtLjQ2OS0uOTI5LS4yNTQtMS4zNTIuMTE0LS4yMTcuMjk1LS4zOTguNDkxLS40OWExLjIgMS4yIDAgMCAxLS4xMTEtLjQ3NC4zOS4zOSAwIDAgMC0uMjIzLjIxLjA0LjA0IDAgMCAxLS4wMzIuMDIuMDQuMDQgMCAwIDEtLjAzLS4wMmMtLjE4Ni0uMzgtLjA3Ni0uODgyLjI0NS0xLjExOGEuOS45IDAgMCAxIC41ODYtLjE3NWMuNTA1LS42NjcgMS4wMzUtLjU1NSAxLjcwNC0uNDEzLjIxNi4wNDUuNDg2LjEwMi43ODMuMTM2Ljg1My4wOTUgMS4zMTQtLjQxNiAxLjUzLS43NzRhMS44IDEuOCAwIDAgMS0uNDYuMDEgMi41IDIuNSAwIDAgMS0uNDctLjEyMWwtLjA4My0uMDI3Yy0uMjYtLjA4Ny0uNTY5LS4xNzctLjg4OC0uMTg0bC0uMjM1LS4wMDVhLjAzLjAzIDAgMCAxLS4wMy0uMDE4LjAzLjAzIDAgMCAxIC4wMDEtLjAzNWwuMTItLjJjLjEyMy0uMjQ1LjM4LS40NS42NjktLjUzNi4yNjEtLjA5LjUyNi0uMTQuNzYtLjE4MS4wOTMtLjAxOC4yMTUtLjA0NS4zMjEtLjEwNWEuNTkuNTkgMCAwIDAgLjMwMi0uNDU2IDIgMiAwIDAgMS0uMTM5LjAyMmMtLjM0NS4wNzYtLjg0Mi0uMDc3LTEuMjQyLS4yYTUgNSAwIDAgMC0uNDE3LS4xMTdsLS4wNTgtLjAxM2MtLjE1Ni0uMDM3LS4zNTEtLjA4Mi0uNDc4LS4wMzJsLS4xNTQuMDc0YS4wMzUuMDM1IDAgMCAxLS4wNS0uMDMybC4wMDUtLjE5YS44LjggMCAwIDEgLjI5Ny0uNTYzIDEuNCAxLjQgMCAwIDEtLjM4NC0uMTE3LjcuNyAwIDAgMS0uMjYyLS4yMjcuMDM1LjAzNSAwIDAgMSAuMDA2LS4wNDdsLjA1My0uMDQ1cS4wOTMtLjA3NS4xNjMtLjE1Yy0uMjE4LjExNy0uNTA3LjA4OC0uNzMyLS4wMDktLjE5LS4wNzItLjM3MS0uMjA3LS41NDEtLjM0MWEuMDQuMDQgMCAwIDEtLjAxNC0uMDNxLjAwMi0uMDIuMDE4LS4wMjhjLjA5OS0uMDU2LjI0MS0uMTM4LjM3NC0uMjMzYS43Ni43NiAwIDAgMS0uMjk5LS4zMjguNy43IDAgMCAxLS4zNTQtLjAzYy0uMTM3LS4wNTUtLjI4MS0uMTA3LS40MTctLjEwN2EuMzYuMzYgMCAwIDAtLjI5LjEzMS4wNC4wNCAwIDAgMS0uMDM2LjAxMi4wMy4wMyAwIDAgMS0uMDI1LS4wMjhjLS4wNy0uNDM2LjE5LS44ODkuNTg0LTEuMDFsLjA2LS4wMTVhMSAxIDAgMCAxLS4wNDgtLjI5LjguOCAwIDAgMS0uMzMyLS4wOTVjLS4yMzgtLjE0NC0uNDg0LS4yOTItLjc0Mi0uMTA4YS4wMzUuMDM1IDAgMCAxLS4wNTQtLjAzYy4wNDQtLjQ0OC4zOS0uODMuODA3LS44ODdxLjEyOC0uMDE1LjI2LjAwMWEuOTYuOTYgMCAwIDEgLjE3LS43MTdjLS4xOS0uMjEyLS4zNzMtLjM3NS0uNjQyLS4yODRhLjA0LjA0IDAgMCAxLS4wMzYtLjAxLjA0LjA0IDAgMCAxLS4wMDctLjAzNmMuMTczLS40MTUuNjE3LS42NzYgMS4wMzItLjYwN2EuOTcuOTcgMCAwIDEgLjUyLjI3LjYuNiAwIDAgMCAuMjY0LS4yMDYuNC40IDAgMCAwIC4wNTMtLjExMmMtLjEzNS0uMjEyLS4yOTMtLjQxLS41OC0uMzZhLjA0LjA0IDAgMCAxLS4wMzQtLjAxNC4wMy4wMyAwIDAgMSAwLS4wMzdjLjI0Mi0uMzk1Ljc0OS0uNTg3IDEuMTUzLS40MzkuMjM3LjA4OS41MDEuMzAxLjU3LjU4LjIzOS4wMi43NjIuMTA0IDEuMDMyLjQ1OC4xNjEuMjEuMjAzLjQ3NC4xMjQuNzgzLS4yNyAxLjA1Ni0uMTg5IDEuNjk1LS4xMzIgMS45NDYuODc2LS4wNjQgMS4zNS4xNyAxLjgxLjM5NS42NDUuMzE1IDEuMjU2LjYxNCAzLjA3My4wMzUuMzA2LS4yNDguMzMxLS42NS4zMjYtLjgyNnEtLjI3OS0uMjI4LS41OS0uMTg0Yy0uMzc2LjA1My0uNzM2LjM5NS0uOTI2LjcxbC0uMDQ4LjA3OWEuMDM0LjAzNCAwIDAgMS0uMDM1LjAxN2wtLjA5Mi0uMDE1Yy0uNjc4LS4xMDUtMS4xNjMtLjM2Mi0xLjQwMS0uNzQ1LS4xODgtLjI5OS0uMjItLjY1OC0uMDk1LTEuMDY3LjA5Ny0uMzI0LjA3Mi0uNjM3LjA0Ni0uODA2LS4yNDYtLjA5MS0uNDM1LS4yNDMtLjYxOC0uMzktLjI3Mi0uMjItLjUwNy0uNDA5LS44ODUtLjM1MWwtLjE3Ny4wMjZhLjA0LjA0IDAgMCAxLS4wMy0uMDEuMDQuMDQgMCAwIDEtLjAxLS4wMjhsLjAyLS4xOGEuNTMuNTMgMCAwIDEgLjI4LS4zODdjLjI4Mi0uMTUzLjcxOS0uMDk0IDEuMy4xNzRhMS40IDEuNCAwIDAgMS0uMDczLS43NjRxLjAxNS0uMDkuMDQtLjE5MWMtLjI5LS4zMjUtLjMzNC0uNzIzLS4xMTctMS4wOTZhLjA0LjA0IDAgMCAxIC4wMTQtLjAxM2MuNDg0LS4yNTYgMS4wNzctLjM2MyAxLjcxNS0uMzA4LjMxLjAxMi42MDktLjExNS44ODUtLjI1NS4yNDUtLjEyNS40OTUtLjI4OC43MjMtLjQ3bC4wNDYtLjAzOGEuMDMuMDMgMCAwIDEgLjAyOC0uMDA3bC4wNi4wMWMuNjM0LjA4IDEuMzAyLjEyIDEuODg3LS4xMTRxLjE3NC0uMDgzLjM2LS4xOGMuNjk4LS4zNTggMS40ODgtLjc2NCAyLjIyOS0uMTg2YS4wMy4wMyAwIDAgMSAuMDEzLjAyNHEwIC4wMTUtLjAwOC4wMjdsLS4wNDguMDU1Yy0uMjguMzEtLjQ2OC44MDYtLjMwNCAxLjE3MmwuMDM3LS4wMThjLjI0OS0uMTI5LjQ5OS0uMjkyLjcyMy0uNDcybC4wNDYtLjAzN2EuMDMuMDMgMCAwIDEgLjAyNy0uMDA2bC4wNi4wMDljLjU2OC4wNzMgMS4yMjkuMTIgMS44Mi0uMDg2LjIwNS0uMDg3LjQwNy0uMjAyLjYwNC0uMzEzLjU2OC0uMzIyIDEuMTU2LS42NTQgMS44NjgtLjM1MnEuMDE2LjAwNy4wMjEuMDI1YS4wNC4wNCAwIDAgMS0uMDEuMDMyLjc2Ljc2IDAgMCAwLS4yMDQuNDgzYy4yOTgtLjExOC42Ni0uMTY3IDEuMS0uMTQ5cS4wMi4wMDIuMDMuMDE4YS4wNC4wNCAwIDAgMS0uMDAxLjAzNGMtLjE5LjMxOS0uMzA1LjU5Ny0uMzUzLjg1MS0uMDQxLjE3LS4wMTUuMzMuMDEzLjVxLjAxNy4wOTguMDI5LjJjLjA0Ni4zNTgtLjAwNS42ODQtLjE0OC45NDUuNTUuMzk0Ljc1Ljc5Ljc2NCAxLjUuMDIxLjI2NC4xNzEuNDY5LjMzLjY4NC4xMTQuMTU0LjIzMi4zMTQuMzAzLjUwMi4xOTMuNDg1LS4wMy44OTMtLjI5NyAxLjMwM2EuMDQuMDQgMCAwIDEtLjAyOC4wMTZjLS4wMTUgMC0uMDIyLS4wMDUtLjAzLS4wMTVsLS4xMi0uMTc0cS0uMDg0LS4xMy0uMTQ5LS4yNTNhMyAzIDAgMCAwLS4xNDgtLjI1cS0uMjUtLjM4MS0uNzQtLjU4N2MuMjI2LjMuMzQuNjcxLjMxNCAxLjAzNnEtLjAwOS4xMTctLjAyLjIzNWMtLjAyLjItLjA0MS40MDYtLjAwNi41ODcuMDQuMjEuMjQuMjA3LjUuMTgxbC4wOTUtLjAwOS4wNzctLjAxMWEuMDQuMDQgMCAwIDEgLjAyNi4wMDcuMDMuMDMgMCAwIDEgLjAxMy4wMjNxLjA0MS4zLS4wOTUuNDc2Yy0uMTY4LjIzLS40ODQuMjc0LS43MjQuMjE1YTEuNSAxLjUgMCAwIDEtLjU1LS4yNzdjLS4xMTcuMjU4LS4xMDYuNTgyLjAzMy45ODguMTEzLjMzMi4yMzcuNzY5LjE4NCAxLjIwM2EuOS45IDAgMCAxLS4wOS4yODUuMDQuMDQgMCAwIDEtLjAyOC4wMmMtLjQyNy4wMjEtLjkyOC0uMTUtMS4xMTQtLjU4MS0uMDU2LjI1OC0uMTg4LjQ4LS4zODYuNjQ2LS40OS4zODQtLjUxNy42NS0uNDY1IDEuMjU3YS4wMzUuMDM1IDAgMCAxLS4wNTYuMDNsLS4xMDQtLjA4YTMgMyAwIDAgMS0uNDczLS40MjZjLS4xOTgtLjIxOC0uMjk3LS40ODctLjI3My0uNzM1cS0uMTM1LjA4MS0uMjg3LjE1OGMtLjA3OC42MzYuMzc2IDEuNDM5LjgzIDIuMTQxLjM3Ni41MzQuNjYgMS4wNjQuODQ0IDEuNTc2LjE3OC40OS4yMjUgMS4wNDQuMTMzIDEuNTYyLjc2MS0uMDIgMS4yNDQuNDkxIDEuNzEuOTg2LjQxMy40MzcuODM4Ljg4NiAxLjQ2NCAxLjAwMy41Ni4xMDQuOTk1LS4wMDcgMS4yNTYtLjMxOS4zNi0uNDMuMzg2LTEuMjI4LjA3LTIuMDg0LS4zOS0xLjA1Ni0uODU1LTEuNDQ0LTEuMzA1LTEuODE5LS40NDQtLjM3MS0uODY0LS43MjItMS4xNDEtMS42MTYtLjQ0LTEuNDE0LjY4NS0yLjQ0Ljc1Ni0yLjUwMy4wMDgtLjI5Ny4xNzctLjYwNC40NTctLjgyOC4xMzgtLjEyNC4zMDMtLjIyLjQ2Mi0uMzE0bC4xNzQtLjEwNWMuMzMyLS4yMTcuNzg4LS41MTYuNzgtLjk4IDAtLjE1NS0uMDM5LS4zMTgtLjA3Ni0uNDc1YTQgNCAwIDAgMS0uMDUxLS4yMjdjLS4wNy0uMzY3LS4xMy0uNzkuMDMtMS4xNmEuNjIuNjIgMCAwIDEgLjI2OC0uMjk5LjAzLjAzIDAgMCAxIC4wMzguMDA1cS4wMTguMDE2LjAxLjAzOGEuNS41IDAgMCAwLS4wMTQuMzMyYy4wNzguMjQuMjM3LjQ1My4zOTEuNjU5cS4wODcuMTE1LjE3LjIzNGwtLjA1Ni0uMTkzYy0uMTEtLjM3NC0uMjI1LS43NjItLjE0Ni0xLjE4My4wNzItLjM5My4zNS0uNzUuNzQtLjk1NWwuMTkzLS4xMDZjLjI4LS4xNTIuNDU0LS4zMTUuNTYtLjUyOS4xMjQtLjIzNC4xNjUtLjUwNS4yMDQtLjc2OGwuMDA1LS4wMzljLjA2OC0uMzkuMzE2LS44OS43OTUtMS4wMjJhLjQuNCAwIDAgMSAuMTQ3LS4wMzVjLjAxNS0uMDAyLjAyOS4wMDguMDM0LjAyMmEuMDM0LjAzNCAwIDAgMS0uMDEuMDM5LjkuOSAwIDAgMC0uMjkzLjc1MWMuMDExLjE3Ny4wNTcuMzUyLjEwMS41MjIuMDcuMjc0LjE0My41NTYuMDgzLjg1Ni0uMDY1LjI5LS4yODEuNDctLjQ5Mi42NDUtLjE1Mi4xMjctLjI5Ni4yNDYtLjM4Ny40MDQtLjE5OS4zNDMtLjE3Ljc2Mi0uMDkzIDEuMTguMDc1LS40ODIuMzc5LS45NjguODU0LTEuMDI5YS4wMy4wMyAwIDAgMSAuMDMuMDEycS4wMTEuMDE0LjAwOC4wMzJjLS4xMDcuMzk3LS4wNzYuODQuMDkgMS4yOC4wMy4wODkuMDcuMTcuMTEzLjI1N3EuMDM1LjA3Mi4wNjkuMTQ4Yy4zNDYuODg0LjI4NyAxLjkzNC0uMTU4IDIuODEtLjQ3OS45Mi0xLjQxNSAxLjM0Ny0yLjUwNCAxLjE0Mi0xLjU3OS0uMzMtMi4wMTQuMjA2LTIuMTM0LjU1NS0uMDkuMjg1LS4wODEuNTMuMDI0LjcyNi4xMjUuMjQuMzY0LjQzLjU1Ny41ODJsLjIwOS4xNmMuMTY1LjEyNC4zMzYuMjUzLjQ5OS4zOTEuNTQzLjQ3OC45Mi45MjQgMS4xODggMS40MDQuMjcuNDkxLjQyIDEuMDc3LjQ2MiAxLjc5LjA0Ny42MTgtLjEgMS4yNjMtLjQxMyAxLjgxNS0uMzg1LjcxLTEuMTIgMS4zMDItMS44MjggMS40Ny0uNDczLjExMy0uOTIzLjAzNy0xLjMwMi0uMjE4LS4yOTguMjgtLjY1NC4zNzItMS4wMDUuMjYzLS41ODUtLjE4NS0uOTg2LS43MTMtMS4yNDUtMS4xMTguMDg2LjQ4NS4wNDQuOTExLS4xMjcgMS4yOTguMjM4LjAzNi40ODkuMDA4Ljc4NS0uMDg3YS4wNC4wNCAwIDAgMSAuMDM0LjAwOC4wNC4wNCAwIDAgMSAuMDEuMDMzYy0uMDM4LjE1My0uMTk0LjI1OC0uMzA1LjI5Mi0uMDY0LjI5OS0uMDQ4LjQ4NC4wNDUuNTY0cS4xMjYuMTA4LjQ2NC0uMDJjLjQ2Mi0uMTU4IDEuMTI4LS4zMjcgMS41OTQuMDI4bC4wNjQuMDU5cS4wMTYuMDE1LjAxLjAzNWwtLjAyNi4wODZjLS4xMzYuNDc4LS4xNi44NzUtLjA3MSAxLjE4MXEuMDQyLjE3My4xODUuMjUzYy4xODguMTA1LjQ3Ni4wNzIuNjg0LjAwNmwuMDgzLS4wMjVhLjA0LjA0IDAgMCAxIC4wMzUuMDA4IDEgMSAwIDAgMSAuMDU4LjA2Yy4xNjEuMTkxLjA3LjQzMi0uMDM1LjZhLjY0LjY0IDAgMCAxLS41NTMuMjk0Yy0uMDE0LjIzMi4wMS43MzMuNDEgMS4wNjJsLjA3MS4wNTlxLjAxNi4wMTIuMDEzLjAzMmwtLjAxNS4wOTNjLS4wNDUuMjgyLS4zMDQuNTgtLjU5OC42OTEuMTU3LjQ1NS4xMDUuODkyLS4xNDUgMS4yMDRhMS43MyAxLjczIDAgMCAxLS4yMTguOTkxLjA0LjA0IDAgMCAxLS4wMjcuMDE4LjYzLjYzIDAgMCAxLS40MDEtLjA5MnEtLjExNi40MTctLjM3Ni41ODUtLjI2OC4xNzQtLjY0LjA2NWExIDEgMCAwIDEtLjExLjEwM2MtLjIxMy4xNDEtLjQzOC4zMTUtLjQzOC42MDdsLjAwMy4wNjJhLjAzLjAzIDAgMCAxLS4wMTguMDM0LjA0LjA0IDAgMCAxLS4wMzgtLjAwMyAxLjEyIDEuMTIgMCAwIDEtLjM5Ni0uNjE3IDIuNCAyLjQgMCAwIDEtLjg0Ni4yMjQuODUuODUgMCAwIDEtLjI0Mi4yNzZjLS4yMjkuMTQ4LS40NzIuMzMtLjQ3Mi42MjlxMCAuMDQ1LjAwOC4wOTVhLjA0LjA0IDAgMCAxLS4wMTYuMDM2em0tLjg4NC0xLjY2NXEuMDE1IDAgLjAyNC4wMWMuMTA4LjEwOC4yNzcuMjQ3LjQ3LjNxLjAxNi4wMDYuMDIyLjAxOWEuMDMuMDMgMCAwIDEgMCAuMDI4cS0uMDE2LjA0LS4wMjguMDc4Yy0uMTE2LjM4OS4wMy44MzcuMzUzIDEuMTE4di0uMDIzYzAtLjMxNy4yNC0uNTE3LjUtLjY4NmEuOC44IDAgMCAwIC4yMy0uMjY4LjAzLjAzIDAgMCAxIC4wMy0uMDE5Yy4xMi0uMDA0LjQ0OC0uMDM2Ljg3OS0uMjM2YS4wNC4wNCAwIDAgMSAuMDMgMHEuMDE0LjAwOS4wMTguMDI0Yy4wNDcuMjIzLjE2My40MjcuMzIuNTcuMDA2LS4zMi4yNDQtLjUwNC40NjctLjY1MmEuNy43IDAgMCAwIC4xMTQtLjEwOS4wNC4wNCAwIDAgMSAuMDM4LS4wMTFxLjM1NC4xMTIuNjAyLS4wNS4yNTItLjE2My4zNTktLjU5NGEuMDQuMDQgMCAwIDEgLjAyMy0uMDI1LjA0LjA0IDAgMCAxIC4wMzMuMDA3LjUyLjUyIDAgMCAwIC4zNzYuMTA5Yy4xNTctLjI3Ny4yMjctLjYxMy4xOTktLjk1cTAtLjAxMy4wMDgtLjAyNGMuMjQ3LS4zLjI5NC0uNzMuMTMtMS4xOGEuMDMuMDMgMCAwIDEgMC0uMDI2LjA0LjA0IDAgMCAxIC4wMi0uMDE5Yy4yODYtLjA5My41NDMtLjM3OS41ODYtLjY0OGwuMDExLS4wNzMtLjA1Ny0uMDQ2Yy0uNDQ0LS4zNjctLjQ1LS45MjktLjQzMi0xLjE1NC4wMDEtLjAxOS4wMTYtLjAzNC4wMzYtLjAzMmEuNTcuNTcgMCAwIDAgLjUyNi0uMjZjLjA5MS0uMTQ4LjE3My0uMzU5LjA0LS41MmwtLjA0LS4wMzktLjA2My4wMmMtLjEwNy4wMzQtLjQ3Ni4xMzQtLjczNy0uMDEzYS40NC40NCAwIDAgMS0uMjE4LS4yOTVjLS4wOTMtLjMxOC0uMDctLjcyOC4wNy0xLjIxOWwuMDItLjA2Ni0uMDQ0LS4wNDFjLS40MzgtLjMzMy0xLjA4MS0uMTctMS41MjctLjAxN3EtLjM3Ni4xNDQtLjUzMy4wMDdjLS4xMTgtLjEwMi0uMTM4LS4zMDktLjA2My0uNjUyYS4wMy4wMyAwIDAgMSAuMDI2LS4wMjYuNDIuNDIgMCAwIDAgLjI1LS4xODQgMS43IDEuNyAwIDAgMS0uNzkzLjA2LjA0LjA0IDAgMCAxLS4wMjQtLjAxOC4wNC4wNCAwIDAgMS0uMDAxLS4wM2MuMjA2LS40MzguMjM4LS45My4wOTctMS41MDVhLjAzNC4wMzQgMCAwIDEgLjAyLS4wNC4wMzUuMDM1IDAgMCAxIC4wNDQuMDE1cS4wMzUuMDY2LjA3NC4xMzFjLjI1LjQuNjUuOTU1IDEuMjQgMS4xNC40MjcuMTM0Ljc1Ni0uMDcuOTU2LS4yNjVhLjAzNC4wMzQgMCAwIDEgLjA0My0uMDA0Yy4zNjcuMjU2LjgwNy4zMzMgMS4yNy4yMjQuNjktLjE2NCAxLjQwNi0uNzQgMS43ODItMS40MzYuMzA4LS41NDEuNDUxLTEuMTcxLjQwNS0xLjc3Ni0uMDQyLS43MDQtLjE5LTEuMjgtLjQ1NC0xLjc2Mi0uMjY0LS40NzMtLjYzNy0uOTE0LTEuMTcyLTEuMzg1LS4xNjItLjEzNy0uMzMyLS4yNjUtLjQ5Ni0uMzlsLS4yMS0uMTU5Yy0uMTk3LS4xNTYtLjQ0NC0uMzUtLjU3NS0uNjA0LS4xMTQtLjIxNC0uMTI0LS40NzctLjAyOC0uNzguMTI3LS4zNzIuNTgzLS45NDMgMi4yMTMtLjYwMiAxLjA1Ni4xOTkgMS45NjUtLjIxNCAyLjQyOS0xLjEwNS40MzYtLjg1OS40OTQtMS44ODguMTU1LTIuNzUzcS0uMDMzLS4wNzMtLjA2OC0uMTQ1Yy0uMDQtLjA4NC0uMDg0LS4xNzEtLjExNS0uMjYzYTIuMTcgMi4xNyAwIDAgMS0uMTA2LTEuMjdjLS40NC4wOS0uNzEyLjU5LS43NTUgMS4wNThxLS4wMDYuMDY1LS4wMS4xMjhhLjAzNi4wMzYgMCAwIDEtLjAzMi4wMzQuMDM2LjAzNiAwIDAgMS0uMDM3LS4wMjdjLS4xMDctLjUwNC0uMTkxLTEuMDMuMDU1LTEuNDU2LjA5Ny0uMTY5LjI1My0uMjk4LjQwMi0uNDIzLjIxLS4xNzUuNDEtLjM0LjQ2OS0uNjA2LjA1Ny0uMjg0LS4wMS0uNTQ3LS4wODMtLjgyNS0uMDQ0LS4xNzMtLjA5LS4zNTMtLjEwMi0uNTM1YS45OC45OCAwIDAgMSAuMjMtLjcyM2wtLjAxNi4wMDdjLS40NTIuMTI0LS42ODYuNTk5LS43NS45NjhsLS4wMDUuMDM3Yy0uMDQuMjY5LS4wODEuNTQ3LS4yMS43OTEtLjExNC4yMjctLjI5NS40LS41ODkuNTU4bC0uMTkzLjEwNmMtLjM2Ny4xOTItLjYzOC41MzktLjcwNi45MDYtLjA3NS40MDUuMDMxLjc2OC4xNDUgMS4xNTIuMDQyLjE0My4wODUuMjkuMTE4LjQzOGEuMDM0LjAzNCAwIDAgMS0uMDIzLjA0LjAzNS4wMzUgMCAwIDEtLjA0My0uMDE4IDEgMSAwIDAgMC0uMTA3LS4xODljLS4wNTctLjA4NS0uMTIxLS4xNy0uMTgyLS4yNTItLjE1Ny0uMjEtLjMyLS40MjgtLjQwMi0uNjc5YS41Ni41NiAwIDAgMS0uMDEtLjI4NC42LjYgMCAwIDAtLjE2Mi4yMTVjLS4xNTIuMzUyLS4wOTIuNzYzLS4wMjUgMS4xMTlxLjAyMy4xMTMuMDUuMjI0Yy4wMzkuMTYyLjA3OC4zMjguMDc5LjQ5MS4wMDguNTAxLS40NjcuODEyLS44MTMgMS4wMzlsLS4xNzcuMTA2YTMgMyAwIDAgMC0uNDUyLjMwN2MtLjI3Ni4yMjEtLjQzNy41MjMtLjQzMS44MWEuMDQuMDQgMCAwIDEtLjAyMy4wMzMuMDQuMDQgMCAwIDEtLjAyLjAwMWMtLjE1NS4xNDMtMS4xMjYgMS4wOTctLjcxNyAyLjQxNC4yNzIuODc1LjY4NCAxLjIxOSAxLjEyIDEuNTgzLjQ1Ny4zODEuOTMuNzc1IDEuMzI2IDEuODQ4LjMyNC44OC4yOTMgMS43MDQtLjA4MiAyLjE1My0uMjc4LjMzMy0uNzM1LjQ1Mi0xLjMyMi4zNDItLjY0OC0uMTItMS4wOC0uNTc4LTEuNS0xLjAyLS40NjYtLjQ5NS0uOTQ2LTEuMDA1LTEuNzAyLS45NjZhLjAzNC4wMzQgMCAwIDEtLjAzNS0uMDRjLjEtLjUyLjA1Ni0xLjA3Ny0uMTIyLTEuNTdhNi43IDYuNyAwIDAgMC0uODM1LTEuNTZjLS40NjgtLjcyLS45MzMtMS41NDYtLjg0LTIuMjA4YS4wNC4wNCAwIDAgMSAuMDE5LS4wMjZxLjE5NS0uMDk4LjM2Mi0uMjAyYS4wMy4wMyAwIDAgMSAuMDM4IDAgLjA0LjA0IDAgMCAxIC4wMTQuMDM2Yy0uMDUuMjQ1LjA0Mi41MjYuMjQ2Ljc1MS4xMjcuMTU0LjI5OC4yODcuNDYzLjQxNWwuMDQyLjAzMmMtLjA0Mi0uNTY4LjAwNi0uODUyLjQ5OC0xLjIzOC4yMTYtLjE4MS4zNDktLjQzNi4zODMtLjczM2EuMDM1LjAzNSAwIDAgMSAuMDMyLS4wMy4wMzUuMDM1IDAgMCAxIC4wMzYuMDI1cS4wMTEuMDQzLjAyNy4wOGMuMTU2LjQyMi42MzIuNTk1IDEuMDQyLjU4YS44LjggMCAwIDAgLjA3My0uMjQ1Yy4wNTItLjQyLS4wNy0uODQ3LS4xOC0xLjE3Mi0uMTUyLS40NDYtLjE1NS0uOC0uMDEtMS4wOGEuMDQuMDQgMCAwIDEgLjAyNC0uMDE4cS4wMTYtLjAwMy4wMy4wMDcuMjY0LjIxNi41NTYuMjljLjIxNy4wNTMuNTAyLjAxNi42NTItLjE5cS4xMS0uMTQ1LjA4NS0uMzlsLS4wNDQuMDA2LS4wOTYuMDA5Yy0uMjIuMDIyLS41MTkuMDUyLS41NzQtLjIzOC0uMDM3LS4xOS0uMDE2LS40MDIuMDA1LS42MDZxLjAxMy0uMTIyLjAyLS4yMzRhMS40OCAxLjQ4IDAgMCAwLS4zODItMS4wODcuMDM0LjAzNCAwIDAgMS0uMDAyLS4wNDIuMDM0LjAzNCAwIDAgMSAuMDQtLjAxM2MuNDAyLjE0LjcwNC4zNjMuODk3LjY2cS4wODUuMTI3LjE1Mi4yNTVjLjA0NS4wOC4wOS4xNjQuMTQ2LjI0N2wuMDkuMTMxYy4yNDMtLjM4LjQzNi0uNzU5LjI2Mi0xLjE5N2EyIDIgMCAwIDAtLjI5NC0uNDg2Yy0uMTU3LS4yMTQtLjMyLS40MzUtLjM0NC0uNzIzLS4wMTMtLjcwNS0uMjA1LTEuMDc0LS43Ni0xLjQ2NGEuMDM1LjAzNSAwIDAgMS0uMDEtLjA0NWMuMTQ3LS4yNTMuMi0uNTc0LjE1NS0uOTNxLS4wMTItLjEtLjAyOC0uMTk3Yy0uMDI4LS4xNjktLjA1Ny0uMzQyLS4wMTItLjUyNS4wNDYtLjI0Ny4xNTUtLjUxNy4zMzEtLjgyMi0uNDMtLjAxMy0uNzc4LjA0MS0xLjA2My4xNjZhLjAzLjAzIDAgMCAxLS4wMzMtLjAwMy4wNC4wNCAwIDAgMS0uMDE2LS4wM3YtLjAxNGEuODQuODQgMCAwIDEgLjE5Mi0uNTMzYy0uNjU4LS4yNTYtMS4xOTQuMDQ3LTEuNzYuMzY4YTYgNiAwIDAgMS0uNjEzLjMxN2MtLjYwOC4yMTItMS4yOC4xNjQtMS44NTUuMDlsLS4wNDYtLjAwNy0uMDM1LjAyOGE0LjQgNC40IDAgMCAxLS43MzQuNDc5bC0uMDQ2LjAyMi0uMDIzLjAxMmEuMDM1LjAzNSAwIDAgMS0uMDQ2LS4wMTZjLS4yMTMtLjQxNC4wMDUtLjk1My4yOTgtMS4yNzlsLjAyMy0uMDI3Yy0uNjk3LS41MTgtMS40MjMtLjE0NS0yLjEyNS4yMTVxLS4xODcuMDk4LS4zNjQuMTgyYy0uNjAyLjI0LTEuMjguMi0xLjkyNS4xMTlsLS4wNDUtLjAwOC0uMDM0LjAyOGMtLjIzMi4xODUtLjQ4Ni4zNS0uNzM1LjQ3OS0uMjg1LjE0My0uNTkzLjI3NC0uOTIuMjYxLS42MjQtLjA1My0xLjIuMDUtMS42Ny4yOTYtLjE5OC4zNDctLjE1Mi43MTguMTI2IDEuMDJxLjAxMi4wMTQuMDA4LjAzMi0uMDI4LjEwOS0uMDQzLjIwNGMtLjA1MS4zMDYtLjAxMi41OTQuMTEuODA5YS4wMzUuMDM1IDAgMCAxLS4wNDYuMDQ5Yy0uNjA0LS4yOTUtMS4wNS0uMzY4LTEuMzI3LS4yMTlhLjQ2LjQ2IDAgMCAwLS4yNDMuMzMzbC0uMDE1LjEzNS4xMzMtLjAyYy40MDgtLjA2MS42NTMuMTM2LjkzOC4zNjUuMTg1LjE0OC4zNzQuMy42MTguMzg2cS4wMTkuMDA4LjAyMy4wMjdjLjAyOS4xNy4wNi41MDctLjA0NS44NTgtLjExOC4zODgtLjA4OC43MjkuMDg4IDEuMDEuMjI3LjM2NS42OTUuNjEyIDEuMzUzLjcxM2wuMDY4LjAxMS4wMzYtLjA2Yy4xOTktLjMyOS41NzctLjY4NS45NzUtLjc0Mi4yMzItLjAzMy40NTQuMDM3LjY1Ny4yMWEuMDQuMDQgMCAwIDEgLjAxMi4wMjVjLjAwOC4xOC0uMDEuNjI3LS4zNTUuOTAzbC0uMDEyLjAwNmMtMS44NDguNTg5LTIuNDcuMjg0LTMuMTMtLjAzOC0uNDU3LS4yMjQtLjkyOS0uNDU1LTEuODA1LS4zODZhLjAzNS4wMzUgMCAwIDEtLjAzNi0uMDI2Yy0uMDU3LS4yMzMtLjE1OS0uODk0LjEyNi0yLjAwOHEuMTEtLjQzMi0uMTEzLS43MjNjLS4yNy0uMzU1LS44NC0uNDIxLTEuMDA3LS40MzNhLjAzNS4wMzUgMCAwIDEtLjAzMi0uMDI3Yy0uMDU0LS4yNjYtLjMwNi0uNDcxLS41MzItLjU1NS0uMzUzLS4xMy0uNzkuMDI0LTEuMDMuMzQ5LjI4Ny0uMDEzLjQ1LjIwMy41OC40MWEuMDQuMDQgMCAwIDEgLjAwNi4wMjRjMCAuMDAzLS4wMS4wNy0uMDY3LjE1MmEuNy43IDAgMCAxLS4zMTcuMjQyLjAzNC4wMzQgMCAwIDEtLjAzOS0uMDA5LjkuOSAwIDAgMC0uNDk3LS4yNjZjLS4zNjItLjA2LS43NDcuMTUzLS45MjUuNS4zMDItLjA1OC41MDkuMTczLjY2Mi4zNDZhLjAzNS4wMzUgMCAwIDEgMCAuMDQ1Ljg5Ljg5IDAgMCAwLS4xNjcuNzMyLjAzLjAzIDAgMCAxLS4wMS4wMy4wMy4wMyAwIDAgMS0uMDMuMDEgMSAxIDAgMCAwLS4yODYtLjAwOWMtLjM2My4wNS0uNjY5LjM2OC0uNzM4Ljc1My4yNzItLjE0Ni41MzYuMDE0Ljc1Mi4xNDRhLjcuNyAwIDAgMCAuMzMuMDg2Yy4wMiAwIC4wMzUuMDE1LjAzNi4wMzQuMDAxLjA4Ny4wMTIuMjE1LjA1OS4zMzlxLjAwNS4wMTUtLjAwMi4wMjlhLjAzLjAzIDAgMCAxLS4wMjUuMDE3IDEgMSAwIDAgMC0uMDkxLjAyMWMtLjM2Ni4xMTMtLjU2Ny41Mi0uNTQ0Ljg2MWEuNDMuNDMgMCAwIDEgLjI5LS4xMDJjLjE0OCAwIC4zLjA1NS40NDEuMTFhLjY2LjY2IDAgMCAwIC4zNDQuMDIzLjAzNC4wMzQgMCAwIDEgLjA0LjAyLjcuNyAwIDAgMCAuMzI0LjM0N3EuMDE2LjAwOS4wMTkuMDI3YS4wMy4wMyAwIDAgMS0uMDE0LjAzYy0uMTI4LjA5OC0uMjcuMTgzLS4zOC4yNDUuMTU1LjEyLjMxNy4yMzcuNDg0LjMuMjYuMTEyLjYwNi4xMjguOC0uMDg1YS43LjcgMCAwIDAgLjA4Ny0uMTE4LjAzNS4wMzUgMCAwIDEgLjA2My4wMjlxLS4wODUuMjI5LS4zNjIuNDUybC0uMDI3LjAyM2MuMDY1LjA4LjE0Mi4xNDUuMjE2LjE4cS4xOTkuMDk1LjQ0Ni4xMmEuMDM0LjAzNCAwIDAgMSAuMDMuMDI2LjA0LjA0IDAgMCAxLS4wMTQuMDM4Ljc1Ljc1IDAgMCAwLS4zMzYuNTYybC0uMDAzLjEzMS4xMDUtLjA1Yy4xNDktLjA1OS4zNTUtLjAxLjUyLjAyOWwuMDU4LjAxM2MuMTE3LjAyNS4yNjUuMDcuNDIyLjExOS4zOTEuMTIuODc5LjI3IDEuMjEuMTk4LjA3Mi0uMDEuMTMtLjAyLjE4Mi0uMDMyYS4wMy4wMyAwIDAgMSAuMDMuMDA3LjAzLjAzIDAgMCAxIC4wMTIuMDNjLS4wMjQuMjYxLS4xNDMuNDU0LS4zNDMuNTU4YTEuMSAxLjEgMCAwIDEtLjM0Mi4xMTFjLS4yMzEuMDQzLS40OTMuMDktLjc1Mi4xOC0uMjczLjA4LS41MTQuMjczLS42My41MDJsLS4wOS4xNTIuMTc3LjAwNGMuMzI5LjAwOC42NDQuMDk5LjkwOC4xODdsLjA4My4wMjdjLjE0Ny4wNDguMjk4LjA5OC40NTYuMTE4cS4yNzQuMDI4LjUxMi0uMDI0YS4wMzUuMDM1IDAgMCAxIC4wMzguMDVjLS4yMDUuMzczLS42OS45ODItMS42MzUuODc1LS4zMDItLjAzMy0uNTczLS4wOS0uNzktLjEzNi0uNjUxLS4xMzgtMS4xNjUtLjI0Ni0xLjY0Ny40MDJhLjA0LjA0IDAgMCAxLS4wMzIuMDE0LjgyLjgyIDAgMCAwLS41NTcuMTZjLS4yNzcuMjA1LS4zODMuNjI3LS4yNTIuOTY5YS40NS40NSAwIDAgMSAuMjc1LS4xOTdxLjAxNi0uMDAzLjAzLjAwNmEuMDQuMDQgMCAwIDEgLjAxNC4wMjdjLjAwMi4xNC4wMjUuMzQ2LjEyLjUyMWEuMDMuMDMgMCAwIDEgLjAwMy4wMjkuMDQuMDQgMCAwIDEtLjAyLjAyIDEuMDUgMS4wNSAwIDAgMC0uNDkuNDc0Yy0uMTkuMzc0LS4xMS44Ny4xODUgMS4yMS4wMzMtLjM1NC4zNDMtLjUxNy42MzUtLjY0MmExIDEgMCAwIDAgLjEwMy0uMDYyLjAzNC4wMzQgMCAwIDEgLjA0IDAgLjg0Ljg0IDAgMCAwIC40NTkuMTU0LjcuNyAwIDAgMCAuMTMxLS4wMTRxLjAxNi0uMDA0LjAzLjAwOGEuMDQuMDQgMCAwIDEgLjAxMi4wMjljLS4wMzIuMzguMTc4Ljc4My41MTUgMS4wMDhhMSAxIDAgMCAxLS4wMS0uMTA0YzAtLjMuMjMyLS41MTIuNDUtLjY4OGEuOC44IDAgMCAwIC4xODctLjI0My4wNC4wNCAwIDAgMSAuMDMtLjAyLjAzLjAzIDAgMCAxIC4wMy4wMTYuNy43IDAgMCAwIC4yMS4xOTNjLjMwNi4xNzMuNTk4LjAxLjc1MS0uMjNhLjAzNC4wMzQgMCAwIDEgLjAzNi0uMDE1LjA0LjA0IDAgMCAxIC4wMjcuMDI5cS4wMy4xODcuMTI2LjMzOWMuMzIuMDM5LjY1NC0uMTcuNzY0LS40OGExIDEgMCAwIDAgLjA0Ny0uMTkuMDQuMDQgMCAwIDEgLjAzMi0uMDNjLjAxNyAwIC4wMzIuMDEuMDM2LjAyNy4wNTguMjUuMDAyLjUtLjE3Mi43NjFsLjA4OC4wNDdjLjE4Ni4xMDUuNDIzLjAzMS41NzUtLjA4OS4xNy0uMTMuMjk2LS4zMTUuMzY3LS41MzdhLjA0LjA0IDAgMCAxIC4wMzItLjAyNS43NC43NCAwIDAgMCAuNjI1LS40MTcuMDQuMDQgMCAwIDEgLjAzLS4wMmMuMzIyIDAgLjUzNi0uMjMyLjY1OC0uNDI2YS4wNC4wNCAwIDAgMSAuMDMtLjAxNmMuMzktLjAwNC43Mi0uMjI4LjkyNy0uNjMyYS4wNC4wNCAwIDAgMSAuMDM1LS4wMTguOTcuOTcgMCAwIDAgLjg4Ny0uNDNxLjE0NC0uMjIyLjE4NC0uNDkzYS4wMy4wMyAwIDAgMSAuMDE5LS4wMjcuMDQuMDQgMCAwIDEgLjAzMy4wMDJjLjQxLjI0NS41ODkuNjYuNTY1IDEuMzA0bC4wMS0uMDAzYy4wNzItLjAxOS4xODItLjA0OC4yMi0uMDg0LjIyMi0uMTczLjM2NC0uNDUyLjM5NC0uNzY4YS4wMzUuMDM1IDAgMCAxIC4wMy0uMDMxLjA0LjA0IDAgMCAxIC4wMzguMDIyYy4xNTQuMzkyLjQ1MS43MTIuODE3Ljg3Ni4zLjE2My42OTUuMTc4Ljk2Ni4xNzRxLjEyMi4wMDEuMjUxLjAzMWEuMDM0LjAzNCAwIDAgMSAuMDI3LjAzNC4zNS4zNSAwIDAgMS0uMTI1LjI4NWMtLjEyNi4xLS4zNTQuMTI2LS42MS4wNjgtLjExMi0uMDItLjI2Ni0uMDctLjQwMi0uMTExbC0uMTM4LS4wNDNhNSA1IDAgMCAwLS41Ni0uMTMzYy0uNjA4LS4xMDQtMS41LS4xNDYtMi4zMDIuMjQtLjEyMy4yODQtLjE4LjU2OC0uMjIyLjgzMmE1LjIgNS4yIDAgMCAwIC4wMzMgMS42NDhjLjAxNy4xMS4wNDIuMjIuMDY1LjMyNi4wMzQuMTUzLjA3LjMxMS4wODQuNDcyLjA2My41Ni0uMDE0IDEuMDk3LS4yMjYgMS41NTItLjE5NS40MjUtLjYwNS44ODUtMS4xMjMuNzg0YS4wMy4wMyAwIDAgMS0uMDIyLS4wMTYgNCA0IDAgMCAwLS40MDMtLjU0N2MtLjIzLS4yNjktMS4wNDUtMS4xMDItMS45MjMtLjU2YS4wMy4wMyAwIDAgMS0uMDM3IDBjLS4xOTQtLjEyNi0uNDg4LS4xNTUtLjc1LS4wNzMtLjQyNC4xMzQtLjY1Mi41ODgtLjY0NS45OGEuNS41IDAgMCAxIC4zNTctLjEzMnEuMDkgMCAuMTk5LjAyNS4wMTcuMDA0LjAyNS4wMjJhLjAzLjAzIDAgMCAxLS4wMDUuMDMycS0uMTguMjM3LS4xNTguNjJhLjAzNC4wMzQgMCAwIDEtLjAzLjAzNiAxIDEgMCAwIDAtLjYwNy4zNWMtLjI5LjM0Ny0uMjUzLjg2OC0uMDUgMS4yMWEuNTUuNTUgMCAwIDEgLjI3LS4zMzMgMS42IDEuNiAwIDAgMSAuNDczLS4xNTIuOS45IDAgMCAwIC4yMTUtLjA4Ny4wNC4wNCAwIDAgMSAuMDM4LjAwMi4wNC4wNCAwIDAgMSAuMDEzLjAzNnEtLjA5LjM4NC0uMDQ4Ljg0YS4wMy4wMyAwIDAgMS0uMDA3LjAyNHEtLjA0Ni4wNjgtLjA4LjEzNGMtLjE5My4zOTQtLjEwNy45MTUuMjAxIDEuMjdhLjYzLjYzIDAgMCAxIC4yMDQtLjQxYy4wOTgtLjA5OC4yMjMtLjE2LjM0My0uMjE4LjEwNi0uMDUzLjIwNy0uMTAyLjI5My0uMTc2YS4wNC4wNCAwIDAgMSAuMDI3LS4wMDhxLjAxNi4wMDIuMDI0LjAxNGwuMDI4LjAzOHEuMTY0LjIwNS41MDguMjY3LjAxNi4wMDMuMDI0LjAxNy4wMDcuMDE0LjAwMy4wMjlhMSAxIDAgMCAwLS4wMy4wOTZjLS4xMTEuNDYuMTk2LjkxNy41NjQgMS4xMTNhLjUyLjUyIDAgMCAxIC4wNzctLjQzMWMuMDcxLS4xMTYuMTczLS4yMDQuMjcyLS4yODkuMDczLS4wNjIuMTQ5LS4xMjcuMjA4LS4yMDJhLjAzNC4wMzQgMCAwIDEgLjA0Mi0uMDFjLjIxLjEuNDYyLjE1Ny42OTEuMTU3cS4xNiAwIC4zMDEtLjAzM2MuMjIzLS4wNTIuNTM4LS4xOTYuNzc1LS41ODRhLjA0LjA0IDAgMCAxIC4wMzMtLjAxNy4wNC4wNCAwIDAgMSAuMDMuMDI0Yy4wNzMuMjI0LjA0My40ODYuMDAxLjcwMS44My0uMzMyIDEuMjg4LTEuMTM2IDEuMTczLTIuMDY3YS4wMzQuMDM0IDAgMCAxIC4wMjItLjAzNy4wMzUuMDM1IDAgMCAxIC4wNDEuMDEzYy4yNC4zNDcuMjc0LjgxLjI3MiAxLjIyNmwuMS0uMDE4Yy42MDEtLjEwNS44MjQtLjgzNS44My0xLjQyOHEuMDEtLjQwNi0uMTUzLS44MDVhLjAzNS4wMzUgMCAwIDEgLjAxNC0uMDQzYy4zMjMtLjE5Ni43MjYtLjQ0MS44OTEtLjg0LjI0NS0uNTc2LS4wNzQtMS4xMTMtLjI4Ni0xLjM4MmEuMDM0LjAzNCAwIDAgMSAwLS4wNDQuMDM0LjAzNCAwIDAgMSAuMDQzLS4wMDhjLjI1Mi4xNC41MTguMTcuNzUuMDg2LjIyMS0uMDguMzktLjI1Ni40OS0uNTFhLjAzLjAzIDAgMCAxIC4wMjEtLjAybC4wMTQuMDMxLS4wMDctLjAzM3EuMDE3LS4wMDUuMDMyLjAwNmMuMDEuMDA3LjAxMy4wMi4wMTIuMDMtLjA5OCAxLjAxNC4zOTQgMS45NTggMS4yNTMgMi40MDYuMjguMTQ3LjU4NC4yNDguODc5LjM0Ni4zODQuMTI3Ljc4My4yNiAxLjEyOS40OTUuOTAyLjU4NSAxLjMzOSAxLjY2MiAxLjE0MiAyLjgxYS4wMy4wMyAwIDAgMS0uMDIyLjAyNy4wMy4wMyAwIDAgMS0uMDM0LS4wMDZjLS4zNTktLjMwNC0uNzg0LS42MTUtMS4yMjUtLjYxNWgtLjAwOGMtLjQzNy4wMy0uODI4LjI4Mi0xLjAxNy42NTVhLjAzLjAzIDAgMCAxLS4wMjguMDE5Ljc4Ljc4IDAgMCAwLS41MTEuMjhjLS4yMTUuMjYtLjIyMS42NzQtLjAyMy45NjhhLjQ1LjQ1IDAgMCAxIC4xNzQtLjIxOWMuMDktLjA2LjItLjA5LjMwNS0uMTE1YS4wNC4wNCAwIDAgMSAuMDM0LjAxMnEuMDEzLjAxNi4wMDYuMDM2YTEuNDYgMS40NiAwIDAgMC0uMTA4LjY3My4wNC4wNCAwIDAgMS0uMDE0LjAzLjk2Ljk2IDAgMCAwLS4zMS40MThjLS4xMjQuMzQzLS4wMTYuNzYzLjI1NyAxLjAyOGEuNTcuNTcgMCAwIDEgLjE0OC0uMzQzYy4wNzMtLjA4Ni4xNjktLjE0NS4yNi0uMjAzLjA3LS4wNDQuMTM2LS4wODQuMTkzLS4xMzdxLjAxNS0uMDA0LjAyNy0uMDA1Ii8+PHBhdGggZmlsbD0iIzc0NDkwYyIgZD0iTTEyLjIxOCA0Mi4xODZjLS4zNTYtLjA0NS0uNzE3LjAzLTEuMDUuMTU2LS4zNTkuNjE1LS4xNzUgMS45MTYuMDA5IDIuNTg2LjAyMy0uMzY0LjAzLS44ODIuMDQyLTEuMjUuMDIzLS4zNzMuMDA5LS43OC4xNC0xLjEyOS4yNzUtLjEyLjU2MS0uMjEzLjg1OS0uMjU2LjEwNy0uMDE0LjIxNS0uMDI1LjMyNy0uMDIxYTEuMSAxLjEgMCAwIDAtLjMyNy0uMDg2TTE0Ljc4IDI2LjgyN2MuMTI4LS4yODguMjM1LS42MDguNTA0LS43OTYtLjMxMy4wMDQtLjU0Mi4yOTYtLjY4NC41NDdsLS4wNS4xYy0uMTk1LjM1LS42NDMuNDUtMS4wMDMuNjA2LjQ0LjA4NS45OTctLjAxNiAxLjIzMy0uNDU3TTE5LjU1OCAyNy4xOTljLjEyLS4yMzkuMjAyLS41MDEuMzg0LS43MDNhLjcuNyAwIDAgMSAuMjA5LS4xNy41LjUgMCAwIDAtLjI5LjA2NGMtLjY1Ny4zOTYtLjMzOS45NTMtMS4zNiAxLjIyNS4zODQuMTQ4Ljg2MS0uMDU0IDEuMDU3LS40MTZNMTEuOTA2IDMyLjY0M2MuODA1LS4xMjYuODk1LTEuMjcuNi0xLjg3Ni0uMTE4LjY1Ny0uMDU0IDEuNDAzLS42IDEuODc2Ii8+PHBhdGggZmlsbD0iIzc0NDkwYyIgZD0iTTEyLjA0OSAzMC41ODVjLS4wMjUuMjQtLjA1LjYxNy0uMTEuODQ1LS4wNjYuMjc4LS4xOS40OS0uMzkuNzExLjY5Ni0uMDkxLjg3My0xLjA1MS41LTEuNTU2TTEwLjY3NiAyOC45NmMuNDY3Ljk3Ny42MjggMS43NC0uMTczIDIuNTkxIDEuMTM0LS40ODIgMS4wNC0xLjg4Ni4xNzMtMi41OU0xNS44NTMgMjkuMzI4Yy40NjcuOTc2LjYyOSAxLjc0LS4xNzMgMi41OSAxLjEzNC0uNDgyIDEuMDQtMS44ODYuMTczLTIuNTlNOS40OCAyOC43NzhjLS4yOS4xMzYtLjUzLjI2Mi0uODY1LjIzOC4yNi4yNDguNjk0LjE1Ny45ODEuMDE1LjE1LS4wNy4yODQtLjE1Mi40MTQtLjIxNC4xMzktLjA2Ny4yNjItLjA5NS40MS0uMDE0LS4xNy0uMzc0LS42ODItLjE1LS45NC0uMDI1TTE0LjU1IDI5LjA1NmMtLjI5LjEzNi0uNTMuMjYyLS44NjUuMjM4LjI2LjI0OC42OTUuMTU4Ljk4MS4wMTUuMTUtLjA2OS4yODQtLjE1MS40MTQtLjIxMy4xMzktLjA2Ny4yNjItLjA5Ni40MS0uMDE1LS4xNy0uMzczLS42ODItLjE1LS45NC0uMDI1TTguOTQ5IDMyLjA4Yy0uMDI1LS4yMjEuMDA0LS40NDkuMDIxLS42ODUtLjQ2OC4zNy0uMzc4IDEuMjMzLjI0OSAxLjM1OGwuMDA2LjAwM3YtLjAwMmwuMDEuMDAyLS4wMTctLjAyN2ExLjIgMS4yIDAgMCAxLS4wNDktLjMyN2MuMDE2LS4zNS4yNTctLjYwNS40MjMtLjkxMS0uMzAzLjA1LS41Ni4zMDgtLjY0My41OU0xNC4yMDYgMzIuNDk1Yy0uMDI0LS4yMjEuMDA1LS40NDkuMDIyLS42ODYtLjQ2OS4zNzItLjM3OCAxLjIzNC4yNDggMS4zNTlsLjAwNy4wMDMtLjAwMS0uMDAyLjAxLjAwMi0uMDE2LS4wMjdhMS4yIDEuMiAwIDAgMS0uMDQ5LS4zMjdjLjAxNi0uMzUxLjI1Ny0uNjA1LjQyMy0uOTExLS4zMDIuMDUtLjU1OS4zMDgtLjY0NC41OU0yMC42MTUgMjcuMTk2Yy0uMDY0LjUyLS4xMTUuOTg4LS4zNTMgMS40Ni41NTYtLjIwNi42OTQtMS4wMS4zNTMtMS40Nk0xOC4wNTIgMjkuNzM4Yy0uMzAzLjU4Mi0uMzU1IDEuMjc1LS4yMzkgMS45MTYtLjE2NS4yMS0uNDEuMzg0LS42NzguNDE1YS42LjYgMCAwIDEtLjMwNS0uMDVjLjA3My4wODMuMTguMTQ0LjI5Ni4xNjYuMzc4LjA2Ni43NTQtLjE1NC45NzItLjQ1OGE3LjYgNy42IDAgMCAxLS4wNDYtMS45OSIvPjxwYXRoIGZpbGw9IiM3NDQ5MGMiIGQ9Ik0xNy41NjIgMzEuNjU3Yy0uMDA3LS41OC4wOTUtMS4xMTQuMDU0LTEuNjkzLS4zMzIuNDUtLjQzOSAxLjI0NS0uMDU0IDEuNjkzTTE3LjI5MiAyOS42NjhhLjQ2LjQ2IDAgMCAxIC4xMDUuMjVjLjEwNS0uMjMtLjA1My0uNTIzLS4yNC0uNzU4cS4xMTguMDE2LjIzMy4wMzVjLjE5OS4wNDEuNDAxLjA2Ni41NjQuMjA1LS4wNjYtLjIyLS4zMDYtLjM0Mi0uNTAzLS40MjJhMiAyIDAgMCAwLS4xOTUtLjA2NC45LjkgMCAwIDAgLjMxMy0uMjM4LjYuNiAwIDAgMCAuMTQyLS40OXEuMTQuMDMzLjI4NC4wNmExLjcgMS43IDAgMCAwLS4zNS0uMjYgMS4zIDEuMyAwIDAgMC0uNTU1LS4xN2MuMjEyLS4xMy40NTQtLjE4Ni43NjItLjEzLS41MDYtLjM5Ni0xLjEwMS0uMDc4LTEuNDMxLjM4Mi0uMjIuMzExLS41NzIuNDM4LS45NTEuMjg4YS42Ny42NyAwIDAgMCAuNjI0LjIwOC41LjUgMCAwIDAgLjA2NS4xMzZjLjExLjE1MS4yNjguMjQ0LjQ0LjI4NS4xMTQuMS4yMzYuMjA3LjMxNi4yODEuMTMyLjEyNy4yNjcuMjU0LjM3Ny40MDJtLS42OS0xLjIwMmEuMzcuMzcgMCAwIDEtLjI5LjAyOC45LjkgMCAwIDAgLjI3Mi0uMjAyLjcuNyAwIDAgMSAuMTczLS4xMTFjLS4wMTcuMTItLjA2LjIyMS0uMTU1LjI4NW0uMTYuMjU4Yy4yMDEtLjExNi4yNDgtLjQwNi4xMzQtLjU5cS4xNDItLjAzNC4yOTYtLjAyNmMuMDU2IDAgLjEzNi4wMTIuMTkzLjAxNmwuMTk3LjAzNC4wNzMuMDE2Yy0uMTEuMzgzLS41MzMuNTY3LS45MTkuNTY0ek0xMi4wNzMgMjkuMjkzYS40Ni40NiAwIDAgMSAuMTA2LjI1MmMuMTA1LS4yMy0uMDU0LS41MjUtLjI0LS43NnEuMTE4LjAxNy4yMzMuMDM2Yy4xOTkuMDQxLjQuMDY2LjU2NC4yMDUtLjA2Ni0uMjItLjMwNS0uMzQxLS41MDMtLjQyM2EyIDIgMCAwIDAtLjE5NS0uMDYzLjkuOSAwIDAgMCAuMzEyLS4yMzhjLjExMS0uMTMuMTgtLjMyMS4xNDMtLjQ5LjA5NC4wMi4xODcuMDQzLjI4NC4wNmExLjcgMS43IDAgMCAwLS4zNS0uMjYgMS4zIDEuMyAwIDAgMC0uNTU2LS4xN2MuMjEzLS4xMy40NTUtLjE4Ny43NjMtLjEzLS41MDYtLjM5Ni0xLjEtLjA3OC0xLjQzMS4zODMtLjIyLjMxLS41NzEuNDM2LS45NTEuMjg3YS42Ny42NyAwIDAgMCAuNjIzLjIwOC42LjYgMCAwIDAgLjA2NS4xMzYuNzUuNzUgMCAwIDAgLjQ0MS4yODVjLjExNS4xLjIzNi4yMDcuMzE1LjI4MS4xMzMuMTI3LjI2OC4yNTUuMzc3LjQwMW0tLjY5LTEuMmEuMzcuMzcgMCAwIDEtLjI4OC4wMjcuOS45IDAgMCAwIC4yNy0uMjAyLjcuNyAwIDAgMSAuMTczLS4xMWMtLjAxNi4xMTktLjA2LjIyLS4xNTUuMjg1bS4xNi4yNTdjLjIwMi0uMTE2LjI0OS0uNDA1LjEzNS0uNTlxLjE0My0uMDMzLjI5Ny0uMDI0Yy4wNTQtLjAwMi4xMzUuMDEuMTkxLjAxNGwuMTk4LjAzNC4wNzIuMDE2Yy0uMTA5LjM4My0uNTMyLjU2Ny0uOTE4LjU2NXpNMTkuMTgyIDMwLjQxN2MuMTYzLjU1Mi4yNzMgMS4xMjguMjkzIDEuNzA1LjAxLjM4My0uMDAzLjc3LS4xMzUgMS4xNDcuNTEzLS43MTQuNDE5LTEuODM5LjE3NS0yLjY0MmE2IDYgMCAwIDEtLjM1NC0yLjAwMyAzLjg2IDMuODYgMCAwIDAgLjAyIDEuNzkzTTE2LjMyIDM0LjgxNGMtLjI1NC4xMTMtLjQ4My4yNC0uNzU3LjI4MS0uMzQzLjA2MS0uNjY3LjAwNy0xLjAyNC0uMDQ2LjQ0OS42MzQgMS41MjUuNTIgMS43OC0uMjM1TTE5LjA4MyAzMy4yNzZjLjE0MS0uNjE2LS4wNS0xLjE5My4wNzYtMS44MS0uMzQ1LjM2Ny0uMzU4Ljk0NS0uMzcgMS40MS0uMDEuMjI5LS4wMjQuNDQtLjExNy42MTYtLjA5LjE4LS4yNzMuMzIzLS40OC40NjIuNDEuMDEzLjgtLjI2Ni44OS0uNjc4TTE2Ljk0NiAzNC44MjRhMi4zIDIuMyAwIDAgMC0uNzU2Ljc2M2MuMjY5LS4xMzQuNTAzLS4yOS43NS0uNDQzLjMzMy0uMjA3LjcwMS0uMzM2IDEuMDczLS40NjcuMjE3LS4wNzUuNDM3LS4xNDcuNjYtLjIyN2EzLjA0IDMuMDQgMCAwIDAtMS43MjcuMzczTTIwLjcwNCAzMS44NjZjLjA4Mi4yNzcuMDY2LjUyLS4wMi43OC0uMDg3LjMtLjAzLjY2Mi4yMDMuODc4YTIuMiAyLjIgMCAwIDEgLjA2NC0uODAxYy4xLS4yOTYuMDM3LS42OTItLjI0Ny0uODU3TTIwLjk1NiAyOS43NTVjLjA4My4yMy4wNzQuNDU3LjEyNi43LjA4LjMzOS4zMDIuNjcyLjYzNC43OTZhMi45IDIuOSAwIDAgMS0uMzY1LS44NmMtLjA0My0uMjE3LS4xMDEtLjUzLS4yODEtLjcxLS4wNjMtLjA2Mi0uMTQ4LS4xMjYtLjI0LS4xMi4wNjYuMDUuMS4xMi4xMjYuMTk0TTkuMTQ3IDM2LjM2OWMuMzg1LS4zMDcuNjg0LS43MiAxLjA1LTEuMDQ3LjM0My0uMzEuNzU1LS42IDEuMjMtLjYwOC4xODgtLjAwNS4zOC4wNC41NjYuMTEzLS43MjEtLjU4Ny0xLjY1LS4wODUtMi4yLjUtLjQxLjQzMS0uNzUuOTA5LTEuMjIyIDEuMjcyLS4xNTMuMTE1LS4zMTcuMjM5LS41MDguMjc2LjIwMy4wMjIuNDAyLS4wNzMuNTgtLjE2MXEuMjcxLS4xNS41MDQtLjM0Nk0xMS4yMzcgMzUuNWMtLjI5My4zNjUtLjcyOS41NjYtMS4xNy43MjdhMS41OCAxLjU4IDAgMCAwIDEuMzU3LS41MThjLjA0OC0uMDU5LjEwMi0uMTI1LjE1NS0uMTc4LjIyMy0uMjE2LjQ5MS0uMzcxLjgzLS4zMTgtLjI5Mi0uMjUzLS43NTEtLjEyLTEuMDEzLjEycS0uMDg3LjA3Ny0uMTU5LjE2N00xMC4xODMgMzYuODQ2YTEuNSAxLjUgMCAwIDAtLjM2My4xMzdjLS4zMzguMTgzLS42MDcuNTI1LS42NTguOTExLjI1NC0uMzM1LjU0Ny0uNTkzLjkzMi0uNzMxLjI5Mi0uMDkuNTk2LS4xOS44NDUtLjM4NS4yMDYtLjE1My4zNjctLjM3NS40MzItLjYxNHEtLjA2Mi4wNy0uMTIzLjEzNmMtLjI4Ny4yOTYtLjY3NS40NC0xLjA2NS41NDZNMTguNDQ0IDQzLjU4MmMuMDY1LS4xMDIuMTA2LS4yMTguMTQxLS4zMzUuMDgxLS4yODcuMTA3LS41OC4wODItLjg2Ni4zOS0uODcyLjA4LTEuODA2LS42NDYtMi40NTgtLjY1OC0uNjY5LTEuMTkyLTEuNDk0LTEuMzg1LTIuNDI1LS4wMi45OTEuNTE2IDEuOTI4IDEuMTg5IDIuNjIxLjMzMy4zMTMuNjMuNjgyLjc1OSAxLjEyOC4wODguMjk3LjEwMy42MTYuMDU3LjkzNWEyLjMzIDIuMzMgMCAwIDAtLjcyMi0xLjMyYy0uNjM4LS42NzktMS4xNjYtMS40OTMtMS4zNzUtMi40MTMtLjAwMi45ODIuNTI0IDEuOTAxIDEuMTc1IDIuNjAzLjUyLjQ4My43OSAxLjExNS44IDEuODI4LjAwNi4yMzMtLjAwOS40NzItLjA3NS43MDJNNC43NjYgMzMuODk0Yy42NDcuMTY1IDEuMTk2LjU4NCAxLjgzLjc5LjEzMy4wNC4yNjguMDc3LjQwOC4wOC0uNzEzLS40MDktMS4zNTMtLjk4My0yLjE5OS0xLjA4LS4yNy0uMDI1LS42MDYtLjAxNS0uOC4yMDMuMjQ1LS4xMTIuNTEyLS4wNTcuNzYxLjAwN002LjA4OSAzNC43ODhhMS44IDEuOCAwIDAgMS0uNDg3LS4xODljLS4xNTYtLjA4LS4yOTktLjE4LS40NS0uMjctLjMyMy0uMTgtLjczOS0uMjcxLTEuMDktLjExOC4zNDYuMTAzLjY0OC4yMTMuOTY4LjM1OC4yNDUuMTIxLjUwNC4yMzkuNzgyLjI1YS43LjcgMCAwIDAgLjI3Ny0uMDNNOSA0MC4wNzRjLS4wNDQuMDYyLS4xNi4yMjctLjIwNi4yODUtLjM5Ny41MTgtLjk5My44OTMtMS42NTguODk0LjY0MS4yMyAxLjM4Mi0uMTE1IDEuNzk2LS42MjUuMjA4LS4yNDguMzUtLjU0LjU1LS43ODlhMi43IDIuNyAwIDAgMSAuNjgtLjY0N2MtLjQ4Ny4xMDctLjg3Ni40ODctMS4xNjIuODgyTTEwLjczNSAzNy44ODVhLjQ2LjQ2IDAgMCAwLS4yMTYtLjAxN2MtLjIyMy4wMzItLjQxNy4xNzYtLjU2OS4zMzYtLjA3Mi4wOC0uMTQyLjE3My0uMjAyLjI2Mi0uMDUuMDgxLS4xMS4xOTQtLjE1OC4yNjMtLjM0LjUtLjk5Mi42MDQtMS41Ny42NDMuNTQyLjE5MyAxLjIzOC4xMyAxLjY1Ni0uMzA3LjEwNS0uMTA4LjE4NC0uMjQ1LjI0OC0uMzguMTQ1LS4yOS4zMjItLjU5LjYxNy0uNzQzYS42LjYgMCAwIDEgLjE5NC0uMDU3TTE4LjI2NyAzMy4zMzVhLjkuOSAwIDAgMCAuMTUzLS40Yy0uMDcuMTIyLS4xNDguMjM0LS4yNDUuMzE5LS4zMS4yNy0uNzA3LjI4MS0xLjEwNS4zODUtLjU2LjExNC0xLjA3OC41MjEtMS4yNzYgMS4wNjguMzAyLS4yODUuNjA3LS41Mi45NzYtLjY4LjQ4OC0uMjEyIDEuMTUtLjIwOCAxLjQ5Ny0uNjkzTTEzLjE0NSA0My4xODVjLjAxNS4yMjkuMDA2LjQ0OS0uMDk0LjY1LS4xNDUuMjk2LS4zMjYuNTQ3LS40NjMuODU4LS4xMzIuMjkzLS4wODEuNjQzLjA3LjkxMy4wMDQtLjE1LjAwNS0uMjk2LjAzMi0uNDMuMDUtLjI4MS4yMjctLjQ2OC4zODYtLjcwM3EuMTI3LS4xODIuMjMyLS4zODRjLjMyNC0uNTY3LjA3My0xLjI3OC0uMzA0LTEuNzUuMDY0LjI5LjEyMi41NzIuMTQxLjg0Nk0xMS45MTMgNDcuMzk1YTEgMSAwIDAgMC0uMzk5LS41NTNxLjI3MS41NDEuMTQyIDEuMDQ5Yy0uMDU3LS4yMTMtLjIxNC0uNDA1LS40ODctLjUxNy4yMzkuMzg0LjM0Ljc1LjA5NyAxLjE0OC0uMDY3LjEyNi0uMTU2LjI0OC0uMjQuMzg5cS4xNjEtLjA1My4yODYtLjE0M2MuMTktLjEyLjM1NS0uMjgyLjQ3Mi0uNDc1LjQ1My0uNi41OTctMS40NDQuMzIxLTIuMTQ2LS4wMS40MjQtLjA3Ljg0Ni0uMTkyIDEuMjQ4TTEyLjcyMyA0Ny4xOWMuNjAyLS4wNDIuNjQ4LS45MDcuMjY0LTEuMjQ5LS4wMzQuNDUxLjA0NC44NzctLjI2NCAxLjI1TTIxLjI1NCA0OS41MzdjLS4xNTcuNjcyLS40MTUgMi4wMS0uMDEgMi42MDItLjEtLjI5LS4wNTgtLjYtLjAyOC0uODk4LjA2LS41MDIuMTY2LS45OTcuMjczLTEuNDkzLjA2NS0uMjUxLjEtLjQ4NS4wOTYtLjY5OHEuMDI2LjE0OC4wMzMuM2MuMDEuMDcuMDA0LjE0My4wMTQuMjEyLjAzLjI4Ni4xNjIuNTkyLjQxMi43NDMtLjE5LS4yNzgtLjIxOC0uNTktLjE4My0uODk4cS4wMDMtLjEzNi4wMDEtLjI3NGMtLjAzNi0uNzIyLS41MTMtMS40NDItMS4yMTQtMS42NDguMjU4LjIwOS40NzIuNDU5LjYzNS43MzctLjE5Mi0uMi0uNDgtLjMzOS0uODg1LS40MDMuODYyLjM5MyAxLjA3Mi43ODMuODU2IDEuNzE4TTE5LjAxMiA0My43MjJsLS4wNDQtLjA5M2MuMTEgMS4wMS0uMjEzIDEuOTkzLS41MTcgMi45NDQtLjE4LjUyMi0uMTc5LjUuMTIzLjA1OC4yMDYtLjM0MS4zODgtLjc1NC41LTEuMTg2cS0uMDE1LjEyOC0uMDM2LjI1NGMtLjA2Ni42MjUtLjM2MiAxLjU1OS4yNTUgMi4wMDUtLjIxNS0uMjgyLS4yMTgtLjYxNy0uMTY0LS45NS4wNS0uMzMxLjEzNS0uNjY3LjE4Mi0xLjAxNS4wNS0uMzQ3LjA3LS43MDguMDItMS4wNjJhMi41IDIuNSAwIDAgMC0uMzItLjk1Nk0yMC40NiA0OC41MjNjLS4xMDUtLjEzNC0uMjEtLjI0MS0uMjktLjM2Ny0uMjY0LS4zNzctLjM3OC0uODAyLS41MDQtMS4yNDctLjI1OC42MjIuMTA4IDEuNDg3Ljc5NCAxLjYxNE0xOS44MzcgNDMuMzgxYy4xMjUuODUzLjgxNSAxLjgzNSAxLjc2MiAxLjc3LjEzLS4wMTUuMjU2LS4wNS4zNjktLjEwNS0uMTI3LS4wMDUtLjI0Ny0uMDA4LS4zNjQtLjAzMi0uODQxLS4xNy0xLjMxNS0uOTY0LTEuNzY3LTEuNjMzIi8+PHBhdGggZmlsbD0iIzc0NDkwYyIgZD0iTTI3LjQyMiAzMy4wMWMtLjA2LS4xMzgtLjEzNC0uMjY2LS4xODItLjQwOC0uMTU2LS40MTMtLjIwOC0uODctLjA5Mi0xLjMtLjUwNy4wNjQtLjc5NC42My0uODM2IDEuMDk3bC0uMDEuMTMyYy0uMTAzLS40OC0uMTk0LTEuMDEuMDUtMS40MzIuMjI0LS4zOS43NjgtLjU2Ljg3NS0xLjA0LjA5Ny0uNDc3LS4xNTQtLjkwOC0uMTg0LTEuMzY5YS45My45MyAwIDAgMSAuMzA1LS43OC40LjQgMCAwIDAtLjEzOS4wMzRjLS40MzEuMTE4LS42OTYuNTY5LS43Ny45OTQtLjA0Mi4yODItLjA4LjU2Ny0uMjExLjgxOC0uMTI1LjI1LS4zMzEuNDEyLS41NzYuNTQzbC0uMTkzLjEwNmMtLjM1Ni4xODYtLjY0OC41MjctLjcyMy45My0uMTA3LjU3Mi4xNDYgMS4wNzIuMjYzIDEuNjA1YTEgMSAwIDAgMC0uMTEtLjE5NWMtLjIwMS0uMy0uNDY3LS41NzctLjU4LS45MjJhLjU1LjU1IDAgMCAxIC4wMTUtLjM1My42LjYgMCAwIDAtLjI1MS4yOGMtLjE1NC4zNTgtLjA5OC43Ny0uMDI4IDEuMTQuMDQ1LjIzOC4xMjcuNDc1LjEyOC43MS4wMDcuNDcyLS40MzIuNzctLjc5NyAxLjAxLS4yMTEuMTMyLS40NDUuMjQ4LS42MzMuNDE2LS4yNzEuMjE3LS40NDkuNTI4LS40NDMuODM2bC0uMDEtLjAxMWMtLjAxMS4wMS0xLjE5NiAxLjAyNy0uNzQ4IDIuNDY5LjI3NS44ODUuNjkgMS4yMzIgMS4xMyAxLjYuNDUzLjM3OC45MjIuNzY5IDEuMzE1IDEuODMzLjMyLjg2Ny4yOTIgMS42OC0uMDc1IDIuMTE5LS4yNy4zMjMtLjcxNy40MzctMS4yOS4zMy0uNjM5LS4xMTgtMS4wNjgtLjU3NC0xLjQ4My0xLjAxMy0uNDcxLS41LS45NTctMS4wMTItMS43MjctLjk3M2EzIDMgMCAwIDAtLjEyNC0xLjU4N2MtLjItLjU1NS0uNS0xLjA4Ni0uODM5LTEuNTY4LS4zNzQtLjU3Ny0uOTMyLTEuNDg1LS44MzQtMi4xODNxLjE5NS0uMS4zNjUtLjIwM2MtLjA1NC4yNi4wNS41NTQuMjU1Ljc4LjE1NC4xOS4zOC4zNS41Ny41MDEtLjA1MS0uNjE1LS4wMjctLjg5LjQ3OS0xLjI4Ni4yMzgtLjIuMzY0LS40Ny4zOTYtLjc1N2ExIDEgMCAwIDAgLjAyOC4wODRjLjE2MS40MzUuNjYyLjYyMiAxLjA5Ni42YS44LjggMCAwIDAgLjA4Ni0uMjc1Yy4wNS0uNDAzLS4wNTUtLjgxNS0uMTgyLTEuMTg3LS4xMTYtLjM0LS4xNzktLjczLS4wMS0xLjA1My4xNjYuMTM3LjM1NS4yNDIuNTcuMjk3LjIzOC4wNTkuNTMyLjAxLjY4OC0uMjAzLjA5OS0uMTI5LjEwOS0uMjk2LjA4Ny0uNDVsLS4wOC4wMWMtLjIzLjAxNy0uNTc1LjA5Ny0uNjMtLjItLjA1MS0uMjYuMDEtLjU2Mi4wMjUtLjgzYTEuNTMgMS41MyAwIDAgMC0uMzktMS4xMTRjLjM1Mi4xMjMuNjcuMzI1Ljg4LjY0Ny4xMTIuMTYzLjE4MS4zMy4yOTcuNTAybC4xMi4xNzVjLjI1Mi0uMzg4LjQ4Mi0uNzk3LjI5My0xLjI3Mi0uMTY2LS40NDItLjU5OC0uNzIzLS42MzUtMS4xOTktLjAxMy0uNzE2LS4yMTQtMS4wOTUtLjc3NS0xLjQ5LjE2LS4yNzQuMjAzLS42MS4xNi0uOTUxLS4wMjYtLjI0My0uMTAyLS40NjYtLjA0Mi0uNzEuMDU3LS4zMDMuMi0uNi4zNTctLjg2My0uMzg0LS4wMTYtLjc4My4wMTMtMS4xMzYuMTY3di0uMDE1YS44LjggMCAwIDEgLjIxNy0uNTQ2Yy0uOTM4LS40LTEuNjQzLjMyNC0yLjQ0Ny42NjYtLjU4Mi4yMDMtMS4yMzIuMTY2LTEuODM2LjA4N2wtLjA2LS4wMDktLjA0Ny4wMzdjLS4yMjMuMTc5LS40NzMuMzQzLS43MjkuNDc1bC0uMDY5LjAzNGMtLjIwNC0uMzk3LjAxLS45MjYuMjk0LTEuMjRsLjA0OC0uMDU2Yy0uODQ5LS42NjItMS43NS0uMDA5LTIuNTU0LjM3MS0uNTk3LjIzOS0xLjI4LjE5NC0xLjkwNi4xMTVsLS4wNi0uMDEtLjA0Ny4wMzhhNC40IDQuNCAwIDAgMS0uNzI4LjQ3NWMtLjI5LjE0Ni0uNTkuMjctLjkwMy4yNTctLjU4LS4wNDktMS4xNzguMDMtMS42OTYuMzA0LS4yMzIuNC0uMTM3Ljc4NS4xMjYgMS4wN2EyIDIgMCAwIDAtLjA0NS4yMDZjLS4wNDYuMjc3LS4wMjYuNTgzLjExNC44MzItLjYxNS0uMy0xLjA3Mi0uMzc0LTEuMzU4LS4yMThhLjUuNSAwIDAgMC0uMjYxLjM2bC0uMDIuMTguMTc3LS4wMjdjLjM5NC0uMDYuNjM0LjEzNS45MTIuMzU4LjE4Ni4xNS4zNzkuMzA0LjYyNy4zOTJhMS45IDEuOSAwIDAgMS0uMDQ0Ljg0MWMtLjEyMi40LS4wOS43NS4wOTEgMS4wNC4yMzMuMzczLjcxLjYyNSAxLjM3Ny43MjhsLjA5Mi4wMTUuMDQ4LS4wOGMuMTk0LS4zMjIuNTY0LS42NzEuOTUtLjcyNnEuMzM0LS4wNDcuNjMuMjAyYy4wMDcuMTc0LS4wMS42MDgtLjM0NC44NzQtMS44MzUuNTg1LTIuNDUyLjI4My0zLjEwNS0uMDM1LS40Ni0uMjI2LS45MzctLjQ2LTEuODIyLS4zOS0uMDU3LS4yMzItLjE1NS0uODg3LjEyNi0xLjk5cS4xMTQtLjQ0OC0uMTE5LS43NTRjLS4yNzUtLjM2LS44MzQtLjQzMi0xLjAzMy0uNDQ2LS4wNTQtLjI3LS4zMDQtLjQ4OC0uNTUzLS41OC0uNDEtLjE1LS44OTIuMDY3LTEuMTEyLjQyNC4zMS0uMDU1LjQ4LjE2My42Mi4zODdhLjQuNCAwIDAgMS0uMDYuMTM4LjY0LjY0IDAgMCAxLS4zMDIuMjI4LjkzLjkzIDAgMCAwLS41MTctLjI3N2MtLjQyMi0uMDY5LS44MzcuMjEtLjk5NC41ODcuMzEyLS4xMDQuNTE3LjExLjcuMzE1YS45Mi45MiAwIDAgMC0uMTc1Ljc2IDEgMSAwIDAgMC0uMjk3LS4wMDhjLS40MjQuMDU5LS43MzcuNDQ5LS43NzcuODU1LjI3NC0uMTk3LjUzOC0uMDQuNzc4LjEwNWEuNy43IDAgMCAwIC4zNDkuMDljLjAwMS4xMDEuMDE1LjIzLjA2MS4zNWExIDEgMCAwIDAtLjA5Ni4wMjNjLS4zOTUuMTIxLS42MjQuNTc5LS41Ni45Ny4wODktLjEwNS4yLS4xNDMuMzE3LS4xNDMuMTQzIDAgLjI5NS4wNTYuNDI4LjEwOC4xMTIuMDM3LjI0My4wNS4zNjQuMDIzLjA2My4xNTYuMTkuMjg1LjM0Mi4zNjMtLjEzMi4xLS4yODEuMTktLjQyLjI2Ny4xNi4xMjguMzQzLjI2Ni41MzMuMzM3LjI2LjExMi42MjkuMTM2LjgzOC0uMDk0YS43LjcgMCAwIDAgLjA5MS0uMTI1Yy0uMDY0LjE3NC0uMjEuMzI0LS4zNS40MzdsLS4wNTQuMDQ1YS43LjcgMCAwIDAgLjI0OS4yMTZjLjE0NC4wNy4zLjEwOC40NTcuMTI1YS43OS43OSAwIDAgMC0uMzUxLjU4N2wtLjAwNi4xOS4xNTctLjA3NWMuMTUzLS4wNi4zODYuMDA3LjU1Ni4wNDUuNDA4LjA4NiAxLjE3Mi40MiAxLjY0Ny4zMTZxLjA5Mi0uMDEyLjE4My0uMDMyYy0uMDIuMjIxLS4xMTcuNDIyLS4zMjYuNTMtLjEuMDU3LS4yMTMuMDg3LS4zMzIuMTA4YTUgNSAwIDAgMC0uNzU3LjE4MSAxLjA4IDEuMDggMCAwIDAtLjY0OS41MmwtLjExOS4yLjIzNS4wMDZjLjMuMDA3LjU5Ny4wODQuODk4LjE4NS4xNjguMDU0LjM1My4xMjIuNTQ1LjE0OHEuMjg5LjAyNy41MjQtLjAyNWMtLjE5NS4zNTUtLjY3Ljk2MS0xLjYuODU2YTggOCAwIDAgMS0uNzg4LS4xMzZjLS42NjItLjE0LTEuMTg2LS4yNS0xLjY4MS40MTZhLjg2Ljg2IDAgMCAwLS41ODIuMTY2Yy0uMzI1LjI0LS40MDQuNzI3LS4yMzUgMS4wNzVhLjQyLjQyIDAgMCAxIC4yODgtLjI0MWMuMDAyLjE0My4wMjUuMzU0LjEyNS41MzdhMS4xIDEuMSAwIDAgMC0uNTA4LjQ5Yy0uMjIuNDM3LS4wODEuOTgzLjI0OCAxLjMxMXYtLjAyM2MwLS4zNzcuMzItLjU0Ni42MTctLjY3NGExIDEgMCAwIDAgLjExLS4wNjVjLjExNS4wOC4yODguMTYuNDc4LjE2YS43LjcgMCAwIDAgLjEzOC0uMDE0Yy0uMDM2LjQ0My4yMzIuODc1LjYwNCAxLjA4NGEuNi42IDAgMCAxLS4wMjgtLjE3OGMwLS4yOC4yMjMtLjQ4Ny40MzYtLjY2YS45LjkgMCAwIDAgLjE5Ny0uMjU1LjcuNyAwIDAgMCAuMjIuMjA0Yy4zMTcuMTc5LjYzLjAyMy44LS4yNDFxLjAyOC4xOTQuMTM4LjM2NWEuNzc0Ljc3NCAwIDAgMCAuODE4LS41MDEgMSAxIDAgMCAwIC4wNDgtLjE5N2MuMDYuMjU2LS4wMDcuNTA4LS4xODguNzY2bC4xMjMuMDY1Yy4xOTcuMTEuNDQ5LjAzNi42MTItLjA5Mi4xODQtLjE0LjMxLS4zMzcuMzc4LS41NTRhLjc3Ljc3IDAgMCAwIC42NTUtLjQzN2MuMjkyIDAgLjUyNC0uMTg0LjY4Ny0uNDQzLjQ0LS4wMDQuNzY3LS4yNzguOTU4LS42NTEuMzUyLjAzNS43MjQtLjE0Ni45Mi0uNDQ2YTEuMjQgMS4yNCAwIDAgMCAuMTg5LS41MDdjLjQ2OS4yODEuNTc1Ljc2OC41NDYgMS4zMi4wNzgtLjAyMy4yMzUtLjA1NC4yOTEtLjEwNy4yNC0uMTg3LjM3Ni0uNDg0LjQwNC0uNzkuMTUzLjM5LjQ1Ny43MjUuODM2Ljg5Ni4yOTIuMTU5LjY2Ny4xODIuOTguMTc4cS4xMjUuMDAyLjI0My4wM2MwIC4zNjItLjM5My4zODctLjY5My4zMTktLjE1Mi0uMDI4LS4zODgtLjEwOS0uNTM3LS4xNTNhNSA1IDAgMCAwLS41NjUtLjEzNWMtLjc3OC0uMTMzLTEuNjE0LS4xMDEtMi4zMzUuMjVhMy40IDMuNCAwIDAgMC0uMjI5Ljg1MWMtLjA4LjU1LS4wNjMgMS4xMTMuMDMzIDEuNjYuMDQyLjI2Ny4xMjQuNTI1LjE0OC43OTQuMDYuNTIyLS4wMDQgMS4wNjQtLjIyMiAxLjUzNS0uMTkzLjQyMy0uNTkuODYxLTEuMDg1Ljc2NGE0IDQgMCAwIDAtLjQwNi0uNTUyYy0uNDk0LS41NzgtMS4yNDctMS4wMS0xLjk2Ny0uNTY2LS4yMjEtLjE0NC0uNTMzLS4xNTMtLjc3OC0uMDc2LS40NDguMTQyLS43MTEuNjUtLjY2NiAxLjA5N2EuNDcuNDcgMCAwIDEgLjM4Ny0uMTgxcS4wOTUuMDAxLjE5MS4wMjNjLS4wOTYuMTI3LS4xODIuMzI5LS4xNjQuNjQzLS4yNDIuMDMtLjQ3Ny4xODMtLjYzLjM2My0uMzA3LjM2Ny0uMjc0Ljk0Ni0uMDA2IDEuMzJhLjUyLjUyIDAgMCAxIC4yNy0uMzkyYy4xMzYtLjA3OC4zMDUtLjExNi40NjMtLjE0OGExIDEgMCAwIDAgLjIyNS0uMDkgMi42IDIuNiAwIDAgMC0uMDQ5Ljg1MSAxIDEgMCAwIDAtLjA4NC4xMzljLS4yMjQuNDU5LS4wNzggMS4wMjcuMjY1IDEuMzcyYS42LjYgMCAwIDEgLjE5NS0uNDdjLjE4LS4xOC40NDQtLjIyOS42MzUtLjM5NGwuMDI4LjA0cS4xNzUuMjE2LjUzLjI4YTEgMSAwIDAgMC0uMDMuMDk4Yy0uMTIuNDkuMjIgMS4wMDEuNjU2IDEuMTg4YS41LjUgMCAwIDEgLjA0Ny0uNDc4Yy4xMjEtLjE5OS4zMzUtLjMxLjQ3OC0uNDg4LjE4Ny4wODguNDQuMTYuNzA2LjE2cS4xNTQuMDAxLjMwOC0uMDM0Yy4yNDItLjA1Ni41NTgtLjIwOC43OTctLjU5OS4wNzcuMjM0LjAzOC41MS0uMDEyLjc0Ni45MjMtLjMzOCAxLjM3LTEuMTk4IDEuMjU1LTIuMTI3LjI0LjM0OC4yNy44Mi4yNjUgMS4yNDhsLjE0LS4wMjVjLjY0Ny0uMTEzLjg1NC0uOS44Ni0xLjQ2Mi4wMDctLjI4Mi0uMDUtLjU2LS4xNTUtLjgxOC4zNTItLjIxNC43MzktLjQ1NC45MDUtLjg1Ni4yMTEtLjQ5Ni4wMjctMS4wMTQtLjI5MS0xLjQxNy40OTcuMjc0IDEuMDYzLjEzNSAxLjI4OS0uNDQybC4wMDUtLjAwMmMtLjA5Ni45ODUuMzY0IDEuOTY3IDEuMjcyIDIuNDQuNjQ4LjM0IDEuMzk4LjQyNiAyLjAwNC44NC45MzcuNjA2IDEuMzEyIDEuNyAxLjEyNyAyLjc3NS0uMzU3LS4zMDMtLjc5OS0uNjI4LTEuMjU2LS42MjMtLjQzNC4wMy0uODQ2LjI3Ni0xLjA0Ny42NzRhLjgzLjgzIDAgMCAwLS41MzUuMjkyYy0uMjU0LjMwNy0uMjIuNzcyLjAxNiAxLjA2N2EuNDIuNDIgMCAwIDEgLjE4LS4yNjYuOS45IDAgMCAxIC4yOTQtLjExIDEuNSAxLjUgMCAwIDAtLjExLjY5IDEgMSAwIDAgMC0uMzIyLjQzMmMtLjE0NC40LjAxLjg1OS4zMjMgMS4xMThhLjUzLjUzIDAgMCAxIC4xNC0uMzk2Yy4xMjQtLjE0Ni4zMTItLjIxMS40NTEtLjMzNy4xMS4xMDkuMjg0LjI1My40ODUuMzFsLS4wMy4wOGMtLjEzMi40NDcuMDczLjk0LjQyOSAxLjIwNmExIDEgMCAwIDEtLjAwOS0uMWMwLS4zMS4yNDUtLjUuNDg2LS42NThhLjguOCAwIDAgMCAuMjQxLS4yOGMuMTM3LS4wMDYuNDYyLS4wNC44OTItLjI0LjA1NC4yNS4xOS40ODUuMzkyLjYzOGwtLjAwMy0uMDY1YzAtLjMwMS4yMjEtLjQ4Mi40NS0uNjM0YS43LjcgMCAwIDAgLjEyMi0uMTE2IDEgMSAwIDAgMCAuMjguMDQ4LjY0LjY0IDAgMCAwIC4zNTMtLjFxLjI2My0uMTcxLjM3My0uNjE2LjE2My4xMzYuNDIuMTE2Yy4xNy0uMjkyLjI0LS42NDUuMjEyLS45ODYuMjc4LS4zMzguMjg3LS43OTguMTM1LTEuMjEzLjMxMS0uMTAyLjU2Ni0uNDA3LjYwOS0uNjc2bC4wMTQtLjA5Mi0uMDczLS4wNmMtLjQzOC0uMzYtLjQzNS0uOTI2LS40MTktMS4xMjRhLjYuNiAwIDAgMCAuNTU3LS4yNzZjLjEtLjE2LjE4My0uMzg2LjAzOC0uNTZsLS4wNTctLjA1Ni0uMDgzLjAyNWMtLjMyNi4xMDQtLjgxNC4xMjMtLjkxMi0uMjgyLS4xMS0uMzc3LS4wMzctLjgyNS4wNy0xLjIwMmwuMDI3LS4wODYtLjA2Mi0uMDU2Yy0uNDQyLS4zMzYtMS4wODMtLjE4Ny0xLjU2LS4wMjMtLjU4My4yMi0uNjY0LS4wOTItLjU1Mi0uNjA0LjEwNy0uMDI1LjI2Ni0uMTI5LjMwMS0uMjcyLS4yOS4wOTMtLjU2NC4xMzMtLjg0Ni4wOC4yMy0uNDkuMjMtLjk5OS4xLTEuNTI4bC4wNzUuMTMzYy4yOTguNDc3LjY5MS45NzcgMS4yNTkgMS4xNTYuMzg2LjEyLjczLS4wMi45OS0uMjc0IDEuMTA3Ljc3MSAyLjU0Ni0uMTk0IDMuMTAzLTEuMjI0YTMuMiAzLjIgMCAwIDAgLjQxLTEuNzk1Yy0uMDM3LS42MS0uMTYxLTEuMjMyLS40NTktMS43NzYtLjMwMS0uNTQtLjcyMi0uOTktMS4xOC0xLjM5NC0uMjMyLS4xOTctLjQ3Ni0uMzczLS43MDctLjU1LS4yMTUtLjE3MS0uNDQtLjM1My0uNTY2LS41OTMtLjEyNC0uMjMzLS4xMDQtLjUwNS0uMDI2LS43NTQuMjg0LS44MyAxLjQ4MS0uNzIzIDIuMTczLS41NzggMS4wMTUuMTkxIDEuOTc1LS4xNzkgMi40NjctMS4xMjMuNDQtLjg1LjUxNS0xLjg4NS4xNjQtMi43NzltLTYuOTQ4IDIuMTk1Yy4wNTQuMjEyLjEwNC40MTguMTMuNjI2LjAyMi4xNjguMDM4LjM0LjAxMy41MDYtLjI1Mi0uMDA1LS41MTYtLjA4LS43MDEtLjI1M2ExIDEgMCAwIDEtLjIyNy0uMzY3IDEuNiAxLjYgMCAwIDAtLjA4OC0uNDdjLjAxOS40NzctLjA3Ljk1LS40NyAxLjIzNi0uMTc3LjEyLS4zNDUuMjU4LS40NTcuNDQ5YTEuMSAxLjEgMCAwIDAtLjE1My40NTZjLS4yNi0uMjI3LS40NTMtLjUwNi0uMzg4LS44MTEuODgxLS41OTkgMS4wOTgtMS4yNjIgMS4xNDktMS41NDRxLjE2MS0uMTQ2LjMwNi0uMzFhMy4yIDMuMiAwIDAgMCAuNDUxLS43NDZxLS4wMzIuMjktLjA3Mi41NzVjLS4wNDYuMjYzLS4xMDYuNTI0LS4wNjMuNzk1LjAzNS4yNjQuMTc2LjU2Ny40NC42Ni0uMzctLjM4OC0uMTk2LS45NS0uMTA0LTEuNDEzcS4wNjktLjQ5My4wMjgtLjk4MmMuMTE1LjE2LjI0My4zMDguMzg5LjQzNS0uMjc4LjI5LS4yODIuNzg2LS4xODMgMS4xNThtLjY5Mi0yLjUxNGMtLjA0Ni4zMDQtLjEyLjU4Ny0uMDU0LjkwNi4wNzEuMzY0LjQ2Ni40MzUuNzc0LjMzM2EuMzUuMzUgMCAwIDEtLjI5Mi4yNjFjLS41OTYuMDU2LTEuMDI1LS41NzgtMS4yNzItMS4wNjJxLjA2Ny0uMjY5LjEyLS41MzguMDk2LS41NS4xMS0xLjEwOC4xNDIuMDI3LjI4My4wNjdjLjI1OC4zMTcuMzk1LjczNC4zMyAxLjE0bS01LjcwNS01LjMzNy0uMDAyLjAwMS0uMDAyLS4wMDZ6bS03LjY3OCAyLjc3M2MtLjIzNi0uMTkxLS40NzgtLjM4Ni0uODItLjQyNS4xNC0uMDU2LjQ3LS4wNzYgMS4xODMuMjkxbC4wMDcuMDA0Yy4zNjYuMTYuOTcuMDg1IDEuNzUtLjIxNmwuMDAyLS4wMDJhLjM3LjM3IDAgMCAxIC4yNzIuMjQ3Yy4wNTcuMTUuMDUyLjM3NS0uMTA0LjU5OGEuOC44IDAgMCAwLS41MzctLjE4NWMtLjEzNSAwLS4yNzMuMDIzLS40MDkuMDQ1LS4yMjIuMDM2LS40NTIuMDczLS42ODkuMDItLjI1OC0uMDU3LS40NS0uMjE0LS42NTUtLjM3N20yLjkyOSAyLjE1Yy0uNDcuMDY4LS44NzEuNDQ1LTEuMDk4Ljc3OC0uNTM4LS4wOTctLjkxNi0uMy0xLjA5Ny0uNTg3LS4xMzYtLjIxOS0uMTU3LS40OTItLjA2LS44MS4xMDEtLjMzNC4wOTItLjY1My4wNjgtLjg1Ny4yMzMuMDI2LjQ1LS4wMDkuNjQ3LS4wNC4zNzQtLjA2Mi41OTctLjA4NC44MDQuMTYybC4wMDQuMDA1YS41Mi41MiAwIDAgMC0uMDQ4LjMxNWMuMDIxLjEwNS4wNzguMjA0LjE3NS4yNDktLjE3LS4zNTguMTYxLS42MjMuMzQ3LS44OS4yMDUtLjI2OS4zMTMtLjY2Mi4wOTUtLjk3NC0uMjk0LS40NzQtLjgxMi0uMzA4LTEuMjQtLjIxYTIuOCAyLjggMCAwIDEtLjg1OS4wNzRjLS4xOTMtLjE3OC0uMjU2LS40NzMtLjI2My0uNzQ2cS4xMy4xMTQuMjkzLjE5NmwtLjA0LS4wNTNjLS4xMjktLjIyNi0uMTktLjUxNC0uMTM0LS43MjguMDQtLjA4OS4wOTgtLjE3LjE4MS0uMTguMjguMjgxLjU0NCAwIC41MDQtLjA5MS0uNTEzLS4yODctLjcxNS0uMDMyLS43NzIuMjE0LS4yMzMtLjExNy0uMTQ5LS4zNzgtLjE0LS40MDMuNDYtLjE5OC45NTgtLjI0IDEuNDUyLS4xOTYuNy4wOCAxLjMzNi0uMzA3IDEuODgtLjcxMS41Ny4wOCAxLjE0Ni4wOTkgMS43MDktLjA1Ljc5My0uMjMgMS41NjUtMS4wNTUgMi40MDMtLjc0M2wtLjAwMy4wMDRjLS41Ny4xMTQtLjIzOCAxLjQwNy0xLjcyIDEuNTY4YTEgMSAwIDAgMC0uMDkzLjAyNiAyLjYgMi42IDAgMCAwLS43MjIuMjU2Ljg0NC44NDQgMCAwIDAgLjEyNiAxLjA2NyAyIDIgMCAwIDAtLjA0NS4yMDljLS4wNDUuMjc3LS4wMjYuNTgzLjExNC44MzEtLjYxNC0uMy0xLjA3Mi0uMzczLTEuMzU4LS4yMThhLjUuNSAwIDAgMC0uMjYxLjM2bC0uMDIuMTguMTc4LS4wMjZjLjM5My0uMDYuNjMzLjEzNC45MTEuMzU4bC4wODMuMDY2Yy4wOTguMzY1LjI0OCAxLjI1LS4yOTcgMS45OTktLjI1LjM0My0uNjAxLjU4Ni0uODgyLjc0LjExLS4yNDIuMTQtLjUxMS4xMTgtLjc0N2wtLjAwNS0uMDUzLS4wNC0uMDM2cS0uNDA3LS4zNzYtLjg5NS0uMzA3bTIuMjIuODAyYy4zMjgtLjAwMy42NDIuMTI3Ljg4Ny4zMzgtLjMtLjA1NS0uNTg1LS4xMzYtLjg4My0uMTMtLjMwMi0uMDA2LS41ODUuMTM2LS44OTQuMTIuMjgtLjE0Ny41NTUtLjMyOC44OS0uMzI4bS0uMzQyLS4yNDdjLjUwOC0uNDg0LjQ1LTEuMjEzLjYzNS0xLjg0My4xMjIuNjMzLjA4MSAxLjU5OC0uNjM1IDEuODQzbS4yMTUtMi40MzNjLS4yMzYtLjE5LS40NzktLjM4Ni0uODItLjQyNC4xNDEtLjA1Ni40Ny0uMDc2IDEuMTgzLjI5MWwuMDA3LjAwNGMuMzY2LjE2Ljk3LjA4NSAxLjc1LS4yMTZsLjAwMi0uMDAyYS4zNy4zNyAwIDAgMSAuMjcyLjI0N2MuMDU2LjE1LjA1Mi4zNzUtLjEwNS41OThhLjguOCAwIDAgMC0uNTM2LS4xODUgMi42IDIuNiAwIDAgMC0uNDA4LjA0NWMtLjIyMy4wMzYtLjQ1My4wNzMtLjY5LjAyLS4yNTctLjA1OC0uNDUtLjIxMy0uNjU1LS4zNzhtLjE4NCAzLjI1N2MuNDgzLjA3OC45Ny4wMzggMS40MzEtLjE1My0uMzgyLjM3NC0uOTUyLjQ5Ni0xLjQ2OS40Mi0uNTE2LS4wOS0xLjA1Mi0uMTUtMS41NzEtLjA0OC40NjYtLjMxOSAxLjA3My0uMzE1IDEuNjA4LS4yMTlNMy43MjIgMjkuNzRjLjI0LS4wOC40ODMtLjEyMS43Mi0uMDQ0LjIyNC4wODQuNDcuMjM4LjUyOC40ODdhLjUuNSAwIDAgMS0uMDAxLjIwNmMtLjI1LjEtLjUwMi4wMDktLjY1Ny0uMjMtLjA0My0uMDYzLS4xMDEtLjE0Ny0uMTU1LS4yYS42NS42NSAwIDAgMC0uNDM1LS4yMk0yLjQ2IDMwLjc1M2MuMjEtLjEwNy40MjktLjE3OC42NjEtLjE0Ni4yMjUuMDQuNDg2LjE0LjU4NC4zNjRhLjUuNSAwIDAgMSAuMDM0LjE5NWMtLjIyMS4xMy0uNDguMDg0LS42NjQtLjExMy0uMDUyLS4wNTMtLjEyMS0uMTIzLS4xODMtLjE2NmEuNjUuNjUgMCAwIDAtLjQzMi0uMTM0bS4wNjUgMS45NDljLS4wNjYtLjAzNS0uMTUyLS4wODItLjIyNC0uMTA0YS42My42MyAwIDAgMC0uNDUyLS4wMDFjLjE3LS4xNjUuMzU4LS4yOTcuNTktLjMzNS4yMjYtLjAyOC41MDQtLjAxLjY2NC4xNzVxLjA2LjA3My4wOS4xNzdjLS4xNzUuMTg4LS40MzYuMjIyLS42NjguMDg4bS40NTMgMS4zOGMtLjA2OS0uMDIxLS4xNTgtLjA1LS4yMy0uMDU5YS42LjYgMCAwIDAtLjQzNy4wODNjLjEyNS0uMTkyLjI3NC0uMzU1LjQ4OC0uNDMyLjIxLS4wNjYuNDc1LS4wODkuNjYuMDZhLjUuNSAwIDAgMSAuMTIuMTQ4Yy0uMTI0LjIxNS0uMzU1LjI4Ny0uNjAxLjJtMi4xOTIgMi4zNzRhMSAxIDAgMCAwLS4xMzgtLjAyOGMtLjA0OC0uMDA3LS4xLS4wMTYtLjE1Mi0uMDE4LjE1Ny0uMjU2LjQ3OC0uNDEyLjc4MS0uNTM4cS4xNzctLjA1LjM0MS0uMTQzYTEuMyAxLjMgMCAwIDAtLjI0LS4wMjVsLS4xOTEtLjAxMWMtLjIzNi0uMDEyLS41ODUtLjAyLS44MTQtLjA0OGExLjUgMS41IDAgMCAxLS4yOTItLjA1OS42Mi42MiAwIDAgMCAuMjk4LS41NjYuNjMuNjMgMCAwIDAgLjQ3Ni0uMDY1IDIuOCAyLjggMCAwIDAtLjk2NS0uMjE4LjguOCAwIDAgMCAuMzY0LjI1LjcuNyAwIDAgMS0uMTcxLjE1Yy0uMjU5LjE0Ny0uNTUuMDI3LS43OTMtLjEyMy4xMzUtLjExNy4yNDYtLjI2MS4zNDEtLjQxNWwtLjE4My0uMDEyYS44LjggMCAwIDEtLjUyNS0uMjI4LjUuNSAwIDAgMCAuMTIzLS4wNmMuMTM1LS4wOTUuMjItLjI2OC4xODYtLjQyOGEuNDYuNDYgMCAwIDAtLjA2LS4yMTQuNTQuNTQgMCAwIDAtLjE3Ni0uMTc3LjkyLjkyIDAgMCAxIC41OTgtLjQyMmMuMjY2LS4wNi41MDMtLjAyOS43NjYuMDQ2LjA3NC4xMjQuMTcyLjI2LjI4LjM1Ny4xMjEuMTE1LjMzLjIxOS40NzMuMjI0LS4wNjEtLjA1LS4xMjUtLjA5OC0uMTgtLjE1NC0uMTgtLjE3MS0uMjYyLS40MS0uMzEyLS42NDktLjY2LS4yNC0xLjUyLS4xNzMtMS44ODguNDk4LS4wODgtLjExMy0uMDk3LS4zMTMtLjA5LS40M2EuNDQuNDQgMCAwIDAgLjIwMy0uMzQxLjQ0LjQ0IDAgMCAwLS4wOTUtLjM3MmMuMzEtLjM1Ljc3LS40MzEgMS4yMDEtLjI0Mi4xMzMuMDU0LjI3NC4xMzMuMzkuMjE5LjExNS4zNzcuNDMxLjg2Ni42OTkgMS4wMzFhNC40IDQuNCAwIDAgMS0uMzMtLjYwMiAxLjQgMS40IDAgMCAxLS4xMy0uNTc1Yy0uNTk5LS41MDItMS40Mi0uNjQtMS45ODYtLjA3LS4wOC0uMzEzLjA0MS0uNTEyLjExMy0uNTk1LjA5My4wNDUuMTk2LjA3LjMuMDU3LjE2Ny0uMDIuMzMtLjEyOC4zODUtLjI4NmEuNC40IDAgMCAwIC4wMzktLjEwNmMuMjQtLjA1OC40OTItLjAzNS43Mi4wNi4yMTcuMDg4LjQwMi4yMS41NjIuMzg0LS4wMzIuNTYuMDM0IDEuMTI3LjI4NCAxLjIzOC0uMTA3LS4xODgtLjEwNy0uNDQtLjA4My0uNjU4YTIuNSAyLjUgMCAwIDEgLjE0Ni0uNjFjLS4zMjUtLjQzNi0uOTE0LS43NS0xLjQ2LS43MTlhLjguOCAwIDAgMCAuMjU3LS4yNzZjLjA5My4wNzcuMjA0LjEzMS4zMjUuMTM4LjE3NS4wMS4zNi0uMDcyLjQ0LS4yMjZhLjQuNCAwIDAgMCAuMDU5LS4xMDdjLjE1Ni4wMS42MjguMDY2LjgzNS4zMzguMTAyLjEzNC4xMjMuMzAxLjA3LjUxNS0uMzgzIDEuNTA2LS4wOTggMi4yMzItLjA4NiAyLjI2M2wuMDQuMDk1LjEwMy0uMDFjLjg4LS4wOTMgMS4zMi4xMjMgMS43ODYuMzVxLjE3OC4wOS4zNjcuMTcxYy0uMjQtLjAyOS0uNDgzLS4wNS0uNzMyLS4wNDYuMjI0LjE3OC41NS4zMjcuODk0LjQwNnEtLjA5NS4wMDEtLjE5LS4wMDRhMy41IDMuNSAwIDAgMS0xLjEyLS4yMTdjLjA4Ny4yMDcuMjY2LjM2LjQ2MS40NjYuMjExLjEwOS40NDUuMTY0LjY4MS4xNjlxLS4yOTkuMDg5LS42MTIuMTI0Yy0uNjc2LjA3My0xLjU1NS0uMDI3LTIuMTMuNDcuNzMyLS4wOCAxLjMzLjEzNSAyLjA1NC4wOTRsLS4wMzQuMDE3YTggOCAwIDAgMS0uOTcuNDAxYy0uMzM1LjEyMi0uNjkuMjAyLTEuMDQ2LjM0NGEzLjUgMy41IDAgMCAwIDEuNjg4LS4wOTZjLS41ODcuMjY3LTEuMzUzLjM0NS0xLjk1NS4zMTRtNC0yLjE4Yy0uMTY5LjMxLS41OTguNDE4LS45MTYuMy4zMy0uMDg1LjYxNy0uMTQ3LjkxNy0uM20tLjk1Ljc0MWMtLjM4Mi4zNzgtMS4wNTQuMzM5LTEuNTIuMTUzLjUyLS4wMSAxLjAzLjA0OCAxLjUyLS4xNTNNOCAzNS40NDNjLS4xNTMuMzI0LS42MTYuNDctLjk1LjQ2My4zMDYtLjE5LjY0NS0uMjczLjk1LS40NjNtLTEuODk4IDEuMjM1Yy45OTcuMjEzIDEuNjYxLS40NTQgMi4xNzYtMS4yMzIuMTI4LS4xOTguMjY1LS40MTMuNDQzLS41NzFhMy4xIDMuMSAwIDAgMSAyLjAzMi0uODI3IDMuNCAzLjQgMCAwIDAtMS44MDIgMS4wMzZjLS4xNi4xNzMtLjI4OC4zNzMtLjQ0LjU1Mi0uNjA0Ljc0OC0xLjQwNCAxLjM5OS0yLjQwOSAxLjA0Mk0yLjM0NiA0MC44OGMuMDYzLS4yMDguMTU1LS4zOTguMzIzLS41MzMuMTc0LS4xMjcuNDEtLjIzOC42MjUtLjE2MnEuMDg0LjAzMS4xNTcuMTAxYy0uMDU3LjIzNC0uMjUzLjM3OC0uNTA1LjM3NC0uMDcxLjAwMi0uMTY0LjAwNC0uMjMzLjAxOGEuNi42IDAgMCAwLS4zNjcuMjAybS44ODQgMS4xNzZhLjcuNyAwIDAgMS0uMzIyLjNjLS4wNzYuMDQtLjE3OS4wOS0uMjQ3LjE0M2EuNzMuNzMgMCAwIDAtLjMxNS40NzRjLS4wNTMtLjI5Ni0uMDU4LS41OTMuMDcxLS44NjIuMTI4LS4yNC4zNC0uNTAzLjYyOC0uNTI0YS41LjUgMCAwIDEgLjIyOC4wNDUuNy43IDAgMCAxLS4wNDMuNDI0bTEuNTg3LjI5NmEuNzMuNzMgMCAwIDEtLjIzLjM3NmMtLjA2NC4wNTgtLjE1LjEzNS0uMi4yMDRhLjc0Ljc0IDAgMCAwLS4xNzguNTQxYy0uMTI5LS4yNzEtLjIxMy0uNTU2LS4xNi0uODUuMDYtLjI2NS4xOTMtLjU3NC40NjYtLjY3M3EuMTA3LS4wMzUuMjMyLS4wMThhLjcuNyAwIDAgMSAuMDcuNDJtLjY2MyA0LjY5NGMuMTQ4LS4yNDYuMzM0LS40NjIuNjAyLS41NTguMjUtLjA3OC41NjYtLjEwMy43NzguMDc3cS4wODIuMDcxLjEzNC4xOGEuNi42IDAgMCAxLS4xODUuMjA3IDMgMyAwIDAgMC0uMTk1LjA3Ny42Ni42NiAwIDAgMS0uMzMyLS4wMzJjLS4wNzgtLjAyNS0uMTgyLS4wNi0uMjY0LS4wN2EuNjguNjggMCAwIDAtLjUzOC4xMTltLjcyLjIxNS0uMDIzLjAxOHptLS40MzMgMS40MjNjLS4wODIuMDItLjE5MS4wNDktLjI2OC4wODRhLjcxLjcxIDAgMCAwLS40MDYuNGMuMDAyLS4yOTkuMDUxLS41OS4yMzQtLjgyMy4xNzQtLjIwNi40MzUtLjQwOC43Mi0uMzY1YS42LjYgMCAwIDEgLjIxMi4wODZjLjAxMy4zMS0uMTc3LjU0NC0uNDkyLjYxOG0xLjI2NiAxLjIyOGMtLjA4LjE3OC0uMjc4LjI5Ni0uNDU4LjM4NC0uMjE0LjEwNi0uNDE2LjMzNS0uNDU1LjU3Ny0uMDUzLS4zMDctLjA1OC0uNjE1LjA3My0uODk1LjEzLS4yNTEuMzQ3LS41My42NDctLjU1NmEuNS41IDAgMCAxIC4yMzguMDQ1LjcyLjcyIDAgMCAxLS4wNDUuNDQ1bTEuNjM1LjYzNmMtLjAyNy4xOC0uMTk1LjM0My0uMzQuNDY5LS4xODYuMTYtLjMzOC40NTYtLjI4NS42OTktLjE2NS0uMjctLjI4Mi0uNTU4LS4yMi0uODc5LjA2NS0uMjc2LjIyNS0uNTc3LjUxLS42NzNhLjcuNyAwIDAgMSAuMjM4LS4wMjdjLjA4LjEyLjEyLjI3OS4wOTcuNDExbTYuMDkxLTYuMjU2Yy0uMTk4LS41MTcuMzA5LTEuMTMyLjgwMi0xLjI0NS0uMzI2LjM4NS0uNjc3Ljc0Mi0uODAyIDEuMjQ1bTEuMjEyLTEuMTczYy0uNTI1LjQ5NC0uODMyIDEuMTc2LTEuMDk1IDEuODM3LS4wNC0uNjg5LjQwOC0xLjYyIDEuMDk1LTEuODM3bS43MjIgOS4xMmEuNi42IDAgMCAwLS4yOTQuMjZjLjAxOC0uMjA0LjA2NC0uMzk1LjE4OC0uNTU1LjEzNC0uMTU3LjMyNy0uMzE2LjU0NS0uMjk2YS41LjUgMCAwIDEgLjE3LjA2LjUuNSAwIDAgMS0uMDgyLjI1N3EtLjA2MS4wNTYtLjExNS4xMTdhLjYuNiAwIDAgMS0uMTk4LjA4NmMtLjA2Ni4wMTgtLjE1My4wNC0uMjE0LjA3bS42MzMgMS4zMDZjLS4wNTYuMTQ4LS4yMDMuMjU4LS4zNC4zNDRhLjc0Ljc0IDAgMCAwLS4zMTkuNDU3Yy0uMDU2LS4zMDgtLjA1LS42MTcuMTMtLjg4NC4wODYtLjEzMS4xOTQtLjI2Ni4zNTUtLjI5OGEuNC40IDAgMCAxIC4xOTYuMDEzYy4wMy4xMi4wMTkuMjYtLjAyMi4zNjhtMS4yMTQgMS4wNGMtLjA2Ny4wNS0uMTU2LjExNS0uMjExLjE3NmEuNzIuNzIgMCAwIDAtLjIxNy40NzJjLS4wOC0uMjY0LS4xMi0uNTMzLS4wNDYtLjc5OC4wOC0uMjQ0LjIyOC0uNTI3LjQ5My0uNmEuNS41IDAgMCAxIC4yMi4wMDVjLjEuMjc0LjAwNy41NzItLjI0Ljc0NW0xLjk3LS41NzlhMS4zIDEuMyAwIDAgMC0uMTkzLjE2Ny42Ny42NyAwIDAgMC0uMTg5LjM4OGMtLjA3LS4zMTEtLjA4LS42MjUuMDgtLjkxMi4wOC0uMTQuMTc0LS4yODguMzM1LS4zMzNhLjQuNCAwIDAgMSAuMi4wMDIuNjMuNjMgMCAwIDEtLjIzMi42ODhtMi42MDMtNS4yMzRoLS4wMDJxLS4wMDYtLjAwOC0uMDA1LS4wMDkuMDAzIDAgLjAwNy4wMW0zLjg5Ni0xMy4xMjFjLS40MjUuODU0LTEuMjU3IDEuMTY3LTIuMTY3IDFhNC4zIDQuMyAwIDAgMC0uODk4LS4xMWMtLjQ2LS4wMDQtLjk4OC4wNzUtMS4zMzUuNDI4LS4zNDEuMzY0LS40NS45Ni0uMjI1IDEuNDE1LjMwMS41NTMuODkzLjg0NiAxLjMzNSAxLjI1LjQyLjM3OC44MjMuODE3IDEuMDkgMS4zMTIuMjY0LjQ5My4zNyAxLjA2Mi40IDEuNjM2YTIuOCAyLjggMCAwIDEtLjM4IDEuNTg3Yy0uNDA1LjY3OC0xLjExNCAxLjI2NC0xLjkxMSAxLjI2N2ExLjAzIDEuMDMgMCAwIDEtLjYwMi0uMnEuMDctLjExOC4xMi0uMjQyYy0uMjI5LjI1NC0uNDkyLjU0Ni0uODI4LjYzMS0uNjc0LjE2LTEuMjQyLS41NzctMS42MjYtMS4wNTItLjIyMS0uMjkxLS40MzMtLjU5LS42MjctLjkwMy4xNjYuODg0LjMzMiAxLjgwMy0uMDYgMi42NC4xOTYuMDQuMzkyLjA0NS41ODQuMDI0cS0uMDIzLjEzNC0uMDI0LjI3NmMtLjAxMy4zNDIuMTk0LjY0OS41NjEuNjI3YTEuMyAxLjMgMCAwIDAgLjQwMS0uMDg2Yy4yMjItLjA4LjQ1MS0uMTQuNjc4LS4xNTYuMTgtLjAxMi4zNzMtLjAwMi41MzIuMDc4LS4yNTkuOTctLjEyNCAyLjA0OCAxLjA5OCAxLjc2MmEuNDQuNDQgMCAwIDEtLjA0LjE5Yy0uMTkxLjQwNi0uNzMyLjI4Mi0xLjA2LjExNi4xMDYuMDc4LjIzLjE0OC4zNi4xOTYtLjAyMy4yMDgtLjA1NS44ODcuNDUzIDEuMzc0YS42NC42NCAwIDAgMS0uNDAzLjM0NiAxLjYgMS42IDAgMCAwLS40OC0uNTI0Yy4yNi41OC41NCAxLjE4NC40NTIgMS44MTItLjA4Ni0uMzg4LS4zMS0uNzM2LS42NzYtLjkyOC4zOS41NjEuNDYgMS4xODcuMzEzIDEuODNhLjIuMiAwIDAgMS0uMDY4LS4wNDguOC44IDAgMCAxLS4xMDItLjE3N3YtLjAwM2gtLjAwMmwtLjAzLS4wNmEuNjcuNjcgMCAwIDAtLjI0LS4yODEuMzguMzggMCAwIDAtLjM1NC0uMDJjLjA4NS4wNjguMTY1LjExNC4yMzUuMTg0YS40Ni40NiAwIDAgMSAuMTEyLjE4OWMtLjAzNy40MDktLjE0My42ODMtLjMxLjc5LS4xMTUuMDc0LS4yNDYuMDYzLS4zNDYuMDM4YS41LjUgMCAwIDAgLjAyLS4xMjdjLjAwNi0uMTctLjA2LS4zNTItLjItLjQ0OGEuNC40IDAgMCAwLS4yMjEtLjFjLS4xOTEtLjAxOC0uMzU1LjA5Ni0uNDc2LjIzNWExLjIgMS4yIDAgMCAxLS4wNTgtLjIzMSAxIDEgMCAwIDEtLjAyLS4yMjdjLS4wMDUtLjAzOC4wMDYtLjA3NS4wMDctLjExMi4wNDEtLjM3LjI3My0uNjYyLjUxLS45NDgtLjYxMi4xNTQtLjk1NS44ODctLjc3IDEuNDc5LjAzMy4xMjEuMDg2LjIzNi4xNDQuMzQ2YTEgMSAwIDAgMC0uMDU2LjI2Yy0uMzY0LjE4NS0uNjUzLjIzOS0uODA2LjI1NC0uMDA1LS4xNzItLjA4LS4zNDctLjIyNC0uNDM4YS40NS40NSAwIDAgMC0uMjM1LS4wOTYuNjEuNjEgMCAwIDAtLjQ1OS4xODFjLS4wMDMtLjU5OC4yNjQtMS4yMS43OTgtMS41MDNxLjI2Ny4wODIuNTQzLjA5N2EyLjEgMi4xIDAgMCAxLS41NDItLjQxNmMtLjc0Ny4zNTMtMS4xMDYgMS4xMTctMS4wNzIgMS45MTNhMS4yIDEuMiAwIDAgMS0uMzEzLS4yNDJjLjA3OC0uMjA2LjAzNC0uNDY2LS4xNDQtLjU5M2EuNC40IDAgMCAwLS4yMDgtLjEwOC41LjUgMCAwIDAtLjEzIDBjMC0uMjk5LjExOC0uNi4zMjYtLjgxNS4yMjgtLjIzMy41MzEtLjM2My44NDYtLjQzNXEuMDQyLjAzLjA4OC4wNTdjLjE3LjEwNi4zNzIuMDk1LjU2LjA3My0uMTA4LS4wMzgtLjIyNy0uMDU5LS4zMTgtLjEyOC0uMTA4LS4wNzUtLjE3LS4xOTUtLjIzLS4zMDlhMi4yIDIuMiAwIDAgMC0uODkyLjM0MS40LjQgMCAwIDAtLjA3OC0uMTM5LjQuNCAwIDAgMC0uMTA0LS4xMTUuOTYuOTYgMCAwIDEgLjcxOC0uNDU0Yy40MDYtLjAzOC45MjMuNDAzIDEuMjI0LjY2NWwuMjI3LjIwOC4wNjQtLjI5OGMuMjE1LS45MDguMDctMS45MTctLjUwMi0yLjY3MmEzLjM1IDMuMzUgMCAwIDAtMS40OTEtMS4xMTZjLS40MDYtLjE3Mi0uODA1LS4yOC0xLjE3NS0uNDg2LTEuMTE0LS41ODUtMS4zMDctMS45NTctLjgtMy4wMzMuMTQ0LS4zMDIuMzQtLjU5My41NjMtLjg1LjE1MS0uMTcyLjMwNy0uMzcxLjQxMi0uNTc0LjQ4Ni0uODM4LjI0NC0xLjkyLS40MzYtMi41NjguNTQ0LjY4Mi43MiAxLjY4Mi4yMTMgMi40MzFsLS4wNy4xMDNjLjMzNy0uNjQ2LjE5Ny0xLjQ3Ni0uMTI3LTIuMTA0LjExNS42Ni4xNjMgMS40NTctLjIzOCAyIC4xNTItLjQxOC4xNi0uODczLS4yNTMtMS4xNzEuMDUuMTU5LjExNy4zMDYuMDk0LjQ2Ni0uMDQ2LjMzNC0uMjcyLjYwMi0uNDcxLjg2N2wtLjAwOC4wMTJhLjc3Ljc3IDAgMCAwLS4yNzQtLjYxOGMuMDg4LjMxLjA5Mi41ODUtLjA5NC44MDJhLjY2LjY2IDAgMCAwLS40Ni0uNTE2Yy4xMzYuMzY1LjE2OC41OTctLjAzNC44N2wtLjA1My4wNjNjLjAxNy0uMjY1LS4xMTItLjU0Mi0uMzQ3LS42NjYuMTIzLjMyMi4xNDIuNjItLjA1Ljg4Ny0uMzU3LjM4Ni0uMzMzLjk2LS4wMjUgMS4zNjNhMi4zIDIuMyAwIDAgMS0uMDE1LS41ODkgMSAxIDAgMCAxIC4xMi0uMzc3Yy0uMDcuMjczLS4wNTQuNTU5LjExMy44MDNhLjYuNiAwIDAgMCAuMTIzLjEzNSAxLjA3IDEuMDcgMCAwIDEgLjAwMy0uNjRxLjA0Mi0uMTI2LjEwNC0uMjQxLS4wMjguMjE1LjAwMi40MzFhLjkuOSAwIDAgMCAuMTMyLjM1NyAyLjQgMi40IDAgMCAxIC4xNS0uNzM2Yy0uMDM5LjMyLS4wMDMuNjUuMTEuOTQyLS40NzQuNjE2LS44OS40NzktMS42ODguMDRxLjE1NC4yNC4zNDkuMzkzYy4zNDEuNTE2LjUyMiAxLjIzNy0uMDE2IDEuNjUtLjE3OC4xNC0uNDA0LjIzOS0uNjM3LjMzNGEyLjQgMi40IDAgMCAwLS4yNTYtLjMxNmMuMzE3LjQ0My40OTIuOTk0LjQzNSAxLjUzNC0uMDQyLjQxNS0uMjA1LjkzMi0uNTU4IDEuMTZhMiAyIDAgMCAwLS4wOS0uNTY3Yy0uMTEtLjMwMy0uMzQ5LS43MjItLjczLS42MzhxLjE0MS4wOS4yNC4yMDljLS4xMTguNzU2LS4zNTQgMS4yMi0uODcgMS43My4wMTItLjIxNS0uMDMtLjQ0Mi0uMTY1LS42MTYtLjEyNS0uMTQtLjI0OS0uMjc5LS4yOTktLjQ2NWExLjEgMS4xIDAgMCAxLS4wMzMtLjQ3LjguOCAwIDAgMC0uMTEyLjIzMi45NS45NSAwIDAgMCAuMTM4Ljc4Yy0uMTU5LjMyOS0uMzkxLjUzMy0uNjkzLjYwMy0uMzA0LjA3LS42MTctLjAwOC0uODItLjEuMDc4LS4yNjktLjA1My0uNTk3LS4zMzUtLjY3YS42LjYgMCAwIDAtLjIxNy0uMDRjLS4yMzcuMDA3LS40MzYuMTQ5LS41NzYuMzM3LS4wNTItLjQ4Mi4wNTYtMSAuMzgzLTEuMzY0LjE5Ny0uMjIuNDU2LS4zNjcuNzM3LS40NjMuMTAxLjA5My4yMTMuMTgzLjM0Mi4yMjlxLjA4Mi4wMjkuMTYyLjA0NGEuOC44IDAgMCAxLS4yMjMtLjIyNGMtLjA3Mi0uMTEzLS4xMjMtLjI1Mi0uMTcyLS4zNzktLjM4OC4xMTQtLjc3OC4yOTMtMS4wNTIuNjA2LS4zNy40MS0uNTA1Ljk4MS0uNDU3IDEuNTI0LS4xODMtLjA3NC0uMjM0LS4xOS0uMjQ3LS4yNDQuMS0uMjMyLjA2OC0uNTMyLS4xMy0uNjkzYS41LjUgMCAwIDAtLjIyNi0uMTNjLS4yMS0uMDQ3LS40MTEuMDIzLS41OC4xNXEwLS4wNjguMDAzLS4xMzdjLjA1Ny0xLjAyLjcwNC0xLjUyNCAxLjY2NS0xLjUxOGExLjcgMS43IDAgMCAwIC4yMzkuNTYzIDEuNSAxLjUgMCAwIDEtLjAzNC0uMzU2IDIgMiAwIDAgMSAuMDc5LS40OGwtLjE2OC0uMDA1Yy0uNzY3LS4wMzUtMS4zNS4yMjItMS42OTcuNjlhLjQ0LjQ0IDAgMCAwLS4wOS0uMTcuNTIuNTIgMCAwIDAtLjI0OS0uMTkxYy4yMzItLjM2Mi42NTItLjU2MSAxLjA1NS0uNjc3cS4yMDEtLjA1NS40MS0uMDg0LjI0Ny4xNjYuNS4zMWE4IDggMCAwIDEtLjQwMi0uNTk4IDMuNCAzLjQgMCAwIDAtLjU2NC4xLjQuNCAwIDAgMCAuMDAzLS4xNzMuNS41IDAgMCAwLS4wNzEtLjIyNmwtLjAxOC0uMDI0YTEgMSAwIDAgMSAuMi0uMDg2Yy43OTYtLjIxOCAxLjQ2NS41OSAxLjg0NCAxLjE5NmwuMDIuMDRhLjk2Ljk2IDAgMCAwIC41MDcuMDI4YzEuMDEyLS4yNzUgMS4zNDUtMS42MzMgMS4yNTktMi41NTdhNCA0IDAgMCAwLS4wNi0uNDI4Yy0uMTcxLS44MzQtLjE4Mi0xLjcyOS4xMTMtMi41MzQuNzMtLjMzNyAxLjU4My0uMzM1IDIuMzYyLS4xNzQuMjQzLjA2LjUyOS4xNDcuNzc2LjE4Mi4xNjEuMDE2LjMyNi4wMTkuNDg0LS4wMjZhLjU2LjU2IDAgMCAwIC40MDctLjVjLjEzNS4wNTUuMjY2LjEyOC4zOTMuMjA2LS4xOTctLjI2OC0uNDk3LS40ODMtLjgzMy0uNTMtMS4wMTgtLjA2My0xLjcyOC0uNTg0LTEuOTMzLTEuNjE3cS0uMDMyLjIxNi4wMDIuNDNhMS4zIDEuMyAwIDAgMS0uMjc4Ljc0OGwtLjA1LjA1NmEyIDIgMCAwIDAtLjAxNy0uMTk1Yy0uMDYtLjQzOC0uMzctLjg0My0uNzk2LS45NzhhMS40IDEuNCAwIDAgMC0uMDc2LS4zODJjLS4wNS4xOTItLjA4NS4zNzUtLjE0LjU0Ni0uMTMuNDczLS40MjQuNzktLjg1NC45NjVhMS44IDEuOCAwIDAgMCAuMDc3LTEuMjA0Yy0uMTY3Ljc0My0uMzM1IDEuNDk4LTEuMDI2IDEuODU5LjE4NC0uMzQ5LjI1Ny0uNzkzLjItMS4xMS0uMjUzLjQ4NC0uNDE4IDEuMjA3LS44ODkgMS41MmEuOC44IDAgMCAwLS4wNDktLjYyNWMtLjA2OC4xODMtLjEwNy4zNjEtLjE5NS41MzMtLjEuMjE1LS4yNTIuMzc2LS40My41MjQuMDUzLS4yNzUuMDItLjU2Ny0uMTA4LS44MDQuMDI3LjQ2OS0uMDk3Ljk4MS0uNDcyIDEuMjc0YS41LjUgMCAwIDEtLjIwNC4wOTVjLjExNS0uMzY4LS4wMTUtLjgtLjM2Mi0uOTk0LjA4LjEwOS4xMzMuMjE2LjE2Ny4zMjJxLS4wNzMuMS0uMTUxLjE4NWEuODYuODYgMCAwIDEtLjUzMS4yOTdjLS4xNTMtLjM0OC0uMDU1LS43MzQuMDY3LTEuMDk3LS4xOTcuMTc2LS4zMy40MjktLjM3MS42OTFxLS4wNzkuMDgyLS4xNTUuMTU1Yy0uMjU3LjI2NC0uNTM0LjI1NC0uODMxLjExM2EuNi42IDAgMCAwIC4wMzQtLjIyOGMtLjAxMy0uMTk1LS4xMjEtLjM5NC0uMjk4LS40NzNhLjUuNSAwIDAgMC0uMTA3LS4wNDQuOS45IDAgMCAxIDAtLjI1NGMuMDQxLS4yODYuMjExLS41NTMuNDItLjc1cS4yMzEuMDk1LjQ4Mi4xMDZhLjg2Ljg2IDAgMCAwIC41MzQtLjE0IDEgMSAwIDAgMS0uMjYzLjAzNiAxLjUgMS41IDAgMCAxLS43NzktLjIzNGwtLjA1My4wMzZjLS4zOTkuMjY2LS42OS43MjQtLjY1NiAxLjIxNS0uMjEyLjA3Ni0uMzczLjI3LS40NjkuNDgzLS4xODguMTM5LS4zOS4wNjItLjUwNC0uMDA0YS42LjYgMCAwIDAgLjA5NS0uMjEzYy4wNDItLjIwMS0uMDE1LS40MzQtLjE4MS0uNTU0bC0uMDEtLjAwOGMuMTM3LS4yMzMuMjk4LS40NzcuNDctLjY4NC4xNzItLjIwMy4zNjItLjQwNy42MDYtLjUxNS4zMjEuMTUyLjY5My4xNzcgMS4wMjUuMDUtLjM0NS0uMDAyLS43MTUtLjA2Mi0uOTk3LS4yNjgtLjU4NC4xMi0xLjA4Mi44MDItMS4zOTEgMS4yODEtLjExOC0uMTQ2LS4xMzQtLjM2Ni0uMTMzLS40OTRsLjEyNC4wMDNjLjE3MyAwIC4zNy0uMDY2LjQ4LS4yMTUuMDk1LS4xMzEuMTI0LS4zMTYuMDQ3LS40NTZhLjQuNCAwIDAgMC0uMTItLjE4NWwtLjAxMi0uMDFjLjM3Mi0uNDYuNzMtLjM4NiAxLjM1Ny0uMjUzLjIzNi4wNS41MDQuMTA3LjgxNC4xNDEgMS40MTQuMTU4IDEuOTQxLTEuMTE3IDItMS4yNzIuNDI0LS4yMzYuNjk2LS42OTMuODkzLTEuMjI4LS40MjQuNjU5LS44NCAxLjI0LTEuNyAxLjE0MS0uMTg3LS4wMjItLjM1Ni0uMDkxLS41NDYtLjE1NGEzLjYgMy42IDAgMCAwLS43MzEtLjE4NmMuMTg0LS4xOS40Ni0uMjczLjcxNy0uMzUxLjI0OC0uMDg1LjUxNS0uMTEuNzM4LS4yNjcuMjQtLjE1LjMzLS40Mi4zMTItLjY4Ny40NTQtLjEyNy44OTYtLjQ1MyAxLjMzOS0xLjAzOC4zNy0uNDUzLjgtLjg1OSAxLjI5Mi0xLjE3Ni4zNjktLjIzNy43Ny0uNDIzIDEuMTkxLS41NC4zLS4wODUuNjEtLjEzNS45Mi0uMTQ2LjMzMi0uMDEuNjM5LjEwNi45NjIuMTQ2LjMwMS4wMzcuNjEuMDE5LjkwNC0uMDUzLjIxOC0uMDUzLjQzLS4xMzcuNjI0LS4yNS4zODMtLjIyMi42ODctLjU2IDEuMDYtLjguMTkyLS4xMjUuNDIyLS4yNjIuNjU3LS4yNzRhLjQuNCAwIDAgMSAuMTA4LjAwOGMuMDg2LjAxOC4xNDguMDcxLjE5NS4xNjUtLjMxNi4yMi0uNTM2LjUzNy0uNTM2Ljk1NS4xMDQtLjUyMS40ODgtLjgxOC45NzYtLjk2OC43MzMtLjIzNyAxLjczLS4zNyAxLjcyOC0xLjM3My4wMDMtLjI2My0uMDY5LS41MDgtLjEwOC0uNzYyYTcuNCA3LjQgMCAwIDEtLjA0NS0xLjQ4NCAzLjYgMy42IDAgMCAwLS4yMDMgMS41MTJjLjA0LjQ0LjIxNi45NjUtLjE0MiAxLjMxNy0uMzQyLjMyLS44NjkuNDEtMS4zMDIuNjA1YTIgMiAwIDAgMC0uMTI4LjA1OC41Ni41NiAwIDAgMC0uMzc3LS4yOThjLS40OTItLjEwOC0xLjE5MS40MjUtMS41OTYuNzgzbC0uMDE1LS4wMDItLjAwMy0uMDAyLS4wMDEuMDAxYy0uNTQyLS4wOTctLjkyMi0uMy0xLjEwMy0uNTg4LS4xMzYtLjIxOC0uMTU3LS40OTEtLjA2LS44MS4xMDEtLjMzNi4wOTItLjY1Ny4wNjgtLjg2MS4yMS4wMTQuNDA2LS4wMTguNTg2LS4wNDcuMzctLjA2LjU5My0uMDgzLjc5Ny4xNTUtLjA4OC4xOTYtLjA2OC40NzEuMTM4LjU3Ni0uMTctLjM1Ny4xNjMtLjYyMi4zNDgtLjg4OS4yMDQtLjI3LjMxMy0uNjYzLjA5NS0uOTc1LS4yOTUtLjQ3NC0uODEyLS4zMDgtMS4yNC0uMjFhMi44IDIuOCAwIDAgMS0uODYuMDc0Yy0uMTk1LS4xOC0uMjU3LS40NzktLjI2Mi0uNzUzcS4wNzguMDYyLjE2OS4xMTUuMDQ1LjA0LjA5NS4wNzNsLS4wMTgtLjAzMy4wMTIuMDA3LS4wMzItLjA0MmMtLjExLS4yMDYtLjE2Mi0uNDU3LS4xMjUtLjY1Ny4wMzktLjEwMy4xMDItLjIxLjE5OS0uMjIxLjI4LjI4MS41NDQgMCAuNTAzLS4wOTItLjUxNS0uMjg4LS43MTctLjAzLS43NzIuMjItLjE4My0uMDg3LS4xOC0uMjYtLjE2My0uMzUycS4wMS0uMDI4LjAyMy0uMDU1LjE4Ni0uMDc1LjM3Ny0uMTI4Yy4zNS0uMDkxLjcxNS0uMDk3IDEuMDc1LS4wNjguNy4wOCAxLjMzNi0uMzA4IDEuODgtLjcxMi4xNy4wMjUuMzM1LjA0Mi41MDQuMDUyLjQ3NC4wMjYuOTYzLjAwMyAxLjQxMy0uMTcuNjc1LS4yNzcgMS4yNS0uOTEzIDEuOTk0LS44NTgtLjA1MS4xOC0uMDQyLjM5LjA1Ny41NDdhMiAyIDAgMCAwLS4xNDMuMDgxLjk0Ljk0IDAgMCAwLS40MjIuNTgxbC0uMDIuMDg2Yy0uMDgyLjMzOS0uMjU0LjY5OS0uNTk5LjgzMi4zOTctLjAzNi42NjgtLjQyMi43OS0uNzczbC4wMzMtLjA5MmMuMDkzLS4yOTYuMzYzLS40NjMuNjYxLS41NS4xNDgtLjA0Ni4zMDgtLjA3My40NjYtLjA4Ny0uMTI4LjMtLjIwNS42MjEtLjE1Ljk1My4xNzIuNjMzLjI0IDEuMjEtLjI4MSAxLjY5OHEuMDktLjA1My4xNjQtLjExNmMuMjg5LjE0LjU1Mi4zMTEuNjc2LjYxNy4xMDIuMjI0LjEwNi40OTMuMTU2LjczNS4xMS40My41LjcwNy42NTMgMS4xMDguMDk1LjI0LjA1LjUwNS0uMDk0LjcxLS4wNTItLjExNC0uMTA3LS4yNDItLjE3OC0uMzYzLS4zMTUtLjU3NC0uOTQ5LS45LTEuNTY1LTEuMDQzYTguMyA4LjMgMCAwIDAtLjMxOC0yLjAxYy4xMiAxLjE4MS4xMjUgMi4zNy0uMDg4IDMuNTM0LS4xNDEuNjk1LS4zMTkgMS40MzMtLjc5IDEuOTc3LTEuMTA3IDEuMTA4LTIuODI3IDEuNTc1LTQuMzYgMS40MjdhNC43IDQuNyAwIDAgMS0uODQ1LS4xNjRjLS41ODItLjE2LTEuMjAzLS4yODctMS44MDYtLjE2LS4yOS4wNjYtLjYxLjIxNC0uNzM0LjUuNTE1LS42NjkgMS43NzYtLjI5IDIuNDUyLS4wNmE1LjEgNS4xIDAgMCAwIDEuODEuMjZjLjkwNS0uMDQgMS44NDQtLjI2OSAyLjY0LS43MjYuMDE4LjUwOC0xLjMwNCAxLjAxNC0yLjE4NSAxLjItLjc0LjE1NC0xLjM1Ni4xMjYtMi4wNjEtLjE1Ny0uNDkxLS4xOTYtMS4xNi0uMzU1LTEuNjgzLS4yMDVhMS43NCAxLjc0IDAgMCAwLS43NjUuNDdjLS4zMjkuMzExLS43NzcuNDQxLTEuMjQ2LjM1NC40ODguMjY5IDEuMTA1LjEzIDEuNTE0LS4yNTVsLjAzLS4wMjRjLS4yNzUuMjYtLjQ3LjU5My0uNjUuOTMxYTEuODUgMS44NSAwIDAgMS0xLjE1My44NGMuNTE1LS4wMDkgMS4wMzctLjI2NiAxLjM5My0uNjUxLjExMi0uMTIuMjE0LS4yNjMuMzM0LS4zNzcuMDgyLS4wODMuMTgtLjE3LjI4Ni0uMjQ3YTIuNSAyLjUgMCAwIDAtLjUyMi42OTFjLS4yNC40OTItLjYxLjkzNy0xLjEzNyAxLjE0LjQ4OS0uMDczLjkzOS0uMzc4IDEuMjczLS43NDZsLjEwNi0uMTI5YTIuMSAyLjEgMCAwIDAtLjEyOSAxLjAwOWMuMDI4LjI3Ni4xMy41NDEuMjU1Ljc4Ny0uMDYtLjQ0OS0uMDg3LS45LjAyLTEuMzRxLjA2Mi0uMjk2LjE5OC0uNTUxYTEuNCAxLjQgMCAwIDAtLjAzNC42MDVjLjA4NC41MjMuMzczLjk4NS43NjIgMS4zMjctLjEwMS0uMjM2LS4yMDctLjQ2LS4yOTYtLjY4Ni0uMTQ4LS4zNTgtLjIzMy0uNzQtLjIwMS0xLjEwNnEuMDQuMjYyLjEzNy41NjljLjE5LjUwNS41MTYuODYuODk2IDEuMDY1LS43LS43OTMtLjU4Mi0xLjM0My0uMTAxLTEuNzQyLS4wNDUuMTk5LS4wMTUuNDM1LjA4NS42ODcuMTE0LjI5OS4yNjcuNTYuNDEuODIuMTQuMjYyLjI5NC41MDguMzE4LjgxNS4yMS0uNTYyLS4yMjgtMS4yNDYtLjQwNC0xLjc1Ny0uMTYyLS40Mi0uMTc5LS43MjQuMjU2LS45NDNhLjcyLjcyIDAgMCAwIC4wMzguNDM2Yy4xNi40NjYuNDUxLjc3NC41MTEgMS4yNjcuMjI5LS40MzYtLjA0My0uOTc1LS4xODMtMS4zNzgtLjE0LS4zNi4wNDItLjQ0NC4zNDItLjU3NnEuMDc2LS4wMzQuMTUyLS4wNjNjLjczMS0uMjE0IDEuNDgtLjM1NiAxLjg1OC0uNTA1LjEyNy43ODQuNzEgMS41NyAxLjE2MiAyLjE0OC4xNTYuMTkxLjM4Ny40NjUuNTE4LjY3MS41MzIuODE3Ljc0NyAxLjg1OC41MiAyLjgxNC0uMDMzLjE0LS4wNzUuMjc5LS4xMzQuNDEyYTIuNSAyLjUgMCAwIDAgLjM0NC0uNzE0Yy42OS0uMDc3IDEuMTEuMzY2IDEuNTk1Ljg4MS40NDUuNDcyLjkwNi45NiAxLjYzNCAxLjA5NXEuMjQ1LjA0Ni40NS4wNDVjLjU3MyAwIC45MS0uMjQyIDEuMTAyLS40Ny40MzgtLjUyMy40ODMtMS40MTkuMTIyLTIuMzk1LS40MTgtMS4xMzQtLjkzOC0xLjU2OC0xLjM5Ny0xLjk1LS40MjUtLjM1NS0uNzkyLS42NjMtMS4wNDMtMS40Ny0uMzIzLTEuMDM5LjMwNy0xLjgxNS41NjMtMi4wNzZxLjA1OC4xMjkuMTc0LjI0NWMtLjE3OC0uNzQ0LjI0Ny0xLjEuODIzLTEuNDM3LjQ3NS0uMzA0IDEuMTA1LS43MjYgMS4wNC0xLjM3OC0uMDQ0LS4zOC0uMjIyLS43MjItLjI0NC0xLjEwM2EyLjIgMi4yIDAgMCAxIC4wMTktLjYzOWMuMDE4LjM5Ni4yNzYuNzQ1LjQ3OSAxLjA1Mi4yNy40MDEuMjg1Ljg5LjE3NiAxLjM2NS4wOTgtLjExNS4xNjgtLjI1Mi4yMTQtLjM5OC4xNC0uMjIuMTMtLjUxOC4xMTctLjc3MWE4IDggMCAwIDAtLjE2MS0uOTkzYy0uMTE5LS40OTgtLjAyOC0xLjA0LjQxNi0xLjM0Ni4yMDYtLjE1Ny41MTEtLjI2NS43NDUtLjQ5Ni4xMTctLjExNC4yMS0uMjUyLjI3OC0uMzk3LjEzMi0uMjg0LjE1Ni0uNTk2LjE3My0uOS4wMjktLjM0NC4xNjMtLjY5My40MzUtLjkxYS43LjcgMCAwIDAtLjEwNi4xNDZjLS4yMi40NDYtLjA0NC45NDYuMDE1IDEuNDAzLjAxOC4xNDEuMDI1LjI3My0uMDAyLjM4NGEuNjQuNjQgMCAwIDEtLjE5MS4zMDNjLS4xOTUuMTg2LS40ODMuMzY2LS42NTMuNjY4LS4yNDIuNDM0LS4xNzcuOTUtLjA3IDEuNDEuMDM0LjE1LjA4Ni4yOTcuMTI2LjQzNC4wNy4yNzcuMDguNTc3LjAyNi44NjQtLjA0LjIyOC0uMTI2LjQ0OS0uMjYuNjQycS0uMDkuMTItLjIuMjI1Yy4xMzMtLjA4My4yNi0uMTguMzczLS4yOTYuMzk0LS40Mi41MS0xLjAzNS41NTQtMS41OS0uMDEtLjIxNy0uMDE4LS40MjguMDQ4LS42MjkuMDU5LS4xODkuMTU5LS4zNi4zMDMtLjQ5NmwuMDMzLS4wMzVjLS4xMy4yOTQtLjE1OS42NDMtLjEwNC45NjFhMi42IDIuNiAwIDAgMCAuMjIuNjdjLjI5Mi43OS4yMTQgMS43OS0uMTU3IDIuNTRNMTQuOTkgMzcuMzI2Yy0uNDgyLjEwNi0uOTY5LjIxLTEuMzk2LjQ1LS40NTUuMjQyLS42OTUuNjQ4LS42MyAxLjE2OC0uMzg5LS44ODMuNDg2LTEuNDkzIDEuMjY0LTEuNnEuMTA1LS4wMTcuMjEyLS4wMjdjLS4zMDQtLjAzNy0uNTc4LS4xOS0uODYyLS4yODQtLjU2NC0uMTg0LTEuMTY1LjAwMy0xLjU4Mi40MjguMTUtLjI2Ni40LS40ODIuNjk3LS41OTkuNDUtLjE4Ny45NTctLjA2OSAxLjM3Mi4xNDcuMzk3LjE3NS44NDguMjggMS4yODEuMTgzLS4xMTguMDctLjMzLjEyOS0uMzU2LjEzNW0tMi42My43MzhxLS4wMDMuMDAzLS4wMDguMDAxbC0uMDA0LS4wMDdjLS4wMTYtLjEzNS4wNDctLjI2OC4xMTctLjM4LjIyNS0uMzUyLjcwNi0uNTIgMS4wOTYtLjM3LS4xMy4wMzgtLjI1Mi4wNy0uMzY3LjExYTEuNyAxLjcgMCAwIDAtLjgzMy42MjhjLS4wMDIuMDA3LS4wMS4wMTgtLjAwMi4wMTgiLz48cGF0aCBmaWxsPSIjNzQ0OTBjIiBkPSJNMjYuNDgxIDM1LjE0NmExLjM0IDEuMzQgMCAwIDEtLjk3Ny42NjhxLjA3MS0uMDIxLjEzOS0uMDUxYy41NC0uMTkxLjg5NC0uNzg2LjY4OC0xLjMyMi0uMDE4LjcxNC0uNTg4IDEuMDctMS4yNDQgMS4xbC0uMTI3LjAwMy4wOTUtLjAxNGMuNDI1LS4wNTcgMS0uMzMzLjg1NC0uODYtLjA1LjI4OC0uMjQuNDQ5LS41MDYuNTE1LS4yNTEuMDcxLS41MzcuMDktLjguMTEzYTIgMiAwIDAgMC0uMjMyLjA0Yy4xNjUtLjExMS4zNDMtLjIxNC41MjMtLjNsLjA5LS4wNWMuOC0uNDUzLjk4Ny0xLjMzNC42OTYtMi4xNjEtLjE4Ni0uNDctLjI2Ni0uOTktLjE1OS0xLjQ5My0uMTQzLjQzLS4xNTEuOTExLS4wNDYgMS4zNTMuMDgyLjI5Ny4xNDQuNjEyLjExLjkxNC0uMDQ1LjU0Ni0uNDE0Ljk4Ny0uOSAxLjIxLS42OC4zMDMtMS4zNTIuNjQyLTEuNDE4IDEuNDhsLS4wMjQuMDI0Yy41NjctLjI5NSAxLjE3Ny0uMjg3IDEuNzczLS4xNi43MDMuMTE1IDEuNDI2LS4yMDQgMS43MDctLjg4NS4xOC0uNDE3LjE5OS0uODY2LjEzLTEuMjgzLS4wNzQuNDE3LS4xNzMuODI0LS4zNzIgMS4xNTlNMTkuOTY2IDMxLjA2NWMwIC4xNTEtLjAzLjMwNC0uMDY3LjQ2LjA5Ny0uMTI4LjE2Ny0uMjc5LjIwNy0uNDQxLjAzOS0uMTYzLjA0NS0uMzM2LjAyMi0uNTAzLS4wNDMtLjMzNS0uMTc1LS42My0uMjUtLjkyLS4xODItLjU5NS4wMjMtMS4xOTcuMzI1LTEuNzI2LS40OS40MjQtLjc4MiAxLjE1MS0uNTkzIDEuNzk3LjEyMy40NzcuMzY0Ljg1My4zNTYgMS4zMzNNMTYuMzQgNDYuNzg0Yy0uOTUyLTEtLjQ1Ny0yLjMyOS4xOTUtMy4zNS0uOTg4Ljg5NS0xLjQ4MSAyLjUxNS0uMzQ2IDMuNTA1LjMyOS4yOTUuNzIuNDk1IDEuMTI4LjYxNy0uMzYtLjIyNy0uNzAyLS40NzItLjk3Ni0uNzcyIi8+PHBhdGggZmlsbD0iI2ZjYzIwMCIgZD0iTTU2LjUwMyA0NC40OTdjLS45MDYuMzg0LTIuNDIuNDQ1LTMuNDEtLjM5NC0uNzktLjY2OS0xLjMxMy0xLjg0Ni0xLjA5My0zLjM5NS0xLjU1LjYyLTEuODc1IDQuMzM3LS44ODMgNS45MSAwIDAtLjI1MSAxLjM0Ny0uNDI1IDEuODJhMyAzIDAgMCAwLS41MzUtLjE4OWMtMS4xMDUtLjI4NC0yLjMyNS4wMjEtMy4wMzYuNzU3LS45NDMuOTgtMS4xNyAyLjE3NS0uNTc3IDMuMzY5LjM1NS43MTMgMS4zIDEuMjIgMi4yMDQgMS4yMS40OTYtLjAwNiAxLjM1Mi0uMTc4IDIuMDMyLTEuMTUyLS4xNTYgMS43ODQtMi4zOTYgMi43MzYtMy45NjQgMS41MTgtMS44OTUtMS4zOTUtMS40ODMtNC44MzUtMS40NTItNS40MDUuMjMtLjMyOC4yMTQtLjU0Ni4yNC0xLjAzMy4wNzMuMTU4LjE3OC4yOTkuMzIuNDA4LjM5Ni4zMTYuOTYxLjE5IDEuMzQ2LS4wODJsLjA4OS0uMDU4LS4wNS0uMTAyYy0uMTY0LS4zMzYtLjE2LS43MDMtLjEzLTEuMDczLjAwMy0uMDQuMDA2LS4wNDQuMDA5LS4wODQuMDY3LjA1OC4xNC4wOTQuMjE2LjE0Mi40NDUuMjgyLjkzOS4xNzcgMS4xNTgtLjMzNy0uNjEyLS4xMjUtLjkyNi0uNTY4LS45MDctMS4yLjAwNS0uNC0uMTEtLjgzNS0uMzU5LTEuMTU2IDEuMTI4LjM3MyAxLjI4My43NjggMS4zNjQgMS4yNDZsLjA2Ny4zOTIuMTkxLS4zNDhjLjQyNS0uNzgtLjEzOC0xLjUzLS40NC0xLjkzNC0uMjQxLS4zMjEtLjUwNC0uNzQtLjU3LTEuNjZhMi40IDIuNCAwIDAgMC0uNDQ5LTEuMjUzYy41OTcuMjEgMS4xNTUuMjc2IDEuNjYxLjI3Ni4yMzYgMCAuNDYtLjAxNC42NzEtLjAzNGwuMDM1LS4wMDQuMDMtLjAyYzEuMzEzLS44OCAxLjAxMS00LjUzMy44ODgtNS42MzJhMjcgMjcgMCAwIDAtLjI4OC0xLjc2Mi45NC45NCAwIDAgMCAuMTc3LS40MzhxLjA1MS0uNjIuMTI4LTEuMjM4Yy4wNDYtLjM1NC4xMDMtLjc1OC0uMDAzLTEuMTI0LS4wNi0uMjI2LS4yMDItLjQwOS0uMzQxLS41ODQtLjItLjI5My0uNDI2LTEuMTIyLS40MjYtMS4xMjJzLS42MjUtLjIyLTEuMjgxLjAyN2wuMzg3LS4yMmEuMTQ0LjE0NCAwIDAgMCAuMDY2LS4xODEuMTQuMTQgMCAwIDAtLjE5NS0uMDY2bC0uODQ3LjQ4MWEzIDMgMCAwIDEtLjA0NC0uMjFsLjgxNC0uNDYxYy4wNjMtLjAzNy4wOTUtLjExNC4wNjUtLjE4MmEuMTQuMTQgMCAwIDAtLjE5NS0uMDY1bC0uNzE1LjQwN2EyIDIgMCAwIDEgLjAwMy0uMjM2bC42MzUtLjM2MWEuMTQ0LjE0NCAwIDAgMCAuMDY2LS4xOC4xNC4xNCAwIDAgMC0uMTk1LS4wNjZsLS40Ni4yNjIuMDI2LS4xMjJhLjM2LjM2IDAgMCAxIC4xNzMtLjIyNmwuMTg0LS4xMDRjLjA2My0uMDM2LjA5NS0uMTE0LjA2Ni0uMTgxYS4xNC4xNCAwIDAgMC0uMTk2LS4wNjVsLTIuNTkzIDEuNDc0YS4xNC4xNCAwIDAgMC0uMDUyLjE5LjE0LjE0IDAgMCAwIC4xODkuMDUybC4zNC0uMTkzYS4zNi4zNiAwIDAgMSAuMzQ4LS4wMDRsLjAzNy4wMi0uNjQ3LjM2N2MtLjA2My4wMzctLjA5NS4xMTYtLjA2NC4xODRhLjE0LjE0IDAgMCAwIC4xOTQuMDYzbC43NzItLjQ0cS4wNzguMDY0LjE1Ny4xNDVsLS44NTIuNDg1Yy0uMDY1LjAzNi0uMDk3LjExNi0uMDY2LjE4NGEuMTQuMTQgMCAwIDAgLjE5NC4wNjJsLjkwNy0uNTE1cS4wNTcuMDc4LjExNC4xN2wtLjk0My41MzRjLS4wNjMuMDM3LS4wOTUuMTE3LS4wNjQuMTg0YS4xMzcuMTM3IDAgMCAwIC4xOTQuMDYzbC45NDYtLjUzOHEuMDQzLjA4OC4wODMuMTg4bC0uOTUyLjU0Yy0uMDY0LjAzNy0uMDk2LjExNy0uMDY1LjE4NGEuMTQuMTQgMCAwIDAgLjE5NC4wNjNsLjkxNS0uNTJxLjAzMS4wOTcuMDU2LjIwMmwtLjg5My41MDljLS4wNjQuMDM2LS4wOTYuMTE2LS4wNjUuMTg0YS4xNC4xNCAwIDAgMCAuMTk0LjA2MmwuODI1LS40N3EuMDE4LjEwNi4wMzMuMjE2bC0uNzguNDQ0Yy0uMDY1LjAzNy0uMDk3LjExNy0uMDY2LjE4NGEuMTQuMTQgMCAwIDAgLjE5NC4wNjNsLjY4NS0uMzlxLjAwOC4xMTEuMDE0LjIyN2wtLjYyLjM1M2MtLjA2NS4wMzYtLjA5Ny4xMTYtLjA2Ni4xODRhLjE0LjE0IDAgMCAwIC4xOTQuMDYybC41LS4yODRxMCAuMTE1LS4wMDIuMjM2bC0uNDIuMjM4Yy0uMDY0LjAzNy0uMDk2LjExNy0uMDY1LjE4NGEuMTQuMTQgMCAwIDAgLjE5My4wNjRsLjI3Ny0uMTU5cTAgLjAyNS0uMDAzLjA1YS4zNi4zNiAwIDAgMS0uMTgxLjI5bC0uMDE0LjAwOGMtLjA2NS4wMzYtLjA5Ny4xMTYtLjA2Ni4xODRhLjE0LjE0IDAgMCAwIC4xOTQuMDYzbC40OTItLjI4LjAxLjA2N2MuMDU4LjMyOC4yMTkuNjQxLjQ2Ljg3MS4wNDMuMTYuMDcyLjMzNi4wOS41MDEuMDY4LjU2Ni4wNCAxLjE0MS0uMDUgMS43MDUtLjA4NC41OTktLjM1MyAxLjE4Ny0uMzg2IDEuNzkybC0uMDY1LS4wOTVhMy43MyAzLjczIDAgMCAwLTEuNTU3LTEuMzI1Yy0uMTctLjI5My0uMjk2LS42MzQtLjI4Ni0uOTcuMDMyLS40NDkuMDczLS45MjYtLjAzNi0xLjM2Ny0uMDIzLS4wNjctLjA0Mi0uMTQtLjA3LS4yMDVsLS4wNjItLjEzYy0uMDk4LS4xOC0uMjQ2LS4zNTgtLjMwNi0uNTJhMS45IDEuOSAwIDAgMS0uMTEzLS42NjhjLS4wMTMtLjMxNi4wMjMtLjY2NC4wNTItLjk4LjA0LTEuMDQ2LS42MzYtMS44NDItMS4zNDMtMi41MTItLjc1LS44OS0xLjI0Mi0yLjc1OS0yLjgyNi0yLjE5NGEuODIuODIgMCAwIDAtLjkxNC0uNDIzYy0uNDcuMDg3LS44MzQuMzQ1LTEuMTYxLjY2M3EtLjExNi4wOS0uMjMzLjE2NWMtLjI0LjE2LS41Ni4xOTktLjc4Mi40MzJhMS4yNyAxLjI3IDAgMCAwLS4yNyAxLjIzNiAxIDEgMCAwIDAtLjE1LjEzNGMtLjM5NS40NTMtLjQ0OCAxLjA5LS40MjIgMS42NjYuMDMyLjQ2NC4yMDQuOTM3LjI3IDEuMzY2LjA3Mi4zOC0uMDg2LjU4MS0uMzQ3LjgxNWEzLjkgMy45IDAgMCAxLTEuMDEuNjAyYy0uNTQuMTkyLS45NjIuNjU4LTEuMTA3IDEuMjE1LS4xNjUuNjE1LjA4NSAxLjI2My40NjYgMS43MzlxLS4xNTguMjkzLS4zMjcuNjIzLS4xNjEuMzEyLS4zNC42NWMtLjE1OS4yOTUtLjk2MyAxLjEzOC0xLjQ0NiAxLjYyNnYtMi4zNjNjLjIxOC0uMTA2LjMzMi0uMTkzLjM5My0uMzM2YS41LjUgMCAwIDAgLjAyMy0uMzA1Yy4xOTQtLjEwOS4zNDItLjMzOS4yNTktLjU2OC4yMDMtLjEwMi4yODItLjQ1NC4xMDUtLjYxOS4yNjMtLjE3Mi4yNDUtLjQ3OS4wNzItLjcxMy0uMjUzLS4xNDgtLjUyOC0uMy0uODIyLS4zNjcuMDYxLS40OS4yMjQtLjk2Mi40NjUtMS4zOTYuMjY1LS40NzQuNDUtMS4xNjYuNTA2LTEuOTU3aC4xOGEuMzQ3LjM0NyAwIDAgMCAuMzQ2LS4zNDguMzUuMzUgMCAwIDAtLjM0Ny0uMzQ4aC0uMTY2Yy0uMDM4LTEuMzU1LS40NTYtMi40NzMtMS4wMTQtMi44MDZ2LS40OWEuMzQ2LjM0NiAwIDEgMC0uNjkzIDB2LjQ5Yy0uNTU4LjMzMi0uOTc3IDEuNDUtMS4wMTUgMi44MDZoLS4xNjZhLjM0OC4zNDggMCAwIDAgMCAuNjk2aC4xOGMuMDU1Ljc5MS4yNCAxLjQ4My41MDUgMS45NTcuMjU0LjQ1NC40MTkuOTUuNDc0IDEuNDYzLS40MzMuMTkzLS43NTguNjI0LTEuMDIgMS4wMDQtLjk5MyAxLjYwMy0xLjIzIDMuODUxLS44NjQgNS42OC4xOTQuOTYuNTkgMS45NDYgMS4zOTUgMi41NThsLjA0Ny4wMzUuMDU2LS4wMDhjLjg4LS4xODUgMS43MjctLjYxIDIuNDUyLTEuMTgyYTUgNSAwIDAgMS0uMjI4LjczNWMtLjQ4MiAxLjE3Ni0uMTc3IDEuNzY2LS4wMTIgMS45NzZxLS4xMy4yOTMtLjI4LjU3OWEzIDMgMCAwIDAtLjEwNS4yMjVjLS4yNTcuNTk5LS4xMSAxLjI0OC4zNzIgMS42NC0uMDE0LjMzLjEuNjU0LjI4NS45MzEuMDQ2LjQ1Ni4yNTkuODIxLjU1NC44OTQuMjI0Ljk0OC43NTQgMi44MDQgMi41NzYgNS40NzcgNS4wNSA2LjY4NSAxMC45MjIgNS4wMzQgMTIuOTU4IDIuNTM2IDEuNTA2LTEuODMyIDEuOTk4LTMuMzU3IDEuMzc5LTUuNDQxLS4xNjQtLjU1Ni0uNTU4LTEuMzU4LS44MS0xLjcxMi4wNDUtLjI1NS4yMDUtMS4xMDguNDYtMS43NzIgMy4zOTQtLjIxNiA0LjAyLTMuMjgyIDQuMDItMy4yODIiLz48cGF0aCBmaWxsPSIjNzQ0OTBjIiBkPSJtNDYuNDQ4IDU4LjkxLS4xNC0uMDAxYy0xLjk3Ni0uMDM3LTQuOTQyLS44ODctNy44NDYtNC43MzItMS45NDUtMi44NTMtMi40Mi00LjgwNi0yLjU3Ny01LjQ3LS4yOTEtLjA4NS0uNTA5LS40MzgtLjU1OC0uOTFhMS42IDEuNiAwIDAgMS0uMjg3LS45MjdjLS40ODYtLjQwNS0uNjMtMS4wNTgtLjM2OS0xLjY2OWEyIDIgMCAwIDEgLjEwNi0uMjI3Yy4xMDItLjE5Ny4xOS0uMzguMjcxLS41Ni0uMTY1LS4yMi0uNDU5LS44MjYuMDItMS45OTNxLjExOS0uMjg4LjIwNC0uNjM0Yy0uNzM4LjU2NS0xLjU2MS45NTQtMi4zODkgMS4xMjhsLS4wNTguMDA5YS4wMy4wMyAwIDAgMS0uMDI2LS4wMDZsLS4wNDYtLjAzNWMtLjY5Ni0uNTMtMS4xNy0xLjM5OC0xLjQwOS0yLjU4LS4zOTUtMS45NzYtLjA1NS00LjIxNS44NjktNS43MDUuMjgzLS40MS42MDEtLjgxNSAxLjAxMy0xLjAwN2EzLjggMy44IDAgMCAwLS40NjctMS40MjRjLS4yNy0uNDg1LS40NS0xLjE3My0uNTA4LTEuOTRoLS4xNDdhLjM4My4zODMgMCAwIDEtLjAwMS0uNzY1aC4xMzNjLjA0My0xLjMyMi40NDgtMi40MzcgMS4wMTMtMi43OTF2LS40N2EuMzgyLjM4MiAwIDAgMSAuNjUtLjI3Yy4wNzEuMDcuMTEyLjE2OC4xMTIuMjd2LjQ3Yy41NjYuMzU1Ljk3IDEuNDcgMS4wMTMgMi43OWguMTMzYS4zODMuMzgzIDAgMCAxIDAgLjc2NmgtLjE0N2MtLjA1Ny43NjgtLjIzNyAxLjQ1NS0uNTA4IDEuOTRhMy44IDMuOCAwIDAgMC0uNDU3IDEuMzUyYy4yODUuMDcuNTUyLjIxOC44MDEuMzYzbC4wMS4wMWEuNi42IDAgMCAxIC4xMjguNDYuNDUuNDUgMCAwIDEtLjE3NS4yNzljLjA2Ni4wNzkuMDkzLjE5LjA3Ni4zMWEuNDUuNDUgMCAwIDEtLjE5MS4zMmMuMDY3LjIyOS0uMDc1LjQ1My0uMjYyLjU2OGEuNTQuNTQgMCAwIDEtLjAzLjMwMmMtLjA2OC4xNTktLjE5Ni4yNDgtLjM5LjM0NHYyLjI1NmMuNTg4LS41OTcgMS4yNDQtMS4zMDMgMS4zOC0xLjU1Ny4xMjQtLjIzMi4yNC0uNDU2LjMzOS0uNjQ4LjEwMy0uMi4yMTItLjQxLjMxNi0uNjA0LS40MzMtLjU1LS42MDUtMS4yMDQtLjQ1OC0xLjc1LjE0OC0uNTcuNTgtMS4wNDUgMS4xMjgtMS4yMzlhMy44IDMuOCAwIDAgMCAxLS41OTZjLjI3My0uMjQ1LjQwMS0uNDM0LjMzNC0uNzgzLS4wMjctLjE3Ni0uMDcxLS4zNTYtLjExNy0uNTQ2YTUgNSAwIDAgMS0uMTUzLS44MjNjLS4wMjEtLjQ5IDAtMS4xOTcuNDMtMS42OTFxLjA2Ny0uMDczLjEzNi0uMTI0YTEuMzEgMS4zMSAwIDAgMSAuMjg3LTEuMjQ3Yy4xNC0uMTQ2LjMxMy0uMjE4LjQ4Mi0uMjg4LjExLS4wNDUuMjEzLS4wODguMzA1LS4xNDlxLjEyMi0uMDc4LjIzLS4xNjNjLjM5OS0uMzg2Ljc2Mi0uNTkzIDEuMTc3LS42Ny4zOC0uMDc5Ljc2MS4wOTEuOTM4LjQxNCAxLjE5Ni0uNDA4IDEuNzg1LjU2NSAyLjMwNSAxLjQyNC4xNzcuMjk0LjM0NS41Ny41My43OS42OS42NTQgMS4zOTIgMS40NjkgMS4zNSAyLjUzNmwtLjAwOC4wOTFhNyA3IDAgMCAwLS4wNDMuODg2Yy4wMDQuMTkuMDIuNDM0LjExLjY1Ni4wMzUuMDk2LjEwMi4xOTYuMTczLjMwNC4wNDYuMDcuMDkzLjE0LjEzMi4yMTJsLjA2Mi4xMzNxLjAyOS4wNy4wNDguMTM4bC4wMjIuMDdjLjEwNy40MzIuMDc0Ljg4Ni4wNDIgMS4zMjZsLS4wMDQuMDU0Yy0uMDA5LjI4Ni4wODcuNjExLjI3NS45NGEzLjggMy44IDAgMCAxIDEuNTYyIDEuMzMzbC4wMDguMDEzYy4wMy0uMzA5LjExNS0uNjE0LjE5Ny0uOTEuMDcyLS4yNTcuMTQ1LS41MjIuMTgyLS43ODVhNi4yIDYuMiAwIDAgMCAuMDUtMS42OTYgMyAzIDAgMCAwLS4wODctLjQ4NyAxLjYyIDEuNjIgMCAwIDEtLjQ2Mi0uODgzbC0uMDAzLS4wMTgtLjQ0OC4yNTVhLjE3My4xNzMgMCAwIDEtLjI0Mi0uMDc4LjE4LjE4IDAgMCAxIC4wOC0uMjI5bC4wMTMtLjAwN2EuMzMuMzMgMCAwIDAgLjE2NC0uMjQ4bC0uMjIxLjEyNmEuMTczLjE3MyAwIDAgMS0uMjQzLS4wNzguMTguMTggMCAwIDEgLjA4LS4yMjlsLjQwMi0uMjI5LjAwMi0uMTU1LS40NDguMjU1YS4xNzMuMTczIDAgMCAxLS4yNDItLjA3OC4xOC4xOCAwIDAgMSAuMDgtLjIzbC42MDItLjM0Mi0uMDA5LS4xNS0uNjM3LjM2M2EuMTczLjE3MyAwIDAgMS0uMjQyLS4wNzguMTguMTggMCAwIDEgLjA3OS0uMjI4bC43Ni0uNDMyLS4wMjEtLjE0Mi0uNzgyLjQ0NWEuMTcyLjE3MiAwIDAgMS0uMjQyLS4wNzguMTguMTggMCAwIDEgLjA4LS4yMjlsLjg3LS40OTYtLjAzNy0uMTM0LS44NzguNWEuMTczLjE3MyAwIDAgMS0uMjQyLS4wNzguMTguMTggMCAwIDEgLjA4LS4yM2wuOTI1LS41MjUtLjA1NC0uMTI1LS45MTQuNTJhLjE3Ni4xNzYgMCAwIDEtLjI0My0uMDc4Yy0uMDM4LS4wOC0uMDAzLS4xOC4wNzgtLjIyOWwuOTEyLS41MTgtLjA3NS0uMTExLS44OC41YS4xNy4xNyAwIDAgMS0uMjQyLS4wNzguMTguMTggMCAwIDEgLjA3OS0uMjNsLjgxMi0uNDZhMiAyIDAgMCAwLS4xMDQtLjA5NmwtLjc1Mi40MjhhLjE3NC4xNzQgMCAwIDEtLjI0My0uMDhjLS4wMzctLjA4LS4wMDMtLjE4LjA3OS0uMjI4bC41OTEtLjMzNmEuMzIuMzIgMCAwIDAtLjI5NS4wMTRsLS4zNC4xOTNhLjE3LjE3IDAgMCAxLS4yMzUtLjA2Ny4xNzMuMTczIDAgMCAxIC4wNjUtLjIzN2wyLjU5Mi0xLjQ3M2EuMTcuMTcgMCAwIDEgLjE0LS4wMTRjLjA0Ni4wMTUuMDg0LjA1LjEwNC4wOTZhLjE4LjE4IDAgMCAxLS4wOC4yMjRsLS4xODQuMTA1YS4zMy4zMyAwIDAgMC0uMTU2LjIwNGwtLjAxLjA0NS4zOTItLjIyNGEuMTc0LjE3NCAwIDAgMSAuMjQ0LjA4My4xOC4xOCAwIDAgMS0uMDguMjI0bC0uNjE4LjM1MnEtLjAwNC4wNzYtLjAwMy4xNTZsLjY2NC0uMzc4YS4xNy4xNyAwIDAgMSAuMTQtLjAxM2MuMDQ2LjAxNS4wODQuMDUuMTA0LjA5NWEuMTguMTggMCAwIDEtLjA4LjIyNWwtLjc5MS40NDZxLjAxLjA2Ni4wMjkuMTM5bC44MDYtLjQ1OGEuMTcyLjE3MiAwIDAgMSAuMjQ0LjA4Mi4xOC4xOCAwIDAgMS0uMDgxLjIyNGwtLjEzNS4wNzdhMi4xIDIuMSAwIDAgMSAxLjAyMy4wNTNxLjAxNy4wMDcuMDIzLjAyNGMuMDAyLjAwOC4yMjYuODI2LjQyIDEuMTEyLjEzMi4xNjYuMjgzLjM1Ni4zNDcuNTk1LjEwNC4zNjEuMDUyLjc1Ni4wMDcgMS4xMDVsLS4wMDQuMDMyYy0uMDU0LjQzNS0uMDk2Ljg0LS4xMjggMS4yMzZhMSAxIDAgMCAxLS4xNzUuNDQ0Yy4wNTMuMjc2LjIxNyAxLjE0Ny4yODUgMS43NS4wNjcuNTkzLjE2NyAxLjc1Ny4wOTQgMi45MDQtLjA5MSAxLjQ1LS40MjcgMi4zNzgtLjk5OCAyLjc2MWwtLjAzLjAyYS4wMy4wMyAwIDAgMS0uMDE2LjAwNWwtLjAzNC4wMDNjLS4yNDEuMDIzLS40NjIuMDM0LS42NzUuMDM0LS41NTggMC0xLjA3NC0uMDgtMS41NzMtLjI0My4yMy4zNDcuMzYzLjc0NS4zOTUgMS4xODMuMDY1LjkxLjMyNCAxLjMyNS41NjIgMS42NDIuMzA4LjQxLjg4IDEuMTcxLjQ0NCAxLjk3MWwtLjE5LjM1YS4wMzQuMDM0IDAgMCAxLS4wMzcuMDE3LjA0LjA0IDAgMCAxLS4wMjktLjAyOWwtLjA2Ny0uMzkzYy0uMDc3LS40NTEtLjIyLS44MjctMS4yMzktMS4xODMuMTk4LjI5Ny4zMDcuNjg3LjMwMiAxLjA4OC0uMDE5LjYzMi4yOTQgMS4wNDUuODggMS4xNjZxLjAxNS4wMDMuMDIzLjAxN3QuMDAyLjAzYy0uMTA1LjI0Ny0uMjc1LjQxMi0uNDkxLjQ4LS4yMjQuMDctLjQ4LjAyNC0uNzE4LS4xMjZsLS4wNjMtLjAzOHEtLjA1NS0uMDMzLS4xMDgtLjA2OWwtLjAwMi4wMjJjLS4wMzIuNDEtLjAyMy43NDYuMTI5IDEuMDU2bC4wNDkuMTAyYS4wMzUuMDM1IDAgMCAxLS4wMTMuMDQ1bC0uMDg4LjA1OGMtLjM5Mi4yNzYtLjk3NC40MDktMS4zODcuMDhhMS4xIDEuMSAwIDAgMS0uMjY5LS4zMDVsLS4wMDEuMDI3Yy0uMDE5LjM4MS0uMDI5LjU5My0uMjM0Ljg4OGwtLjAxMS4xNThjLS4xOTQgMi42MDUuMjkzIDQuMzU2IDEuNDUgNS4yMDcuNzQ2LjU4IDEuNy43MDQgMi41NTIuMzMyLjczNi0uMzIyIDEuMjMtLjk0OSAxLjM0MS0xLjY5NC0uNjg1LjkwNS0xLjUzIDEuMDUzLTEuOTgyIDEuMDU4aC0uMDI1Yy0uOTI4IDAtMS44NTQtLjUxNC0yLjIxLTEuMjMtLjU5My0xLjE5Mi0uMzg2LTIuNDAyLjU4My0zLjQwNy43Mi0uNzQ2IDEuOTUyLTEuMDU0IDMuMDY4LS43NjdxLjI1Ny4wNjUuNTA3LjE3NWMuMTYxLS40NjYuMzgzLTEuNjI5LjQwOS0xLjc2Ny0uNjI4LTEuMDA5LS43NS0yLjkzMy0uMjc4LTQuMzkyLjI2NS0uODE0LjY3NC0xLjM1MyAxLjE4NC0xLjU1N2EuMDMuMDMgMCAwIDEgLjAzNC4wMDVxLjAxNS4wMTIuMDE0LjAzMmMtLjE5OCAxLjM5LjE5NiAyLjYxNSAxLjA4IDMuMzYzLjk0Ljc5NiAyLjQwOC43OTggMy4zNzQuMzg5YS4wNC4wNCAwIDAgMSAuMDM1LjAwNXEuMDE1LjAxMy4wMTIuMDM0Yy0uMDA3LjAzLS42NjcgMy4wODItNC4wMjYgMy4zMDctLjI0Ni42NS0uNDAxIDEuNDcxLS40NDcgMS43MzEuMjQ3LjM1NS42NCAxLjE1NC44MDYgMS43MTEuNTk0IDIuMDAyLjIwNSAzLjUzNy0xLjM4NiA1LjQ3My0uODY4IDEuMDctMi42NCAyLjE5Ni01LjAyMiAyLjE5Nm0tMTEuMTItMTcuMjQ2cS4wMDggMCAuMDE4LjAwNmEuMDM0LjAzNCAwIDAgMSAuMDE1LjAzNnEtLjA5My40MDgtLjIzLjc0MWMtLjQ3NyAxLjE2NS0uMTcxIDEuNzQ2LS4wMTcgMS45NDFxLjAxMy4wMTcuMDA0LjAzNmExMCAxMCAwIDAgMS0uMjgxLjU4cS0uMDc0LjE0Ny0uMTAzLjIyM2MtLjI1Mi41ODgtLjExIDEuMjE3LjM2MiAxLjZhLjAzLjAzIDAgMCAxIC4wMTIuMDI4Yy0uMDExLjMwMy4wODUuNjE5LjI4LjkxcS4wMDQuMDA4LjAwNS4wMTdjLjA0NS40NS4yNTcuNzk3LjUyNy44NjNhLjA0LjA0IDAgMCAxIC4wMjYuMDI1Yy4xNTIuNjQyLjYxNCAyLjU5NiAyLjU3MSA1LjQ2NiAyLjg4NyAzLjgyMiA1LjgzIDQuNjY3IDcuNzkgNC43MDQgMi40MjguMDQ1IDQuMjM0LTEuMDkgNS4xMTMtMi4xNyAxLjU3NS0xLjkxNiAxLjk2LTMuNDMzIDEuMzczLTUuNDA5LS4xNjYtLjU1Ni0uNTYxLTEuMzU4LS44MDUtMS43MDJxLS4wMDgtLjAxMS0uMDA1LS4wMjVjLjA0My0uMjQ4LjIwMy0xLjEwNy40Ni0xLjc3OWEuMDQuMDQgMCAwIDEgLjAzMS0uMDIyYzMuMDUyLS4xOTMgMy44NTMtMi43NDYgMy45NjktMy4xODgtLjk4NS4zOTEtMi40NDMuMzctMy4zODMtLjQyNi0uODktLjc1Mi0xLjI5My0xLjk3Ny0xLjExMy0zLjM2NS0uNTg1LjI2Ny0uOTE0Ljk1NC0xLjA4OCAxLjQ5MS0uNDcgMS40NDYtLjM0NyAzLjM1NS4yNzcgNC4zNDRhLjA0LjA0IDAgMCAxIC4wMDUuMDI1Yy0uMDEuMDU1LS4yNTQgMS4zNTctLjQyNyAxLjgyN2EuMDM1LjAzNSAwIDAgMS0uMDQ3LjAxOSAzIDMgMCAwIDAtLjUzLS4xODdjLTEuMDkzLS4yOC0yLjI5OS4wMi0zLjAwMS43NDgtLjk0Ny45ODItMS4xNSAyLjE2NS0uNTcgMy4zMjkuMzQxLjY4OCAxLjI3NiAxLjIwMiAyLjE3MSAxLjE5LjQ1Ni0uMDA1IDEuMzI0LS4xNiAyLjAwNC0xLjEzNmEuMDM0LjAzNCAwIDAgMSAuMDQtLjAxM3EuMDI0LjAxLjAyMy4wMzZjLS4wNzMuODI4LS41OTYgMS41MzItMS4zOTggMS44ODJhMi41NSAyLjU1IDAgMCAxLTIuNjIxLS4zNGMtMS4xNzYtLjg2NS0xLjY3NC0yLjYzOC0xLjQ3Ny01LjI2OGwuMDExLS4xNjdxLjAwMS0uMDA5LjAwNy0uMDE4Yy4xOTgtLjI4Mi4yMDgtLjQ3NS4yMjctLjg2bC4wMDctLjE1NWMwLS4wMTUuMDEzLS4wMjkuMDI5LS4wMzJhLjAzNS4wMzUgMCAwIDEgLjAzOC4wMnEuMTEuMjQzLjMwOC4zOTRjLjM4Ni4zMDguOTMzLjE4IDEuMzA1LS4wODJsLjA2NC0uMDQyLS4wMzYtLjA3NWMtLjE3Ny0uMzYtLjE2Mi0uNzUyLS4xMzUtMS4wOTIuMDAxLS4wMi4wMDMtLjAzLjAwNS0uMDQxbC4wMDUtLjA0MnEuMDAyLS4wMi4wMjEtLjAzYS4wNC4wNCAwIDAgMSAuMDM2LjAwNmMuMDQ2LjA0LjA5NS4wNjguMTQ3LjFsLjA2NS4wMzhjLjIyMS4xNC40NTYuMTgyLjY2LjExOC4xODUtLjA1Ny4zMzMtLjE5NS40MzEtLjQwMS0uNTg3LS4xMzgtLjkxMi0uNTgyLS44OTItMS4yMjYuMDA0LS40MjYtLjEyMy0uODQtLjM1Mi0xLjEzNGEuMDM0LjAzNCAwIDAgMSAwLS4wNDEuMDQuMDQgMCAwIDEgLjAzOC0uMDE0YzEuMTUuMzc5IDEuMzA0Ljc4MyAxLjM4OCAxLjI3M2wuMDUuMjk0LjE0NC0uMjYyYy40MTQtLjc2LS4xNC0xLjQ5OS0uNDM4LTEuODk2LS4yNDQtLjMyNi0uNTEtLjc1LS41NzctMS42NzhhMi4zNSAyLjM1IDAgMCAwLS40NDItMS4yMzUuMDM0LjAzNCAwIDAgMSAwLS4wNDEuMDM0LjAzNCAwIDAgMSAuMDQtLjAxMiA0LjkgNC45IDAgMCAwIDEuNjUuMjc0Yy4yMSAwIC40MjktLjAxMi42NjctLjAzNGwuMDI2LS4wMDMuMDIxLS4wMTVjMS4yOTYtLjg2OS45OTYtNC41MDYuODc0LTUuNmEyNyAyNyAwIDAgMC0uMjg3LTEuNzZxLS4wMDMtLjAxNC4wMDYtLjAyN2MuMDktLjEyLjE1LS4yNjYuMTcxLS40MjIuMDMyLS4zOTUuMDc0LS44MDEuMTI4LTEuMjM4bC4wMDQtLjAzYy4wNDUtLjM0My4wOTUtLjczLS4wMDUtMS4wNzktLjA2LS4yMjUtLjIwNi0uNDEtLjMzNi0uNTcyLS4xODgtLjI3Ni0uMzkxLS45OS0uNDI2LTEuMTE2LS4xMDQtLjAzMi0uNjY1LS4xODUtMS4yNC4wMzNhLjAzNS4wMzUgMCAwIDEtLjA0NS0uMDE4LjAzNS4wMzUgMCAwIDEgLjAxNS0uMDQ1bC4zODctLjIyYy4wNS0uMDI4LjA3Mi0uMDg5LjA1MS0uMTM2YS4xLjEgMCAwIDAtLjA2Mi0uMDU4LjEuMSAwIDAgMC0uMDg0LjAwOGwtLjg0NS40ODFhLjAzLjAzIDAgMCAxLS4wMy4wMDIuMDQuMDQgMCAwIDEtLjAyLS4wMjMgMyAzIDAgMCAxLS4wNDYtLjIxMy4wNC4wNCAwIDAgMSAuMDE3LS4wMzZsLjgxNC0uNDYyYy4wNS0uMDI4LjA3Mi0uMDg5LjA1MS0uMTM3YS4xLjEgMCAwIDAtLjA2My0uMDU3LjEuMSAwIDAgMC0uMDgzLjAwOGwtLjcxNS40MDdhLjAzLjAzIDAgMCAxLS4wMzQgMCAuMDQuMDQgMCAwIDEtLjAxOC0uMDMgMyAzIDAgMCAxIC4wMDMtLjIzOXEwLS4wMTkuMDE3LS4wMjhsLjYzNC0uMzZjLjA1LS4wMjguMDcyLS4wODkuMDUyLS4xMzdhLjEwMy4xMDMgMCAwIDAtLjE0Ny0uMDVsLS40Ni4yNjNhLjAzLjAzIDAgMCAxLS4wMzctLjAwMi4wNC4wNCAwIDAgMS0uMDE0LS4wMzZsLjAyNy0uMTIzYS40LjQgMCAwIDEgLjE4OS0uMjQ4bC4xODQtLjEwNGMuMDQ5LS4wMjkuMDcyLS4wODkuMDUtLjEzN2EuMTAzLjEwMyAwIDAgMC0uMTQ2LS4wNWwtMi41OTMgMS40NzVhLjEuMSAwIDAgMC0uMDQ4LjA2My4xLjEgMCAwIDAgLjAxLjA3OWMuMDI2LjA0OS4wOTQuMDY3LjE0LjA0bC4zNC0uMTkzYS40LjQgMCAwIDEgLjM4MS0uMDA1bC4wMzIuMDE4cS4wMTguMDEuMDIuMDMyIDAgLjAyMS0uMDE1LjAzMmwtLjY0Ni4zNjdjLS4wNS4wMjktLjA3My4wOS0uMDUuMTM4YS4xMDMuMTAzIDAgMCAwIC4xNDYuMDQ3bC43NzItLjQzOGEuMDQuMDQgMCAwIDEgLjAzOS4wMDNxLjA3Ni4wNjQuMTYuMTQ4YS4wMzUuMDM1IDAgMCAxLS4wMDkuMDU0bC0uODUyLjQ4NWMtLjA1MS4wMjktLjA3My4wOS0uMDUuMTM5YS4xMDcuMTA3IDAgMCAwIC4xNDUuMDQ3bC45MDctLjUxNWEuMDM0LjAzNCAwIDAgMSAuMDQ1LjAxcS4wNTkuMDc5LjExNi4xN2EuMDQuMDQgMCAwIDEgLjAwNC4wMjguMDMuMDMgMCAwIDEtLjAxNy4wMjFsLS45NDMuNTM2Yy0uMDUuMDMtLjA3My4wOS0uMDUuMTRhLjEwNS4xMDUgMCAwIDAgLjE0Ni4wNDdsLjk0Ny0uNTM4YS4wMzUuMDM1IDAgMCAxIC4wNDguMDE1cS4wNDUuMDkzLjA4My4xOWEuMDM1LjAzNSAwIDAgMS0uMDE1LjA0M2wtLjk1MS41NGMtLjA1MS4wMy0uMDczLjA5Mi0uMDUxLjE0YS4xMDYuMTA2IDAgMCAwIC4xNDUuMDQ3bC45MTYtLjUyYS4wMy4wMyAwIDAgMSAuMDMtLjAwM3EuMDE1LjAwNy4wMi4wMjIuMDMuMDk5LjA1Ny4yMDVhLjAzNC4wMzQgMCAwIDEtLjAxNy4wMzhsLS44OTMuNTA5Yy0uMDUxLjAzLS4wNzMuMDktLjA1LjEzOWEuMTA3LjEwNyAwIDAgMCAuMTQ1LjA0N2wuODI1LS40N2EuMDM1LjAzNSAwIDAgMSAuMDUxLjAyNHEuMDIuMTA2LjAzMy4yMTdhLjAzNC4wMzQgMCAwIDEtLjAxNy4wMzVsLS43OC40NDRjLS4wNTIuMDI5LS4wNzQuMDktLjA1MS4xMzlhLjEwNy4xMDcgMCAwIDAgLjE0NS4wNDdsLjY4NS0uMzlhLjA0LjA0IDAgMCAxIC4wMzMgMHEuMDE2LjAwOS4wMTkuMDI3LjAwOC4xMTIuMDE0LjIyOGEuMDQuMDQgMCAwIDEtLjAxNy4wMzJsLS42Mi4zNTNjLS4wNTIuMDMtLjA3NC4wOS0uMDUxLjE0YS4xMDcuMTA3IDAgMCAwIC4xNDUuMDQ2bC41LS4yODNhLjAzLjAzIDAgMCAxIC4wMzUgMHEuMDE2LjAxLjAxNy4wMy4wMDEuMTE0LS4wMDIuMjM2YS4wMy4wMyAwIDAgMS0uMDE3LjAzbC0uNDIuMjM4Yy0uMDUuMDMtLjA3NC4wOS0uMDUuMTM5YS4xMDcuMTA3IDAgMCAwIC4xNDUuMDQ4bC4yNzYtLjE1OGEuMDMuMDMgMCAwIDEgLjAzNiAwIC4wMy4wMyAwIDAgMSAuMDE2LjAzMmwtLjAwMi4wNWEuNC40IDAgMCAxLS4yLjMxOWwtLjAxMy4wMDdjLS4wNTIuMDMtLjA3NC4wOS0uMDUxLjE0YS4xMDcuMTA3IDAgMCAwIC4xNDUuMDQ3bC40OTMtLjI4YS4wMy4wMyAwIDAgMSAuMDMyIDBxLjAxNi4wMDguMDIuMDI2bC4wMDkuMDY2Yy4wNTcuMzI4LjIxNi42My40NDkuODUycS4wMDcuMDA3LjAxLjAxNWMuMDM4LjE0NS4wNy4zMi4wOS41MDdhNi4yIDYuMiAwIDAgMS0uMDUgMS43MTQgNiA2IDAgMCAxLS4xODMuNzkzYy0uMDkuMzI1LS4xODQuNjYxLS4yMDIuOTk2YS4wMzQuMDM0IDAgMCAxLS4wMjYuMDMuMDQuMDQgMCAwIDEtLjAzOC0uMDEzbC0uMDEyLS4wMTgtLjA1Mi0uMDc3YTMuNyAzLjcgMCAwIDAtMS41NDMtMS4zMTMuMDMuMDMgMCAwIDEtLjAxNi0uMDE1Yy0uMTk4LS4zNDMtLjMtLjY4NS0uMjktLjk4OGwuMDAzLS4wNTZjLjAzMi0uNDM0LjA2NS0uODgzLS4wMzktMS4zMDFsLS4wMjItLjA2OWMtLjAxNC0uMDQ0LS4wMjctLjA5LS4wNDUtLjEzbC0uMDYxLS4xM2MtLjAzNy0uMDY4LS4wODMtLjEzOC0uMTI4LS4yMDZhMS43IDEuNyAwIDAgMS0uMTgtLjMxNyAyIDIgMCAwIDEtLjExNS0uNjc4IDcgNyAwIDAgMSAuMDQzLS44OTVsLjAwOS0uMDljLjA0LTEuMDM4LS42NTEtMS44MzgtMS4zMzItMi40ODQtLjE5MS0uMjI2LS4zNi0uNTA2LS41MzktLjgwMS0uNTM1LS44ODUtMS4wODgtMS44LTIuMjUtMS4zODVhLjAzNS4wMzUgMCAwIDEtLjA0NC0uMDE3Ljc5Ljc5IDAgMCAwLS44NzUtLjQwNGMtLjQwMi4wNzMtLjc1NS4yNzUtMS4xNDUuNjUzcS0uMTE1LjA5LS4yMzkuMTdjLS4wOTcuMDY0LS4yMDguMTEtLjMxNi4xNTUtLjE2Mi4wNjYtLjMzLjEzNi0uNDU5LjI3Mi0uMjkuMzA0LS4zOTUuNzg3LS4yNjMgMS4yMDFxLjAwNy4wMjQtLjAxMy4wNC0uMDc1LjA1My0uMTQ1LjEyOGMtLjQxNC40NzUtLjQzMyAxLjE2NC0uNDEyIDEuNjQuMDE4LjI3LjA4Ni41NDUuMTUuODExLjA0Ny4xOTIuMDkyLjM3My4xMTkuNTUuMDcyLjM3OS0uMDcuNTktLjM1OC44NDdhMy45IDMuOSAwIDAgMS0xLjAyLjYxIDEuNzQgMS43NCAwIDAgMC0xLjA4NiAxLjE5Yy0uMTQzLjUzMy4wMjkgMS4xNzIuNDYgMS43MS4wMS4wMS4wMS4wMjUuMDA0LjAzNy0uMTA5LjItLjIyMS40MTctLjMyNy42MjMtLjEuMTkyLS4yMTYuNDE3LS4zNC42NDktLjE4Mi4zNC0xLjE1OCAxLjMzNi0xLjQ1MyAxLjYzNGEuMDM1LjAzNSAwIDAgMS0uMDYtLjAyNHYtMi4zNjNxLjAwMS0uMDIxLjAyLS4wMzJjLjIyNC0uMTA4LjMyMi0uMTkxLjM3Ny0uMzE3YS40OC40OCAwIDAgMCAuMDItLjI4NC4wMzUuMDM1IDAgMCAxIC4wMTctLjAzOGMuMTgtLjEwMS4zMi0uMzE0LjI0My0uNTI3YS4wMzUuMDM1IDAgMCAxIC4wMTgtLjA0M2MuMDkxLS4wNDYuMTYyLS4xNTcuMTgtLjI4MS4wMTYtLjExNS0uMDE0LS4yMTctLjA4NC0uMjhhLjA0LjA0IDAgMCAxLS4wMS0uMDNxMC0uMDE2LjAxNS0uMDI2YS4zOC4zOCAwIDAgMCAuMTc4LS4yNTYuNTQuNTQgMCAwIDAtLjExMS0uNDAyYy0uMjUyLS4xNDYtLjUyMi0uMjk0LS44MDctLjM2YS4wMzQuMDM0IDAgMCAxLS4wMjYtLjAzN2MuMDYxLS40ODQuMjItLjk1OC40Ny0xLjQwOS4yNy0uNDgyLjQ0OC0xLjE3Mi41LTEuOTQyYS4wMzUuMDM1IDAgMCAxIC4wMzYtLjAzM2guMThhLjMxMy4zMTMgMCAwIDAgMC0uNjI3aC0uMTY3YS4wMzUuMDM1IDAgMCAxLS4wMzUtLjAzNGMtLjAzNy0xLjMyNy0uNDM4LTIuNDQzLS45OTgtMi43NzdhLjAzLjAzIDAgMCAxLS4wMTctLjAzdi0uNDlhLjMxNS4zMTUgMCAwIDAtLjMxMS0uMzE0LjMxMy4zMTMgMCAwIDAtLjMxMi4zMTN2LjQ5YS4wMy4wMyAwIDAgMS0uMDE3LjAzYy0uNTYuMzM0LS45NiAxLjQ1LS45OTggMi43NzdhLjAzNS4wMzUgMCAwIDEtLjAzNC4wMzRoLS4xNjZhLjMxLjMxIDAgMCAwLS4zMTIuMzE1YzAgLjE3My4xNC4zMTMuMzEyLjMxM2guMThjLjAxNyAwIC4wMzMuMDE0LjAzNC4wMzMuMDU0Ljc3LjIzMSAxLjQ2LjUwMSAxLjk0Mi4yNjMuNDcuNDI0Ljk2Ny40NzggMS40NzZhLjA0LjA0IDAgMCAxLS4wMi4wMzVjLS40MDcuMTgxLS43MjQuNTg0LTEuMDA2Ljk5My0uOTEzIDEuNDc0LTEuMjUgMy42OTQtLjg1OSA1LjY1My4yMzYgMS4xNjUuNzAxIDIuMDIgMS4zODMgMi41MzhsLjAzNS4wMjYuMDQxLS4wMDdjLjg0NS0uMTc3IDEuNjg4LS41ODMgMi40MzYtMS4xNzVhLjA0LjA0IDAgMCAxIC4wMi0uMDA2Ii8+PHBhdGggZmlsbD0iIzc0NDkwYyIgZD0iTTMzLjM5OCAzMS42Yy4yMjguMTkyLjUwMi4wNi42MjctLjE2OS4xNzYtLjMwOC4yMjMtLjY3LjI0OS0xLjAwNy4wMTQtLjI2OS4wMDctLjUzNy0uMDMtLjgtLjA3My40NjUtLjIgMS40NDgtLjU1NiAxLjc0Ny0uMDM4LjAyMi0uMDU0LjAwOC0uMDg3LS4wMTctLjE2Ni0uMTgzLS4yMjctLjQ3LS4yODItLjcxNmE2LjUgNi41IDAgMCAxLS4wMjUtMi4yOTdjLjA1LS4yMDkuMTE2LS41NzYuMzU0LS42MzMtLjI3My0uMDA5LS40MjYuMzcyLS41MTUuNTg2LS4yNy43NzEtLjI5OCAxLjYxMi0uMTUgMi40MTMuMDc2LjMxOC4xNTUuNjYuNDE1Ljg5NE00NC41NzggNTQuOTk4Yy4xNTgtLjA4My4xNjUtLjMwNy4wNy0uNDM4LS4wMjcuMDcyLS4wNC4xMzctLjA2NS4xODgtLjA3My4xNzgtLjI2LjEzLS40MjMuMTEzYS4zMi4zMiAwIDAgMCAuNDE4LjEzN000NS4yNzQgNTUuODA0Yy0uMDA4LjA3Ni0uMDA4LjEzNy0uMDIzLjE4NC0uMDYuMTUxLS4yMzMuMTgtLjM3OS4yNC4yOTcuMjQzLjc1LS4xNS40MDItLjQyNE00Ni40MTYgNDUuNjQ0Yy0uMDQ2LjMxLS4xNTUuNjE4LS4xMzUuOTQuMDEyLjMyLjExNi42OTYuNC44NzEtLjI2Mi0uMzg3LS4xOTMtLjg3Ni0uMDkzLTEuMzA1LjE0NS0uNDU4LjE4My0xLjAyNS0uMDk4LTEuNDUzLS4xNzgtLjI3NC0uNDYtLjUwOC0uNzg3LS41NDUuNTM4LjI3NC44MDcuOTA1LjcxMyAxLjQ5Mk0zOC40NSAzOS4xNTFjLS4xMTItLjAwMi0uMTk1LS4wNzQtLjI4NC0uMTYzLS4wNS4xNzEuMDk3LjM2Mi4yODQuMzYuMTg2LjAwMi4zMzMtLjE4OS4yODMtLjM2LS4wOS4wOS0uMTcxLjE2LS4yODMuMTYzTTM4LjczNSAzNC41OWMuNjk0LjE5IDEuNjY1LS4yNDMgMS42MDItMS4wNjQtLjI2MS43MTQtLjkyMy45MTktMS42MDIgMS4wNjQiLz48cGF0aCBmaWxsPSIjNzQ0OTBjIiBkPSJNNDUuODUyIDQ1LjUzOWMtLjEyMy40MzMtLjE0NS45LS4wMiAxLjMzNi4wODYuMjc2LjIzOC41OTkuNTI4LjY5OGEuOC44IDAgMCAxLS4yMjEtLjM0OGMtLjEzNy0uMzg4LS4xNDItLjgxLS4xLTEuMjE1LjAyMi0uMy4xNTUtLjU4NC4wNjUtLjg5LS4wOC0uMzEtLjQwMi0uNTItLjcwOC0uNTIzLjQxOC4xOS41OTMuNTMxLjQ1Ni45NDJNMzQuNTkgNDEuMjVjMS4xNTQtLjUwMSAyLjA4LTEuNzg1IDIuMTU4LTMuMDUxYTEzIDEzIDAgMCAxLS45NjEgMS42MWMtLjM2LjUxOC0uNzcxLjk2Ny0xLjE5NyAxLjQ0TTQ1Ljg5NSA1Ni4wNzdjLjAwOC4wNzUuMDI2LjEzNi4wMjMuMTg5LS4wMDUuMTctLjE4NC4yMi0uMzIuMjk0YS4zMy4zMyAwIDAgMCAuNDItLjA3MmMuMTE0LS4xNC4wMy0uMzUtLjEyMy0uNDFNNDYuMDI3IDM5Ljg3MWMuMDU4LjMzMy4zMjIuNjEuNTc2Ljg0LjI0LjIxMi4zODIuNTE0LjQ4OC44MzMuMTcuNDc5LjE5MyAxLjAyNC40NTggMS40NjcuMDg5LjE1LjE5Ny4yOTUuMzM4LjM5NWExLjYgMS42IDAgMCAxLS4yMzktLjQ0M2MtLjEyLS4zMTctLjE0OC0uNjUzLS4xODQtLjk4N2EzLjQgMy40IDAgMCAwLS4zMy0xLjAxYy0uMjY4LS40NzUtLjc5NC0uNzEyLTEuMTA3LTEuMDk1TTQ5LjgwMyAzMS45MzZjLS40MjUtLjEwNi0uODIzLjM0Mi0uODE0Ljc1Mi4yNjgtLjI3OC40NzQtLjU2LjgxNC0uNzUyTTQ4Ljk4NiAzOS45ODRjLjQ2MS0uMDc4LjQ1Ni0uMDcuMDAyLS4xMzctLjgyOC0uMTM5LTEuNy0uMjkyLTIuMzU5LS44NTYuMzkzLjgzIDEuNTIgMS4wODcgMi4zNTcuOTkzTTQ3LjM0NyA0My4zNDRjLS42NTMtLjM5NS0xLjE4My0uODg3LTEuNzUxLTEuMzkzLjIzNy43MjYuOTcyIDEuMzgyIDEuNzUxIDEuMzkzTTQ0LjUxNCAzMC41NzVjLjI0Mi4yMDEuNTY0LjM2NS43NDYuNjI5YS42NC42NCAwIDAgMC0uMDcxLS4zMDJjLS4xMjItLjIzLS4zMDEtLjM2NC0uNDkyLS41MzItLjMxLS4zLS40OTctLjY4My0uNjYxLTEuMDktLjA3Ni40NzMuMTIuOTc2LjQ3OCAxLjI5NSIvPjxwYXRoIGZpbGw9IiM3NDQ5MGMiIGQ9Ik00Ny4xMTMgNDIuMjlhOCA4IDAgMCAxLS4xNzctLjYyOWMtLjEzNi0uNDQ5LS40NzQtLjgyNi0uODc1LTEuMDU2LjI0NC4zOTMuNTE1Ljc2LjYzIDEuMjA2LjEwNy40MTkuMzIyLjgxMy42MzIgMS4xMTR6TTQ2LjgxIDQyLjcwNGMtLjMwNy0uNTM0LS41NzUtMS4xNTUtLjkxLTEuNjY2LS4wMy42MjkuMzIgMS40LjkxIDEuNjY2TTQ0LjU5NiA1NS41N2MtLjEwNC4xMzQtLjI3Mi4xNDUtLjQzNi4xOS4yNTUuMjguNzg3LS4wMjguNTA1LS4zNjYtLjAyNC4wNzQtLjA0Mi4xMzUtLjA2OS4xNzVNNDAuMDU1IDUzLjMzN2MtLjE2NC4yOS0uNDM0LjM2My0uNzQ3LjM4Mi4yNjkuMzQuOTE2LjA2Mi43NDYtLjM4Mk0zOS4xOTkgNTEuNDNjLS4yNTMuMzAxLS41OC40MDctLjk2NS4zNTMuMjguNDI4IDEuMDM3LjE3My45NjUtLjM1NE0zOC40MiA1MS4wODJhLjU3NC41NzQgMCAwIDAgLjQ5LS41MDJjLS4xMDIuMDY4LS4xODUuMTMtLjI3LjE3My0uMjcxLjEzLS41NTcuMTIxLS44NDMuMDE4LjA5LjI0Mi4zOC4zNDcuNjIzLjMxTTM5LjU2IDUyLjM4Yy0uMjEuMjk4LS41MDIuMzg2LS44NTMuMzc0LjI3Ni4zOC45NzYuMTEyLjg1Mi0uMzc0TTM4LjQxNiA0NS40ODFjLjMyNi4yNjQuNjkzLjQ4MiAxLjA4Ny42NTggMS43ODMuODU4IDMuNDA1LS4yMDggMy40MDMtLjQtMS4wOTEuNjA2LTIuMDguNTItMi4zNDMuNDM4LjIwNC4wMjUgMS4xMjgtLjA0NSAxLjYxOS0uMjc2cS4zMy0uMTUxLjYwOC0uMzY2Yy4xNTctLjEzLjMyNy0uMzE3LjQxOC0uNTAzLS4wMDMuMjktLjEyOC43NDMtLjQwOCAxLjExMS4xOTItLjAzMi41MjktLjQ3Ni41OS0uNjMzYTIuNiAyLjYgMCAwIDAgLjA0LTEuNzUzYy0uMTQ4LS40MjMtLjA3NS0uODUyLjE0Ni0xLjI1NmwuMDAzLjAxNGMuMDUuMzI2LjE3NS42MzUuMTYzLjk3Mi4wMDQuMzM0LS4wNy42NzgtLjE3NiAxLjAxOC4zOTQtLjU1Ni42MjMtMS4yOTEuNDQzLTEuOTdhOCA4IDAgMCAxLS4yOTUtMS4xMzVjLS4wMjktLjIxLS4wODQtLjQ0Mi0uMDctLjY1NS4wNTYuMTE4LjEzLjIyNy4yMjYuMzE4cS4wMS4xMDcuMDI4LjIxM2MuMDQ2LjI1NC4xMzkuNS4yNzcuNzExLS4yMDgtLjcyOS0uMDgyLTEuNDUuMjEtMi4xMi4wOTQtLjIyNS4yMDItLjQ1NC4yNzktLjcxLjEzLS4zNzguMS0uODYyLS4xNC0xLjIwNS0uMzQxLS40ODYtLjUzNi0xLjEyMS0uMjk1LTEuNjk5LS4zOTUuNTIyLS4yODIgMS4yNjcuMDI3IDEuODA2LjE3OC4zMTIuMTkzLjY1LjA3Ny45OTgtLjEwNi4zMzgtLjI4NC42OTYtLjM3NyAxLjA1NS0uMDcuMjY5LS4xMDQuNTQ4LS4wOTQuODI2LS4xNy0uNDczLS4wODQtLjk3My4wOTItMS40MzIuMDM3LS4xMDkuMDk3LS4yNTQuMTIyLS4zNzcuMTY0LS42NC0uMDMyLTEuMzk4LS41MjYtMS44MzguMjY5LjU5OC4zNiAxLjI0OS4xNiAxLjg2NmwtLjA3Ny4yMzJhMiAyIDAgMCAwLS4wNzMuMjU4Yy0uMDQyLjE3OS0uMDYuMzc0LS4wNDcuNTY3LS44ODIuMTIzLTEuNzk2LS4zMzYtMS45MTMtMS4yOS0uMDQ1LS4zLS4wMTctLjYyMi4wMzgtLjk1cS0uMS4yMjUtLjE2NC40NjRjLS4zNDcgMS4zMy43MjYgMi4yOSAxLjk4OCAyLjE5OC0uMTY1LjQ5LjAzMSAxLjQwNC4xMSAxLjgzOC0uMzgxLjI2MS0uNjAzLjc4NS0uNTI2IDEuMjU3LjA3NC40MTcuMTU1Ljg0NC4xNjIgMS4yNjMtLjI5NS4zMDQtLjczLjUzNi0xLjEzNi42ODZhNC4yIDQuMiAwIDAgMS0xLjk5OC4xODJjLTEuMjM5LS4yMTItMS45MzItLjY3Ny0xLjkzMi0uNjc3cy4xNzYuMjEzLjI3NC4yOTZNNDAuMDY1IDU0LjY2Yy4yNjIuMzA3Ljg2Ni4wMTYuNjUtLjM4Ni0uMTIuMjg1LS4zNy4zNDMtLjY1LjM4NiIvPjxwYXRoIGZpbGw9IiM3NDQ5MGMiIGQ9Ik00MC44MzEgNDMuODczYy4xNDguMTczLjM4OS4xLjQ1MS0uMDg4YTEgMSAwIDAgMSAuMTczLjA3NGMtLjAzNy0uMTgyLS4yMzItLjI5LS40MS0uMjkyYS40MS40MSAwIDAgMC0uNDA0LjMwMmwuMTQzLS4wNjZxLjAyLjAzOC4wNDcuMDdtLjM3LS4xMXEtLjAyMy4wMTctLjA0Ny4wM2MtLjEuMDU3LS4xOTEuMDMtLjI3OC0uMDIyYS43LjcgMCAwIDEgLjMyNS0uMDA3TTQxLjc2MyAzNC41NzFjLS4zMTcuMTYzLS42NDQuMTYtLjk0Ni0uMDM2LjA5NC40Ni44MS40OS45NDYuMDM2TTQxLjM2NCA1NS4yNzFjLS4xMjkuMTMtLjMwNC4xNDEtLjQ4NS4xNzguMjQyLjMuODIuMDI2LjU4NS0uMzUtLjAzNi4wNzQtLjA2NC4xMzMtLjEuMTcyTTQ0LjE0NCA1Ni45NjVjLjAyMy4wNzMuMDU1LjEzLjA2Ny4xODcuMDUzLjE4NS0uMTIzLjI2Ni0uMjYuMzU1YS4zMi4zMiAwIDAgMCAuNDEtLjE1N2MuMDczLS4xNjUtLjA2LS4zNDQtLjIxNy0uMzg1TTUyLjQyIDQ2Ljk1OGMuOTg0LS4wNjQgMS45NjItLjU3MyAyLjQ4OC0xLjM4NC0uNDE2LjM4MS0uOTIuNjgxLTEuNDY0Ljg2Ni4zMDQtLjI0NC41NDQtLjU3NC43LS45MTYtLjM0OC4zNDYtLjc0LjcxNy0xLjIxLjg5Mi4yNTUtLjI5NC4zOTktLjc2MS40NTgtMS4wNjctLjE4Ni4zMS0uMzguNjgtLjYzNy45MzdhLjcuNyAwIDAgMS0uMTg2LjEzNmMtLjI0MS0uNDU4LjAxMy0uOTk4LjExLTEuNDczLS4yLjI4Mi0uMzg5LjYzOC0uNDMuOTktLjE3Mi0uNTI2LS4xOTMtMS4wOTktLjE5Mi0xLjY1MS0uMTU0LjQxLS4yMzkuOTY3LS4xNjUgMS40NzdhNiA2IDAgMCAxLS4yODYtLjk1NmMtLjA4Ni0uNDMzLS4xODEtLjg3OC0uMTQ1LTEuMzIxLS4xNTEuNDMzLS4xMTkuOTA2LS4wODMgMS4zNTYuMDkxLjczNC4zMSAxLjcyNiAxLjA0MiAyLjExNE00Mi4xMTcgNTUuOTAyYy0uMDkxLjE0NC0uMjU4LjE2OS0uNDE3LjIyOC4yNzguMjU3Ljc4MS0uMDk3LjQ3LS40MS0uMDE3LjA3Ny0uMDMuMTM4LS4wNTMuMTgyTTQzLjQwMiA1Ni42MmMuMDA3LjA3NC4wMjUuMTM1LjAyMS4xODctLjAwNy4xNy0uMTg1LjIyLS4zMjIuMjkzYS4zMy4zMyAwIDAgMCAuNDIyLS4wN2MuMTE1LS4xMzcuMDMtLjM1LS4xMjEtLjQxTTQyLjg0IDU2LjIzMmMtLjAwOC4wNzYtLjAwOC4xMzgtLjAyNC4xODQtLjA1OS4xNTItLjIzMi4xOC0uMzc4LjI0LjI5Ny4yNDQuNzUtLjE1LjQwMS0uNDI0TTQ0LjY4IDQ2Ljk2NWMtLjAxMy4xMDYtLjAzOS4yMTUtLjA2NS4zMTgtLjA1Ni4yMzctLjA1Ny40ODguMDA4LjcyMi4wMzMuMTE1LjA4LjIyOC4xNTYuMzJhMS45IDEuOSAwIDAgMSAuMDgyLS45NzFjLjAzOC0uMTAzLjA3Ny0uMjMzLjA5My0uMzQ3LjA3Mi0uNDc1LS4wNTUtLjk5LS4zNzktMS4zNDUuMTA2LjQzNy4xNjYuODY2LjEwNiAxLjMwM000Mi43OCA1My43NTNjLS4yMy4yNDItLjUwOC4yNDgtLjgxOC4xOS4xOC4zOTUuODc2LjI4Mi44MTctLjE5TTQxLjkwMyA1Mi4yNWMtLjMyNi4yMi0uNjcuMjMxLTEuMDI0LjA3Mi4xNTIuNDkuOTQ4LjQ1NCAxLjAyNC0uMDczTTQ0Ljc4MyAzNi4yOTRjLjEyNi0uMjY3LjMyLS40MDkuNDgyLS42NzcuMTc1LS4yOS4xNTItLjY5OS0uMDA4LS45ODctLjA4Ny0uMTU5LS4xOTItLjMtLjI3NS0uNDU3LjIyMS4wOTkuNDc3LjEwOC42OTItLjAyNS0uMjUzLS4wNy0uNDY3LS4xNC0uNjc1LS4yNzgtLjIwOS0uMTM2LS4zNTgtLjMwNy0uNTItLjUxMy0uMDQzLjI5My4xMTUuNTYzLjM0OC43MjctLjAxMy4xOTQuMDUuMzk2LjEwOC41NzcuMDYxLjE1NS4wODYuMjk2LjA3OC40NTcgMCAuMjYzLS4xNjUuNDE1LS4zMTIuNjQxLS4yNTMuMzczLS4zNTIuOTEzLS4xNCAxLjMyNC4wMTItLjI3Ny4xLS41NDUuMjIxLS43ODlNNDEuNzEzIDUxLjQwNWMtLjExMS4wNTEtLjIwMi4wOTgtLjI5NC4xMjgtLjI4Ny4wODUtLjU2OS4wMzItLjgzNS0uMTE0LjA1LjI1Mi4zMjIuNDAyLjU2Ny40MDRhLjU3NC41NzQgMCAwIDAgLjU2Mi0uNDE4TTQxLjM4OCA1MC40NzdjLS4xMTEuMDUyLS4yMDIuMDk5LS4yOTQuMTI5LS4yODcuMDg1LS41NjguMDMyLS44MzUtLjExNS4wNS4yNTMuMzIyLjQwMy41NjcuNDA1YS41NzQuNTc0IDAgMCAwIC41NjItLjQxOU00My44MjYgNTUuMTNjLS4xMzguMTItLjMxNC4xMTgtLjQ5Ny4xNDEuMjIuMzE2LjgxOC4wODYuNjA5LS4zMDctLjA0MS4wNzItLjA3My4xMjgtLjExMi4xNjZNNDMuMDc5IDUzLjYzMmMuMjMxLjQwNC44NzUuMTc1LjcyOC0uMy0uMDU0LjA3NS0uMDkzLjE0NC0uMTQxLjE5NS0uMTU3LjE2NS0uMzczLjE0NC0uNTg3LjEwNU00Mi4yNjggNTMuMDMzYy0uMjc4LjIzLS41ODguMjM3LS45Mi4xMzEuMTY1LjQ0LjkxLjM3LjkyLS4xMzFNNDIuMDMxIDUxLjMyYy4xMTIuMjMyLjQxMy4zMDguNjUuMjQ3YS41NzYuNTc2IDAgMCAwIC40MzktLjU0OGMtLjE2Ni4xNDItLjMuMjU4LS41LjMwN2ExLjE2IDEuMTYgMCAwIDEtLjU4OS0uMDA2TTQyLjUgNTAuNzA0YS41NzUuNTc1IDAgMCAwIC40NTQtLjUzNGMtLjE3LjEzNy0uMzA4LjI0OS0uNTA4LjI5Mi0uMTk0LjA0LS4zODQuMDM3LS41ODgtLjAyNC4xMDQuMjM1LjQwMy4zMi42NDIuMjY2TTQyLjU0MiA1NC42NWMuMTk2LjM1NC44NDUuMTg5LjcxMi0uMjQ4LS4xNzQuMjU1LS40MjguMjYyLS43MTIuMjQ5TTQ0LjIwMSA0MS41Yy4wNi41ODYuMjc0IDEuMTEyLjM4NCAxLjY3M2EzLjMgMy4zIDAgMCAwLS40OTktLjgyOGMuMzcyLjg2Ny42ODcgMi4wMi0uMDQ4IDIuNzYtLjI4NS4zMTQtLjYxNy41OTktLjgwMy45OS0uMDgzLjIxMi0uMDg1LjQyNC0uMDg5LjY0NC4wOTMtLjE5LjE1OC0uMzk4LjI2Ny0uNTQ3LjEwNy0uMTQ3LjI2Ny0uMjc0LjQxOC0uNDE0LjMxNS0uMjk1LjY3LS41NzkuODMtLjk5OHMuMTUtLjg2Ni4wMzMtMS4yODljLjA3NC0uMjkxLjA2NS0uNjA1LjAyOC0uODk4LS4wNTYtLjQ3NC0uMTcyLS45MS0uMjAzLTEuMzczLS4wMTItLjU0Ni4xMzYtMS4wNi4zMDQtMS41ODktLjQzNC41MDUtLjcwNCAxLjE5Ni0uNjIyIDEuODdNNDMuNjEzIDU0LjI4Yy4yMjguMzgxLjgwNC4xMzYuNjA4LS4zMDEtLjA0MS4wNzQtLjA2NS4xNDItLjEwMy4xOTMtLjExNy4xNy0uMzE3LjEzNS0uNTA1LjEwOE00Mi42MTIgNTIuODljLjI0Mi40MzEuOTQ3LjIxLjg0OC0uMy0uMDY3LjA3OC0uMTIuMTQ3LS4xNzguMTk3LS4xOTIuMTYyLS40My4xNTUtLjY3LjEwNE00Mi4yOCA1Mi4xMDljLjI1NS40NTcgMS4wMTkuMjM4Ljk2OC0uMy0uMTQuMTQtLjI1My4yNTUtLjQzMy4zMDNhMS4wNiAxLjA2IDAgMCAxLS41MzYtLjAwM000Ny42NDcgNTAuNTg3Yy4wMy4wMTYuMDYuMDM0LjEuMDQ4YS40LjQgMCAwIDAtLjA3OS0uMjE2LjMzLjMzIDAgMCAwLS4yMjUtLjEyNC4zMTcuMzE3IDAgMCAwLS4zMzIuMzExYy4yMjUtLjExLjMxNC0uMTUuNTM2LS4wMk00Ny42MDggNTEuMzM0Yy4wMzQuMDAxLjA2OS4wMDQuMTEtLjAwMWEuNC40IDAgMCAwLS4xNjMtLjE2LjMzLjMzIDAgMCAwLS4yNTYtLjAxNC4zMi4zMiAwIDAgMC0uMTY0LjQyNmMuMTUzLS4xOTguMjE3LS4yNzIuNDczLS4yNTFNNDcuNTM0IDUxLjkwNGEuMzIuMzIgMCAwIDAgLjAwNi40NTZjLjA3LS4yNDIuMTAyLS4zMzQuMzQ2LS40MTEuMDMyLS4wMTIuMDY1LS4wMjMuMTAyLS4wNDNhLjQuNCAwIDAgMC0uMjExLS4wODcuMzQuMzQgMCAwIDAtLjI0My4wODVNNDguNTQyIDUyLjgxMWMtLjA4Mi0uMjM3LS4xMDktLjMzLjA0Ni0uNTM2cS4wMy0uMDQuMDYtLjA5NGEuNC40IDAgMCAwLS4yMjMuMDUyLjMzLjMzIDAgMCAwLS4xNS4yMS4zMTcuMzE3IDAgMCAwIC4yNjcuMzY4TTQ5LjUyOCA1Mi42NDJjLS4xOC0uMTc1LS4yNDUtLjI0Ni0uMi0uNXEuMDEtLjA1LjAxMS0uMTFhLjQuNCAwIDAgMC0uMTc0LjE0Ny4zMy4zMyAwIDAgMC0uMDQuMjU1Yy4wNS4xNzcuMjQyLjI2Mi40MDMuMjA4TTUwLjM3MiA1Mi4wOGMtLjIzNS0uMDg0LS4zMjUtLjEyMS0uMzg3LS4zNzEtLjAxLS4wMzMtLjAxOC0uMDY3LS4wMzYtLjEwNWEuNC40IDAgMCAwLS4wOTguMjA3LjMzLjMzIDAgMCAwIC4wNjguMjQ4Yy4xMTkuMTQxLjMyOC4xMzguNDUzLjAyMiIvPjxwYXRoIGZpbGw9IiM3NDQ5MGMiIGQ9Ik01Ni41MDIgNDQuNDk2Yy0uOTA2LjM4NS0yLjQyLjQ0NS0zLjQxLS4zOTQtLjc5LS42NjgtMS4zMTMtMS44NDYtMS4wOTMtMy4zOTUtMS41NS42Mi0xLjg3NSA0LjMzOC0uODgzIDUuOTEgMCAwLS4yNTEgMS4zNDgtLjQyNSAxLjgyYTMgMyAwIDAgMC0uNTM1LS4xODhjLTEuMTA1LS4yODQtMi4zMjUuMDItMy4wMzYuNzU3LS45NDMuOTc4LTEuMTcgMi4xNzQtLjU3NiAzLjM2OC4zNTQuNzEzIDEuMjk5IDEuMjIgMi4yMDMgMS4yMS40OTYtLjAwNSAxLjM1My0uMTc4IDIuMDMyLTEuMTUxLS4xNTYgMS43ODMtMi4zOTYgMi43MzYtMy45NjQgMS41MTgtMS44OTUtMS4zOTYtMS40ODMtNC44MzYtMS40NTItNS40MDYuMjMtLjMyOC4yMTQtLjU0Ni4yNC0xLjAzMi4wNzMuMTU3LjE3OC4yOTguMzIuNDA3LjM5Ni4zMTYuOTYxLjE5IDEuMzQ2LS4wODJsLjA4OS0uMDU3LS4wNS0uMTAyYy0uMTY0LS4zMzYtLjE2LS43MDMtLjEzLTEuMDc0LjAwMy0uMDM5LjAwNi0uMDQ0LjAwOS0uMDgzLjA2Ny4wNTcuMTQuMDkzLjIxNi4xNDIuNDQ1LjI4MS45MzkuMTc2IDEuMTU4LS4zMzctLjYxMi0uMTI2LS45MjYtLjU2OS0uOTA3LTEuMi4wMDUtLjQwMS0uMTEtLjgzNi0uMzU5LTEuMTU2IDEuMTI4LjM3MiAxLjI4My43NjggMS4zNjQgMS4yNDVsLjA2OC4zOTMuMTktLjM0OWMuNDI1LS43NzktLjEzOC0xLjUzLS40NC0xLjkzMy0uMjQxLS4zMjItLjUwNC0uNzQtLjU3LTEuNjZhMi40IDIuNCAwIDAgMC0uNDQ5LTEuMjUzYy41OTcuMjEgMS4xNTUuMjc1IDEuNjYxLjI3NS4yMzYgMCAuNDYtLjAxNC42NzItLjAzNGwuMDM0LS4wMDMuMDMtLjAyYzEuMzEzLS44ODEgMS4wMTEtNC41MzQuODg4LTUuNjMyLS4wNy0uNjItLjI0LTEuNTE2LS4yODgtMS43NjNhLjk0Ljk0IDAgMCAwIC4xNzgtLjQzOHEuMDUtLjYyLjEyNy0xLjIzOGMuMDQ2LS4zNTQuMTAzLS43NTctLjAwMi0xLjEyNC0uMDYtLjIyNi0uMjAzLS40MDktLjM0Mi0uNTgzLS4yLS4yOTQtLjQyNS0xLjEyMy0uNDI1LTEuMTIzcy0uNjI2LS4yMi0xLjI4Mi4wMjdsLjM4Ny0uMjJhLjE0NC4xNDQgMCAwIDAgLjA2Ni0uMTguMTQuMTQgMCAwIDAtLjE5NS0uMDY2bC0uODQ2LjQ4YTMgMyAwIDAgMS0uMDQ1LS4yMDlsLjgxNC0uNDYyYy4wNjMtLjAzNi4wOTUtLjExNC4wNjYtLjE4MWEuMTQuMTQgMCAwIDAtLjE5Ni0uMDY1bC0uNzE0LjQwNmEyIDIgMCAwIDEgLjAwMi0uMjM2bC42MzUtLjM2YS4xNDQuMTQ0IDAgMCAwIC4wNjYtLjE4MS4xNC4xNCAwIDAgMC0uMTk1LS4wNjZsLS40Ni4yNjIuMDI3LS4xMjFhLjM2LjM2IDAgMCAxIC4xNzItLjIyNmwuMTg0LS4xMDRjLjA2My0uMDM3LjA5NS0uMTE0LjA2Ni0uMTgyYS4xNC4xNCAwIDAgMC0uMTk2LS4wNjVsLTIuNTkyIDEuNDc0YS4xNC4xNCAwIDAgMC0uMDUyLjE5LjE0LjE0IDAgMCAwIC4xODkuMDUzbC4zNC0uMTkzYS4zNi4zNiAwIDAgMSAuMzQ4LS4wMDVsLjAzNy4wMi0uNjQ3LjM2N2MtLjA2NC4wMzctLjA5Ni4xMTctLjA2NC4xODRhLjE0LjE0IDAgMCAwIC4xOTMuMDYzbC43NzMtLjQ0cS4wNzguMDY1LjE1Ny4xNDZsLS44NTMuNDg0Yy0uMDY0LjAzNi0uMDk2LjExNi0uMDY1LjE4NGEuMTQuMTQgMCAwIDAgLjE5NC4wNjNsLjkwNi0uNTE1cS4wNTkuMDc4LjExNS4xN2wtLjk0My41MzRjLS4wNjQuMDM2LS4wOTYuMTE2LS4wNjUuMTg0YS4xNC4xNCAwIDAgMCAuMTk0LjA2M2wuOTQ2LS41MzlxLjA0NC4wODguMDgzLjE4OGwtLjk1Mi41NGMtLjA2NC4wMzctLjA5Ni4xMTctLjA2NS4xODVhLjE0LjE0IDAgMCAwIC4xOTQuMDYybC45MTUtLjUycS4wMzEuMDk3LjA1Ni4yMDJsLS44OTMuNTFhLjE0NS4xNDUgMCAwIDAtLjA2NS4xODMuMTQuMTQgMCAwIDAgLjE5NC4wNjNsLjgyNS0uNDdxLjAxOC4xMDUuMDMzLjIxNmwtLjc4LjQ0NGMtLjA2NS4wMzctLjA5Ny4xMTYtLjA2Ni4xODRhLjE0LjE0IDAgMCAwIC4xOTQuMDYybC42ODQtLjM5cS4wMDkuMTExLjAxNS4yMjdsLS42Mi4zNTNjLS4wNjUuMDM2LS4wOTcuMTE2LS4wNjYuMTg0YS4xNC4xNCAwIDAgMCAuMTk0LjA2M2wuNS0uMjg0cTAgLjExNS0uMDAzLjIzNWwtLjQyLjIzOWMtLjA2My4wMzctLjA5Ni4xMTctLjA2NS4xODRhLjE0LjE0IDAgMCAwIC4xOTQuMDYzbC4yNzctLjE1OC0uMDAzLjA0OWEuMzYuMzYgMCAwIDEtLjE4Mi4yOWwtLjAxNC4wMDljLS4wNjQuMDM2LS4wOTYuMTE1LS4wNjUuMTgzYS4xNC4xNCAwIDAgMCAuMTk0LjA2M2wuNDkyLS4yOHEuMDAzLjAzMy4wMS4wNjhjLjA1Ny4zMjguMjE4LjY0LjQ1OS44Ny4wNDMuMTYuMDcyLjMzNy4wOS41MDIuMDY4LjU2NS4wNCAxLjE0LS4wNSAxLjcwNC0uMDgzLjYtLjM1MiAxLjE4Ny0uMzg2IDEuNzkzbC0uMDY0LS4wOTVhMy43NCAzLjc0IDAgMCAwLTEuNTU4LTEuMzI1Yy0uMTctLjI5NC0uMjk1LS42MzQtLjI4Ni0uOTcuMDMzLS40NS4wNzQtLjkyNi0uMDM2LTEuMzY4LS4wMjMtLjA2Ni0uMDQxLS4xNC0uMDctLjIwNGwtLjA2MS0uMTMyYy0uMDk5LS4xNzktLjI0Ni0uMzU3LS4zMDctLjUyYTEuOSAxLjkgMCAwIDEtLjExMi0uNjY2Yy0uMDE0LS4zMTcuMDIzLS42NjUuMDUxLS45ODEuMDQtMS4wNDYtLjYzNi0xLjg0Mi0xLjM0My0yLjUxMi0uNzUtLjg5LTEuMjQyLTIuNzU5LTIuODI2LTIuMTkzYS44Mi44MiAwIDAgMC0uOTEzLS40MjNjLS40Ny4wODYtLjgzNC4zNDQtMS4xNjIuNjYycS0uMTE0LjA5LS4yMzMuMTY1Yy0uMjM5LjE2LS41NTkuMi0uNzgxLjQzM2ExLjI3IDEuMjcgMCAwIDAtLjI3MSAxLjIzNiAxIDEgMCAwIDAtLjE1LjEzM2MtLjM5NS40NTMtLjQ0NyAxLjA5MS0uNDIyIDEuNjY3LjAzMy40NjMuMjA0LjkzNy4yNyAxLjM2NS4wNzIuMzgtLjA4NS41ODItLjM0Ny44MTUtLjI5LjI1Mi0uNjQ5LjQ1LTEuMDEuNjAzLS41NC4xOTEtLjk2Mi42NTgtMS4xMDcgMS4yMTUtLjE2NC42MTUuMDg2IDEuMjYyLjQ2NyAxLjczOHEtLjE1OS4yOTMtLjMyOC42MjQtLjE2LjMxMS0uMzQuNjQ5Yy0uMTU4LjI5NS0uOTYzIDEuMTM4LTEuNDQ2IDEuNjI2di0yLjM2M2MuMjE5LS4xMDUuMzMyLS4xOTIuMzk0LS4zMzVhLjUuNSAwIDAgMCAuMDIzLS4zMDVjLjE5NC0uMTEuMzQyLS4zNC4yNTgtLjU2OC4yMDMtLjEwMi4yODItLjQ1NS4xMDUtLjYyLjI2My0uMTcyLjI0NS0uNDc4LjA3Mi0uNzEzLS4yNTItLjE0Ny0uNTI3LS4zLS44MjItLjM2Ni4wNjItLjQ5LjIyNC0uOTYyLjQ2Ni0xLjM5Ni4yNjUtLjQ3NC40NS0xLjE2Ni41MDUtMS45NThoLjE4YS4zNDYuMzQ2IDAgMCAwIC4zNDYtLjM0OC4zNS4zNSAwIDAgMC0uMzQ2LS4zNDhoLS4xNjZjLS4wMzgtMS4zNTUtLjQ1Ny0yLjQ3My0xLjAxNS0yLjgwNXYtLjQ5MWEuMzQ2LjM0NiAwIDEgMC0uNjkzIDB2LjQ5Yy0uNTU4LjMzMi0uOTc2IDEuNDUxLTEuMDE0IDIuODA2aC0uMTY2YS4zNDYuMzQ2IDAgMCAwLS4zNDcuMzQ5YzAgLjE5MS4xNTYuMzQ3LjM0Ny4zNDdoLjE4Yy4wNTQuNzkyLjI0IDEuNDg0LjUwNSAxLjk1OC4yNTMuNDU0LjQxOC45NS40NzQgMS40NjItLjQzMy4xOTMtLjc1OC42MjQtMS4wMjEgMS4wMDUtLjk5MyAxLjYwMi0xLjIzIDMuODUtLjg2NCA1LjY3OS4xOTUuOTYuNTkxIDEuOTQ2IDEuMzk2IDIuNTU5bC4wNDYuMDM1LjA1Ni0uMDA5Yy44ODEtLjE4NSAxLjcyOC0uNjEgMi40NTMtMS4xODJhNSA1IDAgMCAxLS4yMjguNzM1Yy0uNDgyIDEuMTc2LS4xNzcgMS43NjctLjAxMyAxLjk3NnEtLjEzLjI5Mi0uMjguNThhMyAzIDAgMCAwLS4xMDUuMjI1Yy0uMjU3LjU5OC0uMTEgMS4yNDcuMzcyIDEuNjQtLjAxMy4zMy4xLjY1NC4yODUuOTMuMDQ2LjQ1Ny4yNi44MjIuNTU0Ljg5NC4yMjQuOTQ5Ljc1NCAyLjgwNSAyLjU3NyA1LjQ3NyA1LjA1IDYuNjg1IDEwLjkyMiA1LjAzNCAxMi45NTcgMi41MzYgMS41MDYtMS44MzIgMS45OTktMy4zNTYgMS4zOC01LjQ0LS4xNjUtLjU1Ny0uNTU5LTEuMzU4LS44MS0xLjcxMy4wNDQtLjI1NS4yMDQtMS4xMDguNDU5LTEuNzcyIDMuMzk1LS4yMTUgNC4wMi0zLjI4MiA0LjAyLTMuMjgyTTM1LjExNyAyOS42N2EuMTguMTggMCAwIDEgMCAuMzU5aC0uMDQ5YTkgOSAwIDAgMC0uMDAyLS4zNTl6bS0yLjk1Ny4zNThhLjE4LjE4IDAgMCAxIDAtLjM1OWguMDVxLS4wMDMuMTcyLjAwMS4zNTl6bTE1LjQ3IDExLjY1N2MuMDY1Ljg5Ni4yOTcgMS4zNy42MjUgMS44MDcuMjE3LjI5LjU0NS43MjcuNTM2IDEuMTk1LS4xOS0uNDA5LS41ODItLjcxOC0xLjQ3LTEuMDAxLTEuNS0uNDgtMS45NDQtMS4yMzEtMS45MDQtMS44NTcuMDc4LS43ODUuNDg2LTEuMDI3LjI4MS0yLjQ1LjM0MS4yODYuNjc0LjUxMiAxIC42OTEuMDA0LjAwMi4yMTcuMTI0LjQzOC4zODUuMjIyLjI2MS40NTQuNjY0LjQ5NCAxLjIzbS0yLjM2NC0zLjE2N3EuMDUuMzA4LjEyNC42MjNjLS40NDgtLjY1NS0uNjMyLTEuOTM4LjE5LTIuMzc2YTEuNCAxLjQgMCAwIDAtLjIyNy4zOC45LjkgMCAwIDEgLjQ0NC0uMjk3Yy0uNDUuNTAzLS41NTIuODQzLS4yMyAxLjQ2YS44My44MyAwIDAgMS0uMzUtLjQyNGMtLjAwMy4yMTIuMDE4LjQyNi4wNDkuNjM0bTIuODQzLTYuNTQ3Yy4wODQtMS4zOTUtLjE4LTIuNDY3LS43ODUtMy4xODZhMS45IDEuOSAwIDAgMC0uNjU4LS41bC4xMDgtLjA1NmMuMzA3LS4xNTkuNjgtLjM1IDEuMDY3LS41OTFhMi40IDIuNCAwIDAgMCAuMTYgMS41MnEtLjAxNS4wMTQtLjAyOS4wM2wtLjA0NS4wNDdjLjAyLjIxMy4xNC4zOTYuMzEzLjUwN3EtLjA0NS4wNDUtLjA4Ny4wOTJhLjUzNS41MzUgMCAwIDAgLjM2LjQ5OGwtLjA3Ni4wNzhjLjAxLjI1My4yMTMuMzcyLjQzLjQyNWwuMDEyLjA3YS40My40MyAwIDAgMCAuMjQuMzM0LjUuNSAwIDAgMCAuMjkyLjAzMWMtLjM4NS4yMDctLjgwOS40MzQtMS4zMDIuNzAxbS0xLjI2OCA0LjI4NmMuOTgyLjU0IDEuNjc0IDEuNTI3IDIuMDQgMi41NzguMDIzLS4zODQtLjA4My0uNzQ5LS4yNDgtMS4wODgtLjA5MS0uNzU5LjMtMS40NTIuMzk0LTIuMjA5LjA4MS0uNjkuMDkyLTEuNDE0LS4xMDctMi4wODMuMTEuMDY3LjI0Ny4wOTcuMzk4LjA0MWExLjUgMS41IDAgMCAxLS4zNTgtLjIyNyAxLjUxIDEuNTEgMCAwIDEtLjUwNC0xLjA0MmwxLjczNS0uOTk1Yy4wNzMtLjA0Mi4xMTItLjE2LjAzOS0uMjA5LS4yNTktLjE3Mi0uNjk3LjAxNi0uNjk3LjAxNi0uMTAzLjAyMi0uMjk1LS4wMjMtLjM0Ni0uMDk3bC0uMDA0LS4wMDhjLjI4Ny0uMjQ1LjUzMi0uNDQyLjg4NC0uNTg1LS4yNy0uMTI2LS41Mi0uMDExLS43NTcuMTJxLS4wOTkuMDU3LS4xNzkuMTI0Yy0uMTI5LS4wMTctLjI3LS4wNC0uMzctLjExbC0uMDAyLS4wMDFjLjMxNC0uMzExLjY5Ni0uNTMgMS4xMzMtLjU5LS4wMzgtLjA0Ny0uMDk1LS4wNjEtLjE0Ny0uMDhhLjUuNSAwIDAgMC0uMjE3LS4wMTVjLS4yNzUuMDM0LS41My4xNTItLjc1NC4zMTQtLjEzOC0uMDI1LS4yNzItLjA2Ny0uMzItLjE5cS4wMzMtLjAzOS4wNjktLjA3MmwuMDA0LjAwMS4wMDEtLjAwNmMuMzI3LS4zMDMuNjg1LS40MTkgMS4xMy0uNDA2LS4yMTItLjIzLS40NTYtLjE5MS0uNzMyLS4xMmExLjUgMS41IDAgMCAwLS40NjIuMjMuNDguNDggMCAwIDEtLjIzNi0uMjI0Yy40MDMtLjM3NiAxLjAyMi0uNDA4IDEuNTUtLjMyOXEuMDU4LjMxMS4xNjQuNjE3Yy4wNTMuMTQ3LjEyLjMwNS4yMTcuNDM4LjA0OS4wNjUuMTExLjE0My4xNTMuMjA4LjE5Mi4yNjkuMTkyLjYuMTcyLjkyLS4wNS41MTYtLjA5OSAxLjAzOC0uMTEyIDEuNTU2YS44LjggMCAwIDEtLjIwMS40OTNoLS4wMDN2LjAwMmEuNS41IDAgMCAxLS4xOTguMTI2Yy0uMjEyLjA2LS40NTQtLjA2Mi0uNTk3LS4yMi0uMDEzLjE4OC4xNy4zNzQuMzI4LjQxNy4wOTQuNDcxLjE2NC45NS4yMzEgMS40MjkuMTY0IDEuMy4yOTIgMi42MjcuMDg5IDMuOTI4YTQgNCAwIDAgMS0uMTMzLjU0OCAyLjQgMi40IDAgMCAwIC4xOTUtLjQzNmMuNDU2LTEuNDc5LjE5LTMuOTEyLS4xMDItNS40NzcuMDM5LS4wMTIuMTk0LS4wNzMuMjMtLjA5My4wNjguMzU2LjE5NyAxLjA2Ny4yNTQgMS41ODEuMDQ5LjQyOC4xNTQgMS41NDMuMTAyIDIuNjc1LS4wNjYgMS40MDEtLjM1NyAyLjMyNC0uODQxIDIuNjc1LS44MzMuMDc4LTEuNzg2LjA0Ny0yLjg0Mi0uNTE5bC0uMDU2LS4wMzQtLjAwMS4wMDRhNi4zIDYuMyAwIDAgMS0xLjIwNy0uODg2cS0uMDM3LS4yMDUtLjA3NC0uMzkuMTM2LjE2Mi4zMDQuMjgyLjIuMTU0LjQzNy4yNDVjLS4yODQtLjUzNy0uNjYxLTEuMDgtLjUzNS0xLjY2OC4xNDYtLjUwOC41OTEtLjc3IDEuMTQ1LS43OS0uMzA5LS4yNjItLjc5OS0uMjQ3LTEuMTYyLS4wMzMuMDU2LS4yMjEuMTA2LS40NTIuMTMzLS42ODQuMzQuMDY2LjY3LjE3OS45NzMuMzQ4bS0xMC42NDYtMi40MjhjLjE0Mi0uMi4zMzYtLjM3MS41NTctLjQ2OS4wNzgtLjAzNC4xODMtLjA3My4yNTgtLjExMi41MTctLjI1NCAxLjA2LS41NiAxLjM1Ni0xLjA5NC4xNzctLjM5NC4wMTYtLjgyMy0uMDc2LTEuMjA1LS4xNS0uNTEyLS4yNC0xLjA0MS0uMTQ4LTEuNTcuMDQ3LS4yOC4xNC0uNTc4LjM0OC0uNzdxLjA1NS4wOTcuMTI4LjE4Yy0uMDY3LS41MTctLjE0MS0xLjIxMy4zNzItMS41MjIuMDk2LS4wNTUuMjAzLS4wODYuMzA5LS4xMjguMjEyLS4wNzguNDA3LS4yLjU4My0uMzQyLjU4LS42IDEuNTE2LTEuMDcxIDEuOTUxLS4wNTJhMSAxIDAgMCAwLS4wMDItLjE3Yy42MTctLjIxNSAxLjA4OS4wMjMgMS40NjMuNTQ5LjM4LjUxMy42MjcgMS4xMTcgMS4wNDUgMS42MTkuMy4yOTkuNTg4LjU4NC44MjEuOTI3LjI2OC4zOTEuNDM2Ljg1NC40MiAxLjMzLS4wMjMuMjgtLjA1LjU2NC0uMDUuODQ4LS4xMDgtLjE1LS4zMDgtLjMyMi0uNzQ0LS42NTMtMS4wNDYtLjY4Mi0xLjIxLTEuNzM0LTEuMjU4LTIuMTA2cS4wMjYtLjAwOC4wNTMtLjAxOGMuNDYtLjE3OC40ODEtLjgzNC4xMDItMS4wOTQuMTI0LjI1Mi4xNDguNTMtLjAxLjc0NS0uMzM1LjM3NC0uODEuMDc4LS44NzctLjM4YS42LjYgMCAwIDAtLjAyNy4xODZjLS4yNDYtLjE4My0uMzg0LS40My0uNDQtLjc0M3YtLjAwNGEuNjguNjggMCAwIDAtLjIyLS40NnEuMDc1LjIzOS4wMjYuNDVhLjY0NS42NDUgMCAwIDEtLjc1LjUwNi42LjYgMCAwIDAgLjE3Mi0uMzY5Yy0uMTU1LjItLjM0Ni4zMzctLjU4LjM1NC0uMjEyLjAwNy0uMzctLjE4LS40MzMtLjM3Ny0uMDQ2LS4xNDItLjAzLS4zMDcuMDIxLS40NzhhLjYyLjYyIDAgMCAwLS4xNzIuNjEgMSAxIDAgMCAxLS4wNDcuMTUzLjkyLjkyIDAgMCAxLS40Mi40NTFjLS4yMTIuMDg1LS40MjguMDE1LS42NTMtLjA1YS44NS44NSAwIDAgMCAuMzMyLjIyMi40My40MyAwIDAgMS0uMjExLjE3MWMtLjEzOC4wNDgtLjI3LjAyNS0uNDI0LS4wMjdhLjM1LjM1IDAgMCAwIC4yMTguMjQzcS0uMDAyLjI2MS0uMDU3LjUxM2MtLjA0Ny4yMjItLjE1Ni40MjgtLjE4OC42NTZhMiAyIDAgMCAwLS4wMzMuMjkyYy0uMjQzLS40NzYtLjUtMS4wODktLjI4OS0xLjQ0My0uMTUuMDk4LS4yMDUuMjk2LS4yMjcuNDY3LS4wNTguNTU2LjE2IDEuMDk2LjM4OCAxLjU4OS4yNC42Ni4yNzIgMS43MjItLjE0IDIuMzEyLS4xMTcuMTctLjI5NS4yOTEtLjUxLjM2OS43ODUuMDEgMS4xMzQtLjc0MSAxLjIxLTEuNDc3LjE3Ljg4Ni0uMjExIDEuMzg3LS43MDcgMS41MjUtLjU2LjEzNi0uOTg4LjMxNy0xLjI2NS40NTZhMS4zIDEuMyAwIDAgMSAuMTc2LS4yMzJjLjE2NS0uMTg1LjM5OC0uMzE4LjU5NC0uNDcuNDU1LS4zNzIuNjUzLS45OS41Ni0xLjU1LS4wNzkuNS0uMzI1IDEuMDAxLS43NjEgMS4yNjktLjQ1LjIyNy0uOTQ0LjUxNC0xLjA2MSAxLjA1NWEuNy43IDAgMCAwLS4wMDUuMjg5bC4wMDktLjAwMmMtLjIxNi4yMS0uNDA2LjQ4LS41OTUuNzk2LS4zNy0uNTMtLjQ5NC0xLjIyMy0uMDkyLTEuNzY1bTcuMjg5LTMuMTY3cS4wMDguMTk1LS4wMjguMzg4Yy0uMDM5LjIxLS4xMTguNDItLjIwNi42MTF2LjAwM2wtLjAxMi4wMjRjLS4yOTIuNi0uODA2IDEuMTAzLTEuMzcgMS40MTgtLjQyLjIzLS42ODguMjI0LTEuMTA1LS4wMDVhMy4zNCAzLjM0IDAgMCAxLTEuMzU2LTEuNDA1Yy0uMDk0LS4yLS4xNzgtLjQyLS4yMTktLjYzOWExLjg1IDEuODUgMCAwIDEgLjA5Ni0uOTkyYy4xMDktLjI4LjE2Ny0uNTc2LjE4Mi0uODc2bC4wMDMtLjAwMmEuMzkuMzkgMCAwIDAgLjI1Ni0uMzYuNTQuNTQgMCAwIDAgLjM5Ny0uMDcyLjguOCAwIDAgMCAuMzgtLjUuNi42IDAgMCAwIC4xNzguMTYxYy4xNDUuMDkxLjMxNC4wODcuNDYzLjAyNy4yMjEuMTcyLjU1My4xODguODAxLjA2M2EuNy43IDAgMCAwIC4zMDctLjMyMmMuMDYuMjM4LjI3NS40NDIuNTI0LjQyNi4wMzYuMjIuMTk1LjQwOC40MDIuNDc4LjAxNi4yMTYuMDQxLjQyLjA3Mi42MDNxLjA0MS4xODguMTExLjM2NmMuMDc0LjE5LjExNi4zOTIuMTIzLjU5NXptLS40OTcgMi43MjItLjAwMS0uMDAydi0uMDA0em0uMzgxIDEuMDg3cS4wMDguMDE2LjAxNi4wM2MuMTkuMzQyLjMxNi42Ny0uMTQyIDEuNjEyYTIgMiAwIDAgMC0uMTkxLjYxNGMtLjA1Ni0uMzY1IDAtLjczMy4xNDMtMS4wNzUuMDctLjE2LjEzNi0uMzMuMTY0LS41MDJxLjA1NC0uMzQuMDEtLjY3OW0tOS44ODgtOC4yNjRjMC0uMDg2LjA3LS4xNTYuMTU1LS4xNTZzLjE1NC4wNy4xNTQuMTU2di4zNDZhLjcuNyAwIDAgMC0uMzA5LjAwMnptLS44MiAzLjk5Ni0uMDA3LS4xMjdhNiA2IDAgMCAxLS4wMS0uNTdjLjAyOC0xLjAzOS4yOS0xLjkwOS42NDktMi4yNTVhLjcuNyAwIDAgMSAuMTY3LS4xMi40MTYuNDE2IDAgMCAxIC4zNTcgMCAuNi42IDAgMCAxIC4xNjcuMTJjLjM2LjM0Ni42MiAxLjIxNi42NDkgMi4yNTRxLjAwMy4wOTEuMDAyLjE4NS0uMDAxLjE5OC0uMDExLjM4NmwtLjAwOC4xMjdjLS4wOTIgMS4xOS0uNDk0IDIuMDg4LS45NzggMi4wODgtLjQ4MyAwLS44ODYtLjg5Ny0uOTc3LTIuMDg4bS41MTUgMi4xMjhjLjI0NC4zNy43MTIuMzcgMS4wMTgtLjAxLS4yMTguMzM4LS4zMzQuNTE3LS4zNDYgMS4xNDctLjA5Mi0uMDItLjM2NyAwLS4zNjcgMCAuMDA1LS42OS0uMTI0LS43My0uMzA1LTEuMTM3bTMuMTcgMTUuNjI1Yy0uMDIuMjI1LjAzNy40NTQuMTQ1LjY2Mi0uMzItLjExNS0uNDIzLS4zOTYtLjM2OC0uNzUyLjA2NC0uNTM4LjMyMi0xLjA2NC40LTEuNjFhMy42IDMuNiAwIDAgMC0uMTc1LTEuNjhjLS4wMDYuMzI0LS4wMTIuNzg2LS4wMzggMS4xMDNhNS4yIDUuMiAwIDAgMS0uMTM4LjkyNmMtLjEzNy41NDYtLjUwMiAxLjY2OS4wOTMgMS45N2EuOTIuOTIgMCAwIDEtLjYyNy0uODVjLS4wMS0uMTkzLjA3NS0uMzc4LjEzNS0uNTU5LjEwMy0uMzQ1LjE0Ny0uNzMuMDMyLTEuMDc4LS4wNi4zNTQtLjE1NS42Ny0uMjgzLjk5LS4wNDIuMDk4LS4wODMuMi0uMTEzLjMwM2ExLjQgMS40IDAgMCAxIC4wNS0uOTMzYy4yMi0uNDk2LjM1Mi0xLjEyMy4wNjctMS42MTkuMDcyLjQ1LS4wNDUuODk3LS4yMjQgMS4zMDQtLjA2OC4xNDQtLjE0LjI5My0uMTc1LjQ1YTEgMSAwIDAgMC0uMDM0LjE4NGMtLjQxMS0uNjMyLS4yOTctMS4xNTYuMDcyLTEuODU4LjE4Ny0uNDQuMzI0LS45MzEuMjUzLTEuNDEycS0uMDc4LjMxNS0uMTkuNjFjLS4xMTMtLjIzNy0uMjA3LS43MTYuMTM4LTEuNTU3LjE5LS40NjIuMjc4LS45MjIuMzEtMS4xMjZxLjM2Ni0uMzMuNjc0LS43MDVhLjcuNyAwIDAgMSAuMDA4LjMyOWMtLjA1NS4zMzQtLjI0OC42MjMtLjM3Ni45MzEtLjE3OC40OS0uMjM1IDEuMDQ3LS4wNTkgMS41NDMuMDU3LjE2Mi4xMzYuMzE0LjIyOC40NTJhMS45OCAxLjk4IDAgMCAxIC4wMzMtMS4zOTljLjA3LS4xNzguMTY1LS4zNDYuMjYxLS41MTMuMDczLS4xMzQuMTU0LS4yNzguMjM2LS40MDcuMDgzLS4xMjkuMTYtLjI1NC4yMjQtLjM4NS0uMDE4LjE5Mi0uMDYyLjM4LS4xNDUuNTU2LS40NTMuOTY1LS42MDMgMS42NTItLjIgMi42NzMtLjAyLS4yLS4wMzgtLjQtLjAzMy0uNTk4LS4wMDgtLjU4NS4yMDktMS4wODkuNTI4LTEuNThsLjEzLS4yMWMtLjMyMi44MzgtLjE0NSAxLjgxOC4zNSAyLjU0LjEzOC4xOTUuMzAzLjM3My40OTcuNTAzLS42MTUtLjc1My0uODI0LTEuOTEzLS40Ny0yLjgxMi4zMDQtLjYxOC4zNTgtMS4zMTUuMjctMS45OS4wMDIuMDE3LjExNS4wNjIuMTMzLjA3MS4zNzUuMTg3LjgwNS4yNjEgMS4yMTUuMTVhMS45MiAxLjkyIDAgMCAwIDEuMDk5LS44MDZjLjM2NC0uNTYuMy0xLjI5NS0uMDE1LTEuODQ4LjE0NS41NTguMTMzIDEuMjEyLS4yMzggMS42Ny0uMjQxLjI5OC0uNTcuNTA1LS45NDIuNTkyYTEuMyAxLjMgMCAwIDEtLjQ3Ni4wMjQgMS44IDEuOCAwIDAgMS0uNTc1LS4yMTUgMS4zMyAxLjMzIDAgMCAxLS41NDgtLjU0OGMtLjEzMy0uMjY2LS4xNS0uNTctLjEwNy0uODYxcS4wMTMtLjA5LjAzMy0uMTc3Yy4wMzUtLjE3OC4xMTUtLjM1LjE2NS0uNTIzLjEwMi0uMzY1LjExNy0uNzktLjA4MS0xLjEyMy4xMTkuMzk4LjAxNi44MTctLjE2OCAxLjE3MmEyLjMgMi4zIDAgMCAwLS4zMDQuOTggMiAyIDAgMCAwLS4wMDMuMTU1Yy0uMTguNDMxLS40MDcuODQzLS42ODIgMS4yMTktLjI2NS4zNi0uNTc2LjY5Ni0uOTIyLjk5OC0uNzI0LjYzNC0xLjU5OCAxLjExLTIuNTE1IDEuMzE4YTMuMDUgMy4wNSAwIDAgMS0uODAzLTEuMDI0Yy0uNzg3LTEuNjctLjc0NC0zLjc4OC0uMTk4LTUuNTI4LjI1LS43OC43NzEtMS44NDkgMS41NC0yLjE5OC40MTgtLjE2My44NTguMDggMS4yMy4yOTMuMTIxLjEzMS4xMTMuMjgzLS4wMzIuMzk2LS4zMTMtLjIwNi0uODA0LS40MTMtMS4wNTQtLjI3LjM3NS4wODYuNzY0LjI0Ni45OTguNTU5LjAyOS4xMDItLjAzOC4xNzYtLjEyOC4yMjctLjMxMi0uMjA1LS43OS0uNDExLTEuMDUzLS4yNjkuMzc1LjA4NS43NjQuMjQ1Ljk5OC41NTguMDM0LjEyLS4wNjMuMi0uMTczLjI1MS0uMjQyLS4zMDMtLjg5Ny0uNDI5LTEuMDM0LS4yM3EuMTUyLS4wMDUuMjk5LjAyN2MuMjc0LjA1Ni41My4yMDMuNjk3LjQyN2EuMjguMjggMCAwIDEtLjAzMy4yMDIuMy4zIDAgMCAxLS4wOTcuMDk0Yy0uMDk3LS4wNjEtLjI1Ni0uMjAxLS4zNjMtLjI0Ni0uMTM0LS4wNTItLjMyLS4xMjgtLjQ3Mi4wMDQuMDY5IDAgLjIyOC4wNTUuMjg2LjA4NC0uMDg4LjEzOC0uMTgyLjI4NC0uMjc1LjQyNC0uMjk2LjQzNi0uNTk4Ljg2NC0xLjA3MSAxLjEyOS4xNDIuMDAyLjI3OS0uMDI2LjQxLS4wNzYuMzMxLjU4LjU0NyAxLjI0Ni42NTggMS45MDcuMDMuMTY1LjA0OC4zMy4wNjIuNDk2di44OTJjMCAuMTgyLjEzLjM0NS4zMS4zNjNhLjM1LjM1IDAgMCAwIC4zODItLjM0N3YtMS41MjdjLjItLjIgMS40Ni0xLjQ2IDEuNjktMS44ODhxLjE4LS4zNC4zNDItLjY1MmMuNi0xLjE2My45OTgtMS45MzIgMS44LTIuMDc1cS4yNDctLjA0Mi40ODItLjA3N2MuOTE0LS4xMzcgMS43ODMtLjI2NiAxLjg1LTEuMzY2LjI1NS4yMTYuNTM5LjM4OC44NDQuNDkxLjIzMS4wNzMuNTIuMDU4LjczNS0uMDMuMDU5LS4wMi4xMjYtLjA1LjE4LS4wNzcuMDQ3LS4wMjEuMTI0LS4wNjQuMTY3LS4wOXEuMzY4LS4yMzUuNjY2LS41NWExLjk1IDEuOTUgMCAwIDAtLjA3OS45M2MuMDc4LjI4NC4xNDYuNTc1LjA4Ljg3YTEuNiAxLjYgMCAwIDEtLjQzLjc4N2MuMzcxLS4xNTkuNjUtLjUzOS43My0uOTVhMi42IDIuNiAwIDAgMS0uMDY2LjUyNWMtLjA0Ni4yMDYtLjE1OC4zOTEtLjIyNi41ODdhMS45IDEuOSAwIDAgMCAuMDUgMS40MjkgMS43IDEuNyAwIDAgMC0uMDUyLjc5OWMuMDcyLjM5NS4yNi43OC40MiAxLjEzMS4xMDEuMjMzLjE5NS40NTIuMTg2LjczLjM1Ny0uNTE0LS4wMjUtMS4yNTItLjE4Ni0xLjc3YTMgMyAwIDAgMS0uMTItLjQ2N3EuMDUzLjA3LjExMy4xMzguMTE5LjEzNS4yNS4yNTYuMTEyLjExOC4yMzguMmMtLjM4Ny0uNzMxLS4zNTYtMS4yNjMgMC0xLjg5OS43ODQtMS4xNjYuNDM4LTEuNTE4LjIyNC0yLjM0OC0uMTA1LS40MDUuMDU4LS44OS4yNS0xLjI3OS0uMDgyLjc2LS4wNSAxLjU2Ny4zNjEgMi4yMjItLjIxOS0uNTE3LS4yMS0xLjA5OC0uMTE0LTEuNjM4cS4wNS0uMjgxLjE1MS0uNTQ2Yy4wNTguMjU2LjE2My40OTkuMzI0LjcwOS4yMi4yODcuNTQyLjQ5Ljg3LjYwNS0uMzY4LS4yNDYtLjY2MS0uNi0uNzM4LTEuMDRhMS43IDEuNyAwIDAgMSAuMDA1LS41NzJjLjYyNS41MDguOTMuODk3IDEuMDc4IDEuMTYxLjExNS4yODUuMTIyLjYwOC4xMjIuOTE0bC0uMDEzLjI0N2MtLjA0Ni4zNzUuMDM1Ljc1LjE5NCAxLjA4OWEzIDMgMCAwIDAtLjQ3LS4wOTljLjAxMy0uNDE1LS4wNjUtLjgyNC0uMzI0LTEuMTg1IDAgMCAuMyAxLjE4OC0uMjg1IDEuOTkzLS41ODQuODA1LS44OTUgMS4zMzctLjI4NSAyLjU4LjM4LjgxOC4xNjIgMS43NjYtLjA1NCAyLjI2NS0uMjcyLjYyOSAwIDEuNDIuMTQ5IDEuOTY2LjE0My41MjMuMDYyIDEuMjM0LS4xNDggMS41Mi40MjUtLjUxLjU1LTEuMTI0LjQ0Ni0xLjYxNmEyLjUgMi41IDAgMCAxLS4wNTItLjQ3Yy4zMzUuNTYgMS4wNS45OCAxLjc3OCAxLjIzMi4yMjYuMzUzLjMwMy43ODYuMjc3IDEuMjA2LS4wMjEuMjkyLjAyNS42MjMuMjAzLjg5MS4xNDcuMjIyLjM2NS4zODMuNjE0LjQ2My0uMjc2LjMxNS0uNzUzLjA1Ni0xLjAwOS0uMTYzYTMuNyAzLjcgMCAwIDAtLjAwNy0uODk1Yy0uMDctLjgwNS0uNTQ1LTEuNjctMS40NS0xLjYzNi44MzguMDk3IDEuMTk4Ljg5OSAxLjIyMyAxLjY1Ny4wNDQuNTc2LS4xMjkgMS4xNjUtLjA2OCAxLjc1Ny4wMTguMTcyLjA2Ni4zNDMuMTM4LjUwMWExLjMgMS4zIDAgMCAxLS40NTguMTk1Yy0uNDcuMDk1LS44MjEtLjIzMy0uOTc0LS42NDZxMC0uMDMzLS4wMDItLjA2MmMtLjAyOS0uNTc2LS4xMy0xLjIwMy0uNTExLTEuNjU1LjI1MS41MS4yODEgMS4wOTUuMjcxIDEuNjU1LS4wMS41MTEtLjExOCAxLjA2NC0uNDQgMS40NzItLjc2NC0uMTE5LS44MDgtMS4wOTQtLjgyMi0xLjcyLS4xMi40NzgtLjEyNCAxLjEyNS4xMzggMS41NS0uMDc3LjQ0OS0uMjc3LjgyOS0uNzA1LjkyNC4wMzItLjExLjM0NS0uNy0uMzQ2LTEuNTU2LjMxMi44MDYuMzEzIDEuMzU2LS4xNDggMS41NzJhLjYuNiAwIDAgMS0uMjY2LS4xMDFjLjI5NC0uMzU0LjI2Ny0uNy0uMDE3LTEuMTIyYTIuNyAyLjcgMCAwIDAtLjQwOC0uNDczYy4xMjUuMzQ5LjUxNy45Ni4yNDYgMS4yODQtLjEyMy4xNDgtLjMwMi4yOS0uNDA0LjQ3OWExIDEgMCAwIDAtLjA4Mi4xODZjLS40MzMtLjA1Ny0uOTItLjE1MS0xLjEzOC0uNTZhLjguOCAwIDAgMS0uMDctLjI3MmMuMTUtLjMzOC4yMTQtLjc1OC4wNjItMS4yMjYgMCAwLS4yMzkgMS4zNTUtLjg1NSAxLjY2OC0uNTU2LS4yNTYtLjk3NC0xLjI2OC0uNDA1LTEuODMxYS44Ny44NyAwIDAgMC0uNTg3LjgxMWMtLjI2Ny40MzUtLjY1NS43OS0xLjA2NiAxLjA5MS0uMjMyLS4zMjctLjMzOC0uNzMtLjM4LTEuMTMuMDUtLjQyOS4wMjUtLjg2Mi0uMTE1LTEuMjczYTIgMiAwIDAgMC0uMTQzLS4yOThxLjA0Ni4xNTcuMDcyLjMxNmMuMDk2LjY4Ni0uMDQ4IDEuMzktLjI3MSAyLjAzOGExIDEgMCAwIDEtLjE2Ni0uMTJjLTEuMDg4LTEuMDE3LjA1Mi0xLjU2Mi0uMjU1LTIuNDUuMDgyLjU2Mi0uNDA4Ljk3Mi0uNDQ5IDEuNTE5bS44NzktNy4yOGEyIDIgMCAwIDAtLjA0OC0uMzEgMSAxIDAgMCAxLS4wNzYuMTRjLS4xNzYuMjc3LS4zMzQuNTE3LS40OTEuODA2LS4wMTMtLjQxMS4yMzctLjc2NC40MTctMS4xMDcuMDYtLjEzMy4wODMtLjI2NS4wOTItLjQwNnYtLjAwM3EuMDA1LS4wNTQuMDA2LS4xMXYtLjAwNXEuMDA1LS4wNjIuMDE0LS4xMjVhLjcuNyAwIDAgMSAuMDYyLjEzN3EuMDIuMTM1LjA1LjI2OWwuMDE3LjA3MmMuMDQzLjIxMi4xNDIuNDA1LjE2MS42MjIuMDUyLjQzNy0uMDk4LjkyLS40NCAxLjIuMTgtLjM3OC4yNy0uNzY4LjIzNi0xLjE4bS0zLjQzMS00LjIydjQuMjM3YS4xMzQuMTM0IDAgMSAxLS4yNjkgMHYtMy45MTlxLjE1LS4xMzYuMjY5LS4zMTltLS41MDEuNDR2MS43N2E2IDYgMCAwIDAtLjQ3NS0xLjM1NCAyLjIgMi4yIDAgMCAwIC40NzUtLjQxNW0xOS4xNDMgMTQuNDc1Yy41MDcgMS45MjUuMDIgMy4wOTYtLjk0NiA0LjQ0NC0xLjYxOCAyLjI1Ni01Ljk0MSAzLjk4LTEwLjA4OS40My0xLjAwNC0uODYtMi4xNDMtMi4wNjMtMi45MS0zLjM1YTE2LjQgMTYuNCAwIDAgMS0xLjY0Ny0zLjgyNGMuMTU4LjE0My4zNDEuMjUzLjUzLjMxcS4xMzMtLjMzOS4yMTktLjY5OWMuMDE4LjM4LjE1NC43NTEuNDAzIDEuMDQuMzItLjE5Ny42MjItLjQzMi44NjMtLjcyMi42OCA1LjA5NCA1LjcyIDEwLjI5OCAxMC44NyA3LjY2NC0xLjMyLjQ5OC0yLjg1LjQxLTMuNDUyLjMxNi0zLjU2OC0uNjY1LTYuMTQ1LTQuMzkxLTYuNzEzLTcuNzI2LjI3My4yODUuNTc2LjQyMi41NzcuNDIyLjE1Ny0uMDQ5LjQyNy0uMjYuNjMyLS41ODUuMTA2LjU5NC44MjUuODggMS41OTkuOTU4bC4wMzMtLjE1OGMuMDM1LS4xNjcuMTE5LS4yOTcuMjUtLjQ0bC4wMDUtLjAwNGMuMDk3LjE1LjI4LjI4OC41NzQuMjhoLjAwNWMuMDc0Ljc5My4yNDcgMS41NDMuNDg2IDIuMjk4LjMuOTIuNzA5IDEuODIyIDEuMzIxIDIuNTgyLjc4Mi45NzUgMi4xOSAxLjUzNSAzLjQwNyAxLjQ0NiAyLjc0MS0uMTY3IDQuNzQ4LTMuMDU0IDIuOTg2LTUuNzU3LS45MzYtMS4zNzItMi44NC0xLjU2Ni0zLjQyLS42ODYuNDU4LS40IDIuNjg3LS43NzggMy41MDggMS45MTEuNDM4IDEuODc0LS43MzcgMy4zNjMtMi4wNzYgMy43Ni0xLjUxOC40ODMtMy4xMTkuMDY2LTQuMDktMS4zNC0uOTAzLTEuMzE2LTEuMjYyLTMuMzE3LTEuMzM1LTQuNTE3LjE3LS4yMTYuMzIzLS41NjUuMzM2LS43ODdhLjkuOSAwIDAgMCAuMzI3LjIxOWMtLjAyOC4zMTMtLjA4MiAxLjE5My4wNjMgMi4yMDUuMjQgMS42Ny45MTkgMi44ODUgMS45NjIgMy41MTYuNTMuMzIgMS4wNTQuNDUgMS41NDIuNDUuODM2IDAgMS41OTctLjMyNSAyLjA3NS0uNzc5Ljg4My0uODM4IDEuMTIyLTIuMDc4LjYzOC0zLjAwNWEzLjYgMy42IDAgMCAwLS42NTMtLjkxM2MtLjUyNy0uNTEtMS40LS43ODUtMi4wMDgtLjIzNi0uNjI5LjU2Ny0uMzg0IDEuNzAyLjUxMyAxLjc4MWguMDEzYy42My4wNDkgMS4xMjYtLjUxNyAxLjM4NC0xLjAzNXEuMjAyLjI1LjM4Mi41OTcuMDc0LjE0LjExNy4yODJjLS40NTIuOTI0LTEuMTUgMS40MzgtMS45NzMgMS40NDktLjg0Mi4wMS0xLjU1Mi0uNDk3LTEuNzkyLS45OC0uNTE2LTEuMDM3LS4zNTQtMi4wMzcuNDctMi44OS42MS0uNjM0IDEuNjY5LS44OTMgMi42MzMtLjY0NSAxLjA3My4yNzYgMi4wMzggMS40NyAyLjM4MSAyLjcxOG0tMi41MzMtLjg1Yy0uMTU3LjQ1Ni0uNjkzIDEuMTQtMS4yMzUuODY2YS41Ny41NyAwIDAgMS0uMjUtLjc3N2MuMTM4LS4yNDcuNDItLjM5LjY5NS0uNC40MjIgMCAuNjk0LjI0NS43OS4zMW0xLjc4OC0xLjM3OGEzLjMgMy4zIDAgMCAwLS42MzYtLjUxMmMuMTY4LS40NC4zMTMtMS4wMTkuNDE2LTEuNjY0LjE0NS4xMDcuMzM4LjIuNTI4LjI2MS0uMTYzLS4xNDItLjQyOC0uNTEtLjU0NS0uNjgtLjMxLS40NTEtLjQ1My0uOTktLjUxNC0xLjUzLS4wODItMS4wMTQuMDEtMi43MDcuNjgzLTMuNTY1LS4yODIgMS43MjIgMS4yNjYgNC40MTUgNC4yOSAzLjY1My0uNDExLjg0NC0xLjM1MiAxLjcxNC0yLjEyOCAyLjA4LS42MzkuMy0xLjMwOC40MTctMi4wMzEuNDE0cS4xNTguMDY1LjMyNS4xMDdhMTAgMTAgMCAwIDAtLjM4OCAxLjQzNiIvPjxwYXRoIGZpbGw9IiMyNTgxYzQiIGQ9Ik00OS44NzEgNTAuNTFjLS4xNTcuNDU2LS42OTMgMS4xNC0xLjIzNS44NjZhLjU3LjU3IDAgMCAxLS4yNS0uNzc3Yy4xMzgtLjI0Ny40MTktLjM5LjY5NS0uNC40MjIuMDAxLjY5NC4yNDUuNzkuMzFNMzMuMjc4IDM2Ljg4NHYxLjc3YTYgNiAwIDAgMC0uNDc1LTEuMzU1IDIuMiAyLjIgMCAwIDAgLjQ3NS0uNDE1Ii8+PHBhdGggZmlsbD0iIzc0NDkwYyIgZD0iTTM4LjMyMiA0Ny4xMmMtLjAyOC40MS0uMjIyLjg0Ni0uMTc4IDEuMjgxLjAyLjE1My4wODMuMy4xNzguNDFhMSAxIDAgMCAxLS4wNDgtLjQxM2MuMDYtLjQyOC4yODMtLjc5OC4zMjMtMS4yNXYtLjAwN2wuMDAxLjAxNGMuMDE3LjQxLjA1My44MS0uMDE4IDEuMjIuMzkyLS42MjQuMjI4LTEuNzk3LS4wMjctMi40NTctLjAwNS4xOTQuMDAzLjQyOC4wMTUuNjYtLjA5Mi0uNDEzLS4zMzctLjc5NC0uNzA3LS45ODguMzUzLjQ0MS41MTguOTc2LjQ2MSAxLjUzIi8+PHBhdGggZmlsbD0iIzc0NDkwYyIgZD0iTTM3LjAwMyA0Ni40NzRjLjAzLjQxNy0uMDcuODItLjExOCAxLjIzNi0uMDA5LjEwOS0uMDA3LjIyNy4wMS4zMzQuMDM2LjIyMS4xMjYuNDIyLjIzOC42MDNhMi4yIDIuMiAwIDAgMS0uMTAyLS42MTNjLjAwNy0uNDE4LjIxNC0uODEyLjIzNC0xLjI0LjAyMi0uMjIuMDEtLjQ0LS4wMTItLjY1OGwtLjAxNS0uMTAycS4xMS4xNjEuMjIyLjNjLjE4OC4xOTkuMzUyLjM4OS40MDQuNjcxLjA2LjI2My4wNjIuNTUuMDM1LjgzNi4yMDMtLjQ2Ni4yNS0xLjA5Ny0uMS0xLjUxNS0uMjYzLS4zNS0uNTQ2LS42OTktLjczLTEuMDk2YTcuMzM3IDcuMzM3IDAgMCAxLS4xNjgtMS41OTRjLS4xNzMuNjIyLS4xNDggMS4yOS0uMDI2IDEuOTIuMDU5LjI5NC4xMTUuNjIuMTI4LjkxOE00MC4wNTkgNDYuODM2Yy40NDMuNDA2LjQwOCAxLjAzMS4yNjcgMS41NjQtLjA1LjE5LS4xMS4zNzMtLjE1OS41NjVxLjA5My0uMTE3LjE3NC0uMjQ0Yy4xNTQtLjI2Mi4yNjktLjU1Ni4yODQtLjg2My4wNC0uNDA0LS4xNjQtLjg4OS0uNTY2LTEuMDIyTTQxLjY2NiA0OC41OTNjLS4xMTQtLjU1LjAzNi0xLjI3My41MjQtMS42MDgtLjc1MS4xNjctMS4wMTQgMS40MTMtLjQ5MyAxLjk0Mi4wOC4wNzkuMTczLjE0Mi4yNzUuMTc0YTEgMSAwIDAgMS0uMzA2LS41MDgiLz48cGF0aCBmaWxsPSIjNzQ0OTBjIiBkPSJNMzguOTI4IDQ2LjM1OGMuNTgzLjMzNSAxLjAyNi44NTEgMS4xNTMgMS41MjQuMDQ2LjIxNi4wNjYuNDQxLjA4Mi42NzQuMzEtLjk0OC0uMjMyLTIuMDItMS4yMzUtMi4xOThNNDIuMjMxIDQ4Ljg5Yy0uMzY4LS45MDMtLjAwMy0xLjU1Ny42OC0yLjE1Ny0uODg3LjMxLTEuMzc5IDEuNDA0LS42OCAyLjE1Nk00My4zODggNDcuNjM3cS4wNy0uMzc1LjIzLS43MWEyLjYgMi42IDAgMCAwIC4wNTcgMS4wMzVjLjA4Mi4zLjA5OC42MDMuMTM0LjkxOHEuMDkxLS4zMzguMDgyLS42OTNjLS4wMDgtLjIyNy0uMDY2LS40NTItLjA4My0uNjgtLjAyNi0uMzMyLS4wMzctLjY3MS4wNDctLjk5M3EuMDYyLS4wOTIuMTMtLjE4MmMuMDg1LS4xMS4xNzUtLjIxOC4yNTgtLjMzMy0uNjAxLjI1OC0xLjA1NS45ODItLjg1NSAxLjYzOE0zNS42OTMgNDMuMzEzcS0uMDQyLjY0Mi4xMDUgMS4yNzFjLjA4OC4zOTguMDY0LjgxMi4wNzggMS4yMjcuMTc2LS4zOTcuMjMtLjg1Ny4xMTgtMS4yOC0uMTEyLS4zOTUtLjE5MS0uODA3LS4zLTEuMjE4TTM5LjE4OCAyOC4xMDVjLjEwOC0uMTIuMjU5LS4yLjQxNS0uMy4zMjItLjE4My42MTItLjUxNy42MjctLjkwOWExLjg0IDEuODQgMCAwIDEtLjczNy43MzNjLS4xNi4xLS4zMy4yMS0uNDM2LjM3OGEuNy43IDAgMCAwLS4wNjUuNTdjLjAzNC0uMTg0LjA4Ny0uMzUzLjE5Ni0uNDcyTTQxLjQ3NyAyNy4yNTZjLjA4MS4wOTUuMTYuMTkyLjIyOC4zMS4wNDMtLjU0LS42NTYtMS4xOC0xLjE1LS43OTMuMzk0LS4wNDMuNjguMjA1LjkyMi40ODNNNDIuOTk0IDI3Ljc2NWMuMTkuMjQyLjMyOC40OS40MDQuNzk2LjEzOS0uNDkzLS4yMTUtLjk3LS41NzMtMS4yNjctLjExMy0uMTA1LS4yNTQtLjE4MS0uMzI3LS4zMi0uMDEyLjA4My4wMzMuMTY1LjA3MS4yMzYuMTIyLjIuMjg4LjM3My40MjUuNTU1TTQ1LjEgMzAuMjc4Yy0uMjg5LS40MTQtLjQ2MS0uODctLjc3My0xLjI3LjAyMi40NjkuMzA4IDEuMTA1Ljc3NCAxLjI3TTM3LjI3NSAzMy41NGMuMTQ4LS4wODQuMjkyLS4xNS40NDQtLjIzMi0uODYtLjEwMi0xLjYzOC42OTItMS40MjUgMS41NTYuMTctLjU3My40NjYtMS4wMjYuOTgxLTEuMzI1TTQwLjgzNiAzMS4wMjJhLjM3LjM3IDAgMCAwIC4zMTQtLjI0IDEuMDUgMS4wNSAwIDAgMC0uMTEtLjk1Yy4wNi4yMi4wNDcuNDY0LS4wMi43OTctLjAxOC4wOTQtLjA4NC4yOTgtLjE4NC4zOTNNNDEuODA1IDMxLjAyMmMtLjEtLjA5NS0uMTY2LS4yOTktLjE4NS0uMzkyLS4wNjYtLjMzNC0uMDc3LS41NzYtLjAyLS43OTZhMS4wNSAxLjA1IDAgMCAwLS4xMDkuOTQ4Yy4wNTYuMTQ5LjE5LjIzMS4zMTQuMjRNNDAuNTQ0IDI5LjY4NWMuMTQuMDEyLjI3Mi4wNS40MTYuMDgzLS4yMjEtLjUxOC0xLjAxOC0uNDM0LTEuMjA2LjA2NS4xNC0uMDQuMjctLjA4My40LS4xMTNhLjIuMiAwIDAgMC0uMDA1LjA1M2MuMDA3LjExLjEwNC4xOTUuMjE3LjE4OGEuMi4yIDAgMCAwIC4xOTMtLjIxMi4yLjIgMCAwIDAtLjAxNS0uMDY0TTQxLjcgMjkuNzY5Yy4xNDQtLjAzNC4yNzUtLjA3Mi40MTYtLjA4NGEuMi4yIDAgMCAwLS4wMTYuMDY1Yy0uMDA3LjExLjA4LjIwNS4xOTMuMjEyYS4yMDQuMjA0IDAgMCAwIC4yMTctLjE4OC4yLjIgMCAwIDAtLjAwNS0uMDUzYy4xMy4wMy4yNi4wNzIuNC4xMTMtLjE4Ny0uNS0uOTg1LS41ODUtMS4yMDYtLjA2Nk00MS43OCAzMS44NzRjLS4wODMtLjAyOC0uMTUtLjA4NC0uMjQ1LS4xMTYtLjEyNi0uMDQzLS4yMjEuMDY0LS4yMjEuMDY0cy0uMDk2LS4xMDgtLjIyMi0uMDY0Yy0uMDkzLjAzMy0uMTYxLjA4OC0uMjQ1LjExNi0uMDgzLjAyNy0uMTk2LjA0Ny0uMzU3LS4wNTUtLjAwMi4wOC4yMTguMzE3LjQ3OS4yMjUuMTg3LS4wNjcuMjQxLS4wMDMuMzQ1LS4wMDNzLjE1OC0uMDY0LjM0NS4wMDNjLjI2LjA5Mi40OC0uMTQ1LjQ3OS0uMjI1LS4xNjIuMTAyLS4yNzMuMDgyLS4zNTcuMDU1TTQwLjg3OSAzMi4xNWMuMDYyLjM3OS44MzIuMzguODk0IDAtLjE1LjA4MS0uMjkuMDc3LS40NDguMDgzLS4xNTYtLjAwNi0uMjk4IDAtLjQ0Ny0uMDgzTTQwLjc3MiAzMS4zMzZhLjQuNCAwIDAgMSAuMjgyLjEwM2MuMS4wNzQuMTYxLS4wMzUuMTIyLS4wNzctLjI1NS0uMjc4LS40MTgtLjAyNS0uNDA0LS4wMjZNNDEuNTU5IDMxLjQzOWEuNC40IDAgMCAxIC4yODItLjEwNGMuMDE0LjAwMi0uMTQ5LS4yNS0uNDA0LjAyNy0uMDQuMDQyLjAyMy4xNTIuMTIyLjA3N000My4xMzIgMzAuMDZjLjAwNi43MDUtLjExNyAxLjM4LS40NDggMi4wMDYuNTgzLS40NTIuNzUzLTEuMzQ2LjQ0OC0yLjAwN00zOS45MyAzMi4wNDVjLS4zMy0uNjI2LS40NTQtMS4zMDItLjQ0Ny0yLjAwNy0uMzA2LjY2LS4xMzUgMS41NTYuNDQ3IDIuMDA3Ii8+PHBhdGggZmlsbD0iI2ZjYzIwMCIgZD0iTTQ0LjM1IDMxLjk2OGMuMDY1LjA5Mi4xNTIuMTY3LjI0NS4yNTgtLjM2MS0uMDI4LS42MDUtLjMzNC0uNjc3LS42NzdsLS4wMDguMDQxYy0uMDYxLjI4OS0uMjEzLjUzNy0uMzA0LjgxMi0uMDk0LjI2LS4xNjcuNTI2LS4yMDQuOC0uMDM4LjI3OC0uMDQ4LjU1OS4wMTIuODM5LS4zMy0uNTA5LS4yNi0xLjE4Ny0uMDY5LTEuNzM0LjA4LS4yNC4yMTQtLjQ1Ni4zMTYtLjY4Ni4xMTktLjI4NS4xOTYtLjU4NS4xNjUtLjkxMy4wMDcuMDE2LjA1My4wOTcuMDY2LjEyLjMwOC40OTYuNzg3Ljc3NyAxLjI2NyAxLjA4NC4wNzIuMDQ0LjE0NS4wODYuMjE1LjE0LS40OTMtLjA1Ni0xLjA3Ni0uMzU0LTEuMzUyLS44MDYuMDc2LjI1OS4xNjEuNTA2LjMyNy43MjJNNDIuOTkgMzMuMzg0cS0uMDAyIDAtLjAwMy0uMDAzbC4wMDEtLjAwNXpNNDYuODE0IDc0LjkyNGMtLjQ1OC4wNDEtLjg5LjA4LTEuNTM0LS4zMy0xLjI5NC0xLjAxNy0yLjU1LS44LTIuOTgtLjY4M2wtLjAwNi0zLjA3NGMuMTgtLjA2NCAxLjMzMi0uNDEgMi42MzIuNjE3bC4wMTMuMDFjLjI4LjE4LjU1NC4yNTEuODIyLjI1MS41MzUgMCAxLjA0My0uMjggMS41MDctLjU0NCAxLjA1My0uNTk5IDEuODQtLjY2IDEuODQtLjY2LTEuMDU0LS45MzctMS42OS0uODgtMi4zMDYtLjgyNS0uNDU4LjA0MS0uODkxLjA4LTEuNTM0LS4zMy0xLjI5NS0xLjAxNy0yLjU1LS44LTIuOTgtLjY4M2wtLjAwNi0yLjYzN3YtLjE1NGwtLjE1Mi0uMDE5Yy0uMDExLS4wMDEtLjk3LS4xMjctMS42OC0uODM4bC0uMDA2LS4wMDZhMi41IDIuNSAwIDAgMS0uMzc0LS40ODZsLS4wOTItLjE1NC0uMTUxLjA5NmMtLjAxNC4wMS0xLjQ0Ny45MDItNC4yMDgtLjAzNS0xLjQwNS0uNDc2LTIuNzgzLS42OTMtMy45ODYtLjYyNC0xLjIxNy4wNjktMi4xOTMuNDMyLTIuODM0IDEuMDUzLS42NDQtLjYxOC0xLjYyLS45NzctMi44MzktMS4wNC0xLjIwMy0uMDYyLTIuNTguMTYtMy45ODMuNjQzLTIuNzU2Ljk1LTQuMTkzLjA2NS00LjIwNy4wNTZsLS4xNTItLjA5OC0uMDkxLjE1N2EyLjUgMi41IDAgMCAxLS4zNzMuNDg3bC0uMDA2LjAwN2MtLjcwNS43MTQtMS42NjQuODQ0LTEuNjc2Ljg0NmwtLjE1Mi4wMTkuMDA4IDMuMDE2Yy0uMzE3LS4wNDMtMS4xODktLjEwMy0xLjg3LjQxMmExLjggMS44IDAgMCAxLTEuMDkuMzQ0LjUxLjUxIDAgMCAwLS40NzYtLjMzaC0uMDAxYS41LjUgMCAwIDAtLjM1Mi4xNDRsLS43NTQuMDAyYTEuNDIgMS40MiAwIDAgMC0xLjAxNS40MzJjLS4yMS4yMTQtLjM0NS40ODEtLjM5NS43NzFsLS44NDYuMDM3YS4yMjMuMjIzIDAgMCAwLS4yMTMuMjI1YzAgLjEyLjA5NC4yMTkuMjE0LjIyNGwuODQ2LjAzM2MuMTIzLjY4LjcwOSAxLjE5NyAxLjQxMyAxLjE5N2guMDAzbC43NTMtLjAwM2EuNS41IDAgMCAwIC4zNTIuMTQzaC4wMDJhLjUxLjUxIDAgMCAwIC40NzItLjMyMmguMDU2Yy4zMDggMCAuODA5LS4wNjMgMS4yNjctLjQwNi42MDQtLjQ1MyAxLjQzMS0uMzYyIDEuNjM5LS4zM2wuMDA1IDIuMzY2Yy0uMzE2LS4wNDMtMS4xODktLjEwMi0xLjg2OC40MTNhMS44IDEuOCAwIDAgMS0xLjA5LjM0NC41MS41MSAwIDAgMC0uNDc3LS4zM2gtLjAwMWEuNS41IDAgMCAwLS4zNTEuMTQ0bC0uNzU0LjAwMmExLjQyIDEuNDIgMCAwIDAtMS4wMTYuNDMxIDEuNDYgMS40NiAwIDAgMC0uMzk1Ljc3MmwtLjg0Ni4wMzhhLjIyLjIyIDAgMCAwLS4yMTMuMjI0YzAgLjEyLjA5NS4yMi4yMTQuMjI0bC44NDcuMDMzYy4xMjIuNjguNzA5IDEuMTk2IDEuNDEyIDEuMTk2aC4wMDNsLjc1NC0uMDAxYS41MDQuNTA0IDAgMCAwIC43MTMtLjAxLjUuNSAwIDAgMCAuMTEzLS4xN2guMDU2Yy4zMDggMCAuODEtLjA2NCAxLjI2OC0uNDA3LjYwMy0uNDUzIDEuNDMtLjM2MSAxLjYzOC0uMzNsLjAxIDQuMzMuMDQ5LjA1Yy4wNDkuMDUyLjk0OC45NTggMy40MzMuOTU4Ljg5MyAwIDEuOTkyLS4xMTcgMy4zMy0uNDMzbC4wMDctLjAwMmMyLjgzMy0uODA2IDMuNjM5LS42ODggNS4yLS4wNjYgMCAuMjg5LjE5Ni45MTcgMS40NS45MTcgMS4yNTIgMCAxLjYtLjU3NSAxLjYtLjk3MiAxLjQ4LS41ODYgMi4zMTctLjY4MyA1LjA3OC4wOWwuMDA4LjAwMWMxLjMxNC4zMDQgMi4zOTcuNDE4IDMuMjgyLjQxOCAyLjUyMiAwIDMuNDI4LS45MjIgMy40NzgtLjk3NWwuMDQ3LS4wNS0uMDEtNC42NjRjLjE4Ny0uMDY4IDEuMzI1LS40MTUgMi42MzEuNjE3bC4wMTQuMDFjLjI4LjE4LjU1NS4yNTIuODIzLjI1Mi41MzQgMCAxLjA1My0uMjY0IDEuNTA1LS41NDVhNC42NiA0LjY2IDAgMCAxIDEuODQxLS42NmMtMS4wNTUtLjkzOC0xLjY5MS0uODgtMi4zMDctLjgyNiIvPjxwYXRoIGZpbGw9IiM3NDQ5MGMiIGQ9Ik0yOC44MTIgODIuMjYyYy0xLjA3NSAwLTEuNDctLjQ3NS0xLjQ4NC0uOTI4LTEuNTExLS42LTIuMzA3LS43MzUtNS4xNTcuMDc2bC0uMDEuMDAyYy0xLjIxOS4yODgtMi4zNDIuNDM0LTMuMzM1LjQzNC0yLjUxOCAwLTMuNDIyLS45My0zLjQ1OS0uOTdsLS4wNDgtLjA1YS4wMy4wMyAwIDAgMS0uMDEtLjAyM2wtLjAxLTQuM2MtLjI2My0uMDM1LTEuMDIyLS4wOTItMS41ODMuMzI5YTIuMTQgMi4xNCAwIDAgMS0xLjI4OC40MTRoLS4wMzRhLjU0LjU0IDAgMCAxLS44NjEuMThoLS43NGExLjQ3NiAxLjQ3NiAwIDAgMS0xLjQ0NC0xLjE5OGwtLjgyLS4wMzJhLjI1Ni4yNTYgMCAwIDEtLjI0Ny0uMjU4YzAtLjE0LjEwOC0uMjU0LjI0Ny0uMjZsLjgxNy0uMDM1Yy4wNTctLjI5LjE5NS0uNTUzLjQtLjc2My4yOC0uMjg0LjY0OS0uNDQxIDEuMDQtLjQ0MmwuNzQtLjAwMmMuMTAxLS4wOTIuMjMtLjE0NC4zNjYtLjE0NGEuNTUuNTUgMCAwIDEgLjUuMzNjLjIzNy0uMDAyLjY2Ny0uMDUgMS4wNDctLjMzNy42Ni0uNSAxLjQ5LS40NyAxLjg1NC0uNDI1bC0uMDA1LTIuMjk3Yy0uMjYzLS4wMzctMS4wMTktLjA5NS0xLjU4My4zMjgtLjQ3Mi4zNTMtLjk5LjQxNy0xLjMyMi40MTRhLjU0Mi41NDIgMCAwIDEtLjg2MS4xOGwtLjc0LjAwMWExLjQ4IDEuNDggMCAwIDEtMS40NDUtMS4xOTdsLS44MTgtLjAzMmEuMjU5LjI1OSAwIDAgMS0uMDAxLS41MThsLjgxOC0uMDM2Yy4wNTYtLjI4OC4xOTQtLjU1Mi40LS43NjNhMS40NSAxLjQ1IDAgMCAxIDEuMDQtLjQ0MmwuNzQtLjAwMmEuNTQuNTQgMCAwIDEgLjc1MS4wMTcuNi42IDAgMCAxIC4xMTUuMTY5Yy4yMzYtLjAwMi42NjYtLjA1IDEuMDQ2LS4zMzcuNjU4LS41IDEuNDktLjQ2OSAxLjg1NS0uNDI0bC0uMDA4LTIuOTc2YzAtLjAxOC4wMTQtLjAzMi4wMzEtLjAzNWwuMTUyLS4wMmMuMDEtLjAwMS45NjQtLjEzNiAxLjY1NS0uODM2bC4wMDctLjAwNnEuMjE1LS4yMi4zNjctLjQ4bC4wOS0uMTU3YS4wNC4wNCAwIDAgMSAuMDIzLS4wMTcuMDQuMDQgMCAwIDEgLjAyNy4wMDVsLjE1Mi4wOThjLjAxNC4wMDkgMS40MzguODgzIDQuMTc3LS4wNiAxLjQwOC0uNDg0IDIuNzktLjcwOCAzLjk5Ny0uNjQ1czIuMTg3LjQxOCAyLjgzNyAxLjAyN2MuNjQ2LS42MTIgMS42MjUtLjk3MiAyLjgzMi0xLjA0IDEuMjA1LS4wNyAyLjU4OC4xNDcgNCAuNjI1IDIuNzYuOTM3IDQuMTYzLjA0OSA0LjE3Ny4wNGwuMTUyLS4wOTdhLjAzLjAzIDAgMCAxIC4wMjctLjAwNS4wMy4wMyAwIDAgMSAuMDIxLjAxNmwuMDkyLjE1NXEuMTUxLjI1OC4zNy40NzhsLjAwNS4wMDZjLjY5Ni42OTggMS42NS44MjggMS42Ni44MjlsLjE1MS4wMTljLjAxOC4wMDIuMDMuMDE2LjAzLjAzNGwuMDAyLjE1NC4wMDYgMi41OTFjLjUwNC0uMTMgMS43MTMtLjI4NCAyLjk2Ni43MDIuNjMuNDAxIDEuMDU3LjM2MyAxLjUxLjMyMy42MjItLjA1NiAxLjI2NS0uMTE1IDIuMzMxLjgzNHEuMDE2LjAxNS4wMS4wMzZhLjA0LjA0IDAgMCAxLS4wMy4wMjRjLS4wMDggMC0uNzkzLjA2Ny0xLjgyNy42NTQtLjQzLjI0NS0uOTY2LjU1LTEuNTIzLjU1LS4yOTkgMC0uNTczLS4wODQtLjg0MS0uMjU3bC0uMDE1LS4wMTFjLS4xMzctLjEwOS0xLjM2My0xLjAzNS0yLjU3Ni0uNjJsLjAwNyAzLjAwNGMuNTA0LS4xMyAxLjcxNS0uMjgzIDIuOTY2LjcuNjMuNDAzIDEuMDU2LjM2NCAxLjUxLjMyNC42MjItLjA1NiAxLjI2Ny0uMTE0IDIuMzMyLjgzM3EuMDE2LjAxNi4wMS4wMzdhLjA0LjA0IDAgMCAxLS4wMy4wMjRjLS4wMSAwLS45MTQuMDg2LTEuODI2LjY1My0uNDEzLjI1Ny0uOTU4LjU1Mi0xLjUyNC41NTItLjI5OCAwLS41NzMtLjA4NS0uODQxLS4yNTlsLS4wMTUtLjAxYy0xLjI0Mi0uOTgtMi4zMi0uNzA3LTIuNTc4LS42MmwuMDExIDQuNjM5YS4wMy4wMyAwIDAgMS0uMDEuMDIzbC0uMDQ2LjA1Yy0uMzQ1LjM2Ni0xLjQ3Mi45ODYtMy41MDQuOTg2LS45ODQgMC0yLjA5Mi0uMTQtMy4yOS0uNDE4bC0uMDA5LS4wMDNjLTIuNjc5LS43NDktMy41MzItLjY5Mi01LjAzNS0uMDk5LS4wMTYuNDYyLS40NS45ODctMS42MzYuOTg3bS0zLjYwNS0xLjQ5Yy43ODIgMCAxLjM3Ny4xOTEgMi4xNy41MDdhLjAzLjAzIDAgMCAxIC4wMi4wMzJjMCAuMTQ3LjA2OS44ODIgMS40MTUuODgyIDEuMTU1IDAgMS41NjUtLjUwNiAxLjU2NS0uOTM4cS4wMDEtLjAyNC4wMjItLjAzMmMxLjUzNC0uNjA3IDIuMzktLjY3IDUuMTAxLjA4OWwuMDA4LjAwMmMxLjE5LjI3NiAyLjI5My40MTYgMy4yNzIuNDE2IDIuNTE2IDAgMy40MTYtLjkyNSAzLjQ1My0uOTY0bC4wMzgtLjA0LS4wMTEtNC42NXEuMDAxLS4wMjQuMDIzLS4wMzNjLjIxNS0uMDc4IDEuMzU1LS40MTIgMi42NjUuNjIybC4wMTMuMDA4Yy4yNTUuMTY1LjUxOC4yNDcuODAyLjI0Ny41NDggMCAxLjA4My0uMjkgMS40ODctLjU0MWE0LjggNC44IDAgMCAxIDEuNzc4LS42NTVjLTEuMDA4LS44NzQtMS42MjUtLjgxOS0yLjIyMi0uNzY1bC0uMDAzLS4wMzUuMDAzLjAzNWMtLjQ2NS4wNDEtLjkwMy4wODEtMS41NTYtLjMzNS0xLjI2Ny0uOTk2LTIuNDg2LS44MDctMi45NTItLjY4YS4wNC4wNCAwIDAgMS0uMDMtLjAwNS4wNC4wNCAwIDAgMS0uMDE0LS4wMjhsLS4wMDctMy4wNzRxLjAwMS0uMDI0LjAyMy0uMDMzYy4yMTUtLjA3NyAxLjM2LS40MDggMi42NjUuNjIybC4wMTIuMDA5Yy4yNTUuMTY0LjUxNy4yNDUuODAyLjI0NS41MzkgMCAxLjA2Ni0uMyAxLjQ4OS0uNTQuODU4LS40ODkgMS41NS0uNjIyIDEuNzc2LS42NTUtMS4wMS0uODc0LTEuNjI1LS44MTktMi4yMjItLjc2NS0uNDY0LjA0MS0uOTAyLjA4MS0xLjU1NS0uMzM1LTEuMjY5LS45OTktMi40ODctLjgwOC0yLjk1Mi0uNjhhLjA0LjA0IDAgMCAxLS4wMy0uMDA2LjA0LjA0IDAgMCAxLS4wMTUtLjAyN2wtLjAwNy0yLjc2LS4xMjEtLjAxNWMtLjA0LS4wMDUtLjk4OC0uMTM1LTEuNy0uODVsLS4wMDYtLjAwNWEyLjUgMi41IDAgMCAxLS4zOC0uNDkzbC0uMDczLS4xMjMtLjEyMS4wNzhjLS4wMTMuMDA4LTEuNDc2LjkwNS00LjIzOC0uMDMyLTEuNDAyLS40NzYtMi43NzctLjY5LTMuOTczLS42MjItMS4yMDUuMDY4LTIuMTc3LjQyOS0yLjgxMSAxLjA0NGEuMDM0LjAzNCAwIDAgMS0uMDQ4IDBjLS42MzgtLjYxMy0xLjYxMi0uOTY5LTIuODE3LTEuMDMxLTEuMTk3LS4wNjItMi41Ny4xNi0zLjk3LjY0MS0yLjc5My45NjItNC4yMjMuMDYxLTQuMjM3LjA1MmwtLjEyMS0uMDc4LS4wNzMuMTI1cS0uMTU1LjI2OC0uMzc3LjQ5NGwtLjAwNi4wMDZjLS43MTcuNzI2LTEuNjg3Ljg1NS0xLjY5Ny44NTdsLS4xMjEuMDE1LjAwNyAyLjk4NXEwIC4wMTYtLjAxMS4wMjdhLjA0LjA0IDAgMCAxLS4wMjguMDA4Yy0uMzMzLS4wNDUtMS4xOC0uMDk2LTEuODQ0LjQwNS0uNDA4LjMxLS44NzQuMzUzLTEuMTExLjM1MmEuMDM0LjAzNCAwIDAgMS0uMDMyLS4wMjIuNDczLjQ3MyAwIDAgMC0uNzcyLS4xNzMuMDQuMDQgMCAwIDEtLjAyNC4wMWwtLjc1NC4wMDJjLS4zNzIgMC0uNzI0LjE1LS45OS40MmExLjQyIDEuNDIgMCAwIDAtLjM4Ni43NTUuMDM1LjAzNSAwIDAgMS0uMDMzLjAyOGwtLjg0Ni4wMzdhLjE5LjE5IDAgMCAwIC4wMDEuMzc5bC44NDcuMDMzYy4wMTYgMCAuMDMuMDEzLjAzMi4wMjlhMS40MSAxLjQxIDAgMCAwIDEuMzc5IDEuMTY4bC43NTYtLjAwMnEuMDE2LS4wMDIuMDI0LjAxYS40NzQuNDc0IDAgMCAwIC43Ny0uMTY5LjAzNC4wMzQgMCAwIDEgLjAzMy0uMDIxaC4wNTVjLjMyNSAwIC44MDYtLjA2OSAxLjI0Ni0uNC42MS0uNDU2IDEuNDI5LS4zNzIgMS42NjUtLjMzNi4wMTcuMDAzLjAzLjAxNy4wMy4wMzRsLjAwNSAyLjM2NnEwIC4wMTYtLjAxMi4wMjdhLjAzLjAzIDAgMCAxLS4wMjcuMDA4Yy0uMzM0LS4wNDUtMS4xOC0uMDk3LTEuODQzLjQwNmExLjgzIDEuODMgMCAwIDEtMS4xMTIuMzUxLjAzLjAzIDAgMCAxLS4wMzEtLjAyMi40OC40OCAwIDAgMC0uNDQ0LS4zMDcuNDcuNDcgMCAwIDAtLjMyOC4xMzMuMDQuMDQgMCAwIDEtLjAyNC4wMWwtLjc1NC4wMDJjLS4zNzQuMDAxLS43MjYuMTUtLjk5LjQyMWExLjQzIDEuNDMgMCAwIDAtLjM4Ny43NTQuMDM1LjAzNSAwIDAgMS0uMDMzLjAyOGwtLjg0NS4wMzhhLjE4Ny4xODcgMCAwIDAtLjE4LjE5YzAgLjEwMi4wNzkuMTg1LjE4LjE4OGwuODQ3LjAzM2MuMDE2LjAwMS4wMy4wMTMuMDMzLjAyOWExLjQxIDEuNDEgMCAwIDAgMS4zNzggMS4xNjhsLjc1Ny0uMDAxcS4wMTQgMCAuMDIzLjAxYy4wOS4wODQuMjA3LjEzMS4zMjguMTMxYS40NzcuNDc3IDAgMCAwIC40NDEtLjMuMDQuMDQgMCAwIDEgLjAzMi0uMDIyaC4wNTZjLjMyNSAwIC44MDUtLjA2OSAxLjI0Ny0uNC42MDUtLjQ1NCAxLjQyOC0uMzczIDEuNjY1LS4zMzYuMDE3LjAwMi4wMy4wMTcuMDMuMDM0bC4wMSA0LjMxNi4wMzkuMDRjLjAzNy4wMzkuOTIuOTQ3IDMuNDA4Ljk0Ny45ODkgMCAyLjEwNi0uMTQ1IDMuMzIxLS40MzJsLjAxLS4wMDJjMS40MDEtLjM5OSAyLjMwOS0uNTcgMy4wNS0uNTciLz48cGF0aCBmaWxsPSIjNzQ0OTBjIiBkPSJNNDYuNTk4IDc1LjQ0NGMtLjA5Ni4wMDEtLjE3NC4xMDQtLjE3My4yMzMgMCAuMTI4LjA3OS4yMzIuMTc1LjIzMS4wOTYgMCAuMTc0LS4xMDMuMTczLS4yMzIgMC0uMTI4LS4wNzgtLjIzMi0uMTc1LS4yMzJNNDYuNTg5IDcwLjJjLS4wOTcgMC0uMTc0LjEwNC0uMTc0LjIzMnMuMDc5LjIzMS4xNzUuMjMxLjE3NC0uMTA0LjE3NC0uMjMyLS4wNzktLjIzMS0uMTc1LS4yMzFNNDQuOTIzIDY5LjcyYy0uMDk2LjAwMi0uMTc0LjEwNS0uMTc0LjIzMyAwIC4xMjkuMDc5LjIzMS4xNzUuMjMxLjA5NyAwIC4xNzQtLjEwNC4xNzQtLjIzMSAwLS4xMjgtLjA3OC0uMjMyLS4xNzUtLjIzMk00NC45NCA3NC45NTZjLS4wOTggMC0uMTc1LjEwMy0uMTc1LjIzMiAwIC4xMjguMDguMjMyLjE3NS4yMy4wOTcgMCAuMTc0LS4xMDMuMTc0LS4yMyAwLS4xMjktLjA3OC0uMjMzLS4xNzUtLjIzMk00My45MTQgNzQuNTA5Yy0uMDk3IDAtLjE3NS4xMDQtLjE3NC4yMzIgMCAuMTI5LjA3OC4yMzIuMTc1LjIzMS4wOTYgMCAuMTc0LS4xMDMuMTc0LS4yMzFzLS4wNzktLjIzMi0uMTc1LS4yMzJNNDMuODk3IDY5LjI3NmMtLjA5NyAwLS4xNzUuMTA0LS4xNzQuMjMzIDAgLjEyOC4wOC4yMzEuMTc1LjIzMS4wOTcgMCAuMTc0LS4xMDQuMTc0LS4yMzMgMC0uMTI3LS4wNzgtLjIzLS4xNzUtLjIzIi8+PHBhdGggZmlsbD0iIzc0NDkwYyIgZD0iTTQ2Ljc3OSA3NC45MjljLS40NTkuMDQtLjg5Mi4wOC0xLjUzNS0uMzMtMS4yOTQtMS4wMTgtMi41NS0uODAxLTIuOTgtLjY4NGwtLjAwNi0zLjA3NGMuMTgtLjA2NCAxLjMzMi0uNDEgMi42MzIuNjE3bC4wMTMuMDFjLjI4LjE4MS41NTUuMjUyLjgyMi4yNTIuNTM1IDAgMS4wNDMtLjI4MSAxLjUwNy0uNTQ1IDEuMDUzLS41OTggMS44NC0uNjYgMS44NC0uNjYtMS4wNTQtLjkzNi0xLjY5LS44OC0yLjMwNi0uODI0LS40NTguMDQtLjg5MS4wNzktMS41MzQtLjMzLTEuMjk0LTEuMDE4LTIuNTUtLjgwMi0yLjk4LS42ODRsLS4wMDYtMi42MzZ2LS4xNTRsLS4xNTItLjAyYy0uMDExIDAtLjk3LS4xMjctMS42OC0uODM4bC0uMDA2LS4wMDZhMi41IDIuNSAwIDAgMS0uMzc0LS40ODVsLS4wOTItLjE1NS0uMTUxLjA5N2MtLjAxNC4wMS0xLjQ0Ny45MDEtNC4yMDgtLjAzNi0xLjQwNC0uNDc2LTIuNzgzLS42OTMtMy45ODYtLjYyNC0xLjIxNy4wNjktMi4xOTMuNDMzLTIuODM0IDEuMDU0LS42NDQtLjYxOS0xLjYyLS45NzctMi44MzktMS4wNC0xLjIwMy0uMDYzLTIuNTguMTYtMy45ODMuNjQzLTIuNzU2Ljk1LTQuMTkzLjA2NC00LjIwNy4wNTVsLS4xNTItLjA5Ny0uMDkuMTU2YTIuNSAyLjUgMCAwIDEtLjM3NC40ODhsLS4wMDYuMDA2Yy0uNzA1LjcxNC0xLjY2NC44NDUtMS42NzUuODQ2bC0uMTUyLjAyLjAwNyAzLjAxNWMtLjMxNy0uMDQzLTEuMTg5LS4xMDItMS44NjkuNDEzYTEuOCAxLjggMCAwIDEtMS4wOS4zNDMuNTEuNTEgMCAwIDAtLjQ3Ny0uMzI5aC0uMDAxYS41LjUgMCAwIDAtLjM1Mi4xNDNsLS43NTQuMDAyYTEuNDIgMS40MiAwIDAgMC0xLjAxNS40MzJjLS4yMS4yMTQtLjM0NS40ODItLjM5NS43NzJsLS44NDYuMDM3YS4yMjMuMjIzIDAgMCAwLS4yMTMuMjI1YzAgLjEyLjA5NC4yMTguMjE0LjIyM2wuODQ2LjAzM2MuMTIzLjY4LjcwOSAxLjE5NyAxLjQxMyAxLjE5N2guMDAzbC43NTMtLjAwMmEuNS41IDAgMCAwIC4zNTIuMTQyaC4wMDJhLjUxLjUxIDAgMCAwIC40NzItLjMyMmguMDU2Yy4zMDggMCAuODEtLjA2MiAxLjI2Ny0uNDA2LjYwNC0uNDUzIDEuNDMxLS4zNjIgMS42MzktLjMzbC4wMDYgMi4zNjdjLS4zMTctLjA0NC0xLjE5LS4xMDMtMS44NjkuNDEyYTEuOCAxLjggMCAwIDEtMS4wOS4zNDQuNTEuNTEgMCAwIDAtLjQ3Ni0uMzI5aC0uMDAyYS41LjUgMCAwIDAtLjM1MS4xNDRsLS43NTQuMDAxYTEuNDIgMS40MiAwIDAgMC0xLjAxNS40MzIgMS40NiAxLjQ2IDAgMCAwLS4zOTYuNzcybC0uODQ1LjAzN2EuMjIuMjIgMCAwIDAtLjIxMy4yMjRjMCAuMTIuMDk0LjIyLjIxMy4yMjRsLjg0Ny4wMzNjLjEyMi42OC43MDkgMS4xOTcgMS40MTMgMS4xOTdoLjAwMmwuNzU0LS4wMDJhLjUwNC41MDQgMCAwIDAgLjcxNC0uMDEuNS41IDAgMCAwIC4xMTItLjE3aC4wNTZjLjMwOCAwIC44MS0uMDYzIDEuMjY4LS40MDcuNjA0LS40NTIgMS40MzEtLjM2IDEuNjM5LS4zM2wuMDEgNC4zMy4wNDguMDVjLjA1LjA1Mi45NDguOTU5IDMuNDM0Ljk1OS44OTIgMCAxLjk5LS4xMTcgMy4zMjgtLjQzNGwuMDA4LS4wMDFjMi44MzMtLjgwNiAzLjY0LS42ODggNS4yLS4wNjYgMCAuMjg4LjE5Ni45MTcgMS40NS45MTcgMS4yNTIgMCAxLjYtLjU3NiAxLjYtLjk3MyAxLjQ4LS41ODYgMi4zMTctLjY4MiA1LjA3OC4wOWwuMDA4LjAwMmMxLjMxNC4zMDQgMi4zOTcuNDE3IDMuMjgyLjQxNyAyLjUyMyAwIDMuNDI4LS45MjIgMy40NzgtLjk3NWwuMDQ3LS4wNS0uMDEtNC42NjRjLjE4Ny0uMDY3IDEuMzI1LS40MTUgMi42MzEuNjE3bC4wMTQuMDFjLjI4LjE4MS41NTUuMjUzLjgyMy4yNTMuNTM0IDAgMS4wNTMtLjI2NSAxLjUwNS0uNTQ2YTQuNjYgNC42NiAwIDAgMSAxLjg0Mi0uNjZjLTEuMDU1LS45MzgtMS42OTItLjg4LTIuMzA3LS44MjVtLTM1LjQzMS00LjIwNS0uODctLjAzMi4wMTUtLjAxNmEuNDQuNDQgMCAwIDEgLjMxNS0uMTM2aC41NHptLTEuMzYyLS41MDVjLjIwNS0uMjEuNDc3LS4zMjUuNzY1LS4zMjVsLjU5Ni0uMDAydi4yOTRsLS41NC4wMDFhLjgwNi44MDYgMCAwIDAtLjc0NS41MjNsLS4zNTkuMDE2Yy4wNDgtLjE5LjE0My0uMzY1LjI4My0uNTA3bS43NyAxLjg4NGgtLjAwMmExLjA5IDEuMDkgMCAwIDEtMS4wNS0uODI4bC4zNTkuMDE0cS4wNi4xNTkuMTgxLjI4MmEuNzkuNzkgMCAwIDAgLjU2NS4yMzhoLjAwMmwuNTQtLjAwMXYuMjkzem0tLjI3Ni0uNzk4Ljg2OS0uMDM1di4xODRsLS41MzkuMDAxaC0uMDAxYS40NC40NCAwIDAgMS0uMzI5LS4xNW0tLjUxLS4yMjlhNjIgNjIgMCAwIDEtMS40MTMtLjA3MmMtLjAxMS0uMDAxLS4wMTMtLjAyMSAwLS4wMjEuNDA3LS4wMy45OTgtLjA1NiAxLjQxMi0uMDczLjIzNS0uMDEuNDctLjAzNi43MDYtLjAyMS4yMzUuMDE0LjQ3LjAzNi43MDUuMDk0cS4wMS4wMDMuMDA5LjAxMmMtLjQ2LjEzMi0uOTQ2LjExMS0xLjQyLjA4MW0xLjg5MiAxLjE2N2EuMTYuMTYgMCAwIDEtLjE1OS0uMTZsLS4wMDUtMi4xNzVhLjE2LjE2IDAgMCAxIC4xNi0uMTYuMTYuMTYgMCAwIDEgLjE1OS4xNTlsLjAwNSAyLjE3NmEuMTYuMTYgMCAwIDEtLjE2LjE2bS41ODItLjMxNmgtLjA3MnYtLjMxNmguMTA2em0uMTk4LTEuODQ4LS4xMjUgMS4xOGEyIDIgMCAwIDEtLjE0Ni4wMDNsLS4wMDItMS4xODRxLjEyIDAgLjI3MS0uMDE5Yy4yOTMtLjAzNi42NTUtLjE0Ljk5NS0uMzk3LjYxMi0uNDY0IDEuNDUxLS4zNyAxLjY1OS0uMzM3bC4wMDIgMS4xOTctLjEzNC0uMDE0LS4xNjMtMS4wNDctLjE0LjkyOC0uMTQ0LS45MjgtLjE0LjkyMy0uMTM0LS44NTYtLjE1NiAxLjAzYy0uMjc3LjA2LS41Ny4xNzEtLjgzMi4zNjgtLjIyNi4xNy0uNDY3LjI1NS0uNjguMjk4em0uODEgMS41MTFjLS4yLjE1LS40MTQuMjM2LS42MDkuMjgybC0uMDM0LS4zYy4yNjItLjA0OS41NjMtLjE1NC44NDktLjM2Ny42MDMtLjQ1MyAxLjQzLS4zNjIgMS42MzgtLjMzbC4wMDEuMzEyYy0uMzE0LS4wNDMtMS4xNzQtLjEtMS44NDUuNDAzbS0yLjA5MyA0LjA3Mi0uODctLjAzMS4wMTYtLjAxN2EuNDQuNDQgMCAwIDEgLjMxNS0uMTM0bC41NC0uMDAyek0xMCA3NS4xNThjLjIwNC0uMjEuNDc1LS4zMjUuNzY0LS4zMjZsLjU5Ni0uMDAxLS4wMDEuMDE3di4yNzZsLS41MzkuMDAyYS44LjggMCAwIDAtLjU2NS4yNC44LjggMCAwIDAtLjE4LjI4M2wtLjM2LjAxNmMuMDQ4LS4xOS4xNDMtLjM2NC4yODQtLjUwN20uNzY4IDEuODg0aC0uMDAyYTEuMDkgMS4wOSAwIDAgMS0xLjA1LS44MjhsLjM2LjAxNGEuOC44IDAgMCAwIC4xOC4yODIuOC44IDAgMCAwIC41NjYuMjM4aC4wMDJsLjU0LS4wMDJ2LjI5NXptLS4yNzYtLjc5OC44Ny0uMDM1di4xODRsLS41NC4wMDFhLjQ0LjQ0IDAgMCAxLS4zMTUtLjEzM3ptLS41MzUtLjIyMmE2MiA2MiAwIDAgMS0xLjQxMS0uMDczYy0uMDEzIDAtLjAxMy0uMDIgMC0uMDIuNDA3LS4wMy45OTgtLjA1NiAxLjQxLS4wNzQuMjM2LS4wMDkuNDcyLS4wMzYuNzA3LS4wMi4yMzUuMDEzLjQ3LjAzNi43MDYuMDkzYS4wMS4wMSAwIDAgMSAuMDA3LjAxM2MtLjQ2LjEzLS45NDUuMTEtMS40Mi4wOG0yLjAzIDEuMTEzYS4xNi4xNiAwIDAgMS0uMTEzLjA0Ny4xNi4xNiAwIDAgMS0uMTEzLS4wNDYuMTYuMTYgMCAwIDEtLjA0Ny0uMTEzbC0uMDA0LTIuMTc2cTAtLjA2NS4wNDYtLjExMmMuMDMtLjAzLjA3LS4wNDcuMTEyLS4wNDdhLjE2LjE2IDAgMCAxIC4xNi4xNThsLjAwNSAyLjE3N2MwIC4wNC0uMDE3LjA4Mi0uMDQ2LjExMm0uNDctLjI3aC0uMDcydi0uMzE1aC4wMTdsLjA5LS4wMDF6bS4xOTgtMS44NDctLjEyNiAxLjE3OWEyIDIgMCAwIDEtLjE0NS4wMDRsLS4wMDMtMS4xODRxLjEyMSAwIC4yNzItLjAxOGMuMjkzLS4wMzcuNjU2LS4xNDEuOTk1LS4zOTkuNjEyLS40NjMgMS40NS0uMzY5IDEuNjU4LS4zMzZsLjAwMyAxLjE5Ny0uMTM0LS4wMTUtLjE2NC0xLjA0Ni0uMTQuOTI4LS4xNDMtLjkyOC0uMTQuOTIzLS4xMzQtLjg1Ni0uMTU2IDEuMDNhMi4xIDIuMSAwIDAgMC0uODMyLjM2N2MtLjIyNi4xNy0uNDY3LjI1Ni0uNjguMjk5em0uODEgMS41MTFjLS4yLjE1LS40MTQuMjM2LS42MS4yODNsLS4wMzMtLjNjLjI2MS0uMDUuNTYzLS4xNTYuODQ4LS4zNjkuNjA0LS40NTIgMS40MzItLjM2MSAxLjY0LS4zM3YuMzEzYy0uMzE0LS4wNDItMS4xNzUtLjEtMS44NDUuNDAzbTI1Ljg1NyAzLjk0OGMuNDM3LS4wNjYgMS4xNS0uMjEgMS40Ni0uNTc1bC41NDcuNDA4Yy0uNDQuMzc4LTEuMzc1LjM5NC0xLjk2NS4zOTRoLS4xMDJhOSA5IDAgMCAxLTEuNjEyLS4xODYgNi4yIDYuMiAwIDAgMCAxLjY3Mi0uMDQxTTM3IDgwLjA1Yy40MTIuMDQ2LjgyNi4wNiAxLjI0NS4wMjMuNTU3LS4wNDggMS41MjctLjE1NiAxLjk1Mi0uNmwuMDAzLS4wMDMuNTY2LjQyMWMtLjM4NC4zMDctMS4xNTQuMzc0LTEuODA3LjM3NC0uMjg3IDAtLjU1MS0uMDEzLS43NS0uMDI0YTkgOSAwIDAgMS0xLjIwOS0uMTkxbTQuMDItLjQwNC4wMDEtLjAzcS4xODMtMi40NzcuMjMtNC45Ni4wNTcgMi42ODYuMjcxIDUuMzY1em0uNDU3LTEzLjU3My0uMDAxLjAxNGE5MSA5MSAwIDAgMC0uMjI4IDQuOTQ0IDkyIDkyIDAgMCAwLS4yNTMtNS4xNmMuMTcxLjA4Ni4zMzYuMTUyLjQ4Mi4yMDJNNDAuNDYgNzkuMjNsLjAwMS0uMDIzcS4yLTIuNjguMjQyLTUuMzY2LjA0MiAyLjg5LjI3IDUuNzd6bS40NzUtMTMuMzktLjAwMi4wMjVhOTIgOTIgMCAwIDAtLjIzIDUuMjM1IDkyIDkyIDAgMCAwLS4yNTItNS41NzRjLjE2LjEyNi4zMjUuMjMuNDg0LjMxNG0tLjU2LS4zNzQtLjAwNC4wNTVhOTIgOTIgMCAwIDAtLjIzIDYuNDk0YzAgMi4zOTkuMDk1IDQuNzk4LjI4NSA3LjE4OWwtLjM3Ni0uMjgtLjAxNi02LjkwOS0uMDE2LTYuOTA3cS4xNy4yMDIuMzU3LjM1OG0tLjUxOSAxMy43NDguMzIuMjM4Yy0uMjM4LjE3My0uNTg4LjI2LS45NDUuMzAyLS4zNTkuMDQzLS43MjQuMDQ0LS45OTYuMDQ2LTEuNzA0LjAwNi0zLjI4NS0uNzE2LTQuOTUzLS45ODMtMS40NS0uMjU0LTIuOTU1LS4wNzktNC4xMDMuODk1YTYgNiAwIDAgMS0uMTYtLjM5OGMxLjIwMS0xLjExOCAzLjY5LTEuMjQ4IDYuNDMyLS4zMTcgMS4xMi4zOCAyLjAzNS41IDIuNzQuNS44OTItLjAwMiAxLjQ0OC0uMTkxIDEuNjY1LS4yODNtLTguMzc0LjMzNmMuNzc4LS4wODQgMS41NDItLjAwMSAyLjMwMS4xNDhhOCA4IDAgMCAwLS40MjItLjAzMmMtMS4yNTUtLjA5NC0yLjU5LjIxMy0zLjU1IDEuMDU5YTIuOCAyLjggMCAwIDEtLjM1NS0uNDc3Yy42MjgtLjM3MyAxLjMwOC0uNjIzIDIuMDI2LS42OThtLTIuMDI4LjY5M2MtLjEtLjE2OC0uMTktLjM0NC0uMjY1LS41MWE1LjIgNS4yIDAgMCAxIDEuNTU5LS41OThjLjg5Mi0uMTY4IDEuNzY3LS4wNzUgMi42MzYuMTA2LTEuMzkxLS4xNjYtMi43NTYtLjAxNC0zLjkzIDEuMDAybTYuMDE3LTE1LjQ3YzIuMjE1Ljc1IDMuNjE3LjM5MSA0LjIuMTUxbC4wMzMgMTMuOTc2Yy0uMzYuMTQzLTEuNzY2LjU3NC00LjE0Mi0uMjMzLTEuNDA1LS40NzctMi43ODQtLjY5Mi0zLjk4Ny0uNjI0LTEuMTA1LjA2My0yLjAxLjM2OC0yLjY0Ny44OWwtLjAzMi0xMy43YzEuMTM5LTEuMjQ4IDMuNzItMS40MjkgNi41NzUtLjQ2bS0xMy40MTguMDMyYzIuODQyLS45NzkgNS40MTctLjgxNCA2LjU2Ni40MThsLjAzMiAxMy43MDNjLS42MzgtLjUxMy0xLjU0LS44MTEtMi42NC0uODY5LTEuMjAzLS4wNjItMi41OC4xNi0zLjk4My42NDMtMi4zNzMuODE4LTMuNzgyLjM5NC00LjE0LjI1M2wtLjAzNC0xMy45NzZjLjU4My4yMzYgMS45ODguNTkgNC4yLS4xNzFtLTQuMzE3IDE0LjQ2MWMuMjE0LjA5Ljc2Mi4yNzUgMS42MzcuMjc1LjcxIDAgMS42MzMtLjEyMSAyLjc2Ny0uNTEzIDIuNzM4LS45NDMgNS4yMjctLjgyNCA2LjQzNC4yODdhNiA2IDAgMCAxLS4xNTkuMzk4Yy0xLjE1My0uOTY3LTIuNjU2LTEuMTM2LTQuMTA2LS44NzQtMS42NjcuMjc1LTMuMjQ0IDEuMDA0LTQuOTQ5IDEuMDA1LS41NDIgMC0xLjQ2NS4wMDUtMS45NDItLjMzOHptMTAuNjcuNDdhNSA1IDAgMCAxLS4yNjMuNTFjLTEuMTc4LTEuMDEtMi41NDQtMS4xNTctMy45MzQtLjk4NC44NjctLjE4NSAxLjc0Mi0uMjgyIDIuNjM1LS4xMTguNTQ5LjEwOSAxLjA2Ny4zMSAxLjU2LjU5em0tOS4wMTYuNTQ4Yy0uNjUyLjA0LTIuMDA0LjEwMi0yLjU2LS4zMzdsLjU2NS0uNDI0LjAwMy4wMDNjLjQyOC40NDIgMS4zOTUuNTQ2IDEuOTU1LjU5YTYuMyA2LjMgMCAwIDAgMS4yNDQtLjAyOWMtLjM5OC4wOS0uOC4xNjItMS4yMDcuMTk3bS41Ni4yNzZhOSA5IDAgMCAxLTEuNjEuMTkzYy0uNTc2LjAwNC0xLjYwMy4wMTUtMi4wNy0uMzg0bC41NDUtLjQxaC4wMDJjLjMxMy4zNjIgMS4wMjIuNTAyIDEuNDYuNTY3YTYuMyA2LjMgMCAwIDAgMS42NzMuMDM0bS0yLjQ0Mi0xNS4zOTguMDE3IDcuMzM5LjAxNiA2LjQ3Ny0uMzc0LjI4MmE5MSA5MSAwIDAgMC0uMDEtMTMuNjg1bC0uMDA1LS4wNTRhMyAzIDAgMCAwIC4zNTYtLjM1OW0tLjM3OCAxNC4xLjAwMy4wMjQtLjUxLjM4M2E5MSA5MSAwIDAgMCAuMjQxLTUuNzdxLjA1MyAyLjY4Ni4yNjcgNS4zNjRtLS4wNTQtMTMuNjhhOTIgOTIgMCAwIDAtLjIyNiA1LjU3NSA5MyA5MyAwIDAgMC0uMjU0LTUuMjMzbC0uMDAyLS4wMjVhMy40IDMuNCAwIDAgMCAuNDgyLS4zMTdtLS40OTkgMTQuMTIxLS41MDIuMzc4YTkxIDkxIDAgMCAwIC4yNDYtNS4zNjdxLjA2IDIuNDgzLjI1NCA0Ljk1OHptLS4wNC0xMy43NzZhOTIgOTIgMCAwIDAtLjIzIDUuMTYyIDkxIDkxIDAgMCAwLS4yNS00Ljk0NGwtLjAwMi0uMDEzYy4xNDYtLjA1LjMxLS4xMTcuNDgxLS4yMDVtLS44OTEgNi44OTktLjAxNS02LjU3N2MuMDkzLS4wMi4yMjItLjA1LjM3My0uMWE5MiA5MiAwIDAgMC0uMjQ0IDYuNjc3YzAgMi40Mi4wOTcgNC44NDMuMjkgNy4yNTdsLjAwMi4wMTYtLjM4Ny4yOXptMTEuODAzIDguMTU4Yy0xLjcyOS0uNjg1LTIuNi0uNzM3LTUuNDAyLjA2LTMuOTk3Ljk0My01Ljc3LjA0NC02LjI3Mi0uMzAzbC40OC0uMzZhMSAxIDAgMCAwIC4yMzQuMmMuMjcyLjE2OS41OS4yNTkuODk4LjMyNyAxLjA2Ny4yMTYgMi4xNjkuMTQgMy4yMjUtLjA5NCAyLjQxLS41MTcgNC44Ny0xLjQ3NiA3LjE3Mi0uMDhhMS4xIDEuMSAwIDAgMS0uMzM1LjI1bS4zMzgtLjI1NWMtLjk2My0uODQtMi4zLTEuMTQyLTMuNTU1LTEuMDQzcS0uMjEyLjAxMi0uNDIyLjAzNWMuNzYtLjE1MyAxLjUyMy0uMjQgMi4zLS4xNi43Mi4wNzMgMS40LjMyIDIuMDMuNjlhMi43IDIuNyAwIDAgMS0uMzUzLjQ3OG0xLjk2MyAxLjA4N2EyLjE3IDIuMTcgMCAwIDEtMS43OTIgMGMtLjE1Mi0uMDY3LS4yMTUtLjI3Ni0uMTM2LS40NGwuMTItLjI0N2MuNTEuMzUgMS4zMTYuMzUgMS44MjYgMGwuMTE5LjI0NmMuMDc4LjE2NS4wMTYuMzczLS4xMzcuNDQxbTUuODA0LS44MDRjLTEuNTAxLS40Mi0yLjQzLS41ODQtMy4yMDgtLjU2Ni0uNzQuMDE2LTEuMzQ0LjE5My0yLjE0Ni41MTNhLjY1LjY1IDAgMCAxLS4zODQtLjIzYzEuODItMS4xMSAzLjc0My0uNzYyIDUuNzAzLS4yODkgMS41OTIuMzggMy4wNDQuNzYgNC42OTQuNDE1LjMxLS4wNy42MjUtLjE2Mi44OTctLjMzMmExIDEgMCAwIDAgLjIzMi0uMnYtLjAwMmwuNDg0LjM2Yy0uNDk2LjM1Mi0yLjI0OCAxLjI2LTYuMjcyLjMzMW01Ljk5LS45NzQuMDAyLS4wMTZhOTEgOTEgMCAwIDAgLjI1Ny02LjgzcTAtMy41NTctLjI3Ni03LjEwM2MuMTUxLjA0OC4yODEuMDguMzczLjA5OGwuMDE3IDcuMDA1LjAxNiA3LjEzNnptNC42Ni05Ljk4Yy4yMDguMDEyLjQwMS0uMDA1LjU5Mi0uMDIyLjQzNy0uMDM5Ljg1Ni0uMDc2IDEuNDU0LjI5LS4zNDcuMDIxLS42NzguMTQ5LTEuMDAzLjI3NC0uMzg3LjE1LS43NjEuMjkzLTEuMTY2LjI3NHptLS4yNjQtLjAwNC4xMjkuODJhMS41IDEuNSAwIDAgMS0uMjQ3LS4wMzR6bS0uMjg0LS4wMDUuMTIzLjc4YTIgMiAwIDAgMS0uMjI5LS4wNzV6bS0yLjE3My0xLjA5NmEzLjIgMy4yIDAgMCAxIDEuNTQyLjY4NmwuMDE0LjAxYy4xMTQuMDcyLjI5OS4xODIuMjk5LjE4MmwuMTM4Ljg5YTIgMiAwIDAgMS0uMjQxLS4xMzNjLS42NzQtLjUzLTEuMzQtLjcyNS0xLjg4Mi0uNzc0em0tLjI3LjA0LjEyOC44MmEzIDMgMCAwIDAtLjI1LS4wMTJ6bS0uMjg0LS4wMDQuMTI2LjgxMnEtLjEzMyAwLS4yNS4wMXptLS42NzYuMDVjLjA1Ny0uMDE4LjE5Mi0uMDU4LjM4NS0uMDg2bC4xMzQuODYxYy0uMjIzLjAyLS40LjA2LS41MTcuMDkxem0uMDAzIDEuMjNhMi43IDIuNyAwIDAgMSAuODQzLS4xMTdjLjY5Mi4wMSAxLjM0LjI1IDEuOTMuNzE2LjQ4MS40MTIgMS4xODMuMzc3IDEuMzg2LjMzNy0uMzE3LjIxLS44NzIuMjU4LTEuMzE5LS4wMjctMS4yNzgtMS4wMDUtMi40My0uODE4LTIuODQtLjcwMnptMy42OTcgNS4wMjMuMTI4LjgyYTEuNSAxLjUgMCAwIDEtLjI0OC0uMDM0em0tLjI4NC0uMDA1LjEyMS43ODFhMiAyIDAgMCAxLS4yMjctLjA3NnptLTIuMTczLTEuMDk1YTMuMiAzLjIgMCAwIDEgMS41NDEuNjg1bC4wMTQuMDFjLjExNC4wNzIuMy4xODMuMy4xODNsLjEzOC44OWEyIDIgMCAwIDEtLjI0Mi0uMTM0Yy0uNjc1LS41My0xLjM0LS43MjUtMS44ODItLjc3M3ptLS4yNy4wNC4xMjguODJhMyAzIDAgMCAwLS4yNTEtLjAxM3ptLS4yODUtLjAwNS4xMjcuODEyYTQgNCAwIDAgMC0uMjUyLjAxem0tLjY3Ni4wNWMuMDU2LS4wMTguMTkyLS4wNTcuMzg1LS4wODZsLjEzNC44NjJjLS4yMjMuMDE5LS40LjA1OC0uNTE3LjA5em0yLjg0NCAyLjE0Yy0xLjI3OC0xLjAwNi0yLjQzLS44MTgtMi44NC0uNzAzdi0uMjA4YTIuNyAyLjcgMCAwIDEgLjg0My0uMTE2Yy42OTEuMDEgMS4zNC4yNTEgMS45MjguNzE1LjQ5Ny4zNTcuOTkzLjM4OCAxLjM4Ny4zMzkgMCAwLS42NDUuMzc2LTEuMzE4LS4wMjhtLjk4My0uMzA0LjEyNS0uODE2YTQgNCAwIDAgMCAuNTkyLS4wMjJjLjQzNi0uMDQuODU1LS4wNzYgMS40NTQuMjktLjM0OS4wMjEtLjY3OS4xNDgtMS4wMDQuMjczLS4zODcuMTUtLjc2LjI5My0xLjE2Ny4yNzUiLz48cGF0aCBmaWxsPSIjMDAwIiBkPSJNMTEuMzY5IDc2LjIxNXYuMTg0bC0uNTQuMDAxYS40NC40NCAwIDAgMS0uMzE2LS4xMzRsLS4wMTUtLjAxNnpNMTEuMzY2IDc1LjY1N2wtLjg3LS4wMzIuMDE2LS4wMTZhLjQ0LjQ0IDAgMCAxIC4zMTUtLjEzNWwuNTQtLjAwMXpNMTEuMzU0IDcxLjQ1N2wtLjU0LjAwMmgtLjAwMWEuNDQuNDQgMCAwIDEtLjMxNS0uMTM0bC0uMDE1LS4wMTcuODctLjAzNXpNMTEuMzUgNzAuNzI2bC0uODY5LS4wMzEuMDE1LS4wMTdhLjQ0LjQ0IDAgMCAxIC4zMTYtLjEzNWwuNTM5LS4wMDJ6Ii8+PHBhdGggZmlsbD0iI2ZmZiIgZD0iTTM5LjczMiA3OC45MDNjLS4zNi4xNDMtMS43NjUuNTc0LTQuMTQyLS4yMzMtMS40MDUtLjQ3Ny0yLjc4My0uNjkyLTMuOTg2LS42MjQtMS4xMDYuMDYzLTIuMDEuMzY4LTIuNjQ4Ljg5bC0uMDMxLTEzLjdjMS4xMzgtMS4yNDggMy43Mi0xLjQzIDYuNTc1LS40NiAyLjIxNC43NSAzLjYxNy4zOTEgNC4xOTkuMTUxek0yOC42NTQgNzguOTMzYy0uNjM5LS41MTItMS41NDEtLjgxLTIuNjQtLjg2OS0xLjIwMy0uMDYyLTIuNTguMTYtMy45ODMuNjQzLTIuMzczLjgxOS0zLjc4Mi4zOTQtNC4xNDEuMjUzbC0uMDM0LTEzLjk3NmMuNTg0LjIzNyAxLjk4OS41OSA0LjItLjE3MSAyLjg0MS0uOTggNS40MTYtLjgxNSA2LjU2Ni40MTh6Ii8+PHBhdGggZmlsbD0iIzAwMCIgZD0iTTI0LjUwOSA3Mi43MzFoLS4wMzNhLjQuNCAwIDAgMS0uMTkyLS4wNTguNDMuNDMgMCAwIDEtLjE1OS0uMTg2bC0xLjE3LTIuNjMzaC0uMDM1YS42LjYgMCAwIDEtLjAyOC4xMTZxLS4wMjQuMDc1LS4wNTguMTU2bC0uMDYuMTQ1LS4wMzUuMDgtLjkyNSAyLjE1MWEuNC40IDAgMCAxLS4xNTIuMTc3LjQuNCAwIDAgMS0uMTkyLjA2aC0uMDM2di4wNDFsLjg1LS4wMDJ2LS4wNDFoLS4wMzZhLjIuMiAwIDAgMS0uMDk3LS4wMy4xNi4xNiAwIDAgMS0uMDctLjA4OHEtLjAyLS4wNTcuMDEzLS4xMzhoLS4wMDJsLjIyOS0uNTY2Ljk5Ny0uMDAzLjIyMS41NjlxLjA0My4xMi0uMDE2LjE4NmEuMTguMTggMCAwIDEtLjEzNy4wNjdoLS4wMzd2LjA0MWwxLjE2Mi0uMDAzem0tMi4xMjgtLjk3MS40NDUtMS4xMDUuNDMgMS4xMDN6Ii8+PHBhdGggZmlsbD0iIzAwMCIgZD0iTTI3LjI2MiA3Mi43MjVhLjUyLjUyIDAgMCAxLS4zNTQtLjEzNSAyIDIgMCAwIDEtLjE2NS0uMTczIDcuMjY0IDcuMjY0IDAgMCAxLS4yNzYtLjM3NGwtLjExNi0uMTczYTEuNyAxLjcgMCAwIDAtLjIxNS0uMjcyLjU1LjU1IDAgMCAwLS4yMS0uMTM2LjY2LjY2IDAgMCAwIC4zNjktLjEzMy43NC43NCAwIDAgMCAuMjI2LS4yOTIuOS45IDAgMCAwIC4wNzYtLjM1NC44LjggMCAwIDAtLjA3MS0uMzQzLjY0LjY0IDAgMCAwLS4xOTctLjIzOC45LjkgMCAwIDAtLjI5LS4xMzcgMS4zIDEuMyAwIDAgMC0uMzQ2LS4wNDRsLTEuMjkxLjAwM3YuMDRoLjA1M3EuMTA1IDAgLjE4LjA3Ni4wNzUuMDc1LjA4LjE4bC4wMDUgMi4yNTZhLjI2LjI2IDAgMCAxLS4wNzkuMTgxLjI0LjI0IDAgMCAxLS4xOC4wNzZoLS4wNTJ2LjA0aC4zMjNsLjQ3LS4wMDEuMzItLjAwMXYtLjA0MWgtLjA1YS4yNS4yNSAwIDAgMS0uMTgyLS4wNzUuMjQuMjQgMCAwIDEtLjA3Ny0uMTgxbC0uMDA1LTIuMzloLjA2MmwuMTQ4LS4wMDFxLjA4NS0uMDAzLjE2Mi4wMDFhLjQ2LjQ2IDAgMCAxIC4zNC4xNTRxLjEzNC4xNDcuMTQ2LjQzMS4wMDUuMDYxLS4wMDMuMTE4LS4wMDguMDU4LS4wMTYuMDk0YS42LjYgMCAwIDEtLjEzLjI3OS40Ni40NiAwIDAgMS0uMTk5LjEzNy44LjggMCAwIDEtLjIyLjA0IDEgMSAwIDAgMS0uMTU1IDB2LjA0MmEuMjcuMjcgMCAwIDEgLjE2Ni4wOC44LjggMCAwIDEgLjE4OS4yOXEuMDM0LjA2OC4wODUuMTU2bC4xMDQuMThhOCA4IDAgMCAwIC4xNjYuMjgxcS4wOS4xMzUuMjExLjIyNC4xMjIuMDkuMjg2LjEzNHQuMzc1LjA0M2guMzM2ek0yNC4xNTIgNjguNzUzaC0uMDRxLS4wNjQuMTgzLS4xNjYuMzI0YS43LjcgMCAwIDEtLjI1LjIxNi44LjggMCAwIDEtLjM1Ni4wNzdsLS41NDIuMDAxLS4wMDQtMS4xNjguNTgzLS4wMDFxLjEyNSAwIC4yMTEuMDg0YS4yOS4yOSAwIDAgMSAuMDg1LjIxMnYuMDQ1aC4wNHYtLjgzOWgtLjA0di4wNDJhLjMuMyAwIDAgMS0uMjk1LjMwMmgtLjU4NGwtLjAwMy0xLjIwOC43NTEtLjAwMnEuMTM1LjAxMi4yMjEuMDk5YS4zNS4zNSAwIDAgMSAuMDk4LjI1NHYuMDU3aC4wNHYtLjY0NGEuNi42IDAgMCAxLS4xMjIuMDMzcS0uMDg1LjAxNi0uMTg0LjAzLS4xLjAxMS0uMTg4LjAxMmwtLjYxNS4wMDEtLjQ4Mi4wMDEtLjMyNC4wMDF2LjA0MWguMDUzcS4xMDUgMCAuMTguMDc1dC4wOC4xODFsLjAwNSAyLjI1NWEuMjYuMjYgMCAwIDEtLjA3OC4xODEuMjQuMjQgMCAwIDEtLjE4LjA3NmgtLjA1M3YuMDQxaC4zMTJsLjQ4Mi0uMDAyaC40MzdsLjcxNi0uMDAyaC4wMTJ6TTI3LjEyMSA2OS40NzdhLjUyLjUyIDAgMCAxLS4zNTQtLjEzNSAyIDIgMCAwIDEtLjE2NS0uMTczIDcuNDczIDcuNDczIDAgMCAxLS4yNzYtLjM3NGwtLjExNi0uMTczYTEuNyAxLjcgMCAwIDAtLjIxNS0uMjcyLjU1LjU1IDAgMCAwLS4yMS0uMTM2LjY2LjY2IDAgMCAwIC4zNjktLjEzNC43NC43NCAwIDAgMCAuMjI2LS4yOTEuOS45IDAgMCAwIC4wNzYtLjM1NC44LjggMCAwIDAtLjA3MS0uMzQ0LjY0LjY0IDAgMCAwLS4xOTctLjIzNy45LjkgMCAwIDAtLjI5LS4xMzggMS4zIDEuMyAwIDAgMC0uMzQ2LS4wNDNsLTEuMjkxLjAwM3YuMDRoLjA1M3EuMTA1IDAgLjE4LjA3Ni4wNzUuMDc1LjA4LjE4bC4wMDUgMi4yNTZhLjI2LjI2IDAgMCAxLS4wNzkuMTgxLjI0LjI0IDAgMCAxLS4xOC4wNzZoLS4wNTJ2LjA0bDEuMTEzLS4wMDJ2LS4wNDFoLS4wNDlhLjI1LjI1IDAgMCAxLS4xODItLjA3NS4yNC4yNCAwIDAgMS0uMDc3LS4xODFsLS4wMDYtMi4zOWMuMDEzIDAgLjMyMi0uMDAzLjM3MyAwYS40Ni40NiAwIDAgMSAuMzQuMTU0cS4xMzQuMTQ2LjE0Ny40MzEuMDAzLjA2MS0uMDA0LjExOHQtLjAxNi4wOTRhLjYuNiAwIDAgMS0uMTI5LjI3OS40Ni40NiAwIDAgMS0uMi4xMzYuOC44IDAgMCAxLS4yMi4wNDEgMSAxIDAgMCAxLS4xNTUgMHYuMDQxYS4yOC4yOCAwIDAgMSAuMTY2LjA4Mi44LjggMCAwIDEgLjE5LjI4OHEuMDMzLjA3LjA4NC4xNTYuMDUyLjA4OS4xMDQuMTgyYTggOCAwIDAgMCAuMTY2LjI4cS4wOS4xMzUuMjEyLjIyNC4xMi4wOS4yODUuMTM0dC4zNzUuMDQzaC4zMzZ6TTIwLjM3OSA2OS40NTh2LjA0MWMuODc0LjUxNiAxLjk5Ny0xLjEwNyAxLjE0Ny0yLjQ0LS4wNzQtLjExNC0uMjctLjM3Mi0uODQzLS4zNzJsLS44My4wMDJjLS4zMy0uMzMzLS43Ny0uMDE4LS43Ny0uMDE4cy4wMDQuMDE1LjAxLjAyNWMuNjUtLjA1OS42NS41MS42NS41MWguMDAybC4wMDYgNS4zNThjLS4wOTMuMTA0LS4yNS4xODUtLjUxNS4xNmwtLjAxLjAyNnMuNDQuMzE1Ljc3LS4wMThsLjAwNC0uMDAxLjAwNC4wMDFjLjMzLjMzMy43Ny4wMTguNzcuMDE4cy0uMDA0LS4wMTUtLjAxLS4wMjVjLS4yNy4wMjUtLjQyOC0uMDYtLjUyLS4xNjhsLS4wMDctNS43MTRoLjMzMmMxLjExNC4wODEuOTIzIDIuNjk3LS4xOSAyLjYxNSIvPjxwYXRoIGZpbGw9IiMwMDAiIGQ9Ik0yMS4yMzEgNzEuNTU0YS4yNy4yNyAwIDAgMCAuMjctLjI3Mi4yNy4yNyAwIDAgMC0uMjctLjI3MS4yNy4yNyAwIDAgMC0uMjcuMjcxYzAgLjE1LjEyMS4yNzIuMjcuMjcyTTM1LjI4MyA2OC4yN2EuMjcuMjcgMCAwIDAgLjI3LS4yNzEuMjcuMjcgMCAwIDAtLjI3LS4yNzIuMjcuMjcgMCAwIDAtLjI3LjI3MmMwIC4xNS4xMjEuMjcxLjI3LjI3MU0yMi4yNzkgNzQuMDk5YTEuMjYgMS4yNiAwIDAgMC0uNTM0LS41IDEuOCAxLjggMCAwIDAtLjgxMi0uMTc1aC0xLjQ1MWwuMDA0LjA0MWguMDVxLjEwNSAwIC4xODMuMDc3LjA3OC4wNzUuMDc4LjE4M3YyLjI3OGEuMjYuMjYgMCAwIDEtLjA4LjE4My4yNS4yNSAwIDAgMS0uMTgyLjA3NmgtLjA1M3YuMDQxaDEuNDUxcS40NjYgMCAuODEyLS4xNzcuMzQ1LS4xNzYuNTM0LS41LjE4OC0uMzIyLjE4OC0uNzYydC0uMTg4LS43NjVtLS40ODMgMS40NDRxLS4xMjcuMjg3LS4zNTQuNDQ2YS45Mi45MiAwIDAgMS0uNTQyLjE1OGgtLjYwNnYtMi41NjZoLjYwNXEuMzExIDAgLjU0LjE1OHQuMzU2LjQ0N3EuMTI3LjI4Ny4xMjcuNjc5LjAwMi4zOS0uMTI2LjY3OE0yNC42NTQgNzMuNDIydi4wNGguMDM3YS4yLjIgMCAwIDEgLjE0Mi4wNjdxLjA2LjA2NC4wMTQuMTgybC0uNzggMS44NTgtLjc0Ny0xLjg1MmguMDA1cS0uMDQ2LS4xMjMuMDE0LS4xOWEuMTguMTggMCAwIDEgLjEzNy0uMDY1aC4wMzd2LS4wNDFoLTEuMTc0di4wNDFoLjAzM3EuMDkzIDAgLjE5NC4wNi4xLjA2LjE2Ni4xOTloLjAwMmwxLjIgMi42NTJoLjAzN2ExIDEgMCAwIDEgLjAyOC0uMTE3IDMgMyAwIDAgMSAuMTU1LS4zODVsLjk3Mi0yLjE3MmEuNC40IDAgMCAxIC4xNTYtLjE3OC40LjQgMCAwIDEgLjE5My0uMDZoLjAzN3YtLjA0aC0uODU4TTI3LjQ1MyA3Ni4yNTdhLjQuNCAwIDAgMS0uMTk1LS4wNi40NC40NCAwIDAgMS0uMTYtLjE4N2wtMS4xNzUtMi42NjRoLS4wMzdhLjYuNiAwIDAgMS0uMDI4LjExN3EtLjAyNS4wNzUtLjA2LjE1OGwtLjA2LjE0Ni0uMDM1LjA4LS45NCAyLjE3MmEuNDMuNDMgMCAwIDEtLjE1NC4xNzkuNC40IDAgMCAxLS4xOTQuMDZoLS4wMzd2LjA0aC44NTh2LS4wNEgyNS4yYS4yLjIgMCAwIDEtLjA5OC0uMDMxLjE3LjE3IDAgMCAxLS4wNy0uMDg4cS0uMDItLjA1Ny4wMTMtLjE0aC0uMDAybC4yMzItLjU3MmgxLjAwOGwuMjIyLjU3NXEuMDQzLjEyLS4wMTcuMTg4YS4xOS4xOSAwIDAgMS0uMTM5LjA2OGgtLjAzN3YuMDQxaDEuMTc0di0uMDRoLS4wMzN6bS0yLjExNS0uOTg2LjQ1Mi0xLjExNC40MzIgMS4xMTR6TTM0LjUwOSA2Ny4zM2ExLjI1IDEuMjUgMCAwIDAtLjUzLS40OTQgMS43NiAxLjc2IDAgMCAwLS44MDQtLjE3MWwtMS40MzcuMDAzdi4wNDloLjAxNnEuMDY1IDAgLjA5My4wNDl0LS4wMDguMTE3bC0xLjUzMSAyLjM1M2gtLjAwMmEuNy43IDAgMCAxLS4xNy4xODQuMzMuMzMgMCAwIDEtLjE5Ny4wN2gtLjAyOXYuMDRsLjg2Ni0uMDAydi0uMDRoLS4wMzZhLjE2LjE2IDAgMCAxLS4xMDEtLjAzNC4xMy4xMyAwIDAgMS0uMDU1LS4wODdxLS4wMS0uMDU1LjAzLS4xMmgtLjAwMWwuNjA2LTEuMDE5LjgzNC0uMDAyLjAwMi45OTRhLjI2LjI2IDAgMCAxLS4wNzguMTgxLjI0LjI0IDAgMCAxLS4xOC4wNzZoLS4wNTN2LjA0bDEuNDM3LS4wMDNxLjQ2IDAgLjgwMy0uMTc3LjM0LS4xNzUuNTI3LS40OTUuMTg1LS4zMi4xODQtLjc1Ni4wMDItLjQzNS0uMTg2LS43NTZtLTMuMTk3Ljc0My42NDYtMS4wODQuMDkzLS4xMzMuMDAzIDEuMjE2em0yLjcyMy42ODdxLS4xMjYuMjg1LS4zNS40NDJhLjkuOSAwIDAgMS0uNTM1LjE1OWwtLjYuMDAxLS4wMDYtMi41NGguNnEuMzA3LS4wMDIuNTM0LjE1NC4yMjguMTU3LjM1My40NDEuMTI2LjI4NS4xMjcuNjcxIDAgLjM4Ny0uMTIzLjY3Mk0zOC4xMzkgNjkuNDU0YS40LjQgMCAwIDEtLjE5NS0uMDYuNDMuNDMgMCAwIDEtLjE2LS4xODhsLTEuMTc1LTIuNjYzaC0uMDM3YS42LjYgMCAwIDEtLjAyOC4xMTdxLS4wMjUuMDc1LS4wNi4xNThjLS4wMjIuMDU1LTEuMDM1IDIuMzk4LTEuMDM1IDIuMzk4YS40My40MyAwIDAgMS0uMTU0LjE3OC40LjQgMCAwIDEtLjE5NC4wNmgtLjAzN3YuMDQxaC44NTh2LS4wNGgtLjAzNmEuMi4yIDAgMCAxLS4wOTgtLjAzMS4xNy4xNyAwIDAgMS0uMDctLjA4OXEtLjAyMS0uMDU3LjAxMy0uMTM5aC0uMDAybC4yMzItLjU3MmgxLjAwOGwuMjIyLjU3NXEuMDQzLjEyLS4wMTcuMTg4YS4xOS4xOSAwIDAgMS0uMTM5LjA2OGgtLjAzN3YuMDRoMS4xNzR2LS4wNHptLTIuMTE1LS45ODcuNDUyLTEuMTE0LjQzMiAxLjExNHpNMzIuOTc2IDcxLjk4NHEtLjA2Ni4xODQtLjE2OS4zMjdhLjcuNyAwIDAgMS0uMjUzLjIxN3EtLjE1LjA3Ny0uMzYuMDc3aC0uNTQ3di0yLjQxOGEuMjcuMjcgMCAwIDEgLjA4LS4xODQuMjUuMjUgMCAwIDEgLjE4Mi0uMDc2aC4wNTN2LS4wNDFoLTEuMTI4di4wNDFoLjA1M3EuMTA1IDAgLjE4Mi4wNzYuMDc1LjA3Ni4wOC4xODR2Mi4yNzhhLjI3LjI3IDAgMCAxLS4wOC4xODMuMjUuMjUgMCAwIDEtLjE4Mi4wNzZoLS4wNTN2LjA0MWgxLjk3OGwuMjA1LS43ODF6TTM1LjA4NCA2OS44MzdhMi40IDIuNCAwIDAgMS0uMzc2LjA0aC0xLjUzM2EyIDIgMCAwIDEtLjE4OC0uMDEyIDMgMyAwIDAgMS0uMTg2LS4wMjggMSAxIDAgMCAxLS4xMjUtLjAzM3YuNjVsLjA0LS4wMDV2LS4wNTNxMC0uMTYuMDk5LS4yNTlhLjM2LjM2IDAgMCAxIC4yNTctLjEwM2guNjIxdjIuNDI2YS4yNi4yNiAwIDAgMS0uMDguMTg0LjI1LjI1IDAgMCAxLS4xODEuMDc2aC0uMDU0di4wNGgxLjEyOXYtLjA0aC0uMDU0YS4yNS4yNSAwIDAgMS0uMTgyLS4wNzYuMjcuMjcgMCAwIDEtLjA4LS4xODR2LTIuNDI2aC42MThhLjM2LjM2IDAgMCAxIC4yNTguMTAzLjM1LjM1IDAgMCAxIC4wOTguMjU5di4wNTNsLjA0LjAwNXYtLjY1YS42LjYgMCAwIDEtLjEyLjAzMk0zNy45NzUgNzIuNzJhLjQuNCAwIDAgMS0uMTk0LS4wNi40NC40NCAwIDAgMS0uMTYtLjE4OGwtMS4xNzUtMi42NjRoLS4wMzdhLjYuNiAwIDAgMS0uMDI5LjExNyAyIDIgMCAwIDEtLjA1OS4xNTlsLTEuMDM1IDIuMzk4YS40My40MyAwIDAgMS0uMTU0LjE3OC40LjQgMCAwIDEtLjE5NS4wNmgtLjAzNnYuMDRoLjg1OHYtLjA0aC0uMDM3YS4yLjIgMCAwIDEtLjA5OC0uMDMuMTcuMTcgMCAwIDEtLjA2OS0uMDg5cS0uMDIxLS4wNTcuMDEzLS4xNGgtLjAwM2wuMjMyLS41NzJoMS4wMDhsLjIyMy41NzVxLjA0My4xMi0uMDE3LjE4OGEuMTguMTggMCAwIDEtLjE0LjA2OGgtLjAzNnYuMDQxaDEuMTc0di0uMDR6bS0yLjExNC0uOTg3LjQ1My0xLjExNC40MzEgMS4xMTR6Ii8+PC9zdmc+"
            alt="University of Birmingham"
            width={280}
            height={92}
            style={{ display: "block", width: "280px", height: "auto", maxWidth: "100%" }}
          />
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

              <div className="cardIcon" aria-hidden="true">{card.icon}</div>

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

                  <th >Signatory</th>

                  <th >Administrator</th>

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

                      <td >

                        {request.Signatory

                          ? request.Signatory.Title || request.Signatory.EMail || "-"

                          : "-"}

                      </td>

                      <td >{request.AdminLabel || "-"}</td>

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
