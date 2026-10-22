import { useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import useDialogFocus from './useDialogFocus.js';

const transition = { duration: 0.2, ease: [0.16, 1, 0.3, 1] };

export default function Modal({ show, onClose, title, children, footer, initialFocusRef }) {
  const panelRef = useRef(null);
  const titleId = useId();
  useDialogFocus(show, panelRef, onClose, initialFocusRef);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {show && (
        <motion.div
          className="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={transition}
          onClick={onClose}
        >
          <motion.div
            ref={panelRef}
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            tabIndex={-1}
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={transition}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              {title ? <h3 id={titleId}>{title}</h3> : <span />}
              <button type="button" className="modal-close" onClick={onClose} aria-label="Cerrar">
                ×
              </button>
            </div>
            <div className="modal-body">{children}</div>
            {footer && <div className="modal-footer">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
