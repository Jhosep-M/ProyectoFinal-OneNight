import { forwardRef } from 'react';

const Textarea = forwardRef(function Textarea(
  { label, error, id, className = '', rows = 3, ...props },
  ref
) {
  const textareaId = id || props.name;
  return (
    <div className={`field ${className}`.trim()}>
      {label && <label htmlFor={textareaId}>{label}</label>}
      <textarea
        ref={ref}
        id={textareaId}
        rows={rows}
        className={`textarea ${error ? 'input-error' : ''}`.trim()}
        aria-invalid={!!error}
        {...props}
      />
      {error && <span className="field-error">{error}</span>}
    </div>
  );
});

export default Textarea;
