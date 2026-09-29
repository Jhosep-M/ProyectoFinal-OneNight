import { motion } from 'framer-motion';

const variantMap = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  success: 'btn-success',
  danger: 'btn-danger',
  outline: 'btn-outline-primary',
  ghost: 'btn-link',
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
  children,
  className = '',
  ...props
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      className={`btn ${variantMap[variant]} ${sizeMap[size]} ${className}`}
      {...props}
    >
      {icon && <i className={`bi ${icon} me-2`}></i>}
      {children}
    </motion.button>
  );
}
