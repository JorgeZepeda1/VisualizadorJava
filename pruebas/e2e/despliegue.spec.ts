// Tarea 5.12 (REQ-PLAT-008, REQ-PLAT-001): el sitio publicado bajo una ruta base que NO es la raíz, como lo sirve GitHub Pages (`/VisualizadorJava/`). Corre en los tres motores contra el build
// real de `dist-ruta-base/` (BASE_PUBLICA=/VisualizadorJava/, ver playwright.config.ts) o, con `URL_DESPLEGADA`, contra el sitio ya publicado:
//   URL_DESPLEGADA=https://jorgezepeda1.github.io/VisualizadorJava/ npm run e2e -- despliegue
// Lo que prueba es lo que falla al publicar y que ninguna prueba sobre la raíz ve: rutas absolutas que se escapan de la ruta base, el alcance del service worker, el manifiesto y sus íconos, la URL del
// trabajador —el programa de la máquina de snacks, con `a1 2 50` tecleado, tiene que dar el golden del JDK 17— y que tras la primera carga todo siga funcionando sin red.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { escribirEnElEditor, irAlFinalDelPrograma, salidaDelPrograma, teclearCuandoElProgramaEspere, visualizar } from './ayudas.ts';
import { RUTA_BASE_PUBLICA, URL_DEL_SITIO } from './ruta-base.ts';

const CORPUS_DEL_PO = 'corpus/experimentos/ejercicios-del-po';

function delCorpus(nombre: string): string {
  return readFileSync(resolve(CORPUS_DEL_PO, nombre), 'utf8');
}

const SITIO = new URL(URL_DEL_SITIO);

interface RegistroDelServiceWorker {
  readonly alcance: string;
  readonly guion: string | undefined;
  readonly estado: string | undefined;
}

/** Espera a que el service worker esté activo (el precache completo ya se descargó) y dice con qué alcance y desde qué archivo quedó registrado. */
async function esperarAlServiceWorker(page: Page): Promise<RegistroDelServiceWorker> {
  return page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) throw new Error('serviceWorker no disponible en este navegador');
    const registro = await navigator.serviceWorker.ready;
    return { alcance: registro.scope, guion: registro.active?.scriptURL, estado: registro.active?.state };
  });
}

/** Cada petición `http(s)` que hizo la página: lo único que importa es de dónde salió, no su orden. */
function observarPeticiones(page: Page): { readonly urls: string[]; readonly malas: string[]; readonly errores: string[] } {
  const urls: string[] = [];
  const malas: string[] = [];
  const errores: string[] = [];
  page.on('request', (peticion) => {
    if (/^https?:/.test(peticion.url())) urls.push(peticion.url());
  });
  page.on('response', (respuesta) => {
    if (respuesta.status() >= 400) malas.push(`${respuesta.status()} ${respuesta.url()}`);
  });
  page.on('console', (mensaje) => {
    if (mensaje.type() === 'error') errores.push(mensaje.text());
  });
  page.on('pageerror', (error) => errores.push(String(error)));
  return { urls, malas, errores };
}

