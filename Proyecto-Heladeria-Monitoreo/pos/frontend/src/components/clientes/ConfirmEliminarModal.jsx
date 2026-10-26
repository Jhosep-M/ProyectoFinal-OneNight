import { useEffect, useRef, useState } from 'react';
import Button from '../common/Button.jsx';

export default function ConfirmEliminarModal({ cliente, onCancel, onConfirm }) {
  const [saving, setSaving] = useState(false);
  const cancelRef = useRef(null);

  useEffect(() => {
    cancelRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onCancel?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const confirmar = async () => {
    setSaving(true);
    try {
      await onConfirm?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div
        className="modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-eliminar-titulo"
        aria-describedby="confirm-eliminar-desc"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 id="confirm-eliminar-titulo">Eliminar cliente</h3>
          <button type="button" className="modal-close" onClick={onCancel} aria-label="Cerrar">×</button>
        </div>
        <div className="modal-body">
          <p id="confirm-eliminar-desc">
            ¿Eliminar definitivamente a <strong>{cliente?.nombre}</strong>
            {cliente?.telefono ? ` (${cliente.telefono})` : ''}
            {cliente?.correo ? ` · ${cliente.correo}` : ''}?
          </p>
          <p className="field-hint">Se eliminará de la base de datos. Solo es posible si no tiene ventas ni movimientos de puntos; en caso contrario, inactívelo.</p>
        </div>
        <div className="modal-footer">
          <Button ref={cancelRef} type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
          <Button type="button" variant="danger" loading={saving} onClick={confirmar}>Eliminar</Button>
        </div>
      </div>
    </div>
  );
}
