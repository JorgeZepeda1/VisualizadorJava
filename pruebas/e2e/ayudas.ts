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

/**
 * Salta al último paso hasta que el programa espera un dato (el campo de la consola toma el foco) y lo teclea. Reintenta porque los pasos llegan del trabajador un instante después de teclear el
 * dato anterior: si «Fin» se pulsa antes de que lleguen, todavía no hay a quién entregarle el dato.
 */
export async function teclearCuandoElProgramaEspere(page: Page, dato: string): Promise<void> {
  const campo = page.getByRole('textbox', { name: /dato/i });
  await expect(async () => {
    await irAlFinal(page);
    await expect(campo).toBeFocused({ timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
  await teclearDato(page, dato);
}

/** Salta al último paso hasta que el robot cierra con el resumen «Así terminó…» (el programa ya no espera nada ni calcula más). */
export async function irAlFinalDelPrograma(page: Page): Promise<void> {
  await expect(async () => {
    await irAlFinal(page);
    await expect(globoDelRobot(page)).toContainText('Así terminó', { timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
}

/**
 * Reinicia y recorre la traza paso por paso hasta el último: en CADA uno el robot dice algo (nunca un globo vacío) y nada queda sin resolver (un marcador `{…}`, `undefined`, `NaN`…). Devuelve
 * cuántos pasos tiene la traza, que sale del máximo del deslizador.
 */
export async function verificarQueElRobotDiceAlgoEnCadaPaso(page: Page): Promise<number> {
  const total = Number(await page.getByRole('slider', { name: /posición/i }).getAttribute('max'));
  await page.getByRole('button', { name: /reiniciar/i }).click();
  const siguiente = page.getByRole('button', { name: /siguiente/i });
  for (let paso = 1; paso <= total; paso += 1) {
    await siguiente.click();
    await expect(page.getByText(`Paso ${paso} de ${total}`).first()).toBeVisible();
    const texto = (await globoDelRobot(page).textContent()) ?? '';
    expect(texto.trim().length, `paso ${paso}`).toBeGreaterThan(8);
    expect(texto, `paso ${paso}`).not.toMatch(/[{}]|undefined|NaN|\[object|null/);
  }
  return total;
}

/**
 * La tecla que mueve el foco al siguiente elemento. En WebKit de macOS (el de Playwright aquí, como Safari), Tab solo recorre los campos de texto y deja pasar los botones y los enlaces
 * (la preferencia «Pulsar Tab para resaltar cada elemento» viene apagada); Alt+Tab sí los recorre — así lo documenta Playwright. En el resto de motores y sistemas es Tab.
 */
export function teclaDeTabulador(navegador: string): string {
  return navegador === 'webkit' && process.platform === 'darwin' ? 'Alt+Tab' : 'Tab';
}
