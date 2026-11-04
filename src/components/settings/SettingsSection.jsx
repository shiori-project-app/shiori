export const SettingsSection = ({ title, note, hint, children }) => (
  <section className="settings-section">
    <h2 className="settings-section__title">
      {title}
      {note && <span className="settings-section__note">{note}</span>}
    </h2>

    {hint && <p className="settings-section__hint">{hint}</p>}
    {children}
  </section>
);

export const SettingsList = ({ children }) => <div className="settings-list">{children}</div>;

export const SettingsRow = ({ title, description, children }) => (
  <div className="settings-row">
    <div>
      <h3 className="settings-row__name">{title}</h3>
      <p className="settings-row__text">{description}</p>
    </div>

    {children}
  </div>
);
