// Catálogo de datos del JDK (tarea 1.9, ADR 010): firmas públicas de la biblioteca reconocida
// (REQ-SUB-005/007, `GenerarFirmasApi.java`), símbolos regionales (`DecimalFormatSymbols`,
// REQ-BIB-010) y los mensajes EXACTOS del lanzador cuando `main` no existe o no es `static`
// (design.md §2.2) — todo generado contra el JDK 17 real, nunca escrito a mano (regla 5 de
// CLAUDE.md). `src/motor/biblioteca/datos/*.generado.ts` es lo único que consume el motor en
// tiempo de ejecución (design.md §1.1: `motor` no importa nada fuera de sí mismo); `corpus/datos/`
// es el conjunto crudo, auditable, del que salen esos archivos.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { type InfoJdk, localizarJdk, verificarVersionJdk } from './jdk.ts';
import { ejecutarPrograma } from './ejecutar.ts';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ_PROYECTO = resolve(AQUI, '..', '..');

// El oráculo acota lo que captura de stdout (`LIMITE_BYTES_CAPTURA_POR_OMISION`, 64 KiB, pensado para
// UN programa del alumno). Las sondas de este archivo devuelven catálogos enteros (la lista de clases
// pesa ~83 KB y `firmas` ya va por 41 KB): con el tope por omisión la lista salió CORTADA, en silencio.
const LIMITE_BYTES_SONDAS = 16 * 1024 * 1024;

// ---- Firmas de la API (GenerarFirmasApi.java) ----

export interface FirmaMiembro {
  readonly clase: string;
  readonly genero: 'constructor' | 'metodo' | 'campo';
  readonly nombre: string;
  readonly esEstatico: boolean;
  readonly parametros: readonly string[];
  readonly retorno: string;
  readonly esVarargs: boolean;
}

const GENEROS_VALIDOS: ReadonlySet<string> = new Set(['constructor', 'metodo', 'campo']);

/** Pura: una línea de `GenerarFirmasApi.java` → `FirmaMiembro`. Formato fijo de 7 campos, ver
 * la cabecera Javadoc de ese archivo. */
export function analizarLineaFirma(linea: string): FirmaMiembro {
  const partes = linea.split('|');
  if (partes.length !== 7) {
    throw new Error(`línea de firma mal formada (se esperaban 7 campos separados por "|"): "${linea}"`);
  }
  const [clase, genero, nombre, esEstatico, parametros, retorno, esVarargs] = partes as [
    string, string, string, string, string, string, string,
  ];
  if (!GENEROS_VALIDOS.has(genero)) {
    throw new Error(`género de firma desconocido ("constructor"/"metodo"/"campo" esperado): "${genero}"`);
  }
  return {
    clase,
    genero: genero as FirmaMiembro['genero'],
    nombre,
    esEstatico: esEstatico === 'true',
    parametros: parametros === '' ? [] : parametros.split(','),
    retorno,
    esVarargs: esVarargs === 'true',
  };
}

/** Pura: todo el stdout de `GenerarFirmasApi.java` → lista de firmas (ignora líneas en blanco). */
export function analizarFirmasApi(salida: string): FirmaMiembro[] {
  return salida
    .split('\n')
    .map((linea) => linea.trim())
    .filter((linea) => linea.length > 0)
    .map(analizarLineaFirma);
}

// ---- Supertipos (GenerarSupertipos.java, tarea 1.29) ----

/** Tipo de referencia → TODOS sus supertipos (transitivos, incluido `java.lang.Object`). */
export type SupertiposPorTipo = Readonly<Record<string, readonly string[]>>;

/** Pura: una línea de `GenerarSupertipos.java` (`tipo|super1,super2`) → tipo y supertipos. */
export function analizarLineaSupertipos(linea: string): { tipo: string; supertipos: string[] } {
  const partes = linea.split('|');
  if (partes.length !== 2) {
    throw new Error(`línea de supertipos mal formada (se esperaban 2 campos separados por "|"): "${linea}"`);
  }
  const [tipo, supertipos] = partes as [string, string];
  return { tipo, supertipos: supertipos === '' ? [] : supertipos.split(',') };
}

