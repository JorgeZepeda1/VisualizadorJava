// Tareas R0.12 y R0.15 (REQ-PANT-001 a 009, REQ-PANT-005, CR1, CR2, CR3; ADR 017): la pantalla del visualizador con sus tres robots, contra el build real en los tres motores.
//   1. Escritorio (1366×768): el robot, su globo y la ranura de acciones se ven sin desplazar la página.
//   2. Celular (390×844 y 320 px): el editor ocupa ≈ 35 % del alto y se centra en la línea actual, el globo se ve en el paso 0, «Anterior / Siguiente» queda en una barra inferior fija y no hay
//      desplazamiento horizontal.
//   3. La primera vez, solo con el teclado: saludo → «Ver un ejemplo paso a paso» → Máquina de snacks → paso 1 en tres acciones.
//   4. Quién habla: exactamente UN robot a la vez en cada estado, y el que corresponde; un error de compilación lo explica el revisor y, al corregir, vuelve el robot paso a paso.
//   5. axe (WCAG A y AA, contraste incluido) sin violaciones en el saludo, la visualización, el error, la galería y el modo proyector; zoom al 200 % sin desbordes.
//   6. La galería sigue funcionando sin red tras la primera visita (build real con el service worker; regla 8).
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { abrirLaMaquinaDeSnacks, escribirEnElEditor, globoDelRobot, irAlFinal, irAlFinalDelPrograma, teclearCuandoElProgramaEspere, visualizar } from './ayudas.ts';

const MAQUINA_DE_SNACKS = readFileSync(resolve('corpus/experimentos/ejercicios-del-po/maquina-snacks-a1-2-50.java'), 'utf8');
const ETIQUETAS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

const PROGRAMA_LARGO = [
  'public class Largo {',
  '    public static void main(String[] args) {',
  ...Array.from({ length: 40 }, (_, indice) => `        int v${indice} = ${indice};`),
  '        System.out.println(v0 + v39);',
  '    }',
  '}',
].join('\n');

const PROGRAMA_CON_ERROR = ['public class Roto {', '    public static void main(String[] args) {', '        System.out.println("Hola")', '    }', '}'].join('\n');

async function violacionesDeAxe(page: Page): Promise<string[]> {
  const resultado = await new AxeBuilder({ page }).withTags(ETIQUETAS_WCAG).analyze();
  return resultado.violations.map((violacion) => `${violacion.id} (${violacion.impact}): ${violacion.nodes.map((nodo) => nodo.target.join(' ')).join(' | ')} — ${violacion.help}`);
}

/** Cuántos robots se ven en la pantalla ahora, y cuál es cada uno (`data-personaje` solo lo lleva la figura). */
async function robotsVisibles(page: Page): Promise<string[]> {
  return page.locator('[data-personaje]:visible').evaluateAll((figuras) => figuras.map((figura) => figura.getAttribute('data-personaje') ?? ''));
}

async function dentroDeLaVentana(elemento: Locator, ventana: { width: number; height: number }, nombre: string): Promise<void> {
  const caja = await elemento.boundingBox();
  expect(caja, nombre).not.toBeNull();
  if (caja === null) return;
  expect(caja.x, `${nombre}: a la izquierda`).toBeGreaterThanOrEqual(-1);
  expect(caja.y, `${nombre}: arriba`).toBeGreaterThanOrEqual(-1);
  expect(caja.x + caja.width, `${nombre}: a la derecha`).toBeLessThanOrEqual(ventana.width + 1);
  expect(caja.y + caja.height, `${nombre}: abajo`).toBeLessThanOrEqual(ventana.height + 1);
}

async function sinDesplazamientoHorizontal(page: Page): Promise<void> {
  const medidas = await page.evaluate(() => ({ ancho: document.documentElement.clientWidth, contenido: document.documentElement.scrollWidth }));
  expect(medidas.contenido, `la página se desborda a ${medidas.ancho} px`).toBeLessThanOrEqual(medidas.ancho);
}

