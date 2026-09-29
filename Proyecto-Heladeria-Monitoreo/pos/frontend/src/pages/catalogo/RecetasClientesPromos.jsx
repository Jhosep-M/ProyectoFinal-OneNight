import { useEffect, useState } from 'react';
import { api } from '../../services/api.js';

function useList(path) {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const load = () => api.get(path).then(setItems).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);
  return { items, error, reload: load };
}

export function Recetas() {
  const { items, error } = useList('/api/v1/products');
  return (
    <div>
      <h2>Recetas</h2>
      {error && <p role="alert">{error}</p>}
      <p>La receta se gestiona por producto: cada venta descuenta insumos vía <code>recetaService</code> y cada devolución los reintegra proporcionalmente.</p>
      <ul>{items.map((p) => <li key={p.id_producto}>{p.nombre}</li>)}</ul>
    </div>
  );
}

export function Clientes() {
  const { items, error } = useList('/api/v1/customers');
  return (
    <div>
      <h2>Clientes y puntos</h2>
      {error && <p role="alert">{error}</p>}
      <p>Puntos: 1 por cada 10 de total (<code>puntosService.acumularPuntos</code>). Saldo con trazabilidad en <code>movimiento_puntos</code>.</p>
      <ul>{items.map((c) => <li key={c.id_cliente}>{c.nombre} — {c.puntos_fidelidad} pts</li>)}</ul>
    </div>
  );
}

export function Promociones() {
  const { items, error } = useList('/api/v1/promotions');
  return (
    <div>
      <h2>Promociones</h2>
      {error && <p role="alert">{error}</p>}
      <ul>{items.map((p) => <li key={p.id_promocion}>{p.nombre} — {p.porcentaje_descuento}% — {p.estado}</li>)}</ul>
    </div>
  );
}
