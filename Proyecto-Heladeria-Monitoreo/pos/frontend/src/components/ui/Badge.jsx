const variantMap = {
  success: 'badge-success',
  danger: 'badge-error',
  error: 'badge-error',
  warning: 'badge-warning',
  info: 'badge-info',
  secondary: 'badge-neutral',
  neutral: 'badge-neutral',
  accent: 'badge-accent',
};

export default function Badge({ variant = 'secondary', children, className = '' }) {
  return (
    <span className={`badge ${variantMap[variant] ?? 'badge-neutral'} ${className}`}>
      {children}
    </span>
  );
}
