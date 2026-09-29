// Generador diferencial permanente de programas (tarea 1.31, `npm run oraculo:generados`): genera
// programas pequeños del subconjunto U3–U7, guiados por tipos y deterministas por semilla, y compara el
// veredicto de COMPILACIÓN de `compilar()` con el de `javac` 17 real. Un programa que javac rechaza y el
// compilador da por bueno (falso acepto) o al revés (falso rechazo) es una discrepancia: se reduce al
// programa mínimo que la conserva (verificado otra vez con javac), se agrupa por familia y se escribe en un
// informe JSON reproducible. Sale con código ≠ 0 si hubo cualquier discrepancia (es una compuerta de CI);
// con 2 si los argumentos o el JDK están mal.
//
//   npm run oraculo:generados -- --semilla 20260929 --cantidad 5000 [--salida ruta] [--max-reducir 2000]
//
// Empieza (tarea 1.31) con veredictos de COMPILACIÓN; la tarea 2.21 lo extiende a la EJECUCIÓN (salida y
// excepciones) sobre la misma estructura: `generados/campana.ts` compara un veredicto por fase.
//
// Nada de esto entra en `npm test` ni en `npm run test:oraculo`: el generador puede encontrar
// discrepancias y esas dos suites deben seguir verdes. Lo corre `oraculo.yml` (PR y de noche).
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { codigoDeSalidaDe, ejecutarCampana, MAXIMO_A_REDUCIR_POR_OMISION, type FamiliaEnInforme, type InformeDeCampana } from './generados/campana.ts';
import { ErrorJdk, localizarJdk, verificarVersionJdk } from './jdk.ts';

export const SALIDA_POR_OMISION = 'test-results/oraculo-generados.json';

const USO = 'Uso: npm run oraculo:generados -- --semilla N --cantidad M [--salida ruta] [--max-reducir K]';

export interface OpcionesDeLineaDeComandos {
  readonly semilla: number;
  readonly cantidad: number;
  readonly salida: string;
  readonly maximoAReducir: number;
}

function enteroNoNegativo(texto: string | undefined): number | null {
  if (texto === undefined || !/^\d+$/.test(texto)) return null;
  const valor = Number(texto);
  return Number.isSafeInteger(valor) ? valor : null;
}

/** Pura: los argumentos de la línea de comandos como opciones, o el error explicado en español. */
export function analizarArgumentos(argumentos: readonly string[]): OpcionesDeLineaDeComandos | { readonly error: string } {
  const valores = new Map<string, string>();
  for (let i = 0; i < argumentos.length; i += 2) {
    const nombre = argumentos[i]!;
    const valor = argumentos[i + 1];
    if (!['--semilla', '--cantidad', '--salida', '--max-reducir'].includes(nombre)) return { error: `Opción desconocida «${nombre}». ${USO}` };
    if (valor === undefined) return { error: `A «${nombre}» le falta su valor. ${USO}` };
    valores.set(nombre, valor);
  }
  const semilla = enteroNoNegativo(valores.get('--semilla'));
  const cantidad = enteroNoNegativo(valores.get('--cantidad'));
  if (semilla === null || cantidad === null) {
    return { error: `Hacen falta --semilla y --cantidad, ambos enteros no negativos. ${USO}` };
  }
  const maximo = valores.has('--max-reducir') ? enteroNoNegativo(valores.get('--max-reducir')) : MAXIMO_A_REDUCIR_POR_OMISION;
  if (maximo === null) return { error: `--max-reducir debe ser un entero no negativo. ${USO}` };
  return { semilla, cantidad, salida: valores.get('--salida') ?? SALIDA_POR_OMISION, maximoAReducir: maximo };
}

const MAXIMO_DE_FAMILIAS_EN_EL_RESUMEN = 20;

const coma = (numero: number, decimales: number): string => numero.toFixed(decimales).replace('.', ',');

const NOMBRE_DEL_TIPO: Readonly<Record<string, string>> = {
  'falso-acepto': 'falso acepto',
  'falso-rechazo': 'falso rechazo',
  'fallo-interno': 'fallo interno',
};

