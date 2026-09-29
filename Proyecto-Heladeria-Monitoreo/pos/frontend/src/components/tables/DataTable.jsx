import { useMemo, useState } from 'react';
import Skeleton from '../common/Skeleton.jsx';
import EmptyState from '../common/EmptyState.jsx';

export default function DataTable({
  columns,
  rows,
  loading = false,
  emptyTitle = 'Sin datos',
  emptyDescription = 'Aún no hay registros para mostrar.',
  pageSize = 10,
  rowKey,
}) {
  const [sort, setSort] = useState({ key: null, dir: 'asc' });
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    if (!sort.key) return rows;
    const get = (row) => row[sort.key];
    return [...rows].sort((a, b) => {
      const av = get(a);
      const bv = get(b);
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') {
        return sort.dir === 'asc' ? av - bv : bv - av;
      }
      return sort.dir === 'asc'
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
  }, [rows, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages - 1);
  const pageRows = sorted.slice(currentPage * pageSize, currentPage * pageSize + pageSize);

  const toggleSort = (key) => {
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'asc' }
    );
  };

  if (loading) {
    return (
      <div className="table-wrap">
        <Skeleton height={32} className="mb-8" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} height={24} className="mb-8" />
        ))}
      </div>
    );
  }

  if (!rows.length) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                className={c.sortable === false ? '' : 'sortable'}
                onClick={c.sortable === false ? undefined : () => toggleSort(c.key)}
                aria-sort={sort.key === c.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
              >
                {c.label}
                {sort.key === c.key && <span className="sort-ind">{sort.dir === 'asc' ? '↑' : '↓'}</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pageRows.map((row, i) => (
            <tr key={rowKey ? row[rowKey] : i}>
              {columns.map((c) => (
                <td key={c.key}>{c.render ? c.render(row) : row[c.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {totalPages > 1 && (
        <div className="table-pager">
          <button className="btn btn-ghost btn-sm" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>
            ← Anterior
          </button>
          <span>Página {currentPage + 1} de {totalPages}</span>
          <button className="btn btn-ghost btn-sm" disabled={currentPage >= totalPages - 1} onClick={() => setPage(currentPage + 1)}>
            Siguiente →
          </button>
        </div>
      )}
    </div>
  );
}
