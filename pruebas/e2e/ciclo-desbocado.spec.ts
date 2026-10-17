// Tarea 3.4/3.5/3.6 (REQ-EJEC-007, C10, ADR 007): un ciclo sin fin NUNCA congela la página. Playwright ×3 motores contra el build real, con el motor y el trabajador de verdad: el programa del currículo
// `u6-ciclo-infinito-demo` (un `while (contador <= 5)` al que le falta `contador = contador + 1`) corre en el Web Worker, que da pasos en rebanadas de ≤ 8 ms y cede el turno; el límite de pasos lo
// detiene solo; y mientras tanto el hilo principal sigue atendiendo (un reloj de la página que late cada 20 ms no se queda sin latir). Volver a visualizar funciona (el trabajador se reemplaza).
import { expect, test, type Page } from '@playwright/test';

const CICLO_SIN_AVANCE = [
  'public class CicloInfinitoDemo {',
  '    public static void main(String[] args) {',
  '        int contador = 1;',
  '        while (contador <= 5) {',
  '            System.out.println("Vuelta número " + contador);',
  '        }',
  '    }',
  '}',
].join('\n');

// Escribe de verdad en CodeMirror 6 (mismo procedimiento que u3-hola-mundo.spec.ts).
async function escribirEnElEditor(page: Page, programa: string): Promise<void> {
  const editor = page.locator('.cm-content');
  await expect(editor).toBeVisible();
  await editor.click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type(programa);
}

/** Espera a que lo que hay en la consola deje de crecer (la ejecución ya se detuvo) y lo devuelve. */
async function esperarConsolaEstable(page: Page): Promise<string> {
  let anterior = '';
  await expect
    .poll(
      async () => {
        const actual = (await page.getByTestId('consola').textContent()) ?? '';
        const estable = actual.length > 0 && actual === anterior;
        anterior = actual;
        return estable;
      },
      { timeout: 60_000, intervals: [400] },
    )
    .toBe(true);
  return anterior;
}

test.describe('ciclo desbocado: se detiene solo y la página sigue viva', () => {
  // 100 000 pasos se pintan en la consola de la pantalla de hoy (sin virtualizar hasta el lote 4) y dos ejecuciones en WebKit pasan de los 30 s por omisión.
  test.setTimeout(120_000);

  test('el ciclo sin avance se detiene por el límite, el hilo principal nunca se queda sin latir y se puede volver a visualizar', async ({ page }) => {
    await page.goto('/');
    await escribirEnElEditor(page, CICLO_SIN_AVANCE);

    // Un reloj de la página: late cada 20 ms. Si el motor corriera en el hilo principal (o el trabajador lo atorara) habría un hueco enorme entre latidos.
    await page.evaluate(() => {
      const ventana = window as unknown as { __latidos: number[] };
      ventana.__latidos = [];
      setInterval(() => ventana.__latidos.push(performance.now()), 20);
    });

    await page.getByRole('button', { name: /visualizar/i }).click();
    await expect(page.getByTestId('consola')).toContainText('Vuelta número 1');
    const salida = await esperarConsolaEstable(page);
    expect(salida.startsWith('Vuelta número 1\n')).toBe(true);
    expect(new Set(salida.split('\n').filter((renglon) => renglon !== ''))).toEqual(new Set(['Vuelta número 1'])); // «contador» nunca cambió

    const latidos = await page.evaluate(() => (window as unknown as { __latidos: number[] }).__latidos);
    expect(latidos.length).toBeGreaterThan(10);
    const huecoMaximo = Math.max(...latidos.slice(1).map((latido, indice) => latido - latidos[indice]));
    // Cota holgada a propósito: con la pantalla de hoy, que pinta toda la consola en cada lote (se virtualiza en el lote 4), WebKit con tres navegadores en paralelo llega a ≈ 2,3 s de repintado. Lo que se
    // vigila aquí es que el motor NUNCA ocupe el hilo principal sin soltarlo (un ciclo sin fin lo dejaría sin latir para siempre y la prueba agotaría su tiempo); el «teclado ≤ 100 ms p95» es de la 3.8.
    expect(huecoMaximo, 'el hilo principal se quedó sin latir').toBeLessThan(10_000);

    // Volver a visualizar termina al trabajador anterior y usa el de repuesto: la segunda ejecución llega igual de lejos.
    await page.getByRole('button', { name: /visualizar/i }).click();
    await expect(page.getByTestId('consola')).toContainText('Vuelta número 1');
    const segunda = await esperarConsolaEstable(page);
    expect(segunda).toBe(salida);
  });
});