function describirFamilia(familia: FamiliaEnInforme, semilla: number): string[] {
  const marca = familia.conocida === null ? '[NUEVA]' : `[${familia.conocida.id}]`;
  const nombre = familia.conocida?.nombre ?? (familia.etiquetas.join(' + ') || 'sin rasgos');
  return [
    `${marca} ${nombre} — ${NOMBRE_DEL_TIPO[familia.tipo] ?? familia.tipo} — ${familia.cantidad} programa${familia.cantidad === 1 ? '' : 's'} (javac: ${familia.fase})`,
    `    javac: ${familia.codigoJavac || 'compila'} — ${familia.mensajeJavac.split('\n')[0]}`,
    `    nuestro compilador: ${familia.nuestraClave}`,
    '    programa mínimo:',
    ...familia.minimo.cuerpo.map((linea) => `        ${linea}`),
    `    reproducir: --semilla ${semilla}, índices ${familia.indicesDeEjemplo.join(', ')}`,
  ];
}

/** Pura: el resumen acotado que se imprime en la terminal (el informe JSON trae todo). */
export function formatearResumen(informe: InformeDeCampana): string {
  const { programas, discrepancias, coincidenciaDeLinea } = informe;
  const lineas = [
    `Generador diferencial — semilla ${informe.semilla}, ${informe.cantidad} programas, javac ${informe.jdk}`,
    `  javac compila ${programas.javacCompila} y rechaza ${programas.javacRechaza} de ${programas.total} programas (${coma(programas.proporcionQueCompila * 100, 1)} % compila).`,
    `  Cuando ambos rechazan con un error, la línea coincide en ${coma(coincidenciaDeLinea.porcentaje, 2)} % (${coincidenciaDeLinea.coinciden} de ${coincidenciaDeLinea.comparables}).`,
    `  Respuestas de nuestro compilador: ${Object.entries(informe.respuestasDeNuestroCompilador).map(([clave, cuantas]) => `${clave} ${cuantas}`).join(', ') || 'ninguna'}.`,
  ];
  if (discrepancias.total === 0) {
    lineas.push('  Sin discrepancias: nuestro compilador y javac coinciden en todos los programas.');
    return lineas.join('\n');
  }
  lineas.push(
    `  DISCREPANCIAS: ${discrepancias.total} (${discrepancias.falsosAceptos} falsos aceptos, ${discrepancias.falsosRechazos} falsos rechazos, ${discrepancias.fallosInternos} fallos internos); ` +
      `${discrepancias.reducidas} reducidas y ${discrepancias.sinReducir} sin reducir.`,
    `  ${informe.familias.length} familias:`,
  );
  for (const familia of informe.familias.slice(0, MAXIMO_DE_FAMILIAS_EN_EL_RESUMEN)) {
    lineas.push('', ...describirFamilia(familia, informe.semilla).map((linea) => `  ${linea}`));
  }
  if (informe.familias.length > MAXIMO_DE_FAMILIAS_EN_EL_RESUMEN) {
    lineas.push('', `  … y ${informe.familias.length - MAXIMO_DE_FAMILIAS_EN_EL_RESUMEN} familias más (el informe JSON las trae todas).`);
  }
  return lineas.join('\n');
}

/** Escribe el informe como JSON legible (con salto de línea final), creando las carpetas que falten. */
export function escribirInforme(informe: InformeDeCampana, ruta: string): void {
  mkdirSync(dirname(resolve(ruta)), { recursive: true });
  writeFileSync(resolve(ruta), `${JSON.stringify(informe, null, 2)}\n`, 'utf-8');
}

async function main(): Promise<void> {
  const opciones = analizarArgumentos(process.argv.slice(2));
  if ('error' in opciones) {
    console.error(opciones.error);
    process.exitCode = 2;
    return;
  }
  let jdk;
  try {
    jdk = localizarJdk();
    verificarVersionJdk(jdk);
  } catch (error) {
    if (!(error instanceof ErrorJdk)) throw error;
    console.error(error.message);
    process.exitCode = 2;
    return;
  }

  const inicio = Date.now();
  const informe = await ejecutarCampana({
    semilla: opciones.semilla,
    cantidad: opciones.cantidad,
    jdk,
    maximoAReducir: opciones.maximoAReducir,
    avisar: (mensaje) => console.error(mensaje),
  });
  const segundos = (Date.now() - inicio) / 1000;
  escribirInforme(informe, opciones.salida);
  console.log(formatearResumen(informe));
  const porMil = opciones.cantidad === 0 ? 0 : (segundos / opciones.cantidad) * 1000;
  console.log(`\nInforme: ${opciones.salida}. Duración: ${coma(segundos, 1)} s (${coma(porMil, 1)} s por cada 1 000 programas).`);
  process.exitCode = codigoDeSalidaDe(informe);
}

const esEjecutadoDirectamente = process.argv[1] === fileURLToPath(import.meta.url);
if (esEjecutadoDirectamente) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
    process.exitCode = 2;
  });
}
