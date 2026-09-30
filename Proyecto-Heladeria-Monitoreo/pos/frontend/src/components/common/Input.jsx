import { forwardRef } from 'react';

const Input = forwardRef(function Input(
  { label, error, id, className = '', ...props },
  ref
) {
  const inputId = id || props.name;
  return (
    <div className={`field ${className}`.trim()}>
      {label && <label htmlFor={inputId}>{label}</label>}
      <input
        ref={ref}
        id={inputId}
        className={`input ${error ? 'input-error' : ''}`.trim()}
        aria-invalid={!!error}
        {...props}
      />
      {error && <span className="field-error">{error}</span>}
    </div>
  );
});

export default Input;
