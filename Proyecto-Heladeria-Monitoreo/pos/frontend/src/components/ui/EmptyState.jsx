export default function EmptyState({ icon = 'bi-inbox', title, description, action }) {
  return (
    <div className="empty-state">
      <div className="empty-icon-wrap" aria-hidden="true">
        <i className={`bi ${icon} empty-icon`}></i>
      </div>
      <h3 className="h6 mb-1" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>{title}</h3>
      {description && <p className="small mb-0 mx-auto" style={{ maxWidth: '34ch' }}>{description}</p>}
      {action && <div className="empty-action">{action}</div>}
    </div>
  );
}