/** Pura: todo el stdout de `GenerarSupertipos.java` → tabla indexada por tipo (ignora líneas en blanco). */
export function analizarSupertipos(salida: string): SupertiposPorTipo {
  const entradas = salida
    .split('\n')
    .map((linea) => linea.trim())
    .filter((linea) => linea.length > 0)
    .map(analizarLineaSupertipos)
    .map(({ tipo, supertipos }): [string, string[]] => [tipo, supertipos]);
  return Object.fromEntries(entradas);
}

// ---- Clases del JDK (GenerarClasesJdk.java, tarea 1.29) ----

/** Paquete → sus tipos públicos importables, por nombre canónico DENTRO del paquete (`Map.Entry`). */
export type ClasesPorPaquete = Readonly<Record<string, readonly string[]>>;

/** Pura: una línea de `GenerarClasesJdk.java` (`paquete|Clase1,Clase2`) → paquete y clases. */
export function analizarLineaClases(linea: string): { paquete: string; clases: string[] } {
  const partes = linea.split('|');
  const [paquete, clases] = partes as [string, string?];
  if (partes.length !== 2 || paquete === '' || clases === undefined || clases === '') {
    throw new Error(`línea de clases mal formada (se esperaba "paquete|Clase1,Clase2"): "${linea}"`);
  }
  return { paquete, clases: clases.split(',') };
}

const PREFIJO_TOTAL_DE_CLASES = '#total|';

/**
 * Pura: todo el stdout de `GenerarClasesJdk.java` → tabla indexada por paquete (ignora líneas en
 * blanco). Exige la línea final `#total|N` y que N sea la cantidad de clases realmente leídas: el
 * oráculo acota lo que captura de stdout, y una lista CORTADA (sin error alguno) se guardaría como
 * si fuera completa — cada clase que faltara se le mostraría al alumno como «no existe» (un error de
 * compilación falso). Así una salida truncada revienta aquí, con un mensaje claro.
 */
export function analizarClasesJdk(salida: string): ClasesPorPaquete {
  const lineas = salida
    .split('\n')
    .map((linea) => linea.trim())
    .filter((linea) => linea.length > 0);
  const lineaTotal = lineas.find((linea) => linea.startsWith(PREFIJO_TOTAL_DE_CLASES));
  const entradas = lineas
    .filter((linea) => !linea.startsWith(PREFIJO_TOTAL_DE_CLASES))
    .map(analizarLineaClases)
    .map(({ paquete, clases }): [string, string[]] => [paquete, clases]);
  const leidas = entradas.reduce((total, [, clases]) => total + clases.length, 0);
  if (lineaTotal === undefined || Number(lineaTotal.slice(PREFIJO_TOTAL_DE_CLASES.length)) !== leidas) {
    throw new Error(
      `La salida de GenerarClasesJdk.java está truncada o incompleta: se leyeron ${leidas} clases y la línea ` +
        `"${PREFIJO_TOTAL_DE_CLASES}N" ${lineaTotal === undefined ? 'no aparece' : `dice "${lineaTotal}"`}. ` +
        `Revisa el tope de captura del oráculo (LIMITE_BYTES_SONDAS).`,
    );
  }
  return Object.fromEntries(entradas);
}

// ---- Identificadores (GenerarIdentificadores.java, tarea 1.29) ----

/** Rangos de puntos de código (hexadecimal, "41-5a" o "5f", separados por comas) de un identificador. */
export interface IdentificadoresJava {
  /** `Character.isJavaIdentifierStart`: con qué puede EMPEZAR un identificador. */
  readonly inicio: string;
  /** `Character.isJavaIdentifierPart`: con qué puede CONTINUAR. */
  readonly parte: string;
}

/**
 * Pura: el stdout de `GenerarIdentificadores.java` (`inicio|…`, `parte|…`, `#total|N,M`) → las dos
 * tablas. Exige la línea final y que N y M sean la cantidad de rangos realmente leídos: el oráculo
 * acota lo que captura de stdout, y una tabla CORTADA se guardaría como si fuera completa.
 */
