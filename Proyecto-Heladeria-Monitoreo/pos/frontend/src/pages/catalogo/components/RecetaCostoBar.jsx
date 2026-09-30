import Badge from '../../../components/common/Badge.jsx';
import { formatCurrency } from '../../../utils/format.js';
import { calcularCosto, calcularPorciones } from '../../../utils/receta.js';

export default function RecetaCostoBar({ lineas = [] }) {
  const porciones = calcularPorciones(lineas);
  const costo = calcularCosto(lineas);
  const tieneCosto = lineas.some((l) => Number(l.costo_unitario) > 0);

  return (
    <div className="row-inline" aria-label="Resumen de receta">
      <span className="text-muted">
        {lineas.length} insumo{lineas.length === 1 ? '' : 's'} · Costo est.{' '}
        {tieneCosto ? formatCurrency(costo) : '—'}
      </span>
      <Badge tone={porciones > 0 ? 'success' : 'error'}>
        Porciones posibles: {porciones}
      </Badge>
    </div>
  );
}
