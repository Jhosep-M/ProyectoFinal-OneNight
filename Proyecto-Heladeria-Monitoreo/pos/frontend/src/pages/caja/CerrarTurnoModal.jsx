import { useState } from 'react';
import Button from '../../components/ui/Button.jsx';

/**
 * Opción A: arqueo real. Pide conteo físico (monto_final_real) en vez de
 * reutilizar totalVentas. Si es cierre de turno ajeno (admin), exige motivo.
 */
export default function CerrarTurnoModal({ abierto, esAjeno, cargando, error, onConfirmar, onCancelar }) {
  const [monto, setMonto] = useState('');
  const [motivo, setMotivo] = useState('');

  if (!abierto) return null;

  const montoNum = Number(monto);
  const montoValido = monto !== '' && Number.isFinite(montoNum) && montoNum >= 0;
  const motivoValido = !esAjeno || motivo.trim().length >= 3;
  const puedeConfirmar = montoValido && motivoValido && !cargando;

  return (
    <div className="modal d-block" tabIndex="-1" role="dialog" aria-label="Cerrar turno">
      <div className="modal-dialog" role="document">
        <div className="modal-content p-3">
          <h5 className="mb-1">Cerrar turno</h5>
          <p className="text-muted small mb-3">
            Cuenta el efectivo físico de caja e ingrésalo. Quedará en auditoría con tu usuario y hora.
            {esAjeno ? ' Estás cerrando un turno ajeno como administrador: el motivo es obligatorio.' : ''}
          </p>
          {error && <div className="alert alert-danger py-2 small" role="alert">{error}</div>}
          <label htmlFor="monto-cierre" className="form-label small fw-semibold mb-1">
            Efectivo contado (monto final real)
          </label>
          <div className="input-group mb-2">
            <span className="input-group-text" aria-hidden="true">$</span>
            <input
              id="monto-cierre"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              className="form-control"
              placeholder="0.00"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
            />
          </div>
          {esAjeno && (
            <>
              <label htmlFor="motivo-cierre" className="form-label small fw-semibold mb-1">
                Motivo (obligatorio para turno ajeno)
              </label>
              <textarea
                id="motivo-cierre"
                className="form-control mb-2"
                rows={2}
                placeholder="Ej. Cajero ausente, cierre supervisado…"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
              />
            </>
          )}
          <div className="d-flex gap-2 justify-content-end mt-2">
            <Button variant="outlineSecondary" onClick={onCancelar} disabled={cargando}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              icon="bi-lock"
              loading={cargando}
              disabled={!puedeConfirmar}
              onClick={() => onConfirmar({ monto_final_real: montoNum, ...(esAjeno ? { motivo: motivo.trim() } : {}) })}
            >
              {cargando ? 'Cerrando...' : 'Confirmar cierre'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
