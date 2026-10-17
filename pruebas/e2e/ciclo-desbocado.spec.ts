// Tarea 3.4/3.5/3.6 + hito 2C (REQ-EJEC-007, C10, ADR 007): un ciclo sin fin NUNCA congela la página y el alumno entiende por qué se detuvo. Playwright ×3 motores contra el build real, con el motor y el
// trabajador de verdad, sobre la pantalla del visualizador: el programa del currículo `u6-ciclo-infinito-demo` (un `while (contador <= 5)` al que le falta `contador = contador + 1`) corre en el Web
// Worker, que da pasos en rebanadas de ≤ 8 ms y cede el turno; el límite de pasos lo detiene solo; mientras tanto el hilo principal sigue atendiendo (un reloj de la página que late cada 20 ms no se
// queda sin latir); y el robot dice, desde el paso 0, que se detuvo por seguridad y cita la evidencia («`contador` siempre valió 1…»). Volver a visualizar funciona (el trabajador se reemplaza).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { escribirEnElEditor, globoDelRobot, irAlFinal, visualizar } from './ayudas.ts';

const CICLO_SIN_AVANCE = readFileSync(resolve('corpus/curso/u6-ciclo-infinito-demo.java'), 'utf8');
const CICLO_VACIO = ['public class Vacio {', '    public static void main(String[] args) {', '        while (true) {}', '    }', '}'].join('\n');

/** Cota holgada a propósito: lo que se vigila es que el motor NUNCA ocupe el hilo principal sin soltarlo (un ciclo sin fin lo dejaría sin latir para siempre); el «teclado ≤ 100 ms p95» es de la 3.8. */
const HUECO_MAXIMO_ENTRE_LATIDOS_MS = 5_000;

/** Un reloj de la página que late cada 20 ms: si el motor corriera en el hilo principal (o el trabajador lo atorara) habría un hueco enorme entre latidos. */
async function empezarARegistrarLatidos(page: Page): Promise<void> {
  await page.evaluate(() => {
    const ventana = window as unknown as { __latidos: number[] };
    ventana.__latidos = [];
    setInterval(() => ventana.__latidos.push(performance.now()), 20);
  });
}

async function huecoMaximoEntreLatidos(page: Page): Promise<number> {
  // `while (true) {}` llega al límite en unos 200 ms: se espera a tener latidos suficientes en vez de exigirlos de inmediato (si el hilo se atorara, nunca llegarían y la espera falla).
  await expect.poll(() => page.evaluate(() => (window as unknown as { __latidos: number[] }).__latidos.length), { timeout: 10_000 }).toBeGreaterThan(10);
  const latidos = await page.evaluate(() => (window as unknown as { __latidos: number[] }).__latidos);
  return Math.max(...latidos.slice(1).map((latido, indice) => latido - (latidos[indice] ?? latido)));
}

async function pegarYVisualizar(page: Page, programa: string): Promise<void> {
  await page.goto('/');
  await escribirEnElEditor(page, programa);
  await empezarARegistrarLatidos(page);
  await visualizar(page);
}

test.describe('ciclo desbocado: se detiene solo, la página sigue viva y el alumno entiende por qué', () => {
  // 100 000 pasos se calculan en el trabajador; ir al último pinta la consola completa (sin virtualizar), y dos ejecuciones en WebKit pasan de los 30 s por omisión.
  test.setTimeout(120_000);

  test('u6-ciclo-infinito-demo: se detiene por el límite, el hilo principal nunca se queda sin latir y el robot cita «contador siempre valió 1»', async ({ page }) => {
    await pegarYVisualizar(page, CICLO_SIN_AVANCE);

    // Desde el paso 0 el alumno lee una intriga (que no terminó solo y que lo detuvo el visualizador), SIN el porqué: ese lo descubre al avanzar (C7 del panel 1).
    await expect(globoDelRobot(page)).toContainText('Todavía no se ejecuta nada');
    await expect(globoDelRobot(page)).toContainText('Ojo: este programa no terminó solo. El visualizador lo detuvo por seguridad después de muchos pasos. Avanza y descubre por qué.', { timeout: 60_000 });
    await expect(globoDelRobot(page)).not.toContainText('siempre valió');
    await expect(page.getByText('Paso 0 de 100001').first()).toBeVisible();
    expect(await huecoMaximoEntreLatidos(page), 'el hilo principal se quedó sin latir').toBeLessThan(HUECO_MAXIMO_ENTRE_LATIDOS_MS);

    // En el último paso, el aviso con su título, UN solo texto con la evidencia (sin repetir «se detuvo») y el robot levantando la mano.
    await irAlFinal(page);
    await expect(page.getByText('Paso 100001 de 100001').first()).toBeVisible({ timeout: 60_000 });
    await expect(globoDelRobot(page)).toContainText('Se detuvo por seguridad');
    await expect(globoDelRobot(page)).toContainText('En las últimas 100 vueltas del while de la línea 5, contador siempre valió 1, así que contador <= 5 siempre dio true.');
    await expect(globoDelRobot(page)).toContainText('Mientras nada dentro del ciclo cambie contador, el ciclo no va a terminar.');
    await expect(globoDelRobot(page)).not.toContainText('Paré el programa');
    await expect(globoDelRobot(page)).not.toContainText('Así terminó');
    await expect(globoDelRobot(page)).toHaveAttribute('aria-live', 'assertive');
    await expect(page.getByRole('img', { name: /robot/i })).toHaveAttribute('data-animo', 'seguridad');
    // El borde punteado del aviso no se encima al texto: el texto empieza a la derecha del borde, con aire.
    const avisoDelGlobo = globoDelRobot(page).locator('.aviso');
    const sangria = await avisoDelGlobo.evaluate((elemento) => parseFloat(getComputedStyle(elemento).paddingLeft));
    expect(sangria, 'el texto del aviso toca el borde punteado').toBeGreaterThanOrEqual(8);

    // Volver a visualizar termina al trabajador anterior y usa el de repuesto: la segunda ejecución llega igual de lejos y dice lo mismo.
    await visualizar(page);
    await expect(globoDelRobot(page)).toContainText('Ojo: este programa no terminó solo', { timeout: 60_000 });
    await expect(page.getByText('Paso 0 de 100001').first()).toBeVisible();
  });

  test('while (true) {}: no congela la página y el aviso lo dice con lo que sí se sabe del ciclo', async ({ page }) => {
    await pegarYVisualizar(page, CICLO_VACIO);

    // En el paso 0, la intriga; el porqué (sin variables que citar) llega al avanzar hasta el final.
    await expect(globoDelRobot(page)).toContainText('Ojo: este programa no terminó solo', { timeout: 60_000 });
    await irAlFinal(page);
    await expect(globoDelRobot(page)).toContainText('El programa llevaba demasiados pasos y todavía no terminaba.', { timeout: 60_000 });
    await expect(globoDelRobot(page)).toContainText('seguía repitiéndose'); // la condición `true` no lee variables: no hay un «siempre valió» que citar y no se inventa
    await page.getByRole('button', { name: /reiniciar/i }).click();
    expect(await huecoMaximoEntreLatidos(page), 'el hilo principal se quedó sin latir').toBeLessThan(HUECO_MAXIMO_ENTRE_LATIDOS_MS);

    // La página sigue respondiendo a quien la usa: la traza ya calculada es navegable.
    await page.getByRole('button', { name: /siguiente/i }).click();
    await expect(page.getByText('Paso 1 de 100001').first()).toBeVisible();
    await expect(globoDelRobot(page)).toContainText('Línea 3');
  });
});