export function analizarIdentificadoresJava(salida: string): IdentificadoresJava {
  const lineas = salida
    .split('\n')
    .map((linea) => linea.trim())
    .filter((linea) => linea.length > 0);
  const lineaDe = (prefijo: string): string | undefined => lineas.find((linea) => linea.startsWith(prefijo));
  const inicio = lineaDe('inicio|')?.slice('inicio|'.length);
  const parte = lineaDe('parte|')?.slice('parte|'.length);
  if (inicio === undefined || parte === undefined || inicio === '' || parte === '') {
    throw new Error('la salida de GenerarIdentificadores.java está mal formada (faltan las líneas "inicio|…" y "parte|…")');
  }
  const total = lineaDe('#total|')?.slice('#total|'.length);
  const esperado = `${inicio.split(',').length},${parte.split(',').length}`;
  if (total !== esperado) {
    throw new Error(
      `La salida de GenerarIdentificadores.java está truncada o incompleta: se leyeron ${esperado} rangos (inicio,parte) ` +
        `y la línea "#total|N,M" ${total === undefined ? 'no aparece' : `dice "${total}"`}. Revisa el tope de captura del oráculo (LIMITE_BYTES_SONDAS).`,
    );
  }
  return { inicio, parte };
}

// ---- Símbolos regionales (`DecimalFormatSymbols`, REQ-BIB-010) ----

export interface SimbolosRegionales {
  readonly decimal: string;
  readonly miles: string;
  readonly menos: string;
  readonly nan: string;
  readonly infinito: string;
}

const FUENTE_GENERAR_REGIONAL = [
  'import java.text.DecimalFormatSymbols;',
  'public class GenerarRegional {',
  '  public static void main(String[] args) {',
  '    DecimalFormatSymbols s = DecimalFormatSymbols.getInstance();',
  '    System.out.println("decimal=" + s.getDecimalSeparator());',
  '    System.out.println("miles=" + s.getGroupingSeparator());',
  '    System.out.println("menos=" + s.getMinusSign());',
  '    System.out.println("nan=" + s.getNaN());',
  '    System.out.println("infinito=" + s.getInfinity());',
  '  }',
  '}',
  '',
].join('\n');

/** Pura: la salida "clave=valor" de `GenerarRegional` → `SimbolosRegionales`. */
export function analizarSalidaRegional(salida: string): SimbolosRegionales {
  const valores = new Map<string, string>();
  for (const linea of salida.split('\n')) {
    const separador = linea.indexOf('=');
    if (separador === -1) continue;
    valores.set(linea.slice(0, separador), linea.slice(separador + 1));
  }
  const requerido = (clave: string): string => {
    const valor = valores.get(clave);
    if (valor === undefined) throw new Error(`falta la clave "${clave}" en la salida de GenerarRegional`);
    return valor;
  };
  return {
    decimal: requerido('decimal'),
    miles: requerido('miles'),
    menos: requerido('menos'),
    nan: requerido('nan'),
    infinito: requerido('infinito'),
  };
}

// ---- Mensajes del lanzador (design.md §2.2) ----

export interface MensajeArranque {
  readonly mensaje: string;
  readonly codigoSalida: number;
}

// Clases mínimas reales que elicitan cada mensaje del lanzador (java, no javac): ambas compilan
// limpio — el problema solo existe al intentar EJECUTARLAS (REQ-COMP-007/008, exploracion/03 §4.2).
const FUENTE_SIN_MAIN = 'public class SinMain { public static int x = 5; }\n';
const FUENTE_MAIN_NO_STATIC = 'public class MainNoStatic { public void main(String[] args) { } }\n';

export interface DatosJdk {
  readonly firmas: readonly FirmaMiembro[];
  readonly supertipos: SupertiposPorTipo;
  readonly clases: ClasesPorPaquete;
  readonly identificadores: IdentificadoresJava;
  readonly regional: Readonly<Record<'es-MX' | 'es-ES', SimbolosRegionales>>;
  readonly marcos: { readonly sinMain: MensajeArranque; readonly mainNoStatic: MensajeArranque };
}

// Sub-lote 1-D3 (Parte A.2 del orquestador, engram "Gotcha: JVM en frío da el mensaje del
// lanzador en inglés en esta sandbox"): las PRIMERAS invocaciones de `java` en una sesión nueva
// PUEDEN dar el mensaje del lanzador en inglés pese a `-Duser.language=es -Duser.country=MX`
// (causa exacta no confirmada tras repetir el experimento ≥10 veces esta sesión — ver el informe).
// Ambos mensajes REALES (`marcos-arranque.generado.ts`, ya verificados contra el JDK) comparten la
// frase "método principal" — marcador simple y suficiente, sin necesitar reproducir el bug para
// probarlo (Extract-Before-Mock, mismo patrón que `esVersionEsperada` en `jdk.ts`).
const MARCADOR_LANZADOR_EN_ESPANOL = 'método principal';

