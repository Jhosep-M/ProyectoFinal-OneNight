import { forwardRef, useId } from 'react';

const Select = forwardRef(function Select({
  label,
  error,
  hint,
  id,
  children,
  className = '',
  wrapperClassName = '',
  ...props
}, ref) {
  const autoId = useId();
  const selectId = id || props.name || autoId;
  const hasError = Boolean(error);
  const errorMessage = typeof error === 'string' ? error : null;
  const hintId = hint ? `${selectId}-hint` : undefined;
  const errorId = errorMessage ? `${selectId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`field ${wrapperClassName}`.trim()}>
      {label && <label htmlFor={selectId}>{label}</label>}
      <select
        ref={ref}
        id={selectId}
        className={`select ${hasError ? 'input-error' : ''} ${className}`.trim()}
        aria-invalid={hasError || undefined}
        aria-describedby={describedBy}
        {...props}
      >
        {children}
      </select>
      {hint && <span className="field-hint" id={hintId}>{hint}</span>}
      {errorMessage && <span className="field-error" id={errorId}>{errorMessage}</span>}
    </div>
  );
});

export default Select;
