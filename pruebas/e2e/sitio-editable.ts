// Un sitio estático de mentira para probar las ACTUALIZACIONES del service worker en un navegador de verdad (tarea 5.7, `actualizacion.spec.ts`). Copia el build con ruta base a una carpeta
// temporal, lo sirve bajo `/VisualizadorJava/` desde un servidor de Node en un puerto libre y permite «publicar una versión nueva» cambiando el `sw.js` de la copia —lo mismo que ve el navegador
// cuando se despliega de nuevo—. Cada prueba tiene el suyo: nada se comparte con el sitio que usan las demás suites ni entre motores. No es un `*.spec.ts`: Playwright no lo toma como prueba.
import { appendFileSync, cpSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { CARPETA_CON_RUTA_BASE, RUTA_BASE_PUBLICA } from './ruta-base.ts';

const TIPOS_DE_CONTENIDO: Readonly<Record<string, string>> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json',
  '.json': 'application/json',
};

/**
 * Lo que agrega la «versión 2» al `sw.js`: un worker que responde cuál versión es a quien se lo pregunte. La versión 1 (el build tal cual) no sabe responder, así que la respuesta prueba QUIÉN controla
 * la página.
 */
export const RESPONDER_LA_VERSION_2 = `
// Versión 2 (prueba de actualización): responde «VERSION» con su número.
self.addEventListener('message', (evento) => {
  if (evento.data && evento.data.type === 'VERSION' && evento.source) evento.source.postMessage({ version: 2 });
});
`;

export interface SitioEditable {
  /** La dirección del sitio, con la ruta base y terminada en «/». */
  readonly url: string;
  /** Despliega la versión 2: cambia el `sw.js` publicado (el precache del resto de los archivos sigue igual). */
  publicarVersion2(): void;
  cerrar(): Promise<void>;
}

export async function levantarSitioEditable(): Promise<SitioEditable> {
  const origen = resolve(CARPETA_CON_RUTA_BASE);
  const carpeta = mkdtempSync(join(tmpdir(), 'sitio-editable-'));
  cpSync(origen, carpeta, { recursive: true });

  const servidor = createServer((peticion, respuesta) => {
    const { pathname } = new URL(peticion.url ?? '/', 'http://localhost');
    const relativa = pathname.startsWith(RUTA_BASE_PUBLICA) ? pathname.slice(RUTA_BASE_PUBLICA.length) : undefined;
    const archivo = relativa === undefined ? undefined : resolve(carpeta, normalize(relativa === '' ? 'index.html' : relativa));
    if (archivo === undefined || !archivo.startsWith(carpeta + sep) || !esArchivo(archivo)) {
      respuesta.writeHead(404).end('No encontrado');
      return;
    }
    // Sin caché HTTP: la prueba mide al service worker, no a la caché del navegador.
    respuesta.writeHead(200, { 'Content-Type': TIPOS_DE_CONTENIDO[extname(archivo)] ?? 'application/octet-stream', 'Cache-Control': 'no-cache' });
    respuesta.end(readFileSync(archivo));
  });
  await escuchar(servidor);

  const { port } = servidor.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}${RUTA_BASE_PUBLICA}`,
    publicarVersion2: () => appendFileSync(join(carpeta, 'sw.js'), RESPONDER_LA_VERSION_2),
    cerrar: async () => {
      servidor.closeAllConnections();
      await new Promise<void>((listo) => servidor.close(() => listo()));
      rmSync(carpeta, { recursive: true, force: true });
    },
  };
}

function esArchivo(ruta: string): boolean {
  try {
    return statSync(ruta).isFile();
  } catch {
    return false;
  }
}

function escuchar(servidor: Server): Promise<void> {
  return new Promise((listo, fallo) => {
    servidor.once('error', fallo);
    servidor.listen(0, '127.0.0.1', () => listo());
  });
}
