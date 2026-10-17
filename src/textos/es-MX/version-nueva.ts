// Catálogo es-MX — el aviso de «hay una versión nueva» (tarea 5.7, REQ-PLAT-008, ADR 014/015). Sin jerga: el alumno no sabe qué es un service worker ni una caché, solo que lo que ve cambió.
// La advertencia es obligatoria mientras el visualizador no guarde lo que el alumno escribe: recargar devuelve el editor al programa de ejemplo.
export const textosVersionNueva = {
  aviso: (): string => 'Hay una versión nueva del visualizador.',
  advertencia: (): string =>
    'Al recargar, el programa que tienes en el editor vuelve al de ejemplo. Si quieres conservar el tuyo, cópialo antes.',
  botonRecargar: (): string => 'Recargar ahora',
  botonDespues: (): string => 'Más tarde',
};
