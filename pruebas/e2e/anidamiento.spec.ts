// Tarea 1.37 (W-12 de la verificación del delta del lote 1): el tope de anidamiento, medido donde importa: en el TRABAJADOR REAL del build, dentro de Chromium, Firefox y WebKit (Playwright ×3 motores),
// que es donde la pila se agotaba (Node y los navegadores tienen pilas y marcos distintos: con la pila por omisión de Node, 700 paréntesis anidados lanzaban `RangeError`; en Chromium, unos 400; las
// cadenas de `&&`, unos 1 000 términos — y la pantalla decía «Algo falló dentro del visualizador»).
//
// Para cada una de las 21 formas de anidar que midió el verificador (`pruebas/compilacion/formas-anidadas.ts`) se arma el programa con la profundidad MÁS GRANDE que el analizador deja pasar, con la
// siguiente y con la más grande que cabe en el tope de 4 000 tokens (la que agotaba la pila), y CADA UNO se manda a un `Worker` NUEVO (en frío: es el peor caso, el JIT aún no optimizó nada). Lo que se
// afirma: nunca `error-interno` (la pila no se agota), lo que cabe se revisa como siempre (jamás el aviso de anidamiento) y lo que no cabe es el aviso honesto `programa-demasiado-anidado`.
// Las cifras de CUÁNTO falta para agotar la pila (el margen) salen de la calibración de la tarea 1.37 (`tasks.md`), con los topes levantados.
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { FORMAS_ANIDADAS, LINEA_DEL_CUERPO, profundidadMaximaPermitida, profundidadMaximaQueCabeEnLosTokens, programaConForma } from '../compilacion/formas-anidadas.ts';

interface Respuesta {
  /** `compilado` (con o sin problema), `error-interno` (la pila se agotó o algo lanzó), `timeout` o `error-del-trabajador`. */
  readonly tipo: string;
  readonly codigo: string | null;
  readonly linea: number | null;
  readonly detalle: string;
}

/** La URL del trabajador del build (`dist/assets/trabajador-<hash>.js`): el MISMO archivo que carga la aplicación. */
function urlDelTrabajador(): string {
  const archivo = readdirSync(resolve('dist/assets')).find((nombre) => /^trabajador-.*\.js$/.test(nombre));
  if (archivo === undefined) throw new Error('no hay dist/assets/trabajador-*.js: ¿corrió el build del webServer?');
  return `/assets/${archivo}`;
}

/** Manda `fuente` a un trabajador recién creado (frío) y devuelve lo que contestó. */
async function compilarEnUnTrabajadorNuevo(page: Page, fuente: string): Promise<Respuesta> {
  return page.evaluate(
    ({ fuente: programa, url }) =>
      new Promise<Respuesta>((resolver) => {
        const trabajador = new Worker(url, { type: 'module' });
        const temporizador = setTimeout(() => {
          trabajador.terminate();
          resolver({ tipo: 'timeout', codigo: null, linea: null, detalle: 'sin respuesta en 60 s' });
        }, 60_000);
        trabajador.onmessage = (evento: MessageEvent) => {
          const mensaje = evento.data as { tipo: string; ok?: boolean; problema?: { codigo: string; linea: number }; mensaje?: string };
          if (mensaje.tipo !== 'compilado' && mensaje.tipo !== 'error-interno') return;
          clearTimeout(temporizador);
          trabajador.terminate();
          resolver({
            tipo: mensaje.tipo,
            codigo: mensaje.problema?.codigo ?? null,
            linea: mensaje.problema?.linea ?? null,
            detalle: String(mensaje.mensaje ?? ''),
          });
        };
        trabajador.onerror = () => {
          clearTimeout(temporizador);
          trabajador.terminate();
          resolver({ tipo: 'error-del-trabajador', codigo: null, linea: null, detalle: 'onerror' });
        };
        trabajador.postMessage({ tipo: 'ejecutar', id: 1, fuente: programa, config: {} });
      }),
    { fuente, url: urlDelTrabajador() },
  );
}

test.describe('anidamiento: el trabajador real de cada navegador no agota la pila con ninguna de las 21 formas', () => {
  for (const forma of FORMAS_ANIDADAS) {
    test(`${forma.nombre}: lo que cabe se revisa, lo que no cabe es el aviso, y nunca error-interno`, async ({ page }) => {
      await page.goto('/');
      const maxima = profundidadMaximaPermitida(forma);
      const cabeEnLosTokens = profundidadMaximaQueCabeEnLosTokens(forma);
      expect(maxima, 'la forma debe entrar en los topes con una profundidad razonable').toBeGreaterThanOrEqual(25);
      expect(cabeEnLosTokens, 'y la profundidad que cabe en los tokens debe pasarse de los topes').toBeGreaterThan(maxima);

      const dentro = await compilarEnUnTrabajadorNuevo(page, programaConForma(forma, maxima));
      expect(dentro.tipo, `${forma.nombre} con ${maxima} repeticiones (la máxima que pasa los topes): ${dentro.detalle}`).toBe('compilado');
      expect(dentro.codigo, `${forma.nombre} con ${maxima} repeticiones`).not.toBe('programa-demasiado-anidado');

      for (const repeticiones of [maxima + 1, cabeEnLosTokens]) {
        const fuera = await compilarEnUnTrabajadorNuevo(page, programaConForma(forma, repeticiones));
        expect(fuera.tipo, `${forma.nombre} con ${repeticiones} repeticiones: ${fuera.detalle}`).toBe('compilado');
        expect(fuera.codigo, `${forma.nombre} con ${repeticiones} repeticiones`).toBe('programa-demasiado-anidado');
        expect(fuera.linea, `${forma.nombre} con ${repeticiones} repeticiones: la línea del aviso`).toBe(LINEA_DEL_CUERPO);
      }
    });
  }
});

// Lo que ve el alumno: antes de la tarea 1.37, 700 paréntesis anidados dejaban «Algo falló dentro del visualizador» en Firefox y en Chromium (la pila del trabajador se agotaba); ahora, el aviso.
test.describe('anidamiento: lo que ve el alumno', () => {
  test('150 paréntesis anidados, escritos en el editor, muestran el aviso de anidamiento y NO «Algo falló dentro del visualizador»', async ({ page }) => {
    await page.goto('/');
    const editor = page.locator('.cm-content');
    await expect(editor).toBeVisible();
    await editor.click();
    await page.keyboard.press('ControlOrMeta+a');
    const profundos = ['public class Anidado {', '    public static void main(String[] args) {', `        int x = ${'('.repeat(150)}1${')'.repeat(150)};`, '    }', '}'].join('\n');
    await page.keyboard.type(profundos);
    await page.getByRole('button', { name: /visualizar/i }).click();

    const aviso = page.getByRole('alert');
    await expect(aviso).toContainText('Tu programa tiene demasiadas cosas anidadas');
    await expect(aviso).toContainText('línea 3');
    await expect(aviso).toContainText('No lo ejecuto para no enseñarte un resultado que podría no ser el de Java.');
    await expect(aviso).not.toContainText('Algo falló dentro del visualizador');
  });
});