/** El indicador de posición: «Paso N» mientras se calcula o se espera un dato, y «Paso N de M» cuando el programa ya terminó (REQ-PANT-004). */
function posicion(page: Page, numero: number): Locator {
  return page.getByText(new RegExp(`^Paso ${numero}( de \\d+)?$`)).first();
}

async function pegarYVisualizar(page: Page, fuente: string): Promise<void> {
  await page.goto('/');
  await escribirEnElEditor(page, fuente);
  await visualizar(page);
}

test.describe('escritorio 1366×768: el robot, su globo y la ranura sin desplazar (REQ-PANT-003)', () => {
  test.use({ viewport: { width: 1366, height: 768 } });

  test('en el paso 0 de la máquina de snacks se ven el robot, el globo y «Anterior / Siguiente» sin mover la página', async ({ page }) => {
    await pegarYVisualizar(page, MAQUINA_DE_SNACKS);
    await expect(page.getByRole('button', { name: /siguiente/i })).toBeFocused();

    const ventana = { width: 1366, height: 768 };
    await dentroDeLaVentana(page.locator('[data-personaje]:visible'), ventana, 'el robot');
    await dentroDeLaVentana(globoDelRobot(page), ventana, 'el globo');
    await dentroDeLaVentana(page.getByTestId('ranura-de-acciones'), ventana, 'la ranura');
    await dentroDeLaVentana(page.getByRole('button', { name: /siguiente/i }), ventana, 'Siguiente');
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    await sinDesplazamientoHorizontal(page);
  });

  // Correcciones del panel R0 (diseñador, «Antes de publicar» 1): con «Con mis datos», al teclear el tercer dato la página bajaba 188 px y el robot y «Así terminó» quedaban fuera de la vista del paso 22 al 26.
  // Ahora el robot, el globo y la ranura se quedan fijos arriba de la columna derecha.
  test('con «Con mis datos» el robot, el globo y la ranura no salen de la vista al teclear los datos ni hasta «Así terminó»', async ({ page }) => {
    await abrirLaMaquinaDeSnacks(page, { conMisDatos: true });
    const ventana = { width: 1366, height: 768 };
    const enLaVista = async (momento: string): Promise<void> => {
      await dentroDeLaVentana(page.locator('[data-personaje]:visible'), ventana, `el robot ${momento}`);
      await dentroDeLaVentana(globoDelRobot(page), ventana, `el globo ${momento}`);
      await dentroDeLaVentana(page.getByTestId('ranura-de-acciones'), ventana, `la ranura ${momento}`);
    };

    for (const dato of ['a1', '2', '50']) {
      await teclearCuandoElProgramaEspere(page, dato);
      await enLaVista(`al teclear «${dato}»`);
    }
    // El campo de la consola puede quedar fuera de la ventana (la página baja para mostrarlo); la narración, no.
    await irAlFinalDelPrograma(page);
    await enLaVista('en el fin');
    await expect(globoDelRobot(page)).toContainText('Así terminó');
    await dentroDeLaVentana(page.getByRole('button', { name: 'Probar con otros datos' }), ventana, 'Probar con otros datos');

    // Recorriendo los pasos hacia atrás hasta el principio, la narración sigue a la vista en cada uno.
    const anterior = page.getByRole('button', { name: /anterior/i });
    for (let paso = 0; paso < 26; paso += 1) {
      await anterior.click();
      await enLaVista(`al volver ${paso + 1} pasos`);
    }
  });

  // Panel R0 (diseñador): «Siguiente» se movía con la altura del globo (14 px a 1366). Con un alto mínimo del globo de ≈ 4 renglones queda en su lugar de un paso a otro.
  test('«Siguiente» no se mueve de un paso a otro en la máquina de snacks', async ({ page }) => {
    await abrirLaMaquinaDeSnacks(page);
    const siguiente = page.getByRole('button', { name: /siguiente/i });
    const altos: number[] = [];
    for (let paso = 0; paso < 26; paso += 1) {
      const caja = await siguiente.boundingBox();
      expect(caja, `paso ${paso}`).not.toBeNull();
      if (caja !== null) altos.push(caja.y);
      await siguiente.click();
    }
    expect(Math.max(...altos) - Math.min(...altos), `«Siguiente» se movió entre ${Math.min(...altos)} y ${Math.max(...altos)} px`).toBeLessThanOrEqual(1);
  });

  test('«Siguiente» es el botón primario y la leyenda de ▶ y ▷ acompaña al editor', async ({ page }) => {
    await pegarYVisualizar(page, MAQUINA_DE_SNACKS);
    await expect(page.getByRole('button', { name: /siguiente/i })).toHaveClass(/boton-principal/);
    await expect(page.getByRole('button', { name: 'Visualizar' })).not.toHaveClass(/boton-principal/);
    await expect(page.getByRole('list', { name: /marcas/i })).toBeVisible();
  });
});

