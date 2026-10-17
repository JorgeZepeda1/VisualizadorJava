// Dónde vive el sitio publicado, para el E2E de la tarea 5.12 (REQ-PLAT-008). Lo comparten `playwright.config.ts` (que levanta el sitio local bajo la ruta base) y `despliegue.spec.ts` (que lo
// prueba). No es un `*.spec.ts`: Playwright no lo toma como prueba.
//
// La ruta base es la MISMA que `.github/workflows/desplegar.yml` fija en `BASE_PUBLICA` (repositorio `JorgeZepeda1/VisualizadorJava`, P1): el build local de esta prueba y el de Pages leen la variable
// por el mismo camino de `vite.config.ts`.

export const RUTA_BASE_PUBLICA = '/VisualizadorJava/';

/** Puerto del sitio local con la ruta base (el normal, sin ruta base, usa 4173). */
export const PUERTO_CON_RUTA_BASE = 4174;

/** Carpeta del build con la ruta base: aparte de `dist/` para que los dos sitios convivan en el mismo `npm run e2e`. */
export const CARPETA_CON_RUTA_BASE = 'dist-ruta-base';

export const URL_LOCAL_CON_RUTA_BASE = `http://localhost:${PUERTO_CON_RUTA_BASE}${RUTA_BASE_PUBLICA}`;

/**
 * Con `URL_DESPLEGADA` (por ejemplo `https://jorgezepeda1.github.io/VisualizadorJava/`) las mismas pruebas de `despliegue.spec.ts` corren contra el sitio YA publicado, sin levantar ningún servidor
 * local. Termina siempre en «/».
 */
export const URL_PUBLICADA: string | undefined = normalizar(process.env.URL_DESPLEGADA);

export const URL_DEL_SITIO: string = URL_PUBLICADA ?? URL_LOCAL_CON_RUTA_BASE;

function normalizar(url: string | undefined): string | undefined {
  if (url === undefined || url.trim() === '') return undefined;
  const sinEspacios = url.trim();
  return sinEspacios.endsWith('/') ? sinEspacios : `${sinEspacios}/`;
}
