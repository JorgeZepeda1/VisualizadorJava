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

/** Abre la máquina de snacks desde la galería: con los datos de ejemplo a1 · 2 · 50 o, con `conMisDatos`, con la entrada vacía para que el alumno teclee los suyos. */
export async function abrirLaMaquinaDeSnacks(page: Page, opciones: { readonly conMisDatos?: boolean } = {}): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: 'Ver un ejemplo paso a paso' }).click();
  if (opciones.conMisDatos === true) await page.getByRole('button', { name: 'Con mis datos: Máquina de snacks' }).click();
  else await page.getByRole('button', { name: /a1 · 2 · 50/ }).click();
  await expect(page.getByRole('button', { name: /siguiente/i })).toBeFocused();
}

/**
 * Cómo se parten en renglones las líneas del editor que se ven AHORA (modo proyector, REQ-AULA-004, panel R0 del diseñador). Mide cada carácter con un `Range`, así que ve lo que ve el alumno. Devuelve los
 * problemas, uno por línea y por regla; vacío si todo está bien:
 *   - un renglón numerado vacío: una línea partida cuyo primer renglón es solo sangría (el texto arranca en el segundo);
 *   - una palabra (letras, dígitos o `_`) partida entre dos renglones («Cantida|d»);
 *   - una continuación que no lleva la sangría colgante de la línea MÁS 2 columnas.
 */
export async function problemasDelPartidoDeLineas(page: Page): Promise<{ readonly problemas: string[]; readonly lineasPartidas: string[] }> {
  return page.evaluate(() => {
    const problemas: string[] = [];
    const lineasPartidas: string[] = [];
    for (const linea of Array.from(document.querySelectorAll('.cm-content .cm-line'))) {
      const caracteres: { letra: string; izquierda: number; ancho: number; arriba: number }[] = [];
      const recorrer = (nodo: Node): void => {
        if (nodo instanceof Element && (nodo.classList.contains('cm-widgetBuffer') || nodo.className.toString().includes('cm-etiqueta'))) return;
        if (nodo.nodeType === Node.TEXT_NODE) {
          const texto = nodo as Text;
          const rango = document.createRange();
          for (let indice = 0; indice < texto.length; indice += 1) {
            rango.setStart(texto, indice);
            rango.setEnd(texto, indice + 1);
            const cajas = rango.getClientRects();
            const caja = cajas[cajas.length - 1];
            if (caja === undefined || (caja.width === 0 && caja.height === 0)) continue;
            caracteres.push({ letra: texto.data.charAt(indice), izquierda: caja.left, ancho: caja.width, arriba: Math.round(caja.top) });
          }
        } else nodo.childNodes.forEach(recorrer);
      };
      recorrer(linea);
      const nombre = caracteres.map((caracter) => caracter.letra).join('').trim().slice(0, 60);
      const renglones = [...new Set(caracteres.map((caracter) => caracter.arriba))].sort((a, b) => a - b);
      if (renglones.length < 2) continue;
      lineasPartidas.push(nombre);

      for (const arriba of renglones) {
        if (!caracteres.some((caracter) => caracter.arriba === arriba && caracter.letra.trim() !== '')) problemas.push(`«${nombre}»: un renglón numerado queda vacío (solo sangría)`);
      }
      const texto = caracteres.map((caracter) => caracter.letra).join('');
      for (const palabra of texto.matchAll(/[\p{L}\p{N}_$]+/gu)) {
        const inicio = palabra.index ?? 0;
        const filas = new Set(caracteres.slice(inicio, inicio + palabra[0].length).map((caracter) => caracter.arriba));
        if (filas.size > 1) problemas.push(`«${nombre}»: la palabra «${palabra[0]}» se parte entre dos renglones`);
      }
      const primero = caracteres[0];
      if (primero === undefined) continue;
      // El ancho de una columna sale de la distancia entre los primeros caracteres del primer renglón (monoespaciado): WebKit redondea los rectángulos de cada carácter a píxeles enteros y un solo ancho no sirve.
      const primerRenglon = caracteres.filter((caracter) => caracter.arriba === renglones[0]);
      const ultimoMedido = Math.min(primerRenglon.length - 1, 12);
      if (ultimoMedido < 1) continue;
      const ch = ((primerRenglon[ultimoMedido]?.izquierda ?? 0) - primero.izquierda) / ultimoMedido;
      const sangria = texto.length - texto.trimStart().length;
      for (const arriba of renglones.slice(1)) {
        const inicioDelRenglon = caracteres.find((caracter) => caracter.arriba === arriba && caracter.letra.trim() !== '');
        if (inicioDelRenglon === undefined) continue;
        const esperado = primero.izquierda + (sangria + 2) * ch;
        if (Math.abs(inicioDelRenglon.izquierda - esperado) > 2) {
          problemas.push(`«${nombre}»: la continuación arranca en ${(inicioDelRenglon.izquierda - primero.izquierda) / ch} columnas y debía arrancar en ${sangria + 2} (sangría ${sangria} + 2)`);
        }
      }
    }
    return { problemas, lineasPartidas };
  });
}

/** Recorre el código del editor de arriba abajo y junta los problemas de partido de líneas de TODAS las líneas (CodeMirror solo dibuja las que están a la vista). */
export async function problemasDelPartidoEnTodoElCodigo(page: Page): Promise<{ readonly problemas: string[]; readonly lineasPartidas: string[] }> {
  const desplazador = page.locator('.cm-scroller');
  const { alto, visible } = await desplazador.evaluate((elemento) => ({ alto: elemento.scrollHeight, visible: elemento.clientHeight }));
  const problemas = new Set<string>();
  const lineasPartidas = new Set<string>();
  for (let desplazamiento = 0; desplazamiento < alto; desplazamiento += Math.max(visible / 2, 40)) {
    await desplazador.evaluate((elemento, y) => {
      elemento.scrollTop = y;
    }, desplazamiento);
    await page.waitForTimeout(40);
    const medidas = await problemasDelPartidoDeLineas(page);
    for (const problema of medidas.problemas) problemas.add(problema);
    for (const linea of medidas.lineasPartidas) lineasPartidas.add(linea);
  }
  return { problemas: [...problemas], lineasPartidas: [...lineasPartidas] };
}

/** ¿En cuántos renglones se dibuja el texto de este elemento? Una pieza de código que se parte por dentro ocupa más de uno. */
export async function renglonesDeTexto(elemento: Locator): Promise<number> {
  return elemento.evaluate((nodo) => {
    const rango = document.createRange();
    rango.selectNodeContents(nodo);
    return new Set(Array.from(rango.getClientRects(), (caja) => Math.round(caja.top))).size;
  });
}
