// Tarea 4.16 (C9 Normal, C14 base): el recorrido del alumno con el visualizador y su robot, de punta a punta, contra el build real (Playwright ×3 motores, el trabajador de verdad). Es el criterio de
// aceptación del hito 2 que pidió el PO: pegar `MaquinaSnacks`, pulsar Visualizar, escribir `a1`, `2`, `50` en la consola, y que la consola termine IGUAL que Java mientras el robot explica cada paso.
// «Igual que Java» se mide contra el golden `.combinada` que generó el JDK 17 real: la salida del programa en la consola (sin lo que el alumno tecleó, que Java no repite al leer de una tubería)
// tiene que coincidir byte por byte. Los goldens están en `corpus/experimentos/ejercicios-del-po/`.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import {
  consola,
  ecoDeLaConsola,
  escribirEnElEditor,
  globoDelRobot,
  irAlFinal,
  irAlFinalDelPrograma,
  salidaDelPrograma,
  teclearCuandoElProgramaEspere,
  teclearDato,
  verificarQueElRobotDiceAlgoEnCadaPaso,
  visualizar,
} from './ayudas.ts';

const CORPUS_DEL_PO = 'corpus/experimentos/ejercicios-del-po';

function delCorpus(nombre: string): string {
  return readFileSync(resolve(CORPUS_DEL_PO, nombre), 'utf8');
}

const MAQUINA_DE_SNACKS = delCorpus('maquina-snacks-a1-2-50.java');

async function pegarYVisualizar(page: Page, fuente: string): Promise<void> {
  await page.goto('/');
  await escribirEnElEditor(page, fuente);
  await visualizar(page);
}

/** Teclea el dato y espera a que la pantalla pase sola al paso de la lectura (el robot nombra su línea). */
async function teclearYVerLaLectura(page: Page, dato: string, linea: number): Promise<void> {
  await teclearDato(page, dato);
  await expect(globoDelRobot(page)).toContainText(`Línea ${linea}`);
}

test.describe('MaquinaSnacks con entrada interactiva (el ejercicio del PO)', () => {
  test('a1, 2, 50: la consola termina idéntica a Java y el robot explica cada paso', async ({ page }) => {
    await pegarYVisualizar(page, MAQUINA_DE_SNACKS);

    // Paso 0: todavía no se ejecuta nada; el robot dice cuál línea sigue.
    await expect(globoDelRobot(page)).toContainText('Todavía no se ejecuta nada');
    await expect(consola(page)).toHaveText('');

    // Hasta el primer dato: el programa imprime el menú y pide el código. El robot lo dice y la consola toma el foco.
    await irAlFinal(page);
    await expect(globoDelRobot(page)).toContainText('En la línea 19 el programa espera un dato. Escríbelo en la consola y pulsa Enter.');
    await expect(page.getByRole('textbox', { name: /dato/i })).toBeFocused();
    await expect(page.getByRole('img', { name: /robot/i })).toHaveAttribute('data-animo', 'esperando');

    await teclearYVerLaLectura(page, 'a1', 19);
    await expect(globoDelRobot(page)).toContainText('Después crea la variable codigo de tipo String y le guarda "A1".');
    await irAlFinal(page);
    await teclearYVerLaLectura(page, '2', 51);
    await irAlFinal(page);
    await teclearYVerLaLectura(page, '50', 64);
    await irAlFinal(page);

    // La consola termina igual que Java; lo tecleado va aparte, subrayado y con su propio estilo.
    expect(await salidaDelPrograma(page)).toBe(delCorpus('maquina-snacks-a1-2-50.combinada'));
    expect(await ecoDeLaConsola(page)).toEqual(['a1\n', '2\n', '50\n']);
    const eco = consola(page).locator('[data-flujo="eco"]').first();
    expect(await eco.evaluate((e) => getComputedStyle(e).textDecorationLine)).toContain('underline');
    await expect(consola(page).getByRole('textbox')).toHaveCount(0);

    // El robot cierra con el resumen de cómo terminó.
    await expect(globoDelRobot(page)).toContainText('Así terminó: sin errores, en 26 pasos.');
    await expect(page.getByRole('img', { name: /robot/i })).toHaveAttribute('data-animo', 'feliz');
  });

  test('z9: un código inválido termina el programa con su mensaje, idéntico a Java', async ({ page }) => {
    await pegarYVisualizar(page, MAQUINA_DE_SNACKS);
    await irAlFinal(page);
    await teclearYVerLaLectura(page, 'z9', 19);
    await irAlFinal(page);

    expect(await salidaDelPrograma(page)).toBe(delCorpus('maquina-snacks-z9.combinada'));
    await expect(globoDelRobot(page)).toContainText('Así terminó: sin errores');
    await expect(consola(page).getByRole('textbox')).toHaveCount(0);
  });

  test('el robot dice algo en CADA paso: nunca un globo vacío ni un marcador {…} sin resolver', async ({ page }) => {
    await pegarYVisualizar(page, MAQUINA_DE_SNACKS);
    await irAlFinal(page);
    await teclearYVerLaLectura(page, 'a1', 19);
    await irAlFinal(page);
    await teclearYVerLaLectura(page, '2', 51);
    await irAlFinal(page);
    await teclearYVerLaLectura(page, '50', 64);
    await irAlFinal(page);
    await expect(page.getByText('Paso 26 de 26').first()).toBeVisible();

    expect(await verificarQueElRobotDiceAlgoEnCadaPaso(page)).toBe(26);
  });

  test('el panel de variables sigue al programa y la condición muestra su cadena de sustitución', async ({ page }) => {
    await pegarYVisualizar(page, MAQUINA_DE_SNACKS);
    await irAlFinal(page);
    await teclearYVerLaLectura(page, 'a1', 19);
    await irAlFinal(page);
    await teclearYVerLaLectura(page, '2', 51);

    // El paso siguiente a la lectura de la cantidad es la condición `cantidad < 1 || cantidad > 3`.
    await page.getByRole('button', { name: /siguiente/i }).click();
    await expect(page.getByTestId('cadena-de-sustitucion')).toHaveText('cantidad < 1 || cantidad > 3 → 2 < 1 || 2 > 3 → false');
    await expect(page.getByRole('row', { name: /^cantidad\b/ })).toContainText('2');
    await expect(page.getByRole('row', { name: /^codigo\b/ })).toContainText('"A1"');
    // La rama que no corre está atenuada, nunca oculta.
    await expect(page.locator('li.atenuada')).toContainText('No entra al if');
    // En el editor, el bloque que el programa se salta («Cantidad no válida» + `return`) se atenúa Y lleva una etiqueta en palabras; al pasar a la sentencia siguiente, desaparece.
    await expect(page.locator('.cm-etiqueta-rama-no-tomada')).toHaveText('✗ Java se salta este bloque');
    expect((await page.locator('.cm-rama-no-tomada').allTextContents()).join('')).toContain('Cantidad no válida');
    // La línea recién ejecutada y la siguiente llevan DOS marcas distintas.
    await expect(page.locator('.cm-linea-ejecutada')).toHaveCount(1);
    await expect(page.locator('.cm-linea-siguiente')).toHaveCount(1);
    await expect(page.locator('.cm-editor .cm-marca-ejecutada')).toHaveText('▶');
    await expect(page.locator('.cm-editor .cm-marca-siguiente')).toHaveText('▷');

    await page.getByRole('button', { name: /siguiente/i }).click();
    await expect(page.locator('.cm-rama-no-tomada')).toHaveCount(0);
    await expect(page.locator('.cm-etiqueta-rama-no-tomada')).toHaveCount(0);
  });
});

