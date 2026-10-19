// Tarea R0.12 (REQ-AULA-004, CR2; absorbe la tarea 5.5 de `visualizador-java`): el modo proyector a 1024×768 y 1280×720, contra el build real en los tres motores.
//   - Se enciende desde «Ajustes de la clase»; el código queda a 24 px o más y ocupa del 55 % al 60 % del ancho; los controles se ensanchan (≥ 44 px).
//   - Una línea de 53 caracteres, que a 24 px no cabe en la columna del código, se parte en dos renglones y NO hay desplazamiento horizontal.
//   - La tabla de variables no muestra la columna «Tipo» y la consola deja a la vista sus últimas líneas.
//   - Ningún panel se superpone ni corta su texto, y la página no se desplaza de lado.
import { expect, test, type Page } from '@playwright/test';
import { escribirEnElEditor, globoDelRobot, irAlFinal, visualizar } from './ayudas.ts';

/** 8 + 19 + 24 + 2 = 53 caracteres en la línea de la impresión. */
const LINEA_DE_53 = '        System.out.println("0123456789012345678901");';

const PROGRAMA_CON_LINEA_LARGA = [
  'public class Larga {',
  '    public static void main(String[] args) {',
  '        int total = 0;',
  '        for (int i = 1; i <= 8; i++) {',
  '            total = total + i;',
  '            System.out.println("Vuelta " + i + ": " + total);',
  '        }',
  LINEA_DE_53,
  '    }',
  '}',
].join('\n');

/** Cuarenta declaraciones: el programa no cabe en el editor, así que la línea actual se sale de la vista si el editor no se desplaza. */
const PROGRAMA_LARGO = [
  'public class Largo {',
  '    public static void main(String[] args) {',
  ...Array.from({ length: 40 }, (_, indice) => `        int v${indice} = ${indice};`),
  '    }',
  '}',
].join('\n');

async function encenderElProyector(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Ajustes de la clase' }).click();
  await page.getByRole('switch', { name: /Modo proyector/ }).check();
  await page.getByRole('button', { name: 'Cerrar' }).click();
  await expect(page.getByTestId('contenedor-de-la-pantalla')).toHaveAttribute('data-proyector', 'encendido');
}

async function proyectarElPrograma(page: Page): Promise<void> {
  await page.goto('/');
  await escribirEnElEditor(page, PROGRAMA_CON_LINEA_LARGA);
  await visualizar(page);
  await expect(page.getByRole('button', { name: /siguiente/i })).toBeFocused();
  await encenderElProyector(page);
}

