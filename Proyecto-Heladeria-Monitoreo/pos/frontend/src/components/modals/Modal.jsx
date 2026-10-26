import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export default function Modal({ open, onClose, title, children, footer, size = 'sm', className = '' }) {
  const dialogRef = useRef(null);
  const sizeClass = size === 'lg' ? 'sys-modal--lg' : size === 'md' ? 'sys-modal--md' : '';

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="sys-modal-backdrop" onClick={onClose}>
      <div
        className={`sys-modal ${sizeClass} ${className}`.trim()}
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="sys-modal-header">
          <h3>{title}</h3>
          <button className="sys-modal-close" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </header>
        <div className="sys-modal-body">{children}</div>
        {footer && <footer className="sys-modal-footer">{footer}</footer>}
      </div>
    </div>,
    document.body
  );
}
