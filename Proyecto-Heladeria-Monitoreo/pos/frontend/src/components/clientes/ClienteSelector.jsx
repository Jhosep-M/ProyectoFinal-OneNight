import { useEffect, useState } from 'react';
import Input from '../common/Input.jsx';
import { listarClientes } from '../../services/customersService.js';

export default function ClienteSelector({ value, onSelect }) {
  const [q, setQ] = useState('');
  const [opts, setOpts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await listarClientes({ q, limit: 10 });
        setOpts(data || []);
      } catch (err) {
        // búsqueda opcional: no rompe el ticket si falla
        console.warn('ClienteSelector: no se pudo buscar clientes', err);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const limpiar = () => {
    setQ('');
    onSelect(null);
  };

  return (
    <div className="mb-3">
      <Input
        label="Cliente (opcional)"
        name="cliente-q"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar por nombre/tel/correo…"
      />
      {loading && <div className="text-muted small mt-1">Buscando…</div>}
      {!loading && opts.length > 0 && (
        <div className="list-group mt-2">
          {opts.map((c) => (
            <button
              key={c.id_cliente || c.id}
              type="button"
              className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
              onClick={() => onSelect(c)}
            >
              <span>{c.nombre} — {c.puntos_fidelidad ?? c.puntos ?? 0} pts</span>
            </button>
          ))}
        </div>
      )}
      {value && (
        <button type="button" className="btn btn-sm btn-outline-secondary mt-2" onClick={limpiar}>
          Limpiar
        </button>
      )}
    </div>
  );
}
