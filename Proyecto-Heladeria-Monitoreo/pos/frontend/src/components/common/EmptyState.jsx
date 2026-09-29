export default function EmptyState({ title, description, action }) {
  return (
    <div className="empty-state">
      <div className="empty-icon" aria-hidden="true">∅</div>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action && <div className="empty-action">{action}</div>}
    </div>
  );
}