/** Pura: ¿el mensaje capturado del lanzador está REALMENTE en español? */
export function pareceLanzadorEnEspanol(mensaje: string): boolean {
  return mensaje.includes(MARCADOR_LANZADOR_EN_ESPANOL);
}

/**
 * Lanza un error CLARO (nunca silencioso) si `mensaje` no parece español — el llamador (`generarDatos`)
 * nunca debe escribir `marcos-arranque.generado.ts` con un dato así (corrompería, en silencio, el
 * texto que `semantica/arranque.ts` muestra al alumno). `etiqueta` identifica el probe ("sin main"/
 * "main no static") en el mensaje de error, para que quien lo vea sepa cuál de los dos falló.
 */
export function verificarMarcoEnEspanol(mensaje: string, etiqueta: string): void {
  if (pareceLanzadorEnEspanol(mensaje)) return;
  throw new Error(
    `El mensaje del lanzador capturado para "${etiqueta}" NO parece estar en español (falta "${MARCADOR_LANZADOR_EN_ESPANOL}") ` +
      `-- probable arranque en frío de la JVM (gotcha documentado en engram/ADR 010: las primeras invocaciones de ` +
      `"java" en una sesión nueva a veces dan el mensaje del lanzador en inglés pese a -Duser.language=es ` +
      `-Duser.country=MX). Nunca se regenera "marcos-arranque.generado.ts" con este dato -- vuelve a correr ` +
      `"npm run oraculo:datos". Mensaje capturado:\n${mensaje}`,
  );
}

/**
 * Compila y corre los tres probes contra el JDK real (ADR 010/011) y arma el catálogo completo.
 * Nunca lanza por un resultado esperado de los probes (p. ej. que `SinMain` falle al ejecutar es
 * el propio dato que se está capturando) — solo lanza si el JDK no es la versión de referencia o
 * si `GenerarFirmasApi.java` no compila (error real de la herramienta, no del subconjunto).
 */