for (const ancho of [390, 320]) {
  test.describe(`celular ${ancho} px: editor, globo y barra inferior (REQ-PANT-005)`, () => {
    // 390×844 es el escenario de REQ-PANT-005; a 320 px de ancho se prueba en un teléfono pequeño de 640 px de alto (el borde inferior del navegador móvil ya le quita parte a los 568 de un iPhone SE).
    const alto = ancho === 390 ? 844 : 640;
    test.use({ viewport: { width: ancho, height: alto } });

    test('el editor ocupa cerca de un tercio del alto, el globo se ve en el paso 0 y «Siguiente» queda en una barra inferior fija', async ({ page }) => {
      await pegarYVisualizar(page, MAQUINA_DE_SNACKS);
      await expect(page.getByRole('button', { name: /siguiente/i })).toBeFocused();

      const editor = await page.locator('.cm-editor').boundingBox();
      expect(editor).not.toBeNull();
      if (editor === null) return;
      // A 390×844 (REQ-PANT-005) el editor ocupa ≈ 35 %; en una ventana baja (320×640) cede alto para que el globo del paso 0 se vea sin desplazar, pero nunca baja de unas seis líneas.
      expect(editor.height / alto, 'el editor ocupa una parte del alto').toBeGreaterThan(ancho === 390 ? 0.3 : 0.15);
      expect(editor.height / alto, 'el editor no pasa de ≈ 35 % del alto').toBeLessThan(0.4);

      const ventana = { width: ancho, height: alto };
      await dentroDeLaVentana(globoDelRobot(page), ventana, 'el globo en el paso 0');
      await dentroDeLaVentana(page.locator('[data-personaje]:visible'), ventana, 'el robot en el paso 0');

      const ranura = page.getByTestId('ranura-de-acciones');
      expect(await ranura.evaluate((elemento) => getComputedStyle(elemento).position)).toBe('fixed');
      const caja = await ranura.boundingBox();
      expect(caja).not.toBeNull();
      if (caja !== null) expect(Math.abs(caja.y + caja.height - alto), 'pegada al borde inferior').toBeLessThanOrEqual(2);
      await dentroDeLaVentana(page.getByRole('button', { name: /siguiente/i }), ventana, 'Siguiente');
      await sinDesplazamientoHorizontal(page);
    });

    test('el botón «Siguiente» sigue en su sitio al avanzar y el editor se centra en la línea que sigue', async ({ page }) => {
      await pegarYVisualizar(page, PROGRAMA_LARGO);
      const siguiente = page.getByRole('button', { name: /siguiente/i });
      const antes = await siguiente.boundingBox();
      for (let paso = 0; paso < 24; paso += 1) await siguiente.click();
      const despues = await siguiente.boundingBox();
      expect(antes).not.toBeNull();
      expect(despues).not.toBeNull();
      if (antes !== null && despues !== null) expect(Math.abs(antes.y - despues.y), 'el botón no se mueve').toBeLessThanOrEqual(1);

      const linea = await page.locator('.cm-linea-siguiente').boundingBox();
      const contenedor = await page.locator('.cm-scroller').boundingBox();
      expect(linea).not.toBeNull();
      expect(contenedor).not.toBeNull();
      if (linea === null || contenedor === null) return;
      const centroDeLaLinea = linea.y + linea.height / 2;
      const centroDelEditor = contenedor.y + contenedor.height / 2;
      expect(Math.abs(centroDeLaLinea - centroDelEditor), 'la línea que sigue está cerca del centro del editor').toBeLessThanOrEqual(contenedor.height * 0.3);
      await sinDesplazamientoHorizontal(page);
    });

    // Marcar la línea que sigue se desplaza hacia ella, pero nunca de lado: una línea más ancha que el editor del celular dejaba el inicio del código cortado por la izquierda.
    test('al marcar las líneas que siguen el código no se desplaza de lado', async ({ page }) => {
      await pegarYVisualizar(page, MAQUINA_DE_SNACKS);
      const siguiente = page.getByRole('button', { name: /siguiente/i });
      for (let paso = 0; paso < 6; paso += 1) {
        // Unos píxeles de margen (el del propio CodeMirror al llevar el inicio de la línea a la vista): el defecto eran 100 a 170 px, que cortaban el principio de cada línea.
        expect(await page.locator('.cm-scroller').evaluate((elemento) => elemento.scrollLeft), `el código se desplazó de lado en el paso ${paso}`).toBeLessThanOrEqual(8);
        await siguiente.click();
      }
    });

    // Panel R0: la condición (la cadena de sustitución) salió de la zona del robot para que esta pueda fijarse arriba; en el celular debe seguir ESTANDO debajo del globo, no arriba del editor.
    test('la cadena de sustitución queda debajo del código y del globo, no arriba del editor', async ({ page }) => {
      await pegarYVisualizar(page, MAQUINA_DE_SNACKS);
      await page.getByRole('button', { name: /siguiente/i }).click();
      await expect(page.locator('.cadena-de-sustitucion')).toBeVisible();

      const editor = await page.locator('.cm-editor').boundingBox();
      const globo = await globoDelRobot(page).boundingBox();
      const cadena = await page.locator('.cadena-de-sustitucion').boundingBox();
      expect(editor).not.toBeNull();
      expect(globo).not.toBeNull();
      expect(cadena).not.toBeNull();
      if (editor === null || globo === null || cadena === null) return;
      expect(cadena.y, 'la cadena va debajo del editor').toBeGreaterThanOrEqual(editor.y + editor.height - 1);
      expect(cadena.y, 'la cadena va debajo del globo').toBeGreaterThanOrEqual(globo.y + globo.height - 1);
    });

    test('el saludo y la galería tampoco desbordan la pantalla', async ({ page }) => {
      await page.goto('/');
      await sinDesplazamientoHorizontal(page);
      await page.getByRole('button', { name: 'Ver un ejemplo paso a paso' }).click();
      await expect(page.getByRole('heading', { level: 4, name: 'Máquina de snacks' })).toBeVisible();
      await sinDesplazamientoHorizontal(page);
    });
  });
}

