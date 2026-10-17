// Tarea 4.15 (REQ-PLAT-005 parte, C14 base): línea base de accesibilidad AA de la pantalla del visualizador, contra el build real en los tres motores. Cuatro afirmaciones (design.md §6.6):
//   1. Cero violaciones de axe (WCAG 2.0/2.1 A y AA) en la pantalla principal con un programa cargado, y en cada estado que cambia lo que se ve: paso a paso, esperando un dato, una excepción, un error de
//      compilación. axe también revisa el contraste de color.
//   2. El flujo completo (editar → Visualizar → navegar → teclear un dato → volver a editar) se puede hacer SOLO con teclado, sin trampa de teclado y con el foco siempre visible.
//   3. `prefers-reduced-motion: reduce` apaga las animaciones del robot sin perder ninguna información (el globo sigue diciendo lo mismo).
//   4. Zoom al 200 % (la mitad de píxeles CSS de ancho) y reflujo a 320 px: sin desplazamiento horizontal de la página y sin recortar los controles ni el globo.
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { escribirEnElEditor, globoDelRobot, irAlFinal, teclaDeTabulador, teclearDato, visualizar } from './ayudas.ts';

const MAQUINA_DE_SNACKS = readFileSync(resolve('corpus/experimentos/ejercicios-del-po/maquina-snacks-a1-2-50.java'), 'utf8');

const ETIQUETAS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

// C4 del panel 1: axe marcaba `scrollable-region-focusable` (grave) en `.cm-scroller` en cuanto el editor se desplazaba —un programa más alto que el editor, o una pantalla angosta— y el panel lo vio en el estado
// de error. El programa corto de abajo no desborda el editor, por eso la prueba de siempre no lo veía: estos sí.
const PROGRAMA_LARGO_CON_ERROR = [
  'public class Largo {',
  '    public static void main(String[] args) {',
  ...Array.from({ length: 30 }, (_, indice) => `        int v${indice} = ${indice};`),
  '        System.out.println("Hola")',
  '    }',
  '}',
].join('\n');

/** El texto de la línea donde está el cursor del editor (donde caería lo que el alumno teclee). */
async function lineaDelCursor(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const nodo = getSelection()?.anchorNode;
    const elemento = nodo === undefined || nodo === null ? null : nodo.nodeType === Node.TEXT_NODE ? nodo.parentElement : (nodo as Element);
    return elemento?.closest('.cm-line')?.textContent ?? null;
  });
}

async function violacionesDeAxe(page: Page): Promise<string[]> {
  const resultado = await new AxeBuilder({ page }).withTags(ETIQUETAS_WCAG).analyze();
  return resultado.violations.map((violacion) => `${violacion.id} (${violacion.impact}): ${violacion.nodes.map((nodo) => nodo.target.join(' ')).join(' | ')} — ${violacion.help}`);
}

async function pegarYVisualizar(page: Page, fuente: string): Promise<void> {
  await page.goto('/');
  await escribirEnElEditor(page, fuente);
  await visualizar(page);
}

