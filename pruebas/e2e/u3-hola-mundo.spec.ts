// Cierre de la rebanada vertical (tarea 0.15, design.md §7.1 C17, C12). Playwright ×3 motores
// contra el build real (webServer en playwright.config.ts: `vite build` + `vite preview`, con el
// service worker activo — el único caso donde CLAUDE.md permite `vite build`).
import { expect, test } from '@playwright/test';

const PROGRAMA_E2E = [
  'public class Saludo {',
  '    public static void main(String[] args) {',
  '        System.out.println("E2E funciona");',
  '    }',
  '}',
].join('\n');

test.describe('rebanada vertical: u3-hola-mundo', () => {
  test('escribe un programa en el editor, pulsa Visualizar y ve su salida real; sin violaciones de CSP', async ({
    page,
  }) => {
    const erroresDeConsola: string[] = [];
    page.on('console', (mensaje) => {
      if (mensaje.type() === 'error') erroresDeConsola.push(mensaje.text());
    });
    page.on('pageerror', (error) => erroresDeConsola.push(String(error)));

    await page.goto('/');

    // Escribe de verdad en CodeMirror 6 (jsdom no hace layout para esto — ADR 013; por eso vive
    // aquí, no en App.test.tsx). Reemplaza el programa dorado precargado por uno distinto para
    // probar que la salida depende del contenido real del editor, no de un valor fijo.
    const editor = page.locator('.cm-content');
    await expect(editor).toBeVisible();
    await editor.click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.type(PROGRAMA_E2E);

    await page.getByRole('button', { name: /visualizar/i }).click();

    await expect(page.getByTestId('consola')).toContainText('E2E funciona');

    // CodeMirror inyecta sus propios <style> (design.md §6.7 "lo que CodeMirror necesite para sus
    // estilos se verifica en el lote 0"); la CSP de index.html solo restringe connect-src, pero
    // confirmamos aquí que ningún motor reporta una violación real en consola.
    const violacionesCsp = erroresDeConsola.filter((texto) =>
      /content security policy|csp/i.test(texto),
    );
    expect(violacionesCsp, `Errores de consola: ${erroresDeConsola.join(' | ')}`).toEqual([]);
  });

  test('tras precachear, sigue funcionando sin red — offline real (C12, ADR 014)', async ({
    page,
    context,
    browserName,
  }) => {
    // Riesgo abierto de design.md §13 ("soporte de service worker de WebKit en Playwright"),
    // confirmado real (no simulado ni debilitado — precisión del orquestador, tarea 0.15):
    // Playwright 1.63.0 + WebKit del propio Playwright (build webkit-2359, "WebKit 26.6") en
    // macOS 26.5.1 arm64 arroja `Error: page.reload: WebKit encountered an internal error` (y lo
    // mismo con `page.goto()` o una pestaña nueva) al navegar CUALQUIER página controlada por un
    // service worker activo mientras `context.setOffline(true)` está encendido. Aislado con
    // pruebas de diagnóstico (descartadas, no forman parte del repo): la navegación offline
    // funciona bien en este mismo WebKit para páginas SIN service worker (`data:text/html,...`) o
    // antes de que el service worker tome control — el defecto es específico de la combinación
    // "página con SW activo" + "offline" + WebKit de Playwright, no de esta app ni de esta prueba.
    // La prueba anterior (arriba) SÍ corre en WebKit y prueba la app real end-to-end (editor,
    // compilación, ejecución, consola, sin violaciones de CSP) — "conserva el E2E funcional en
    // WebKit" sin fingir ni debilitar en silencio la afirmación "cero peticiones de red": aquí se
    // salta con el motivo explícito, para que el orquestador/PO decida (documentado también en
    // Engram, discovery "riesgo WebKit + service worker offline").
    test.skip(
      browserName === 'webkit',
      'Playwright WebKit (build webkit-2359 / "WebKit 26.6", Playwright 1.63.0, macOS 26.5.1 ' +
        'arm64): navegar una página con service worker activo mientras context.setOffline(true) ' +
        'está encendido falla con «WebKit encountered an internal error» (page.reload/page.goto ' +
        'por igual). No es un defecto de esta app — la prueba de arriba confirma que la app SÍ ' +
        'funciona de verdad en este WebKit. Ver design.md §13 y el hallazgo en Engram.',
    );

    await page.goto('/');

    // Espera a que el service worker tome control (precache completo) antes de cortar la red.
    await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) {
        throw new Error('serviceWorker no disponible en este navegador');
      }
      await navigator.serviceWorker.ready;
    });

    await context.setOffline(true);

    // Con la red realmente cortada (context.setOffline), cualquier petición que NO responda el
    // service worker desde el precache falla a nivel de red (net::ERR_INTERNET_DISCONTINUED) — es
    // una señal más fiable que contar peticiones (el service worker sí sigue "respondiendo"
    // peticiones desde caché, lo cual es correcto y esperado).
    const peticionesFallidas: string[] = [];
    page.on('requestfailed', (peticion) => {
      peticionesFallidas.push(`${peticion.url()} — ${peticion.failure()?.errorText ?? 'sin detalle'}`);
    });

    await page.reload();
    await expect(page.getByRole('button', { name: /visualizar/i })).toBeVisible();
    await page.getByRole('button', { name: /visualizar/i }).click();
    await expect(page.getByTestId('consola')).toContainText('Hola, mundo');

    expect(
      peticionesFallidas,
      `Peticiones fallidas estando offline: ${peticionesFallidas.join(' | ')}`,
    ).toEqual([]);
  });
});