test.describe(`el sitio bajo ${RUTA_BASE_PUBLICA} (${SITIO.origin})`, () => {
  test('la página carga: nada se pide fuera de la ruta base, ninguna petición falla y la consola queda limpia', async ({ page }) => {
    const observado = observarPeticiones(page);

    await page.goto(URL_DEL_SITIO);
    await expect(page.getByRole('button', { name: /visualizar/i })).toBeVisible();
    await esperarAlServiceWorker(page);
    await page.waitForLoadState('networkidle');

    // Que la prueba no sea vacía: el script de la app y el trabajador sí se pidieron, desde dentro de la ruta base.
    expect(observado.urls.filter((url) => url.startsWith(`${SITIO.href}assets/`)).length, observado.urls.join('\n')).toBeGreaterThanOrEqual(2);
    const fueraDeLaRutaBase = observado.urls.filter((url) => !url.startsWith(SITIO.href));
    expect(fueraDeLaRutaBase, `Peticiones fuera de ${SITIO.href}`).toEqual([]);
    expect(observado.malas, 'Respuestas con error').toEqual([]);
    expect(observado.errores, 'Errores de consola').toEqual([]);
  });

  test('el trabajador arranca: la máquina de snacks con a1, 2, 50 deja la consola idéntica al golden del JDK 17', async ({ page }) => {
    const datos = delCorpus('maquina-snacks-a1-2-50.entrada.txt')
      .split('\n')
      .filter((renglon) => renglon !== '');
    expect(datos).toEqual(['a1', '2', '50']);

    await page.goto(URL_DEL_SITIO);
    await escribirEnElEditor(page, delCorpus('maquina-snacks-a1-2-50.java'));
    await visualizar(page);
    for (const dato of datos) await teclearCuandoElProgramaEspere(page, dato);
    await irAlFinalDelPrograma(page);

    expect(await salidaDelPrograma(page)).toBe(delCorpus('maquina-snacks-a1-2-50.combinada'));
  });

  test('el service worker se registra con el alcance de la ruta base, y no con el de la raíz', async ({ page }) => {
    await page.goto(URL_DEL_SITIO);

    const registro = await esperarAlServiceWorker(page);

    expect(registro.alcance).toBe(SITIO.href);
    expect(registro.guion).toBe(`${SITIO.href}sw.js`);
    // `ready` se cumple en cuanto hay un worker activo: puede estar todavía terminando de activarse.
    expect(['activating', 'activated']).toContain(registro.estado);
  });

  test('la pestaña tiene su ícono, de la ruta base (sin él, el navegador pide /favicon.ico a la raíz del dominio, donde no hay nada)', async ({ page }) => {
    await page.goto(URL_DEL_SITIO);

    const urlDelIcono = await page.locator('link[rel="icon"]').evaluate((enlace) => (enlace as HTMLLinkElement).href);

    expect(urlDelIcono.startsWith(SITIO.href), urlDelIcono).toBe(true);
    const imagen = await page.request.get(urlDelIcono);
    expect(imagen.status(), urlDelIcono).toBe(200);
    expect(imagen.headers()['content-type'], urlDelIcono).toContain('image/png');
  });

  test('el manifiesto y sus íconos cuelgan de la ruta base y existen', async ({ page }) => {
    await page.goto(URL_DEL_SITIO);

    const urlDelManifiesto = await page.locator('link[rel="manifest"]').evaluate((enlace) => (enlace as HTMLLinkElement).href);
    expect(urlDelManifiesto.startsWith(SITIO.href), urlDelManifiesto).toBe(true);
    const respuesta = await page.request.get(urlDelManifiesto);
    expect(respuesta.ok(), `${respuesta.status()} ${urlDelManifiesto}`).toBe(true);
    const manifiesto = (await respuesta.json()) as { start_url?: string; scope?: string; lang?: string; icons?: { src: string; sizes: string; type: string }[] };

    // Abrir la app instalada lleva a la ruta base, no a la raíz del dominio (donde no hay nada).
    expect(new URL(manifiesto.start_url ?? '', urlDelManifiesto).href).toBe(SITIO.href);
    expect(new URL(manifiesto.scope ?? '.', urlDelManifiesto).href).toBe(SITIO.href);
    expect(manifiesto.lang).toBe('es-MX');
    const iconos = manifiesto.icons ?? [];
    expect(iconos.map((icono) => icono.sizes)).toEqual(expect.arrayContaining(['192x192', '512x512']));
    for (const icono of iconos) {
      const urlDelIcono = new URL(icono.src, urlDelManifiesto).href;
      expect(urlDelIcono.startsWith(SITIO.href), urlDelIcono).toBe(true);
      const imagen = await page.request.get(urlDelIcono);
      expect(imagen.status(), urlDelIcono).toBe(200);
      expect(imagen.headers()['content-type'], urlDelIcono).toContain('image/png');
    }
  });

  test('tras la primera carga funciona sin red: recarga y ejecuta un programa con el service worker (REQ-PLAT-001)', async ({ page, context, browserName }) => {
    // Mismo salto, con el mismo motivo, que la prueba «sin red» de u3-hola-mundo.spec.ts: el WebKit de Playwright 1.63.0 falla con «WebKit encountered an internal error» al navegar una página con
    // service worker activo mientras `context.setOffline(true)` está encendido. No es un defecto de la app (la prueba del trabajador, arriba, sí corre en WebKit). Ver design.md §13.
    test.skip(
      browserName === 'webkit',
      'Playwright WebKit (build webkit-2359, Playwright 1.63.0, macOS 26.5.1 arm64): navegar una página con service worker activo estando offline falla con «WebKit encountered an internal error». ' +
        'No es un defecto de esta app; ver design.md §13 y u3-hola-mundo.spec.ts.',
    );

    await page.goto(URL_DEL_SITIO);
    await esperarAlServiceWorker(page);
    await context.setOffline(true);

    const fallidas: string[] = [];
    page.on('requestfailed', (peticion) => fallidas.push(`${peticion.url()} — ${peticion.failure()?.errorText ?? 'sin detalle'}`));

    await page.reload();
    await expect(page.getByRole('button', { name: /visualizar/i })).toBeVisible();
    // La recarga la contestó el service worker: la página está bajo su control.
    expect(await page.evaluate(() => navigator.serviceWorker.controller?.scriptURL)).toBe(`${SITIO.href}sw.js`);
    await visualizar(page);
    await page.getByRole('button', { name: /^fin\b/i }).click();
    await expect(page.getByTestId('consola')).toContainText('Hola, mundo');

    expect(fallidas, `Peticiones fallidas estando offline: ${fallidas.join(' | ')}`).toEqual([]);
  });
});