test.describe('la primera vez, solo con el teclado (CR1, REQ-PANT-001)', () => {
  test('saludo → «Ver un ejemplo paso a paso» → Máquina de snacks → paso 1, en tres acciones y sin tocar el ratón', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Ver un ejemplo paso a paso' })).toBeFocused();

    await page.keyboard.press('Enter'); // 1.ª acción: abre la galería
    await expect(page.getByRole('heading', { level: 4, name: 'Máquina de snacks' })).toBeVisible();
    await expect(page.getByRole('button', { name: /a1 · 2 · 50/ })).toBeFocused();

    await page.keyboard.press('Enter'); // 2.ª acción: abre la máquina de snacks con el dato de ejemplo y la visualiza
    await expect(page.getByRole('button', { name: /siguiente/i })).toBeFocused();
    await expect(posicion(page, 0)).toBeVisible();

    await page.keyboard.press('Enter'); // 3.ª acción: paso 1
    await expect(posicion(page, 1)).toBeVisible();
    await expect(globoDelRobot(page)).toContainText('Línea');
    expect(await robotsVisibles(page)).toEqual(['paso-a-paso']);
  });
});

test.describe('quién habla: un solo robot en cada estado (REQ-PANT-009)', () => {
  test('saludo, edición, visualización, espera de un dato y fin: siempre el robot paso a paso, uno solo', async ({ page }) => {
    await page.goto('/');
    expect(await robotsVisibles(page)).toEqual(['paso-a-paso']);

    await pegarYVisualizar(page, MAQUINA_DE_SNACKS);
    expect(await robotsVisibles(page)).toEqual(['paso-a-paso']);
    await page.getByRole('button', { name: /siguiente/i }).click();
    expect(await robotsVisibles(page)).toEqual(['paso-a-paso']);
    await irAlFinal(page);
    await expect(page.getByRole('textbox', { name: /dato/i })).toBeFocused();
    expect(await robotsVisibles(page)).toEqual(['paso-a-paso']);

    await page.getByRole('button', { name: 'Ejemplos' }).click();
    expect(await robotsVisibles(page), 'en la galería el visualizador está oculto').toEqual([]);
  });

  test('el fin del recorrido de un ejemplo: sigue hablando el robot paso a paso y la ranura ofrece qué hacer después', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Ver un ejemplo paso a paso' }).click();
    await page.getByRole('button', { name: /a1 · 2 · 50/ }).click();
    await irAlFinalDelPrograma(page);

    expect(await robotsVisibles(page)).toEqual(['paso-a-paso']);
    const ranura = page.getByTestId('ranura-de-acciones');
    await expect(ranura.getByRole('button', { name: 'Probar con otros datos' })).toBeVisible();
    await expect(ranura.getByRole('button', { name: 'Modificar el programa' })).toBeVisible();
    await expect(ranura.getByRole('button', { name: /siguiente/i })).toHaveCount(0);
  });

  test('un error de compilación lo explica el robot revisor; al corregir y visualizar, vuelve el robot paso a paso', async ({ page }) => {
    await pegarYVisualizar(page, PROGRAMA_CON_ERROR);

    const aviso = page.getByRole('alert');
    await expect(aviso).toBeVisible();
    await expect(aviso).toContainText('Robot revisor');
    expect(await robotsVisibles(page)).toEqual(['revisor']);

    // Con el aviso a la vista, Firefox pierde el texto de un `insertText` que reemplaza la selección completa (también pasa en el código anterior al hito R0, con la misma prueba hecha a mano): se
    // borra primero lo seleccionado y luego se pega el programa corregido, que es lo que haría el alumno.
    await page.locator('.cm-content').click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('Backspace');
    await page.keyboard.insertText(PROGRAMA_CON_ERROR.replace('"Hola")', '"Hola");'));
    await visualizar(page);
    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(posicion(page, 0)).toBeVisible();
    expect(await robotsVisibles(page)).toEqual(['paso-a-paso']);
    await expect(globoDelRobot(page)).toContainText('Todavía no se ejecuta nada');
  });

  test('los tres robots se distinguen por su forma y su accesorio, no solo por el color: la figura de cada uno lleva su nombre', async ({ page }) => {
    await page.goto('/');
    const figura = page.locator('[data-personaje="paso-a-paso"]');
    await expect(figura).toBeVisible();
    await expect(figura).toHaveAttribute('role', 'img');
    await expect(figura).toHaveAttribute('aria-label', /Robot paso a paso/);
  });
});