export async function generarDatos(jdk: InfoJdk): Promise<DatosJdk> {
  verificarVersionJdk(jdk);

  const fuenteFirmas = readFileSync(resolve(AQUI, 'java', 'GenerarFirmasApi.java'), 'utf-8');
  const resultadoFirmas = await ejecutarPrograma(jdk, { fuente: fuenteFirmas, limiteBytesCaptura: LIMITE_BYTES_SONDAS });
  if (!resultadoFirmas.compilo) {
    throw new Error(
      `GenerarFirmasApi.java no compiló contra el JDK real:\n${resultadoFirmas.erroresCompilacion.toString('utf-8')}`,
    );
  }
  const firmas = analizarFirmasApi(resultadoFirmas.stdout.toString('utf-8'));

  const fuenteSupertipos = readFileSync(resolve(AQUI, 'java', 'GenerarSupertipos.java'), 'utf-8');
  const resultadoSupertipos = await ejecutarPrograma(jdk, { fuente: fuenteSupertipos, limiteBytesCaptura: LIMITE_BYTES_SONDAS });
  if (!resultadoSupertipos.compilo) {
    throw new Error(
      `GenerarSupertipos.java no compiló contra el JDK real:\n${resultadoSupertipos.erroresCompilacion.toString('utf-8')}`,
    );
  }
  const supertipos = analizarSupertipos(resultadoSupertipos.stdout.toString('utf-8'));

  const fuenteClases = readFileSync(resolve(AQUI, 'java', 'GenerarClasesJdk.java'), 'utf-8');
  const resultadoClases = await ejecutarPrograma(jdk, { fuente: fuenteClases, limiteBytesCaptura: LIMITE_BYTES_SONDAS });
  if (!resultadoClases.compilo) {
    throw new Error(
      `GenerarClasesJdk.java no compiló contra el JDK real:\n${resultadoClases.erroresCompilacion.toString('utf-8')}`,
    );
  }
  const clases = analizarClasesJdk(resultadoClases.stdout.toString('utf-8'));

  const fuenteIdentificadores = readFileSync(resolve(AQUI, 'java', 'GenerarIdentificadores.java'), 'utf-8');
  const resultadoIdentificadores = await ejecutarPrograma(jdk, { fuente: fuenteIdentificadores, limiteBytesCaptura: LIMITE_BYTES_SONDAS });
  if (!resultadoIdentificadores.compilo) {
    throw new Error(
      `GenerarIdentificadores.java no compiló contra el JDK real:\n${resultadoIdentificadores.erroresCompilacion.toString('utf-8')}`,
    );
  }
  const identificadores = analizarIdentificadoresJava(resultadoIdentificadores.stdout.toString('utf-8'));

  // Parte A.2: defensa adicional (además de -Duser.language/-Duser.country, que YA viaja vía
  // `regional`) para el gotcha de la JVM en frío -- fija también LANG/LC_ALL del proceso hijo.
  // El experimento de esta sesión (≥10 repeticiones, ver el informe) NO logró reproducir el bug
  // ni aislar una causa ligada al entorno en esta máquina, así que esto es "por si acaso" (costo
  // cero: ningún programa del subconjunto observa variables de entorno, REQ-SUB-005/007) --
  // `verificarMarcoEnEspanol` de abajo es la defensa real, incondicional.
  const ENTORNO_LOCALE_ES_MX = { LANG: 'es_MX.UTF-8', LC_ALL: 'es_MX.UTF-8' };
  const [regionalMx, regionalEs, sinMain, mainNoStatic] = await Promise.all([
    ejecutarPrograma(jdk, { fuente: FUENTE_GENERAR_REGIONAL, regional: 'es-MX' }),
    ejecutarPrograma(jdk, { fuente: FUENTE_GENERAR_REGIONAL, regional: 'es-ES' }),
    ejecutarPrograma(jdk, { fuente: FUENTE_SIN_MAIN, regional: 'es-MX', envAdicional: ENTORNO_LOCALE_ES_MX }),
    ejecutarPrograma(jdk, { fuente: FUENTE_MAIN_NO_STATIC, regional: 'es-MX', envAdicional: ENTORNO_LOCALE_ES_MX }),
  ]);

  const mensajeSinMain = sinMain.stderr.toString('utf-8');
  const mensajeMainNoStatic = mainNoStatic.stderr.toString('utf-8');
  // Parte A.2: nunca se guarda un marco que no parece español -- ver `verificarMarcoEnEspanol`.
  verificarMarcoEnEspanol(mensajeSinMain, 'sin main');
  verificarMarcoEnEspanol(mensajeMainNoStatic, 'main no static');

  return {
    firmas,
    supertipos,
    clases,
    identificadores,
    regional: {
      'es-MX': analizarSalidaRegional(regionalMx.stdout.toString('utf-8')),
      'es-ES': analizarSalidaRegional(regionalEs.stdout.toString('utf-8')),
    },
    marcos: {
      sinMain: { mensaje: mensajeSinMain, codigoSalida: sinMain.codigoSalida ?? -1 },
      mainNoStatic: { mensaje: mensajeMainNoStatic, codigoSalida: mainNoStatic.codigoSalida ?? -1 },
    },
  };
}

// ---- Renderizado a TypeScript ("generado; no editar", ADR 010) ----

function cabecera(fuente: string): string {
  return (
    `// Archivo generado por \`npm run oraculo:datos\` a partir de ${fuente} contra el JDK 17 de\n` +
    '// referencia (Temurin 17.0.18+8, ADR 010) — no editar a mano. Cualquier cambio real viene de\n' +
    '// regenerar contra el JDK, nunca de tocar este archivo directamente.\n\n'
  );
}

/** Escapa un valor como literal TypeScript de comillas simples (identificadores/nombres de tipo:
 * nunca traen comillas ni saltos de línea reales, pero se escapan igual por higiene). */
