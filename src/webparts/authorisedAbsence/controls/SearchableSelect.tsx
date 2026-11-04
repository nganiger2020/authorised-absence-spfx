import * as React from "react";

/** Search augments the native select, preserving its keyboard and screen reader behaviour. */
export const SearchableSelect: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = props => {
  const [search, setSearch] = React.useState<string>("");
  const options = React.Children.toArray(props.children) as React.ReactElement<React.OptionHTMLAttributes<HTMLOptionElement>>[];
  const query = search.trim().toLowerCase();
  const textOf = (value: React.ReactNode): string => React.Children.toArray(value).map(node =>
    React.isValidElement(node) ? textOf((node.props as { children?: React.ReactNode }).children) : String(node)
  ).join("");
  const matching = options.filter(option => !query || textOf(option.props.children).toLowerCase().indexOf(query) >= 0);
  // Keep the current selection in the DOM while searching so filtering never changes the saved value.
  const visible = options.filter(option => matching.indexOf(option) >= 0 ||
    String(option.props.value) === String(props.value) || option.props.value === "");
  const searchId = props.id ? props.id + "Search" : undefined;
  return (
    <div className="searchableSelect">
      <input
        id={searchId}
        type="search"
        value={search}
        disabled={props.disabled}
        aria-label={"Search options for " + (props["aria-label"] || props.id || "dropdown")}
        aria-controls={props.id}
        placeholder="Type to search..."
        onChange={event => setSearch(event.target.value)}
      />
      <select {...props}>{visible}</select>
      {query && <span className="hint" role="status">
        {matching.filter(option => option.props.value !== "").length} matching options. Current selection is retained.
      </span>}
    </div>
  );
};
