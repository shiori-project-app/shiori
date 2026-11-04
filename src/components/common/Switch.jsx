export const Switch = ({ label, checked, disabled = false, onChange }) => (
  <button type="button" className="switch" role="switch" aria-checked={checked} disabled={disabled} onClick={onChange}>
    <span>{label}</span>
    <i className="switch__track" />
  </button>
);