function cadenaSimple(valor: string): string {
  return `'${valor.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

export function renderizarFirmasTs(firmas: readonly FirmaMiembro[]): string {
  const entradas = firmas
    .map(
      (f) =>
        `  { clase: ${cadenaSimple(f.clase)}, genero: ${cadenaSimple(f.genero)}, nombre: ${cadenaSimple(f.nombre)}, ` +
        `esEstatico: ${f.esEstatico}, parametros: [${f.parametros.map(cadenaSimple).join(', ')}], ` +
        `retorno: ${cadenaSimple(f.retorno)}, esVarargs: ${f.esVarargs} },`,
    )
    .join('\n');
  return (
    `${cabecera('herramientas/oraculo/java/GenerarFirmasApi.java')}` +
    `export interface FirmaMiembro {\n` +
    `  readonly clase: string;\n` +
    `  readonly genero: 'constructor' | 'metodo' | 'campo';\n` +
    `  readonly nombre: string;\n` +
    `  readonly esEstatico: boolean;\n` +
    `  readonly parametros: readonly string[];\n` +
    `  readonly retorno: string;\n` +
    `  readonly esVarargs: boolean;\n` +
    `}\n\n` +
    `export const FIRMAS_JDK: readonly FirmaMiembro[] = [\n${entradas}\n];\n`
  );
}

export function renderizarSupertiposTs(supertipos: SupertiposPorTipo): string {
  const entradas = Object.entries(supertipos)
    .map(([tipo, lista]) => `  ${cadenaSimple(tipo)}: [${lista.map(cadenaSimple).join(', ')}],`)
    .join('\n');
  return (
    `${cabecera('herramientas/oraculo/java/GenerarSupertipos.java')}` +
    `export const SUPERTIPOS_JDK: Readonly<Record<string, readonly string[]>> = {\n${entradas}\n};\n`
  );
}

/** Una cadena por paquete (clases separadas por comas), no un arreglo de cadenas: son ~4 400 nombres y el
 * lote entra dos veces en los paquetes de producción (hilo principal y trabajador) — ver el peso
 * medido en `tasks.md` 1.29. */
export function renderizarClasesTs(clases: ClasesPorPaquete): string {
  const entradas = Object.entries(clases)
    .map(([paquete, lista]) => `  ${cadenaSimple(paquete)}: ${cadenaSimple(lista.join(','))},`)
    .join('\n');
  return (
    `${cabecera('herramientas/oraculo/java/GenerarClasesJdk.java')}` +
    `// Paquete -> tipos públicos importables (nombre canónico dentro del paquete, "Map.Entry"), separados por comas.\n` +
    `export const CLASES_JDK: Readonly<Record<string, string>> = {\n${entradas}\n};\n`
  );
}

export function renderizarIdentificadoresTs(identificadores: IdentificadoresJava): string {
  return (
    `${cabecera('herramientas/oraculo/java/GenerarIdentificadores.java')}` +
    `// Rangos de puntos de código (hexadecimal: "41-5a" o un solo punto "5f", separados por comas) que el JDK 17 acepta en un identificador.\n` +
    `export const INICIO_DE_IDENTIFICADOR_JAVA: string = ${cadenaSimple(identificadores.inicio)};\n` +
    `export const PARTE_DE_IDENTIFICADOR_JAVA: string = ${cadenaSimple(identificadores.parte)};\n`
  );
}

export function renderizarRegionalTs(regional: Readonly<Record<'es-MX' | 'es-ES', SimbolosRegionales>>): string {
  const unLocale = (s: SimbolosRegionales): string =>
    `{ decimal: ${cadenaSimple(s.decimal)}, miles: ${cadenaSimple(s.miles)}, menos: ${cadenaSimple(s.menos)}, ` +
    `nan: ${cadenaSimple(s.nan)}, infinito: ${cadenaSimple(s.infinito)} }`;
  return (
    `${cabecera('herramientas/oraculo/java/GenerarRegional (inline en generar-datos.ts)')}` +
    `export interface SimbolosRegionales {\n` +
    `  readonly decimal: string;\n` +
    `  readonly miles: string;\n` +
    `  readonly menos: string;\n` +
    `  readonly nan: string;\n` +
    `  readonly infinito: string;\n` +
    `}\n\n` +
    `export const SIMBOLOS_REGIONALES: Readonly<Record<'es-MX' | 'es-ES', SimbolosRegionales>> = {\n` +
    `  'es-MX': ${unLocale(regional['es-MX'])},\n` +
    `  'es-ES': ${unLocale(regional['es-ES'])},\n` +
    `};\n`
  );
}

export function renderizarMarcosTs(marcos: { sinMain: MensajeArranque; mainNoStatic: MensajeArranque }): string {
  const unMarco = (m: MensajeArranque): string =>
    `{ mensaje: ${JSON.stringify(m.mensaje)}, codigoSalida: ${m.codigoSalida} }`;
  return (
    `${cabecera('los probes "sin main"/"main no static" (inline en generar-datos.ts)')}` +
    `export interface MensajeArranque {\n` +
    `  readonly mensaje: string;\n` +
    `  readonly codigoSalida: number;\n` +
    `}\n\n` +
    `// "sinMain": el mensaje trae "\\\\n" LITERAL (dos caracteres, NO un salto real) — bug\n` +
    `// verificado de la localización es-MX del lanzador de Temurin 17.0.18 (exploracion/03 §4.3).\n` +
    `// "mainNoStatic": SÍ trae saltos de línea reales (bien formado).\n` +
    `export const MARCOS_ARRANQUE: { readonly sinMain: MensajeArranque; readonly mainNoStatic: MensajeArranque } = {\n` +
    `  sinMain: ${unMarco(marcos.sinMain)},\n` +
    `  mainNoStatic: ${unMarco(marcos.mainNoStatic)},\n` +
    `};\n`
  );
}

