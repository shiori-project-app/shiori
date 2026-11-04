export const PanelSearchForm = ({ id, label, value, placeholder, onChange, onSubmit }) => {
  const submit = (event) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <form className="download-panel__search" onSubmit={submit}>
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>

      <input
        id={id}
        className="download-panel__input"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />

      <button type="submit" className="btn btn--sm">
        Search
      </button>
    </form>
  );
};
