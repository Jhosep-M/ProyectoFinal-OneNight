import { forwardRef } from 'react';

const VARIANTS = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  danger: 'btn-danger',
  ghost: 'btn-ghost',
};

const Button = forwardRef(function Button(
  { variant = 'primary', size, loading = false, disabled, children, className = '', ...props },
  ref
) {
  const cls = `btn ${VARIANTS[variant] || VARIANTS.primary} ${size === 'sm' ? 'btn-sm' : ''} ${className}`.trim();
  return (
    <button ref={ref} className={cls} disabled={disabled || loading} {...props}>
      {loading && <span className="btn-spinner" aria-hidden="true" />}
      {children}
    </button>
  );
});

export default Button;