// ---- Escritura de archivos (corpus/datos/ crudo + src/motor/biblioteca/datos/ generado) ----

export function escribirDatos(raizProyecto: string, datos: DatosJdk): void {
  const corpusApi = resolve(raizProyecto, 'corpus', 'datos', 'api');
  const corpusRegional = resolve(raizProyecto, 'corpus', 'datos', 'regional');
  const corpusMarcos = resolve(raizProyecto, 'corpus', 'datos', 'marcos');
  const bibliotecaDatos = resolve(raizProyecto, 'src', 'motor', 'biblioteca', 'datos');
  for (const dir of [corpusApi, corpusRegional, corpusMarcos, bibliotecaDatos]) mkdirSync(dir, { recursive: true });

  writeFileSync(
    resolve(corpusApi, 'firmas.jsonl'),
    `${datos.firmas.map((f) => JSON.stringify(f)).join('\n')}\n`,
    'utf-8',
  );
  writeFileSync(resolve(corpusApi, 'supertipos.json'), `${JSON.stringify(datos.supertipos, null, 2)}\n`, 'utf-8');
  // Una línea por paquete (como `firmas.jsonl`, una por firma): un cambio del JDK toca UNA línea en el diff.
  writeFileSync(
    resolve(corpusApi, 'clases.jsonl'),
    `${Object.entries(datos.clases).map(([paquete, clases]) => JSON.stringify({ paquete, clases })).join('\n')}\n`,
    'utf-8',
  );
  writeFileSync(resolve(corpusApi, 'identificadores.json'), `${JSON.stringify(datos.identificadores, null, 2)}\n`, 'utf-8');
  writeFileSync(resolve(corpusRegional, 'simbolos.json'), `${JSON.stringify(datos.regional, null, 2)}\n`, 'utf-8');
  writeFileSync(resolve(corpusMarcos, 'arranque.json'), `${JSON.stringify(datos.marcos, null, 2)}\n`, 'utf-8');

  writeFileSync(resolve(bibliotecaDatos, 'firmas-jdk.generado.ts'), renderizarFirmasTs(datos.firmas), 'utf-8');
  writeFileSync(resolve(bibliotecaDatos, 'supertipos-jdk.generado.ts'), renderizarSupertiposTs(datos.supertipos), 'utf-8');
  writeFileSync(resolve(bibliotecaDatos, 'clases-jdk.generado.ts'), renderizarClasesTs(datos.clases), 'utf-8');
  writeFileSync(resolve(bibliotecaDatos, 'identificadores-java.generado.ts'), renderizarIdentificadoresTs(datos.identificadores), 'utf-8');
  writeFileSync(resolve(bibliotecaDatos, 'regional.generado.ts'), renderizarRegionalTs(datos.regional), 'utf-8');
  writeFileSync(resolve(bibliotecaDatos, 'marcos-arranque.generado.ts'), renderizarMarcosTs(datos.marcos), 'utf-8');
}

function main(): void {
  const jdk = localizarJdk();
  generarDatos(jdk)
    .then((datos) => {
      escribirDatos(RAIZ_PROYECTO, datos);
      console.log(
        `Oráculo: ${datos.firmas.length} firmas, ${Object.keys(datos.supertipos).length} tipos con sus supertipos, ` +
          `${Object.values(datos.clases).reduce((total, lista) => total + lista.length, 0)} clases en ${Object.keys(datos.clases).length} paquetes, ` +
          `tablas de identificador, ` +
          `2 locales regionales, 2 marcos de arranque ` +
          `escritos en corpus/datos/** y src/motor/biblioteca/datos/*.generado.ts (${basename(RAIZ_PROYECTO)}).`,
      );
    })
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}

const esEjecutadoDirectamente = process.argv[1] === fileURLToPath(import.meta.url);
if (esEjecutadoDirectamente) {
  main();
}
