import { useEffect, useState } from 'react';
import Input from '../common/Input.jsx';
import { listarClientes } from '../../services/customersService.js';

const MIN_CHARS = 2;
const SEARCH_LIMIT = 8;

export default function ClienteSelector({ value, onSelect }) {
  const [q, setQ] = useState('');
  const [opts, setOpts] = useState([]);
  const [loading, setLoading] = useState(false);

  const query = q.trim();
  const debeBuscar = query.length >= MIN_CHARS;

  useEffect(() => {
    // Búsqueda bajo demanda: sin texto (o muy corto) no se llama a la API,
    // así con 100+ clientes no se muestra ninguna lista inicial.
    if (query.length < MIN_CHARS) {
      setOpts([]);
      setLoading(false);
      return;
    }
    let vivo = true;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const data = await listarClientes({ q: query, limit: SEARCH_LIMIT });
        if (vivo) setOpts(data || []);
      } catch (err) {
        // búsqueda opcional: no rompe el ticket si falla
        if (vivo) setOpts([]);
        console.warn('ClienteSelector: no se pudo buscar clientes', err);
      } finally {
        if (vivo) setLoading(false);
      }
    }, 250);
    return () => {
      vivo = false;
      clearTimeout(t);
    };
  }, [query]);

  const elegir = (c) => {
    onSelect(c);
    setOpts([]);
  };

  const limpiar = () => {
    setQ('');
    setOpts([]);
    onSelect(null);
  };

  return (
    <div className="mb-3">
      <Input
        label="Cliente (opcional)"
        name="cliente-q"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar por nombre/carnet/tel/correo…"
      />
      {query.length > 0 && !debeBuscar && (
        <div className="text-muted small mt-1">Escribe al menos {MIN_CHARS} caracteres para buscar.</div>
      )}
      {loading && <div className="text-muted small mt-1">Buscando…</div>}
      {!loading && debeBuscar && opts.length === 0 && (
        <div className="text-muted small mt-1">Sin resultados para “{query}”.</div>
      )}
      {!loading && opts.length > 0 && (
        <div className="list-group mt-2">
          {opts.map((c) => (
            <button
              key={c.id_cliente || c.id}
              type="button"
              className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
              onClick={() => elegir(c)}
            >
              <span>{c.nombre} — {c.puntos_fidelidad ?? c.puntos ?? 0} pts</span>
              <small className="text-muted">
                {[c.carnet_identidad, c.telefono, c.correo].filter(Boolean).join(' · ')}
              </small>
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
