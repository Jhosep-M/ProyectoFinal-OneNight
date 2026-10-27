import { useEffect, useRef } from 'react';

/**
 * useAutoRefresh — regla de refresco automático del frontend POS.
 *
 * Toda vista operativa debe reflejar cada acción sin botón Recargar manual:
 * - polling periódico (defecto 15s, cocina 10-15s),
 * - revalidación al volver el foco / visibilidad,
 * - limpieza de intervalo en unmount, sin solapar llamadas.
 *
 * @param {() => Promise<void>} recargar - función que recarga los datos
 * @param {{ intervalMs?: number, onFocus?: boolean, enabled?: boolean }} opts
 */
export function useAutoRefresh(recargar, { intervalMs = 15000, onFocus = true, enabled = true } = {}) {
  const recargarRef = useRef(recargar);
  recargarRef.current = recargar;
  const enVueloRef = useRef(false);

  useEffect(() => {
    if (!enabled) return undefined;
    let vivo = true;

    const correr = async () => {
      if (!vivo || enVueloRef.current) return;
      // Pestaña oculta: no gastar requests (causa de 429 multi-pestaña).
      // Al volver a visible, el evento focus/visibility lo revalida.
      if (typeof document !== 'undefined' && document.hidden) return;
      enVueloRef.current = true;
      try {
        await recargarRef.current();
      } catch {
        /* el recargar local ya muestra su error; el poll no debe romper la vista */
      } finally {
        enVueloRef.current = false;
      }
    };

    let id = null;
    if (intervalMs > 0) {
      id = setInterval(correr, intervalMs);
    }

    let onVis = null;
    if (onFocus) {
      onVis = () => {
        // Solo revalida al VOLVER a visible (evita doble disparo focus+visible
        // y evita polls de pestañas en segundo plano).
        if (typeof document !== 'undefined' && document.hidden) return;
        correr();
      };
      window.addEventListener('focus', onVis);
      document.addEventListener('visibilitychange', onVis);
    }

    return () => {
      vivo = false;
      if (id) clearInterval(id);
      if (onVis) {
        window.removeEventListener('focus', onVis);
        document.removeEventListener('visibilitychange', onVis);
      }
    };
  }, [intervalMs, onFocus, enabled]);
}

export default useAutoRefresh;