// Criterio de aceptación del hito 2 (PO): las CINCO entradas del ejercicio, tecleadas en la consola de la pantalla real, dejan la consola idéntica al golden de Java y el robot dice algo en cada paso.
// Los datos salen del propio corpus (`*.entrada.txt`, un dato por renglón): una sola fuente de verdad con el golden que generó el JDK 17 real.
const ENTRADAS_DE_MAQUINA_DE_SNACKS = ['a1-2-50', 'b2-3-40', 'b3', 'z9', 'a2-5'] as const;

test.describe('MaquinaSnacks: las cinco entradas del PO, tecleadas en la consola', () => {
  for (const entrada of ENTRADAS_DE_MAQUINA_DE_SNACKS) {
    const datos = delCorpus(`maquina-snacks-${entrada}.entrada.txt`)
      .split('\n')
      .filter((renglon) => renglon !== '');

    test(`${datos.join(' ')}: la consola termina idéntica a Java, lo tecleado va aparte y el robot dice algo en cada paso`, async ({ page }) => {
      await pegarYVisualizar(page, delCorpus(`maquina-snacks-${entrada}.java`));
      for (const dato of datos) await teclearCuandoElProgramaEspere(page, dato);
      await irAlFinalDelPrograma(page);

      expect(await salidaDelPrograma(page)).toBe(delCorpus(`maquina-snacks-${entrada}.combinada`));
      expect(await ecoDeLaConsola(page)).toEqual(datos.map((dato) => `${dato}\n`));
      await expect(consola(page).getByRole('textbox')).toHaveCount(0);
      await expect(page.getByRole('img', { name: /robot/i })).toHaveAttribute('data-animo', 'feliz');

      expect(await verificarQueElRobotDiceAlgoEnCadaPaso(page)).toBeGreaterThan(datos.length);
    });
  }
});

