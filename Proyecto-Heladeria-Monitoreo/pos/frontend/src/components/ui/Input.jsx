export default function Input({
  icon,
  label,
  error,
  className = '',
  ...props
}) {
  return (
    <div className="mb-3">
      {label && <label className="form-label">{label}</label>}
      <div className="input-group">
        {icon && (
          <span className="input-group-text">
            <i className={`bi ${icon}`}></i>
          </span>
        )}
        <input className={`form-control ${error ? 'is-invalid' : ''} ${className}`} {...props} />
        {error && <div className="invalid-feedback">{error}</div>}
      </div>
    </div>
  );
}
