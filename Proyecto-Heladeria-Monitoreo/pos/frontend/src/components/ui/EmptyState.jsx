export default function EmptyState({ icon = 'bi-inbox', title, description, action }) {
  return (
    <div className="text-center py-5">
      <i className={`bi ${icon} fs-1 text-muted mb-3`}></i>
      <h5 className="text-muted">{title}</h5>
      {description && <p className="text-muted">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
