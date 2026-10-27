import { useEffect, useState } from 'react';
import Modal from '../../components/modals/Modal.jsx';
import Button from '../../components/ui/Button.jsx';
import { formatCurrency } from '../../utils/format.js';

/**
 * Opción A: arqueo real. Pide conteo físico (monto_final_real) en vez de
 * reutilizar totalVentas.
 * Flujo reactivo: si el cierre devuelve 422 (diferencia > umbral), la página
 * reabre este modal con `requiereMotivo` + `diferenciaInfo` y el motivo pasa a
 * ser obligatorio (>=5). También es obligatorio al cerrar un turno ajeno (admin).
 */
export default function CerrarTurnoModal({ abierto, esAjeno, requiereMotivo = false, diferenciaInfo = null, esperadoAprox = null, umbral = 50, cargando, error, onConfirmar, onCancelar }) {
  const [monto, setMonto] = useState('');
  const [motivo, setMotivo] = useState('');

  useEffect(() => {
    if (abierto) { setMonto(''); setMotivo(''); }
  }, [abierto]);

  const montoNum = Number(monto);
  const montoValido = monto !== '' && Number.isFinite(montoNum) && montoNum >= 0;
  const umbralNum = Number(umbral ?? diferenciaInfo?.umbral ?? 50) || 50;
  const difPreview = (montoValido && esperadoAprox !== null && esperadoAprox !== undefined && Number.isFinite(Number(esperadoAprox)))
    ? montoNum - Number(esperadoAprox)
    : null;
  const superaUmbralPreview = difPreview !== null && Math.abs(difPreview) > umbralNum;
  const esCriticoPreview = difPreview !== null && Math.abs(difPreview) >= umbralNum * 2;
  const motivoObligatorio = esAjeno || requiereMotivo || superaUmbralPreview;
  const motivoValido = !motivoObligatorio || motivo.trim().length >= 5;
  const puedeConfirmar = montoValido && motivoValido && !cargando && !esCriticoPreview;

  const handleClose = () => {
    if (!cargando) onCancelar?.();
  };

  return (
    <Modal
      open={abierto}
      onClose={handleClose}
      title="Cerrar turno"
      size="md"
      footer={
        <>
          <Button variant="outlineSecondary" onClick={handleClose} disabled={cargando}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            icon="bi-lock"
            loading={cargando}
            disabled={!puedeConfirmar}
            onClick={() => onConfirmar({ monto_final_real: montoNum, ...(motivoObligatorio ? { motivo: motivo.trim() } : {}) })}
          >
            {cargando ? 'Cerrando...' : 'Confirmar cierre'}
          </Button>
        </>
      }
    >
      <p className="text-muted small mb-3" style={{ fontFamily: 'var(--bs-font-sans-serif)' }}>
        Cuenta el efectivo físico de caja e ingrésalo. Quedará en auditoría con tu usuario y hora.
        Si el monto supera al esperado te pediremos un motivo; si es muy grande se bloquea.
        {esAjeno ? ' Estás cerrando un turno ajeno como administrador: el motivo es obligatorio.' : ''}
      </p>
      {montoValido && difPreview !== null && (
        <div className={`alert py-2 small ${esCriticoPreview ? 'alert-danger' : superaUmbralPreview ? 'alert-warning' : Math.abs(difPreview) > 0 ? 'alert-info' : 'alert-light'}`} role="status" style={{ fontFamily: 'var(--bs-font-sans-serif)' }}>
          <div className="d-flex flex-wrap" style={{ gap: '4px 12px' }}>
            <span>Esperado: <strong style={{ fontFamily: 'var(--bs-font-numeric)', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(esperadoAprox ?? 0)}</strong></span>
            <span>Diferencia: <strong style={{ fontFamily: 'var(--bs-font-numeric)', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(difPreview ?? 0)}</strong></span>
            <span>Umbral: <strong style={{ fontFamily: 'var(--bs-font-numeric)', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(umbralNum)}</strong></span>
          </div>
          <div className="mt-1">
            {esCriticoPreview ? (
              <span>Diferencia crítica: requiere supervisor. El cierre se bloqueará.</span>
            ) : superaUmbralPreview ? (
              <span>La diferencia supera el umbral: deberás registrar un motivo.</span>
            ) : Math.abs(difPreview) > 0 ? (
              <span>Hay una pequeña diferencia dentro de la tolerancia.</span>
            ) : (
              <span>El monto coincide con el esperado.</span>
            )}
          </div>
        </div>
      )}
      {requiereMotivo && diferenciaInfo && (
        <div className="alert alert-warning py-2 small" role="alert" style={{ fontFamily: 'var(--bs-font-sans-serif)' }}>
          La diferencia de caja supera el umbral permitido:
          <div className="d-flex flex-wrap" style={{ gap: '4px 12px' }}>
            <strong style={{ fontFamily: 'var(--bs-font-numeric)', fontVariantNumeric: 'tabular-nums' }}>Diferencia: {formatCurrency(diferenciaInfo.diferencia ?? 0)}</strong>
            <span>Esperado: {formatCurrency(diferenciaInfo.montoEsperado ?? 0)}</span>
            <span>Umbral: {formatCurrency(diferenciaInfo.umbral ?? 0)}</span>
          </div>
          <div className="mt-1">
            Debes registrar un motivo para poder cerrar el turno.
          </div>
        </div>
      )}
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
      {motivoObligatorio && (
        <>
          <label htmlFor="motivo-cierre" className="form-label small fw-semibold mb-1">
            Motivo {esAjeno ? '(obligatorio para turno ajeno)' : '(obligatorio: diferencia sobre el umbral)'}
          </label>
          <textarea
            id="motivo-cierre"
            className="form-control mb-1"
            rows={2}
            placeholder={esAjeno ? 'Ej. Cajero ausente, cierre supervisado…' : 'Ej. Faltante por vuelto mal entregado…'}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
          <small className="text-muted mb-2">Mínimo 5 caracteres.</small>
        </>
      )}
    </Modal>
  );
}
