// Tarea 5.7 (REQ-PLAT-008): el alumno que tiene abierta la versión vieja se entera de que hay una nueva y puede cambiarse a ella. Playwright ×3 motores, el service worker real del build con ruta base,
// sobre un sitio que la prueba puede «re-desplegar» (`sitio-editable.ts`). Sin este flujo, tras publicar los robots nuevos los alumnos con el sitio en caché seguirían viendo lo viejo para siempre.
// Los fakes de `pwa/registro.test.ts` prueban la lógica; aquí se prueba lo que ningún fake puede: que el `sw.js` que genera `vite-plugin-pwa` entienda `SKIP_WAITING`, que el navegador avise del cambio
// de mando y que la página recargue sola SOLO cuando la persona lo pidió.
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { teclaDeTabulador } from './ayudas.ts';
import { levantarSitioEditable, type SitioEditable } from './sitio-editable.ts';

let sitio: SitioEditable;

test.beforeEach(async () => {
  sitio = await levantarSitioEditable();
});

test.afterEach(async () => {
  await sitio.cerrar();
});

/** Abre el sitio y deja la página BAJO EL CONTROL del service worker (la primera carga lo instala; la recarga ya la atiende él). */
async function abrirYQuedarBajoElControl(page: Page): Promise<void> {
  await page.goto(sitio.url);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);
  await expect(page.getByRole('button', { name: /visualizar/i })).toBeVisible();
}

/** Pregunta al worker que controla la página qué versión es: la 1 (el build) no sabe responder y se rinde a los 500 ms; la 2 contesta `2`. */
async function versionQueControla(page: Page): Promise<number | null> {
  return page.evaluate(
    () =>
      new Promise<number | null>((resolver) => {
        const cancelar = setTimeout(() => resolver(null), 500);
        navigator.serviceWorker.addEventListener('message', (evento: MessageEvent<{ version?: number }>) => {
          clearTimeout(cancelar);
          resolver(evento.data.version ?? null);
        });
        navigator.serviceWorker.controller?.postMessage({ type: 'VERSION' });
      }),
  );
}

/** Igual que `versionQueControla`, pero para repetirla mientras la página se recarga sola: si la consulta cae a media navegación todavía no hay respuesta (`null`), no un error. */
async function versionQueControlaSiLaPaginaYaEstable(page: Page): Promise<number | null> {
  try {
    return await versionQueControla(page);
  } catch {
    return null;
  }
}

const AVISO = /hay una versión nueva del visualizador/i;

test.describe('una versión nueva del sitio', () => {
  test('la primera visita NO ofrece nada (instalar el worker por primera vez no es una actualización)', async ({ page }) => {
    await page.goto(sitio.url);
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('status')).toHaveText('');
    await expect(page.getByRole('button', { name: /recargar ahora/i })).toHaveCount(0);
  });

  test('si el sitio no cambió, recargar tampoco ofrece nada', async ({ page }) => {
    await abrirYQuedarBajoElControl(page);

    await page.reload();
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('status')).toHaveText('');
  });

  test('al re-desplegar, el alumno ve el aviso; «Recargar ahora» cambia a la versión nueva y recarga la página sola', async ({ page }) => {
    await abrirYQuedarBajoElControl(page);
    expect(await versionQueControla(page)).toBeNull();

    sitio.publicarVersion2();
    await page.reload();

    // El aviso aparece DENTRO de la región `status` que ya estaba en la página, con la advertencia de que se pierde lo escrito.
    const region = page.getByRole('status');
    await expect(region).toContainText(AVISO);
    await expect(region).toContainText('cópialo antes');
    // La página sigue siendo la vieja hasta que la persona acepte: el worker nuevo espera.
    expect(await versionQueControla(page)).toBeNull();

    await page.evaluate(() => {
      (window as unknown as { marcaDeLaPaginaVieja: boolean }).marcaDeLaPaginaVieja = true;
    });
    await page.getByRole('button', { name: 'Recargar ahora' }).click();

    // La página se recarga sola (la marca desaparece), el aviso ya no está y quien manda ahora es la versión 2.
    await page.waitForFunction(() => (window as unknown as { marcaDeLaPaginaVieja?: boolean }).marcaDeLaPaginaVieja === undefined, undefined, { timeout: 15_000 });
    await expect(page.getByRole('button', { name: /visualizar/i })).toBeVisible();
    await expect(page.getByRole('status')).toHaveText('');
    await expect.poll(() => versionQueControlaSiLaPaginaYaEstable(page), { timeout: 15_000 }).toBe(2);
  });

  test('«Más tarde» oculta el aviso sin recargar ni cambiar de versión: no se pierde lo que el alumno escribía', async ({ page }) => {
    await abrirYQuedarBajoElControl(page);
    sitio.publicarVersion2();
    await page.reload();
    await expect(page.getByRole('status')).toContainText(AVISO);
    await page.evaluate(() => {
      (window as unknown as { marcaDeLaPaginaVieja: boolean }).marcaDeLaPaginaVieja = true;
    });

    await page.getByRole('button', { name: 'Más tarde' }).click();

    await expect(page.getByRole('status')).toHaveText('');
    // Sigue la misma página (nadie la recargó) y la versión 2 sigue esperando, sin tomar el mando.
    expect(await page.evaluate(() => (window as unknown as { marcaDeLaPaginaVieja?: boolean }).marcaDeLaPaginaVieja)).toBe(true);
    expect(await versionQueControla(page)).toBeNull();
    expect(await page.evaluate(() => navigator.serviceWorker.getRegistration().then((registro) => registro?.waiting !== null))).toBe(true);
  });

  test('si la persona vuelve a cargar la página y la versión nueva sigue esperando, el aviso reaparece', async ({ page }) => {
    await abrirYQuedarBajoElControl(page);
    sitio.publicarVersion2();
    await page.reload();
    await expect(page.getByRole('status')).toContainText(AVISO);
    await page.getByRole('button', { name: 'Más tarde' }).click();

    await page.reload();

    await expect(page.getByRole('status')).toContainText(AVISO);
  });

  test('con el aviso a la vista no hay violaciones de accesibilidad (axe, WCAG A y AA, contraste incluido)', async ({ page }) => {
    await abrirYQuedarBajoElControl(page);
    sitio.publicarVersion2();
    await page.reload();
    await expect(page.getByRole('status')).toContainText(AVISO);

    const resultado = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();

    expect(resultado.violations.map((violacion) => `${violacion.id}: ${violacion.nodes.map((nodo) => nodo.target.join(' ')).join(' | ')}`)).toEqual([]);
  });

  test('se acepta solo con teclado: lo primero que alcanza Tab es «Recargar ahora» y Enter cambia a la versión nueva', async ({ page, browserName }) => {
    await abrirYQuedarBajoElControl(page);
    sitio.publicarVersion2();
    await page.reload();
    await expect(page.getByRole('status')).toContainText(AVISO);

    await page.keyboard.press(teclaDeTabulador(browserName));
    await expect(page.getByRole('button', { name: 'Recargar ahora' })).toBeFocused();
    await page.keyboard.press('Enter');

    await expect.poll(() => versionQueControlaSiLaPaginaYaEstable(page), { timeout: 15_000 }).toBe(2);
    await expect(page.getByRole('status')).toHaveText('');
  });
});
