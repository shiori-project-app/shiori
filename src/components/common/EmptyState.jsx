export const EmptyState = ({ title, children, action }) => (
  <div className="empty-state">
    <h2 className="empty-state__title">{title}</h2>
    <p>{children}</p>
    {action}
  </div>
);