test.describe('axe: cero violaciones en cada estado de la pantalla', () => {
  test('la primera visita: el editor con el «Hola, mundo» y el robot que saluda', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('globo-del-robot')).toContainText('Pega o escribe un programa');
    expect(await violacionesDeAxe(page)).toEqual([]);
  });

  test('un programa cargado y visualizándose paso a paso (variables, condición, consola, robot)', async ({ page }) => {
    await pegarYVisualizar(page, MAQUINA_DE_SNACKS);
    await irAlFinal(page);
    await teclearDato(page, 'a1');
    await expect(globoDelRobot(page)).toContainText('Línea 19');
    await irAlFinal(page);
    await teclearDato(page, '2');
    await expect(globoDelRobot(page)).toContainText('Línea 51');
    await page.getByRole('button', { name: /siguiente/i }).click(); // la condición: panel de condición, cadena de sustitución y franja del búfer a la vista
    await expect(page.getByTestId('cadena-de-sustitucion')).toBeVisible();
    await expect(page.getByTestId('franja-bufer')).toBeVisible();
    expect(await violacionesDeAxe(page)).toEqual([]);
  });

  test('esperando un dato: el campo de entrada dentro de la consola', async ({ page }) => {
    await pegarYVisualizar(page, MAQUINA_DE_SNACKS);
    await irAlFinal(page);
    await expect(page.getByRole('textbox', { name: /dato/i })).toBeVisible();
    expect(await violacionesDeAxe(page)).toEqual([]);
  });

  test('una excepción: el aviso con su título y el mensaje en rojo de la consola', async ({ page }) => {
    await pegarYVisualizar(
      page,
      ['public class Division {', '    public static void main(String[] args) {', '        int a = 10;', '        int b = 0;', '        System.out.println(a / b);', '    }', '}'].join('\n'),
    );
    await irAlFinal(page);
    await expect(globoDelRobot(page)).toContainText('El programa se detuvo por un error');
    expect(await violacionesDeAxe(page)).toEqual([]);
  });

  test('un error de compilación: el aviso, el subrayado y la marca del margen', async ({ page }) => {
    await pegarYVisualizar(page, ['public class Saludo {', '    public static void main(String[] args) {', '        System.out.println("Hola")', '    }', '}'].join('\n'));
    await expect(page.getByRole('alert')).toContainText('Error de compilación');
    await expect(page.locator('.cm-problema-error')).toBeVisible();
    expect(await violacionesDeAxe(page)).toEqual([]);
  });

  test('un error de compilación con un programa largo (el editor se desplaza): sin violaciones, y el foco no se pierde: va a la línea del error (C4)', async ({ page }) => {
    await pegarYVisualizar(page, PROGRAMA_LARGO_CON_ERROR);
    await expect(page.getByRole('alert')).toContainText('Error de compilación');
    await expect(page.locator('.cm-problema-error')).toBeVisible();
    const desplazable = await page.locator('.cm-scroller').evaluate((e) => e.scrollHeight > e.clientHeight);
    expect(desplazable, 'el programa de la prueba debe desbordar el editor para que axe revise la región desplazable').toBe(true);

    expect(await violacionesDeAxe(page)).toEqual([]);
    await expect(page.locator('.cm-content')).toBeFocused();
    expect(await lineaDelCursor(page)).toContain('System.out.println("Hola")');
  });

  test('un error de compilación en una pantalla de celular (390 px): sin violaciones', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await pegarYVisualizar(page, ['public class Saludo {', '    public static void main(String[] args) {', '        System.out.println("Hola")', '    }', '}'].join('\n'));
    await expect(page.getByRole('alert')).toContainText('Error de compilación');
    expect(await violacionesDeAxe(page)).toEqual([]);
  });

  test('editar el programa después de un error: el globo dice «Cambiaste el programa…», con la cara normal y sin violaciones', async ({ page }) => {
    await pegarYVisualizar(page, PROGRAMA_LARGO_CON_ERROR);
    await expect(page.getByRole('alert')).toContainText('Error de compilación');

    await page.keyboard.type(';'); // el foco ya está en la línea del error: quien corrige solo teclea
    await expect(globoDelRobot(page)).toContainText('Cambiaste el programa. Pulsa «Visualizar» y lo reviso otra vez.');
    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(page.getByRole('img', { name: /robot/i })).toHaveAttribute('data-animo', 'normal');
    expect(await violacionesDeAxe(page)).toEqual([]);
  });
});

