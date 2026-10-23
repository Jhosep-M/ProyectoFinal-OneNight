import { useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import useDialogFocus from './useDialogFocus.js';

const transition = { duration: 0.22, ease: [0.16, 1, 0.3, 1] };

export default function Drawer({
  open,
  onClose,
  title,
  children,
  footer,
  width = 440,
  initialFocusRef,
}) {
  const panelRef = useRef(null);
  const titleId = useId();
  useDialogFocus(open, panelRef, onClose, initialFocusRef);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="drawer-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={transition}
          onClick={onClose}
        >
          <motion.aside
            ref={panelRef}
            className="drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            tabIndex={-1}
            style={{ width: `min(${width}px, 100%)` }}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={transition}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="drawer-header">
              {title ? <h3 id={titleId}>{title}</h3> : <span />}
              <button type="button" className="drawer-close" onClick={onClose} aria-label="Cerrar">
                ×
              </button>
            </div>
            <div className="drawer-body">{children}</div>
            {footer && <div className="drawer-footer">{footer}</div>}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
