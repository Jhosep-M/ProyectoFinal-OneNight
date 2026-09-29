const variantMap = {
  success: 'bg-success',
  danger: 'bg-danger',
  warning: 'bg-warning',
  info: 'bg-info',
  secondary: 'bg-secondary',
  light: 'bg-light text-dark',
};

export default function Badge({ variant = 'secondary', children, className = '' }) {
  return (
    <span className={`badge ${variantMap[variant]} ${className}`}>
      {children}
    </span>
  );
}