test.describe('solo con teclado', () => {
  test('editar, Visualizar, navegar, teclear un dato y volver a editar, sin ratón y sin trampa de teclado', async ({ page, browserName }) => {
    const tabulador = teclaDeTabulador(browserName);
    await page.goto('/');

    // Tab NO queda atrapado en el editor: desde él, el foco sigue su camino hasta «Visualizar».
    await page.locator('.cm-content').focus();
    await page.keyboard.press(tabulador);
    await expect(page.getByRole('button', { name: /visualizar/i })).toBeFocused();

    // Enter activa «Visualizar»: el foco pasa a «Siguiente» y el robot dice cuál línea sigue.
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: /siguiente/i })).toBeFocused();
    await expect(globoDelRobot(page)).toContainText('Todavía no se ejecuta nada');

    // Flechas, Fin, Inicio y espacio (con el foco en un botón, la barra espaciadora activa ese botón; con el foco fuera de los botones, reproduce).
    await page.keyboard.press('ArrowRight');
    await expect(page.getByText('Paso 1 de 1').first()).toBeVisible();
    await page.keyboard.press('Home');
    await expect(page.getByText('Paso 0 de 1').first()).toBeVisible();
    await page.keyboard.press('End');
    await expect(page.getByText('Paso 1 de 1').first()).toBeVisible();

    // El foco siempre es visible: tras mover el foco con Tab, el elemento enfocado lleva un contorno (`:focus-visible`) con grosor.
    for (let tab = 0; tab < 3; tab += 1) {
      await page.keyboard.press(tabulador);
      const contorno = await page.evaluate(() => {
        const enfocado = document.activeElement;
        if (!enfocado || enfocado === document.body) return { estilo: 'sin foco', grosor: 0 };
        const estilo = getComputedStyle(enfocado);
        return { estilo: estilo.outlineStyle, grosor: parseFloat(estilo.outlineWidth) };
      });
      expect(contorno.estilo, `Tab ${tab + 1}`).not.toBe('none');
      expect(contorno.estilo, `Tab ${tab + 1}`).not.toBe('sin foco');
      expect(contorno.grosor, `Tab ${tab + 1}`).toBeGreaterThanOrEqual(2);
    }

    // Volver a editar con el teclado: Tab hasta «Editar programa» y Enter; el foco regresa al editor.
    await page.getByRole('button', { name: /editar programa/i }).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.cm-content')).toBeFocused();
  });

  test('con un programa que pide datos: las teclas escriben en el campo y NO navegan; Enter lo envía', async ({ page }) => {
    await pegarYVisualizar(page, MAQUINA_DE_SNACKS);
    await expect(page.getByRole('button', { name: /siguiente/i })).toBeFocused();
    await page.keyboard.press('End');
    const campo = page.getByRole('textbox', { name: /dato/i });
    await expect(campo).toBeFocused();

    await page.keyboard.type('a1 ');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('Home');
    await expect(campo).toHaveValue('a1 ');
    await expect(page.getByText('Paso 8 de 8').first()).toBeVisible();

    await page.keyboard.press('End');
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Enter');
    await expect(globoDelRobot(page)).toContainText('Línea 19');
    // y el foco regresa a los controles para seguir con el teclado
    await expect(page.getByRole('button', { name: /siguiente/i })).toBeFocused();
  });
});

test.describe('movimiento reducido', () => {
  test('con `prefers-reduced-motion: reduce` el robot no se anima y el globo dice lo mismo', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await pegarYVisualizar(page, MAQUINA_DE_SNACKS);
    await page.getByRole('button', { name: /siguiente/i }).click();
    const conMovimiento = await globoDelRobot(page).textContent();
    const animacionNormal = await page.locator('.robot-antena').evaluate((e) => getComputedStyle(e).animationName);
    expect(animacionNormal).not.toBe('none');

    await page.emulateMedia({ reducedMotion: 'reduce' });
    const animacionReducida = await page.locator('.robot-antena').evaluate((e) => getComputedStyle(e).animationName);
    const globoAnimado = await page.locator('.globo-contenido').evaluate((e) => getComputedStyle(e).animationName);
    expect(animacionReducida).toBe('none');
    expect(globoAnimado).toBe('none');
    // Sin perder información: lo que el robot dice es lo mismo.
    expect(await globoDelRobot(page).textContent()).toBe(conMovimiento);
  });
});

test.describe('zoom al 200 % y reflujo', () => {
  async function sinRecortes(page: Page): Promise<void> {
    const medidas = await page.evaluate(() => ({ desbordaLaPagina: document.documentElement.scrollWidth > document.documentElement.clientWidth, ancho: document.documentElement.clientWidth }));
    expect(medidas.desbordaLaPagina, `la página se desborda a ${medidas.ancho}px`).toBe(false);
    // Los controles y el globo caben en el ancho: ningún botón de la barra queda fuera de la ventana.
    for (const nombre of [/visualizar/i, /reiniciar/i, /siguiente/i, /^fin\b/i, /reproducir/i]) {
      const caja = await page.getByRole('button', { name: nombre }).boundingBox();
      expect(caja, String(nombre)).not.toBeNull();
      expect((caja?.x ?? 0) + (caja?.width ?? 0), `${String(nombre)} se sale por la derecha`).toBeLessThanOrEqual(medidas.ancho + 1);
    }
    const globo = await globoDelRobot(page).boundingBox();
    expect((globo?.x ?? 0) + (globo?.width ?? 0)).toBeLessThanOrEqual(medidas.ancho + 1);
  }

  test('a 640 px de ancho (el 200 % de una ventana de 1280)', async ({ page }) => {
    await page.setViewportSize({ width: 640, height: 800 });
    await pegarYVisualizar(page, MAQUINA_DE_SNACKS);
    await page.getByRole('button', { name: /siguiente/i }).click();
    await sinRecortes(page);
  });

  test('a 320 px de ancho (reflujo, WCAG 1.4.10)', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await pegarYVisualizar(page, MAQUINA_DE_SNACKS);
    await page.getByRole('button', { name: /siguiente/i }).click();
    await sinRecortes(page);
  });
});
