import { forwardRef } from 'react';

const Select = forwardRef(function Select(
  { label, error, id, children, className = '', ...props },
  ref
) {
  const selectId = id || props.name;
  return (
    <div className={`field ${className}`.trim()}>
      {label && <label htmlFor={selectId}>{label}</label>}
      <select
        ref={ref}
        id={selectId}
        className={`select ${error ? 'input-error' : ''}`.trim()}
        aria-invalid={!!error}
        {...props}
      >
        {children}
      </select>
      {error && <span className="field-error">{error}</span>}
    </div>
  );
});

export default Select;
