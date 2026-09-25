// Registro del service worker (design.md §1.2 "pwa/", ADR 014). Mínimo para la tarea 0.11:
// registra el service worker que genera `vite-plugin-pwa` cuando el navegador lo soporta; degrada
// sin lanzar cuando no (nunca deja de cargar la app por eso, C12). Respeta `BASE_URL` de Vite para
// que la ruta y el scope sean correctos también bajo la subruta de GitHub Pages
// (`/VisualizadorJava/`, P1). El aviso «Hay una versión nueva» (registerType:'prompt', ADR 014) y
// la búsqueda de actualización cada hora llegan en el lote 5 (M23) — aquí solo el registro base,
// que ese lote amplía sin romperlo.
export function registrarServiceWorker(navegador: Navigator = navigator): void {
  if (!('serviceWorker' in navegador)) return;
  const base = import.meta.env.BASE_URL;
  void navegador.serviceWorker.register(`${base}sw.js`, { scope: base });
}
