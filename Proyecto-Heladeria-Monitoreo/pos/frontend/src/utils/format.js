export function formatCurrency(amount) {
  return new Intl.NumberFormat('es-BO', {
    style: 'currency',
    currency: 'BOB',
  }).format(amount);
}

export const ZONA_BOLIVIA = 'America/La_Paz';

function partesEnBolivia(fecha) {
  const dtf = new Intl.DateTimeFormat('es-BO', {
    timeZone: ZONA_BOLIVIA,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    hourCycle: 'h23',
  });
  const partes = Object.fromEntries(
    dtf.formatToParts(new Date(fecha)).map((p) => [p.type, p.value]),
  );
  return {
    y: Number(partes.year),
    m: Number(partes.month),
    d: Number(partes.day),
    h: partes.hour != null ? Number(partes.hour) % 24 : null,
  };
}

export function horaEnBolivia(fecha) {
  return partesEnBolivia(fecha).h ?? new Date(fecha).getHours();
}

export function esHoyBolivia(fecha, ahora = new Date()) {
  if (!fecha) return false;
  const a = partesEnBolivia(fecha);
  const b = partesEnBolivia(ahora);
  return a.y === b.y && a.m === b.m && a.d === b.d;
}

export function esAyerBolivia(fecha, ahora = new Date()) {
  if (!fecha) return false;
  const ayer = new Date(ahora);
  // Resta un día calendario en horario Bolivia: compara partes, no ms exactos.
  // Construimos "ayer" desplazando 24h y comparando partes Bolivia.
  ayer.setDate(ayer.getDate() - 1);
  const a = partesEnBolivia(fecha);
  const b = partesEnBolivia(ayer);
  // Caso borde DST no aplica en Bolivia (UTC-4 fijo), comparación directa es segura.
  return a.y === b.y && a.m === b.m && a.d === b.d;
}

export function formatearHoyBolivia(fecha = new Date()) {
  const dtf = new Intl.DateTimeFormat('es-BO', {
    timeZone: ZONA_BOLIVIA,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const partes = Object.fromEntries(
    dtf.formatToParts(new Date(fecha)).map((p) => [p.type, p.value]),
  );
  const semana = (partes.weekday || '').toLowerCase();
  // Ej: "Hoy, martes 27 de octubre de 2026"
  return `Hoy, ${semana} ${partes.day} de ${partes.month} de ${partes.year}`;
}

export function formatDate(date) {
  return new Intl.DateTimeFormat('es-BO', {
    timeZone: ZONA_BOLIVIA,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
}

export function formatTime(date) {
  return new Intl.DateTimeFormat('es-BO', {
    timeZone: ZONA_BOLIVIA,
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}
