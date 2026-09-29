import { useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import ClientesPage from '../clientes/ClientesPage.jsx';
import PromocionesPage from '../promociones/PromocionesPage.jsx';

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

export const Clientes = ClientesPage;
export const Promociones = PromocionesPage;
