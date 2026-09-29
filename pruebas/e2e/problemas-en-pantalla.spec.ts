// Tarea 1.28 (agregada por el orquestador, decisión del PO 2026-09-29: «la pantalla muestra el
// texto real de cada problema (error o aviso) con su línea; el ícono, el título y el subrayado
// siguen en la 4.5»). Playwright ×3 motores contra el build real, con el motor y el trabajador de
// verdad: se escribe un programa en CodeMirror, se pulsa Visualizar y se lee lo que el alumno ve.
// Antes de esta tarea la pantalla mostraba SIEMPRE «El programa no compila todavía (…lote 1)»,
// aunque Java aceptara el programa, y un `main` sin `static` no mostraba nada.
//
// Los tres programas se compilaron con javac 17.0.18 real (carpeta temporal fuera del repo,
// borrada): `Saludo` NO compila (`';' expected` en la línea 3); `Arreglos` y `SinStatic` SÍ compilan
// (este último falla solo al lanzarlo: «el método principal no es static en la clase SinStatic»).
import { expect, test, type Page } from '@playwright/test';

const PROGRAMA_SIN_PUNTO_Y_COMA = [
  'public class Saludo {',
  '    public static void main(String[] args) {',
  '        System.out.println("Hola")',
  '    }',
  '}',
].join('\n');

const PROGRAMA_CON_ARREGLO = [
  'public class Arreglos {',
  '    public static void main(String[] args) {',
  '        int[] datos = new int[3];',
  '    }',
  '}',
].join('\n');

const PROGRAMA_SIN_STATIC = [
  'public class SinStatic {',
  '    public void main(String[] args) {',
  '        System.out.println("Hola");',
  '    }',
  '}',
].join('\n');

const PROGRAMA_CORREGIDO = [
  'public class Saludo {',
  '    public static void main(String[] args) {',
  '        System.out.println("Ya funciona");',
  '    }',
  '}',
].join('\n');

// Escribe de verdad en CodeMirror 6 (mismo procedimiento que u3-hola-mundo.spec.ts): reemplaza el
// programa precargado por el que se pide.
async function escribirEnElEditor(page: Page, programa: string): Promise<void> {
  const editor = page.locator('.cm-content');
  await expect(editor).toBeVisible();
  await editor.click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type(programa);
}

async function visualizar(page: Page): Promise<void> {
  await page.getByRole('button', { name: /visualizar/i }).click();
}

test.describe('problemas en pantalla: el texto real de cada problema, con su línea', () => {
  test('un error de sintaxis muestra «Línea N» y el texto real, no un mensaje fijo', async ({ page }) => {
    await page.goto('/');
    await escribirEnElEditor(page, PROGRAMA_SIN_PUNTO_Y_COMA);
    await visualizar(page);

    await expect(page.getByRole('alert')).toContainText('Línea 3: Te falta un punto y coma ";" al final de esta línea.');
    await expect(page.getByRole('alert')).not.toContainText('no compila todavía');
  });

  test('un programa con un arreglo muestra el aviso de arreglos, con `int[]` en <code> y sin comillas invertidas crudas', async ({
    page,
  }) => {
    await page.goto('/');
    await escribirEnElEditor(page, PROGRAMA_CON_ARREGLO);
    await visualizar(page);

    const aviso = page.getByRole('alert');
    await expect(aviso).toContainText('Tu programa usa un arreglo (int[]) en la línea 3.');
    await expect(aviso.locator('code')).toHaveText(['int[]']);
    expect(await aviso.textContent()).not.toContain('`');
  });

  test('un main sin static se explica con el nombre de la clase, y el alumno puede corregir y volver a visualizar', async ({
    page,
  }) => {
    await page.goto('/');
    await escribirEnElEditor(page, PROGRAMA_SIN_STATIC);
    await visualizar(page);

    await expect(page.getByRole('alert')).toContainText('"SinStatic"');
    await expect(page.getByRole('alert')).toContainText('static');

    // El editor sigue siendo editable: no hay nada que visualizar, el alumno corrige.
    await escribirEnElEditor(page, PROGRAMA_CORREGIDO);
    await visualizar(page);
    await expect(page.getByTestId('consola')).toContainText('Ya funciona');
    await expect(page.getByRole('alert')).toHaveCount(0);
  });

  test('el aviso es una región `alert` anunciada: aparece con el problema, se corrige y desaparece', async ({ page }) => {
    await page.goto('/');
    // Sin problemas no hay región de alerta.
    await expect(page.getByRole('alert')).toHaveCount(0);

    await escribirEnElEditor(page, PROGRAMA_SIN_PUNTO_Y_COMA);
    await visualizar(page);
    const aviso = page.getByRole('alert');
    await expect(aviso).toBeVisible();
    await expect(aviso).toHaveText(/^Línea 3: /);

    await escribirEnElEditor(page, PROGRAMA_CORREGIDO);
    await visualizar(page);
    await expect(page.getByTestId('consola')).toContainText('Ya funciona');
    await expect(page.getByRole('alert')).toHaveCount(0);
  });
});
