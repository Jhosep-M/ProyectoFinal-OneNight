const TONES = {
  success: 'alert-success',
  error: 'alert-error',
  warning: 'alert-warning',
  info: 'alert-info',
};

export default function Alert({ tone = 'info', title, message, children, onClose }) {
  return (
    <div className={`alert ${TONES[tone] || TONES.info}`.trim()} role="alert">
      <div className="alert-body">
        {title && <strong className="alert-title">{title}</strong>}
        {message && <div className="alert-content">{message}</div>}
        {children && <div className="alert-content">{children}</div>}
      </div>
      {onClose && (
        <button className="alert-close" onClick={onClose} aria-label="Cerrar">
          ×
        </button>
      )}
    </div>
  );
}
