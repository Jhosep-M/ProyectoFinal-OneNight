const TONES = {
  success: 'alert-success',
  danger: 'alert-error',
  error: 'alert-error',
  warning: 'alert-warning',
  info: 'alert-info',
};

export default function Alert({
  tone,
  variant,
  icon,
  title,
  children,
  onClose,
  className = '',
}) {
  const key = tone || variant || 'info';
  const toneClass = TONES[key] || TONES.info;
  const live = key === 'danger' || key === 'error' ? 'assertive' : 'polite';

  return (
    <div className={`alert ${toneClass} ${className}`.trim()} role="alert" aria-live={live}>
      {icon && <i className={`bi ${icon}`} aria-hidden="true"></i>}
      <div className="alert-body">
        {title && <strong className="alert-title">{title}</strong>}
        {children && <div className="alert-content">{children}</div>}
      </div>
      {onClose && (
        <button type="button" className="alert-close" onClick={onClose} aria-label="Cerrar">
          ×
        </button>
      )}
    </div>
  );
}
