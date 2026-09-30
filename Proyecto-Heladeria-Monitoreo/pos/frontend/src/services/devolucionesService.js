import { apiFetch } from './api.js';
import { crearDevolucion as crearDevolucionBase, anularVenta, listarVentas } from './ventasService.js';

// Par backend: pos/posBackend/src/routes/returns.js montado en /api/v1/returns.
//   GET  /returns -> lista devoluciones (permiso devolucion.consultar)
//   POST /returns { venta_id, producto_id, cantidad, motivo } -> procesa UN
//     producto por request vía PG procesar_devolucion (permiso devolucion.procesar)
// No existe endpoint de devolución multi-producto: el formulario envía
// un POST por ítem. Se reutiliza crearDevolucion de ventasService (sin duplicar).
export const listarDevoluciones = () => apiFetch('/returns');
export const crearDevolucion = crearDevolucionBase;
export { anularVenta, listarVentas };
