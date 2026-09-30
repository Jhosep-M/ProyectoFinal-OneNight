import { motion } from 'framer-motion';

const variantMap = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  danger: 'btn-danger',
  outline: 'btn-outline-primary',
  outlineSecondary: 'btn-outline-secondary',
  ghost: 'btn-ghost',
};

const sizeMap = {
  sm: 'btn-sm',
  md: '',
  lg: 'btn-lg',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  children,
  className = '',
  disabled,
  ...props
}) {
  const isDisabled = disabled || loading;
  return (
    <motion.button
      whileTap={isDisabled ? undefined : { scale: 0.98 }}
      className={`btn ${variantMap[variant] ?? 'btn-primary'} ${sizeMap[size]} ${className}`}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <span className="btn-spinner" aria-hidden="true" />}
      {icon && !loading && <i className={`bi ${icon} me-2`} aria-hidden="true"></i>}
      {children}
    </motion.button>
  );
}
