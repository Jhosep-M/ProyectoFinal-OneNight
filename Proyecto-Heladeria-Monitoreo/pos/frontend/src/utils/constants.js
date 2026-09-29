export const CATEGORIAS = [
  { id: 'todos', nombre: 'Todos' },
  { id: 'helados', nombre: 'Helados' },
  { id: 'cafe', nombre: 'Café' },
  { id: 'pasteles', nombre: 'Pasteles' },
  { id: 'bebidas', nombre: 'Bebidas' },
];

export const ESTADOS_VENTA = {
  completado: { nombre: 'Completado', variante: 'success' },
  pendiente: { nombre: 'Pendiente', variante: 'warning' },
  anulado: { nombre: 'Anulado', variante: 'danger' },
};

export const ESTADOS_MESA = {
  libre: { nombre: 'Libre', variante: 'success' },
  ocupada: { nombre: 'Ocupada', variante: 'danger' },
  reservada: { nombre: 'Reservada', variante: 'warning' },
};

export const METODOS_PAGO = [
  { id: 'efectivo', nombre: 'Efectivo', icono: 'bi-cash' },
  { id: 'tarjeta', nombre: 'Tarjeta', icono: 'bi-credit-card' },
  { id: 'transferencia', nombre: 'Transferencia', icono: 'bi-bank' },
];