test.describe('axe: cero violaciones en cada estado nuevo de la pantalla (CR3)', () => {
  test('el saludo con sus puertas', async ({ page }) => {
    await page.goto('/');
    await expect(globoDelRobot(page)).toContainText('¿Por dónde quieres empezar?');
    expect(await violacionesDeAxe(page)).toEqual([]);
  });

  test('la galería de ejemplos', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Ver un ejemplo paso a paso' }).click();
    await expect(page.getByRole('heading', { level: 4, name: 'Máquina de snacks' })).toBeVisible();
    expect(await violacionesDeAxe(page)).toEqual([]);
  });

  test('un ejemplo abierto desde la galería, ya en el paso 1', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Ver un ejemplo paso a paso' }).click();
    await page.getByRole('button', { name: /a1 · 2 · 50/ }).click();
    await page.getByRole('button', { name: /siguiente/i }).click();
    await expect(posicion(page, 1)).toBeVisible();
    expect(await violacionesDeAxe(page)).toEqual([]);
  });

  test('el error de compilación con el robot revisor', async ({ page }) => {
    await pegarYVisualizar(page, PROGRAMA_CON_ERROR);
    await expect(page.getByRole('alert')).toBeVisible();
    expect(await violacionesDeAxe(page)).toEqual([]);
  });

  test('los ajustes de la clase abiertos y el modo proyector encendido', async ({ page }) => {
    await pegarYVisualizar(page, MAQUINA_DE_SNACKS);
    await page.getByRole('button', { name: 'Ajustes de la clase' }).click();
    await page.getByRole('switch', { name: /Modo proyector/ }).check();
    expect(await violacionesDeAxe(page)).toEqual([]);
    await page.getByRole('button', { name: 'Cerrar' }).click();
    await page.getByRole('button', { name: /siguiente/i }).click();
    expect(await violacionesDeAxe(page)).toEqual([]);
  });

  test('el celular de 390 px en visualización', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await pegarYVisualizar(page, MAQUINA_DE_SNACKS);
    await page.getByRole('button', { name: /siguiente/i }).click();
    expect(await violacionesDeAxe(page)).toEqual([]);
  });
});