for (const ventana of [
  { ancho: 1024, alto: 768 },
  { ancho: 1280, alto: 720 },
]) {
  test.describe(`modo proyector a ${ventana.ancho}×${ventana.alto} (REQ-AULA-004)`, () => {
    test.use({ viewport: { width: ventana.ancho, height: ventana.alto } });

    test('el código va a 24 px o más y ocupa del 55 % al 60 % del ancho; los controles miden al menos 44 px', async ({ page }) => {
      await proyectarElPrograma(page);

      const tamano = await page.locator('.cm-content').evaluate((contenido) => parseFloat(getComputedStyle(contenido).fontSize));
      expect(tamano, 'tamaño de la letra del código').toBeGreaterThanOrEqual(24);

      const cuerpo = await page.getByTestId('cuerpo-del-visualizador').boundingBox();
      const columna = await page.locator('.columna-codigo').boundingBox();
      expect(cuerpo).not.toBeNull();
      expect(columna).not.toBeNull();
      if (cuerpo !== null && columna !== null) {
        const fraccion = columna.width / cuerpo.width;
        expect(fraccion, 'ancho de la columna del código').toBeGreaterThanOrEqual(0.55);
        expect(fraccion, 'ancho de la columna del código').toBeLessThanOrEqual(0.6);
      }

      for (const boton of [page.getByRole('button', { name: /siguiente/i }), page.getByRole('button', { name: /anterior/i }), page.getByRole('button', { name: 'Visualizar' })]) {
        const caja = await boton.boundingBox();
        expect(caja?.height ?? 0).toBeGreaterThanOrEqual(44);
      }
    });

    test('la línea de 53 caracteres se parte en dos renglones, con su número una sola vez y sin desplazamiento horizontal', async ({ page }) => {
      await proyectarElPrograma(page);

      const desplazador = page.locator('.cm-scroller');
      const medidas = await desplazador.evaluate((elemento) => ({ contenido: elemento.scrollWidth, visible: elemento.clientWidth }));
      expect(medidas.contenido, 'el editor no se desplaza de lado').toBeLessThanOrEqual(medidas.visible + 1);

      const larga = await page.locator('.cm-line', { hasText: '0123456789012345678901' }).boundingBox();
      const corta = await page.locator('.cm-line', { hasText: 'int total = 0;' }).boundingBox();
      expect(larga).not.toBeNull();
      expect(corta).not.toBeNull();
      if (larga !== null && corta !== null) expect(larga.height, 'la línea larga ocupa dos renglones').toBeGreaterThan(corta.height * 1.6);

      // El número de línea sale una sola vez: del 1 al 10 (las líneas del programa) hay exactamente un número cada uno (CodeMirror suma un «99» oculto que solo mide el ancho de la columna).
      const numeros = (await page.locator('.cm-lineNumbers .cm-gutterElement').allTextContents()).map((numero) => numero.trim()).filter((numero) => numero !== '' && numero !== '99');
      expect(numeros).toEqual(Array.from({ length: PROGRAMA_CON_LINEA_LARGA.split('\n').length }, (_, indice) => String(indice + 1)));
    });

    test('las variables salen sin la columna «Tipo» y se vuelve a ver con el modo apagado', async ({ page }) => {
      await proyectarElPrograma(page);
      for (let paso = 0; paso < 3; paso += 1) await page.getByRole('button', { name: /siguiente/i }).click();

      await expect(page.getByRole('columnheader', { name: 'Nombre' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Valor' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Tipo' })).toHaveCount(0);

      await page.getByRole('button', { name: 'Ajustes de la clase' }).click();
      await page.getByRole('switch', { name: /Modo proyector/ }).uncheck();
      await expect(page.getByRole('columnheader', { name: 'Tipo' })).toBeVisible();
    });

    test('la consola muestra sus últimas líneas completas, no más de cuatro a la vez', async ({ page }) => {
      await proyectarElPrograma(page);
      await irAlFinal(page);
      await expect(globoDelRobot(page)).toContainText('Así terminó');

      const consola = page.getByTestId('consola');
      const caja = await consola.boundingBox();
      const ultima = await consola.locator('[data-flujo="out"]').last().boundingBox();
      expect(caja).not.toBeNull();
      expect(ultima).not.toBeNull();
      if (caja === null || ultima === null) return;
      expect(ultima.y, 'la última línea empieza dentro de la consola').toBeGreaterThanOrEqual(caja.y - 1);
      expect(ultima.y + ultima.height, 'la última línea termina dentro de la consola').toBeLessThanOrEqual(caja.y + caja.height + 1);
      const tamano = await consola.evaluate((elemento) => parseFloat(getComputedStyle(elemento).fontSize));
      expect(caja.height, 'la consola no pasa de cuatro líneas más su margen').toBeLessThanOrEqual(tamano * 1.5 * 4 + tamano * 2);
    });

    test('ningún panel se superpone ni corta su texto, y la página no se desplaza de lado', async ({ page }) => {
      await proyectarElPrograma(page);
      await page.getByRole('button', { name: /siguiente/i }).click();

      const zonas = ['.zona-codigo', '.zona-explicacion', '.zona-estado', '.zona-consola'];
      const cajas = new Map<string, { x: number; y: number; width: number; height: number }>();
      for (const zona of zonas) {
        const caja = await page.locator(zona).boundingBox();
        expect(caja, zona).not.toBeNull();
        if (caja === null) continue;
        cajas.set(zona, caja);
        expect(caja.x + caja.width, `${zona} no sale de la ventana por la derecha`).toBeLessThanOrEqual(ventana.ancho + 1);
        const recortado = await page.locator(zona).evaluate((elemento) => elemento.scrollWidth > elemento.clientWidth + 1);
        expect(recortado, `${zona} corta su texto por el lado`).toBe(false);
      }
      for (let a = 0; a < zonas.length; a += 1) {
        for (let b = a + 1; b < zonas.length; b += 1) {
          const uno = cajas.get(zonas[a] ?? '');
          const otro = cajas.get(zonas[b] ?? '');
          if (uno === undefined || otro === undefined) continue;
          const seCruzan = uno.x < otro.x + otro.width - 1 && otro.x < uno.x + uno.width - 1 && uno.y < otro.y + otro.height - 1 && otro.y < uno.y + uno.height - 1;
          expect(seCruzan, `${zonas[a]} y ${zonas[b]} se superponen`).toBe(false);
        }
      }
      const medidas = await page.evaluate(() => ({ ancho: document.documentElement.clientWidth, contenido: document.documentElement.scrollWidth }));
      expect(medidas.contenido).toBeLessThanOrEqual(medidas.ancho);
    });

    test('al encender el proyector con el programa a medias, la línea que acaba de ejecutarse sigue a la vista en el editor', async ({ page }) => {
      await page.goto('/');
      await escribirEnElEditor(page, PROGRAMA_LARGO);
      await visualizar(page);
      const siguiente = page.getByRole('button', { name: /siguiente/i });
      for (let paso = 0; paso < 30; paso += 1) await siguiente.click();
      await expect(page.locator('.cm-linea-ejecutada')).toHaveCount(1);

      await encenderElProyector(page);

      await expect(async () => {
        const linea = await page.locator('.cm-linea-ejecutada').boundingBox();
        const desplazador = await page.locator('.cm-scroller').boundingBox();
        expect(linea, 'la línea ejecutada se pinta').not.toBeNull();
        expect(desplazador).not.toBeNull();
        if (linea === null || desplazador === null) return;
        expect(linea.y, 'la línea no queda arriba del editor').toBeGreaterThanOrEqual(desplazador.y - 1);
        expect(linea.y + linea.height, 'la línea no queda abajo del editor').toBeLessThanOrEqual(desplazador.y + desplazador.height + 1);
      }).toPass({ timeout: 5_000 });
    });

    test('el robot, su globo y la ranura siguen a la vista sin desplazar la página en el paso 0', async ({ page }) => {
      await proyectarElPrograma(page);
      for (const [elemento, nombre] of [
        [page.locator('[data-personaje]:visible'), 'el robot'],
        [globoDelRobot(page), 'el globo'],
        [page.getByRole('button', { name: /siguiente/i }), 'Siguiente'],
      ] as const) {
        const caja = await elemento.boundingBox();
        expect(caja, nombre).not.toBeNull();
        if (caja !== null) expect(caja.y + caja.height, `${nombre} cabe en la ventana`).toBeLessThanOrEqual(ventana.alto + 1);
      }
    });
  });
}
