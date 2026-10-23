import { forwardRef, useId } from 'react';

const Input = forwardRef(function Input({
  icon,
  label,
  error,
  hint,
  id,
  className = '',
  wrapperClassName = '',
  ...props
}, ref) {
  const autoId = useId();
  const inputId = id || props.name || autoId;
  const hasError = Boolean(error);
  const errorMessage = typeof error === 'string' ? error : null;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = errorMessage ? `${inputId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`field ${wrapperClassName}`.trim()}>
      {label && <label htmlFor={inputId}>{label}</label>}
      <div className={icon ? 'input-group' : undefined}>
        {icon && (
          <span className="input-group-text" aria-hidden="true">
            <i className={`bi ${icon}`}></i>
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`input ${hasError ? 'input-error' : ''} ${className}`.trim()}
          aria-invalid={hasError || undefined}
          aria-describedby={describedBy}
          {...props}
        />
      </div>
      {hint && <span className="field-hint" id={hintId}>{hint}</span>}
      {errorMessage && <span className="field-error" id={errorId}>{errorMessage}</span>}
    </div>
  );
});

export default Input;