test.describe('zoom al 200 % y reflujo: el saludo y la galería no se desbordan ni se recortan', () => {
  for (const ventana of [
    { ancho: 640, alto: 360, nombre: 'zoom al 200 % en un escritorio de 1280 px' },
    { ancho: 320, alto: 568, nombre: 'reflujo a 320 px' },
  ]) {
    test(ventana.nombre, async ({ page }) => {
      await page.setViewportSize({ width: ventana.ancho, height: ventana.alto });
      await page.goto('/');
      await sinDesplazamientoHorizontal(page);
      await dentroDeLaVentana(page.getByRole('button', { name: 'Ver un ejemplo paso a paso' }), { width: ventana.ancho, height: 100_000 }, 'la puerta del saludo');
      await page.getByRole('button', { name: 'Ver un ejemplo paso a paso' }).click();
      await expect(page.getByRole('heading', { level: 4, name: 'Máquina de snacks' })).toBeVisible();
      await sinDesplazamientoHorizontal(page);
    });
  }
});

test.describe('la galería sin red, tras la primera visita (ADR 014, regla 8)', () => {
  test('con el service worker activo y la red cortada, los ejemplos se listan y uno se abre y se visualiza', async ({ page, context, browserName }) => {
    // Mismo defecto documentado en `u3-hola-mundo.spec.ts`: el WebKit de Playwright falla al navegar una página con service worker activo mientras la red está cortada (no es de esta app).
    test.skip(browserName === 'webkit', 'Playwright WebKit: «WebKit encountered an internal error» al navegar con service worker activo y sin red (ver u3-hola-mundo.spec.ts y design.md §13).');

    await page.goto('/');
    await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) throw new Error('serviceWorker no disponible en este navegador');
      await navigator.serviceWorker.ready;
    });
    // Primera visita a la galería: el fragmento diferido ya está en el precache, pero se abre una vez con red, como lo haría el alumno en casa.
    await page.getByRole('button', { name: 'Ver un ejemplo paso a paso' }).click();
    await expect(page.getByRole('heading', { level: 4, name: 'Máquina de snacks' })).toBeVisible();

    await context.setOffline(true);
    const peticionesFallidas: string[] = [];
    page.on('requestfailed', (peticion) => peticionesFallidas.push(`${peticion.url()} — ${peticion.failure()?.errorText ?? 'sin detalle'}`));

    await page.reload();
    await page.getByRole('button', { name: 'Ver un ejemplo paso a paso' }).click();
    await expect(page.getByRole('heading', { level: 4, name: 'Máquina de snacks' })).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
    await page.getByRole('button', { name: /a1 · 2 · 50/ }).click();
    await page.getByRole('button', { name: /siguiente/i }).click();
    await expect(posicion(page, 1)).toBeVisible();

    expect(peticionesFallidas, `Peticiones fallidas estando offline: ${peticionesFallidas.join(' | ')}`).toEqual([]);
  });
});