test.describe('navegar con teclado y con mouse', () => {
  test('flechas, Inicio, Fin y espacio mueven los pasos; el deslizador salta al paso que se pida', async ({ page }) => {
    await pegarYVisualizar(page, MAQUINA_DE_SNACKS);
    await expect(page.getByRole('button', { name: /siguiente/i })).toBeFocused();

    await page.keyboard.press('ArrowRight');
    await expect(page.getByText('Paso 1', { exact: true }).first()).toBeVisible();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowLeft');
    await expect(page.getByText('Paso 1', { exact: true }).first()).toBeVisible();
    await page.keyboard.press('Home');
    await expect(page.getByText('Paso 0', { exact: true }).first()).toBeVisible();

    await page.getByRole('slider', { name: /posición/i }).fill('5');
    await expect(page.getByText('Paso 5', { exact: true }).first()).toBeVisible();
    await expect(globoDelRobot(page)).toContainText('Línea 13');

    // Fin va al último paso; ahí el programa espera un dato y el campo de la consola toma el foco (las teclas pasan a ser del campo).
    await page.keyboard.press('End');
    await expect(page.getByText('Paso 8', { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('textbox', { name: /dato/i })).toBeFocused();
  });

  test('«Reproducir» avanza solo hasta el dato que el programa espera y ahí se detiene, con el campo en foco', async ({ page }) => {
    await pegarYVisualizar(page, MAQUINA_DE_SNACKS);
    await page.getByRole('button', { name: 'Ajustes de la clase' }).click();
    await page.getByRole('combobox', { name: 'Velocidad' }).selectOption('5');
    await page.getByRole('button', { name: /reproducir/i }).click();

    await expect(page.getByRole('textbox', { name: /dato/i })).toBeFocused({ timeout: 10_000 });
    await expect(page.getByText('Paso 8', { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /reproducir/i })).toBeDisabled();
  });

  test('«Editar programa» devuelve el editor; se corrige y se vuelve a visualizar', async ({ page }) => {
    await pegarYVisualizar(page, MAQUINA_DE_SNACKS);
    await page.getByRole('button', { name: /editar programa/i }).click();
    await expect(page.locator('.cm-content')).toHaveAttribute('contenteditable', 'true');
    await expect(page.locator('.cm-content')).toBeFocused();
    await expect(page.getByRole('button', { name: /siguiente/i })).toHaveCount(0);
  });
});

test.describe('cómo termina un programa', () => {
  test('una excepción: el robot lo explica, el aviso lo titula y la consola trae el mensaje de Java en rojo', async ({ page }) => {
    await pegarYVisualizar(
      page,
      ['public class Division {', '    public static void main(String[] args) {', '        int a = 10;', '        int b = 0;', '        System.out.println(a / b);', '    }', '}'].join('\n'),
    );
    await irAlFinal(page);

    await expect(globoDelRobot(page)).toContainText('El programa se detuvo por un error');
    await expect(globoDelRobot(page)).toContainText('Java detuvo el programa por un error mientras se ejecutaba (una excepción): ArithmeticException (/ by zero).');
    await expect(globoDelRobot(page)).toContainText('Así terminó: Java detuvo el programa por un error');
    await expect(globoDelRobot(page)).toHaveAttribute('aria-live', 'assertive');
    await expect(page.getByRole('img', { name: /robot/i })).toHaveAttribute('data-animo', 'preocupado');
    expect(await salidaDelPrograma(page)).toContain('Exception in thread "main" java.lang.ArithmeticException: / by zero');
    await expect(consola(page).locator('[data-flujo="err"]').first()).toBeVisible();
  });

  test('un ciclo que no termina: el visualizador se detiene por seguridad y la traza sigue navegable', async ({ page }) => {
    test.setTimeout(90_000);
    await pegarYVisualizar(
      page,
      ['public class Infinito {', '    public static void main(String[] args) {', '        int contador = 0;', '        while (true) {', '            contador++;', '        }', '    }', '}'].join('\n'),
    );
    // El motor calcula 100 000 pasos antes de detenerse: se pulsa «Fin» hasta que llegue el paso final.
    await expect(async () => {
      await irAlFinal(page);
      await expect(globoDelRobot(page)).toContainText('Se detuvo por seguridad');
    }).toPass({ timeout: 60_000 });

    // UN solo texto con el motivo (C7 del panel 1): el título ya dice que se detuvo, así que ni «Paré el programa» ni «Así terminó: me detuve…» lo repiten.
    await expect(globoDelRobot(page)).toContainText('seguía repitiéndose');
    await expect(globoDelRobot(page)).not.toContainText('Paré el programa');
    await expect(globoDelRobot(page)).not.toContainText('Así terminó');
    await expect(page.getByRole('img', { name: /robot/i })).toHaveAttribute('data-animo', 'seguridad');
    // La traza sigue navegable.
    await page.getByRole('button', { name: /anterior/i }).click();
    await expect(globoDelRobot(page)).toContainText('Línea');
    await expect(globoDelRobot(page)).not.toContainText('Se detuvo por seguridad');
  });
});
