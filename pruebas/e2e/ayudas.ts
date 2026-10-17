// Ayudas compartidas de las pruebas E2E (tarea 4.16): lo que cualquier recorrido del alumno repite — escribir un programa en CodeMirror, pulsar Visualizar, saltar al último paso y leer lo que la
// consola muestra del programa. Playwright solo toma como pruebas los archivos `*.spec.ts`: este no lo es.
import { expect, type Locator, type Page } from '@playwright/test';

/** Escribe de verdad en CodeMirror 6 (reemplaza el programa precargado por el que se pide): jsdom no hace layout para esto (ADR 013). */
export async function escribirEnElEditor(page: Page, programa: string): Promise<void> {
  const editor = page.locator('.cm-content');
  await expect(editor).toBeVisible();
  await editor.click();
  await page.keyboard.press('ControlOrMeta+a');
  // `insertText` pega el texto de golpe, como un alumno que lo copió de otro lado; `type` escribiría carácter por carácter (y CodeMirror cerraría llaves y sangraría).
  await page.keyboard.insertText(programa);
}

export async function visualizar(page: Page): Promise<void> {
  await page.getByRole('button', { name: /visualizar/i }).click();
}

/** Salta al último paso que el motor ya calculó. El nombre del botón es «Fin ⏭». */
export async function irAlFinal(page: Page): Promise<void> {
  await page.getByRole('button', { name: /^fin\b/i }).click();
}

export function consola(page: Page): Locator {
  return page.getByTestId('consola');
}

/** Lo que el programa imprimió en la consola (`out` y `err`), SIN lo que el alumno tecleó ni las etiquetas que solo oye el lector de pantalla: debe ser idéntico a lo que Java imprime. */
export async function salidaDelPrograma(page: Page): Promise<string> {
  const partes = await consola(page).locator('[data-flujo="out"], [data-flujo="err"]').allTextContents();
  return partes.join('');
}

/** Lo que el alumno tecleó y la consola repite (el eco), un elemento por renglón. */
export async function ecoDeLaConsola(page: Page): Promise<string[]> {
  return consola(page).locator('[data-flujo="eco"]').allTextContents();
}

/** Teclea un dato en el campo de la consola y lo envía con Enter. */
export async function teclearDato(page: Page, dato: string): Promise<void> {
  const campo = page.getByRole('textbox', { name: /dato/i });
  await expect(campo).toBeVisible();
  await expect(campo).toBeFocused();
  await campo.fill(dato);
  await page.keyboard.press('Enter');
}

export function globoDelRobot(page: Page): Locator {
  return page.getByTestId('globo-del-robot');
}
