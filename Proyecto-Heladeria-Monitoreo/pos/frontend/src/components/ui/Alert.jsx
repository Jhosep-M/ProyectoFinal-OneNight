const variantMap = {
  success: 'alert-success',
  danger: 'alert-danger',
  warning: 'alert-warning',
  info: 'alert-info',
};

export default function Alert({ variant = 'info', icon, children, className = '' }) {
  return (
    <div className={`alert ${variantMap[variant]} d-flex align-items-center ${className}`} role="alert">
      {icon && <i className={`bi ${icon} me-2`}></i>}
      <div>{children}</div>
    </div>
  );
}
