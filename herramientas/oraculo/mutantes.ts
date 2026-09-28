// Mutantes de un solo token contra veredictos de `javac` (tarea 1.16, REQ-DIFF-006, criterio C7,
// design.md §7.4, sub-lote 1-D3). Con semilla fija (determinismo real, `crearGeneradorConSemilla`)
// aplica UNA mutación de un solo token a los programas de `corpus/curso/` (borrar, duplicar,
// intercambiar vecinos, cambiar operador/identificador/tipo/literal, quitar/poner puntuación
// `; { } ( )`) — nunca genera un token FUERA del alcance del subconjunto (las 4 mutaciones
// "cambiar-*" solo sustituyen por otro valor DEL MISMO catálogo cerrado: 8 tipos, familias de
// operador reales del subconjunto, identificadores YA presentes en ese mismo programa, o un
// literal del MISMO género). Envía todos los mutantes a `CompiladorEnLote.java` (una sola JVM,
// `javax.tools`) y guarda `{ id, base, mutacion, compila, linea, codigoJavac }` en
// `corpus/mutantes/veredictos.jsonl` — datos del oráculo (ADR 010), nunca escritos a mano.
//
// Deliberadamente SIN reusar `src/motor/lexico/analizador-lexico.ts` (tokenizador de PRODUCCIÓN,
// capa `motor`): este módulo no valida Java, solo necesita separar código (mutable) de espacio/
// comentarios (trivia, inmutable) para aplicar ediciones mecánicas de un solo token — un
// tokenizador propio, angosto, mantiene a `herramientas/` sin acoplarse a `motor` (mismo patrón ya
// establecido: ningún otro archivo de `herramientas/oraculo` importa `src/motor`).
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { type InfoJdk, localizarJdk, verificarVersionJdk } from './jdk.ts';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ_PROYECTO = resolve(AQUI, '..', '..');

// ---- Tokenizador propio, angosto (ver cabecera) ----

export type CategoriaToken =
  | 'palabra-clave'
  | 'identificador'
  | 'tipo'
  | 'literal-entero'
  | 'literal-largo'
  | 'literal-doble'
  | 'literal-caracter'
  | 'literal-cadena'
  | 'literal-booleano'
  | 'operador'
  | 'puntuacion'
  | 'otro';

export interface Trivia {
  readonly tipo: 'trivia';
  readonly texto: string;
}

export interface TokenMutable {
  readonly tipo: 'token';
  readonly texto: string;
  readonly categoria: CategoriaToken;
}

export type Segmento = Trivia | TokenMutable;

// Palabras reservadas de Java del subconjunto (design.md §2; mismo catálogo conceptual que
// `src/motor/lexico/tokens.ts:PALABRAS_CLAVE`, copiado a propósito — ver cabecera del archivo) más
// el resto de Java real que puede aparecer en un mutante (aunque el corpus base nunca las use, una
// mutación podría producirlas incidentalmente): nunca deben clasificarse como "identificador"
// (cambiarían de significado si "cambiar-identificador" las tocara).
const PALABRAS_CLAVE: ReadonlySet<string> = new Set([
  'public', 'private', 'protected', 'class', 'interface', 'enum', 'record', 'static', 'final',
  'abstract', 'void', 'import', 'package', 'return', 'true', 'false', 'instanceof', 'new',
  'if', 'else', 'while', 'do', 'for', 'switch', 'case', 'default', 'break', 'continue',
  'try', 'catch', 'finally', 'throw', 'throws', 'var', 'yield', 'this', 'super', 'null',
  'float', 'byte', 'short', 'extends', 'implements', 'synchronized', 'volatile', 'transient',
  'native', 'strictfp', 'assert', 'const', 'goto',
]);

// Los 8 tipos del subconjunto (design.md §2.7) — "true"/"false" NO están aquí (son
// 'literal-booleano', no un nombre de tipo).
export const TIPOS_DEL_SUBCONJUNTO: readonly string[] = [
  'int', 'long', 'double', 'boolean', 'char', 'String', 'Scanner', 'Random',
];
const TIPOS_DEL_SUBCONJUNTO_SET: ReadonlySet<string> = new Set(TIPOS_DEL_SUBCONJUNTO);

// Operadores reales del subconjunto (REQ-SUB-003), de MÁS a MENOS caracteres -- el orden importa:
// probados en este orden para nunca partir "==" en "=" + "=".
const OPERADORES_POR_LONGITUD: readonly string[] = [
  '>>>=', '<<=', '>>=', // ninguno soportado (bits, REQ-SUB-007) pero un mutante podría producirlos incidentalmente
  '==', '!=', '<=', '>=', '&&', '||', '++', '--', '+=', '-=', '*=', '/=', '%=',
  '+', '-', '*', '/', '%', '<', '>', '=', '!',
];

const PUNTUACION_SIMPLE: ReadonlySet<string> = new Set(['(', ')', '{', '}', '[', ']', ';', ',', '.', ':', '?']);
// Las 5 que design.md §7.4 nombra explícitamente para "quitar/poner": las que más cambian el
// veredicto de compilación al faltar o sobrar (punto y coma, llaves, paréntesis de expresión).
export const PUNTUACION_ESENCIAL: readonly string[] = [';', '{', '}', '(', ')'];

function esInicioDeIdentificador(c: string): boolean {
  return /[A-Za-z_$]/.test(c);
}
function esContinuacionDeIdentificador(c: string): boolean {
  return /[A-Za-z0-9_$]/.test(c);
}
function esDigito(c: string): boolean {
  return c >= '0' && c <= '9';
}

/** Pura: separa `fuente` en segmentos -- `trivia` (espacio/comentarios, INMUTABLE, se preserva
 * verbatim) y `token` (código, mutable, con su `CategoriaToken`). Concatenar `.texto` de todos los
 * segmentos en orden reproduce `fuente` byte a byte (ver la prueba de reconstrucción). */
export function tokenizarParaMutar(fuente: string): Segmento[] {
  const segmentos: Segmento[] = [];
  let i = 0;
  const n = fuente.length;

  while (i < n) {
    const c = fuente[i]!;

    // Espacio en blanco (trivia).
    if (/\s/.test(c)) {
      let j = i + 1;
      while (j < n && /\s/.test(fuente[j]!)) j += 1;
      segmentos.push({ tipo: 'trivia', texto: fuente.slice(i, j) });
      i = j;
      continue;
    }

    // Comentario de línea (trivia).
    if (c === '/' && fuente[i + 1] === '/') {
      let j = i + 2;
      while (j < n && fuente[j] !== '\n') j += 1;
      segmentos.push({ tipo: 'trivia', texto: fuente.slice(i, j) });
      i = j;
      continue;
    }

    // Comentario de bloque (trivia) -- si nunca cierra, se traga el resto (nunca ocurre en corpus
    // real; defensivo).
    if (c === '/' && fuente[i + 1] === '*') {
      let j = i + 2;
      while (j < n && !(fuente[j] === '*' && fuente[j + 1] === '/')) j += 1;
      j = Math.min(j + 2, n);
      segmentos.push({ tipo: 'trivia', texto: fuente.slice(i, j) });
      i = j;
      continue;
    }

    // Cadena "..." (respeta \" escapada).
    if (c === '"') {
      let j = i + 1;
      while (j < n && fuente[j] !== '"') {
        j += fuente[j] === '\\' && j + 1 < n ? 2 : 1;
      }
      j = Math.min(j + 1, n);
      segmentos.push({ tipo: 'token', texto: fuente.slice(i, j), categoria: 'literal-cadena' });
      i = j;
      continue;
    }

    // Carácter '...' (respeta \' escapada).
    if (c === "'") {
      let j = i + 1;
      while (j < n && fuente[j] !== "'") {
        j += fuente[j] === '\\' && j + 1 < n ? 2 : 1;
      }
      j = Math.min(j + 1, n);
      segmentos.push({ tipo: 'token', texto: fuente.slice(i, j), categoria: 'literal-caracter' });
      i = j;
      continue;
    }

    // Número: entero, largo (L), o doble (con '.', exponente, o sufijo 'd').
    if (esDigito(c)) {
      let j = i + 1;
      while (j < n && (esDigito(fuente[j]!) || fuente[j] === '_')) j += 1;
      let esDoble = false;
      if (fuente[j] === '.' && esDigito(fuente[j + 1] ?? '')) {
        esDoble = true;
        j += 1;
        while (j < n && (esDigito(fuente[j]!) || fuente[j] === '_')) j += 1;
      }
      if (fuente[j] === 'e' || fuente[j] === 'E') {
        esDoble = true;
        j += 1;
        if (fuente[j] === '+' || fuente[j] === '-') j += 1;
        while (j < n && esDigito(fuente[j]!)) j += 1;
      }
      let categoria: CategoriaToken = 'literal-entero';
      if (fuente[j] === 'd' || fuente[j] === 'D' || fuente[j] === 'f' || fuente[j] === 'F') {
        categoria = 'literal-doble';
        j += 1;
      } else if (esDoble) {
        categoria = 'literal-doble';
      } else if (fuente[j] === 'l' || fuente[j] === 'L') {
        categoria = 'literal-largo';
        j += 1;
      }
      segmentos.push({ tipo: 'token', texto: fuente.slice(i, j), categoria });
      i = j;
      continue;
    }

    // Identificador, palabra clave, tipo o literal booleano.
    if (esInicioDeIdentificador(c)) {
      let j = i + 1;
      while (j < n && esContinuacionDeIdentificador(fuente[j]!)) j += 1;
      const texto = fuente.slice(i, j);
      let categoria: CategoriaToken;
      if (texto === 'true' || texto === 'false') categoria = 'literal-booleano';
      else if (TIPOS_DEL_SUBCONJUNTO_SET.has(texto)) categoria = 'tipo';
      else if (PALABRAS_CLAVE.has(texto)) categoria = 'palabra-clave';
      else categoria = 'identificador';
      segmentos.push({ tipo: 'token', texto, categoria });
      i = j;
      continue;
    }

    // Operador (el más largo que calce primero).
    const operador = OPERADORES_POR_LONGITUD.find((op) => fuente.startsWith(op, i));
    if (operador !== undefined) {
      segmentos.push({ tipo: 'token', texto: operador, categoria: 'operador' });
      i += operador.length;
      continue;
    }

    // Puntuación de un carácter.
    if (PUNTUACION_SIMPLE.has(c)) {
      segmentos.push({ tipo: 'token', texto: c, categoria: 'puntuacion' });
      i += 1;
      continue;
    }

    // Cualquier otro carácter suelto (nunca debería ocurrir en corpus real; defensivo, D2: nunca
    // se descarta, se preserva como token de la categoría abierta "otro").
    segmentos.push({ tipo: 'token', texto: c, categoria: 'otro' });
    i += 1;
  }

  return segmentos;
}

// ---- Generador seudoaleatorio con semilla fija (mulberry32 -- determinismo real, sin dependencias) ----

/** Pura: `semilla` fija -> secuencia SIEMPRE igual de valores en [0, 1). Mulberry32 (dominio
 * público, ampliamente usado para PRNGs deterministas pequeños) -- nunca `Math.random()` (no es
 * seedable, rompería "veredictos.jsonl reproducible ante una regeneración real"). */
export function crearGeneradorConSemilla(semilla: number): () => number {
  let estado = semilla >>> 0;
  return () => {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---- Mutaciones de un solo token (design.md §7.4) ----

export const tiposDeMutacion = [
  'borrar',
  'duplicar',
  'intercambiar-vecinos',
  'cambiar-operador',
  'cambiar-identificador',
  'cambiar-tipo',
  'cambiar-literal',
  'quitar-puntuacion',
  'poner-puntuacion',
] as const;

export type TipoMutacion = (typeof tiposDeMutacion)[number];

// Familias de operadores reales del subconjunto (REQ-SUB-003) -- "cambiar-operador" solo sustituye
// DENTRO de la misma familia (misma aridad/contexto real), nunca cruza a una familia distinta.
const FAMILIAS_DE_OPERADOR: readonly (readonly string[])[] = [
  ['+', '-', '*', '/', '%'],
  ['==', '!='],
  ['<', '>', '<=', '>='],
  ['&&', '||'],
  ['=', '+=', '-=', '*=', '/=', '%='],
  ['++', '--'],
];

function familiaDe(texto: string): readonly string[] | null {
  return FAMILIAS_DE_OPERADOR.find((familia) => familia.includes(texto)) ?? null;
}

const POOL_ENTERO: readonly string[] = ['0', '1', '7', '42'];
const POOL_LARGO: readonly string[] = ['0L', '1L', '7L', '42L'];
const POOL_DOBLE: readonly string[] = ['0.0', '1.5', '7.25', '3.14'];
const POOL_CARACTER: readonly string[] = ["'a'", "'z'", "'x'", "'0'"];
const POOL_CADENA: readonly string[] = ['"mutado"', '"x"', '""'];

function primerDistinto(pool: readonly string[], actual: string): string | null {
  return pool.find((valor) => valor !== actual) ?? null;
}

/** ¿Qué tipos de mutación son APLICABLES a la categoría del token en `indice` (filtro rápido, sin
 * garantizar éxito -- `aplicarMutacion` es la autoridad final: una categoría aplicable puede
 * seguir fallando en la práctica, p. ej. "cambiar-identificador" sin otro identificador real en el
 * programa). */
function tiposAplicablesEnIndice(segmentos: readonly Segmento[], indice: number): TipoMutacion[] {
  const segmento = segmentos[indice];
  if (segmento === undefined || segmento.tipo !== 'token') return [];
  const aplicables: TipoMutacion[] = ['borrar', 'duplicar', 'poner-puntuacion'];
  if (siguienteIndiceDeToken(segmentos, indice) !== null) aplicables.push('intercambiar-vecinos');
  if (segmento.categoria === 'operador') {
    const familia = familiaDe(segmento.texto);
    if (familia !== null && familia.length > 1) aplicables.push('cambiar-operador');
  }
  if (segmento.categoria === 'identificador') aplicables.push('cambiar-identificador');
  if (segmento.categoria === 'tipo') aplicables.push('cambiar-tipo');
  if (segmento.categoria.startsWith('literal-')) aplicables.push('cambiar-literal');
  if (segmento.categoria === 'puntuacion' && (PUNTUACION_ESENCIAL as readonly string[]).includes(segmento.texto)) {
    aplicables.push('quitar-puntuacion');
  }
  return aplicables;
}

function siguienteIndiceDeToken(segmentos: readonly Segmento[], desde: number): number | null {
  for (let i = desde + 1; i < segmentos.length; i += 1) {
    if (segmentos[i]!.tipo === 'token') return i;
  }
  return null;
}

function reconstruirReemplazando(segmentos: readonly Segmento[], indice: number, reemplazo: readonly string[]): string {
  const partes = segmentos.map((s) => s.texto);
  partes.splice(indice, 1, ...reemplazo);
  return partes.join('');
}

const NO_APLICADA = { fuente: '', aplicada: false } as const;

/** Pura, determinista: aplica EXACTAMENTE una mutación de tipo `tipo` en el token `indice` de
 * `segmentos` (de `tokenizarParaMutar`) y devuelve la fuente reconstruida. `aplicada: false` (con
 * `fuente` vacía, nunca usada por el llamador) si `tipo` no tiene sentido en esa posición o no hay
 * ningún reemplazo real posible (p. ej. "cambiar-identificador" sin otro identificador real en el
 * programa) -- D2, nunca inventa un reemplazo fuera del catálogo cerrado. */
export function aplicarMutacion(
  segmentos: readonly Segmento[],
  indice: number,
  tipo: TipoMutacion,
): { readonly fuente: string; readonly aplicada: boolean } {
  const original = segmentos[indice];
  if (original === undefined || original.tipo !== 'token') return NO_APLICADA;

  switch (tipo) {
    case 'borrar':
      return { fuente: reconstruirReemplazando(segmentos, indice, []), aplicada: true };

    case 'duplicar':
      // Espacio entre las 2 copias -- nunca deja que dos tokens adyacentes se FUSIONEN en un
      // token DISTINTO (p. ej. "+" + "+" sin espacio sería "++", el operador de incremento -- una
      // mutación distinta, no la duplicación pedida).
      return { fuente: reconstruirReemplazando(segmentos, indice, [original.texto, ' ', original.texto]), aplicada: true };

    case 'intercambiar-vecinos': {
      const indiceVecino = siguienteIndiceDeToken(segmentos, indice);
      if (indiceVecino === null) return NO_APLICADA;
      const vecino = segmentos[indiceVecino] as TokenMutable;
      const partes = segmentos.map((s) => s.texto);
      partes[indice] = vecino.texto;
      partes[indiceVecino] = original.texto;
      return { fuente: partes.join(''), aplicada: true };
    }

    case 'cambiar-operador': {
      const familia = familiaDe(original.texto);
      const nuevo = familia !== null ? primerDistinto(familia, original.texto) : null;
      if (nuevo === null) return NO_APLICADA;
      return { fuente: reconstruirReemplazando(segmentos, indice, [nuevo]), aplicada: true };
    }

    case 'cambiar-identificador': {
      if (original.categoria !== 'identificador') return NO_APLICADA;
      const otros = new Set(
        segmentos
          .filter((s): s is TokenMutable => s.tipo === 'token' && s.categoria === 'identificador' && s.texto !== original.texto)
          .map((s) => s.texto),
      );
      const nuevo = otros.values().next().value as string | undefined;
      if (nuevo === undefined) return NO_APLICADA;
      return { fuente: reconstruirReemplazando(segmentos, indice, [nuevo]), aplicada: true };
    }

    case 'cambiar-tipo': {
      if (original.categoria !== 'tipo') return NO_APLICADA;
      const nuevo = primerDistinto(TIPOS_DEL_SUBCONJUNTO, original.texto);
      if (nuevo === null) return NO_APLICADA;
      return { fuente: reconstruirReemplazando(segmentos, indice, [nuevo]), aplicada: true };
    }

    case 'cambiar-literal': {
      const pool =
        original.categoria === 'literal-entero' ? POOL_ENTERO
        : original.categoria === 'literal-largo' ? POOL_LARGO
        : original.categoria === 'literal-doble' ? POOL_DOBLE
        : original.categoria === 'literal-caracter' ? POOL_CARACTER
        : original.categoria === 'literal-cadena' ? POOL_CADENA
        : original.categoria === 'literal-booleano' ? (original.texto === 'true' ? ['false'] : ['true'])
        : null;
      if (pool === null) return NO_APLICADA;
      const nuevo = primerDistinto(pool, original.texto);
      if (nuevo === null) return NO_APLICADA;
      return { fuente: reconstruirReemplazando(segmentos, indice, [nuevo]), aplicada: true };
    }

    case 'quitar-puntuacion': {
      if (original.categoria !== 'puntuacion' || !(PUNTUACION_ESENCIAL as readonly string[]).includes(original.texto)) {
        return NO_APLICADA;
      }
      return { fuente: reconstruirReemplazando(segmentos, indice, []), aplicada: true };
    }

    case 'poner-puntuacion': {
      // Determinista según la posición (nunca necesita el azar del generador, ver cabecera de
      // `generarMutantesDePrograma`): recorre las 5 esenciales -- ninguna se combina con lo
      // adyacente en un token DISTINTO (a diferencia de operadores/identificadores), así que
      // insertarla directo (sin espacio) sigue produciendo exactamente 2 tokens reales.
      const caracter = PUNTUACION_ESENCIAL[indice % PUNTUACION_ESENCIAL.length]!;
      return { fuente: reconstruirReemplazando(segmentos, indice, [original.texto, caracter]), aplicada: true };
    }
  }
}

// ---- Generación de N mutantes distintos de un programa, con semilla fija ----

export interface Mutante {
  readonly id: string;
  readonly base: string;
  readonly mutacion: TipoMutacion;
  readonly fuente: string;
}

/** Pura, determinista: hasta `cantidad` mutantes de un solo token de `fuente` (identificado como
 * `base` en el resultado), eligiendo (posición, tipo de mutación) con el PRNG de `semilla` --
 * misma semilla + mismo programa = MISMA lista siempre (design.md §7.4). Nunca repite una fuente
 * ya vista (ni la original) -- cada mutante es un caso de prueba genuinamente distinto. Puede
 * devolver MENOS de `cantidad` si el programa no tiene suficientes posiciones aplicables
 * distintas (nunca inventa una mutación fuera de las 9 reales para completar la cuota). */
export function generarMutantesDePrograma(fuente: string, base: string, cantidad: number, semilla: number): Mutante[] {
  const segmentos = tokenizarParaMutar(fuente);
  const indicesDeTokens: number[] = [];
  for (let i = 0; i < segmentos.length; i += 1) if (segmentos[i]!.tipo === 'token') indicesDeTokens.push(i);
  if (indicesDeTokens.length === 0) return [];

  const azar = crearGeneradorConSemilla(semilla);
  const vistas = new Set<string>([fuente]);
  const mutantes: Mutante[] = [];
  const maximoIntentos = Math.max(cantidad * 40, 400);
  let intentos = 0;
  let contador = 0;

  while (mutantes.length < cantidad && intentos < maximoIntentos) {
    intentos += 1;
    const indice = indicesDeTokens[Math.floor(azar() * indicesDeTokens.length)]!;
    const aplicables = tiposAplicablesEnIndice(segmentos, indice);
    if (aplicables.length === 0) continue;
    const tipo = aplicables[Math.floor(azar() * aplicables.length)]!;
    const resultado = aplicarMutacion(segmentos, indice, tipo);
    if (!resultado.aplicada || vistas.has(resultado.fuente)) continue;
    vistas.add(resultado.fuente);
    contador += 1;
    mutantes.push({ id: `${base}#${contador}`, base, mutacion: tipo, fuente: resultado.fuente });
  }
  return mutantes;
}

// ---- Orquestación: corpus/curso/*.java -> mutantes -> CompiladorEnLote.java -> veredictos.jsonl ----

// Semilla fija (design.md §7.4: "con semilla fija") -- cada programa base usa SEMILLA_BASE + su
// índice (orden alfabético de archivo), nunca la misma semilla repetida entre programas distintos.
export const SEMILLA_BASE = 20260925;
// Por encima de las ≥2000 mutantes exigidas por C7 (REQ-DIFF-006) -- margen real: algunos
// programas pequeños no alcanzan su cuota exacta (pocas posiciones aplicables distintas), el
// exceso del resto lo compensa.
export const OBJETIVO_TOTAL_MUTANTES = 2600;

export interface VeredictoMutante extends Mutante {
  readonly compila: boolean;
  readonly linea: number;
  readonly codigoJavac: string;
  // Mensaje REAL de javac en inglés (Locale.ROOT, determinista -- ver CompiladorEnLote.java):
  // necesario para distinguir la familia "compiler.err.expected*" (¿faltó ";"? ¿")"? ¿otra cosa?),
  // que `codigoJavac` por sí solo no distingue (misma clave, distinto número de argumentos).
  readonly mensajeJavac: string;
}

/** Todos los `.java` de `corpus/curso/` (nunca `corpus/autoria/`, que esta sesión NO existe
 * todavía -- se creará en la tarea 5.3 del lote 5; desviación documentada, ver el informe de la
 * sesión), ordenados por nombre para que la generación sea 100% determinista. */
function programasBase(raizProyecto: string): { readonly nombre: string; readonly fuente: string }[] {
  const dirCurso = resolve(raizProyecto, 'corpus', 'curso');
  return readdirSync(dirCurso)
    .filter((nombre) => nombre.endsWith('.java'))
    .sort()
    .map((nombre) => ({ nombre, fuente: readFileSync(resolve(dirCurso, nombre), 'utf-8') }));
}

/** Genera los mutantes de TODOS los programas de `corpus/curso/` -- determinista (misma entrada,
 * misma salida siempre). Exportada para que la prueba de integración pueda pedir el mismo conjunto
 * sin duplicar esta lógica. */
export function generarTodosLosMutantes(raizProyecto: string = RAIZ_PROYECTO): Mutante[] {
  const programas = programasBase(raizProyecto);
  if (programas.length === 0) {
    throw new Error(`No se encontró ningún ".java" en "corpus/curso/" (raíz: ${raizProyecto}).`);
  }
  const objetivoPorPrograma = Math.max(Math.ceil(OBJETIVO_TOTAL_MUTANTES / programas.length), 20);
  const mutantes: Mutante[] = [];
  programas.forEach((programa, indice) => {
    mutantes.push(...generarMutantesDePrograma(programa.fuente, programa.nombre, objetivoPorPrograma, SEMILLA_BASE + indice));
  });
  return mutantes;
}

/** Ejecuta `CompiladorEnLote.java` UNA sola vez (una JVM) contra TODOS los `mutantes`, vía el
 * protocolo de texto de la cabecera del archivo Java (stdin: "id\tbase64(fuente)" por línea;
 * stdout: "id\tcompila\tlinea\tcodigoJavac" por línea). */
interface RespuestaJava {
  readonly compila: boolean;
  readonly linea: number;
  readonly codigoJavac: string;
  readonly mensajeJavac: string;
}

/** Inverso de `CompiladorEnLote.java:escaparParaUnaLinea` -- ver su javadoc. */
function desescaparUnaLinea(texto: string): string {
  return texto.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\r/g, '\r').replace(/\\\\/g, '\\');
}

function compilarEnLote(jdk: InfoJdk, mutantes: readonly Mutante[]): Promise<Map<string, RespuestaJava>> {
  return new Promise((resolverPromesa, rechazarPromesa) => {
    const rutaJava = resolve(AQUI, 'java', 'CompiladorEnLote.java');
    const proceso = spawn(jdk.rutaJava, [rutaJava], { stdio: ['pipe', 'pipe', 'pipe'] });

    let salidaAcumulada = '';
    let errorAcumulado = '';
    // Generoso: miles de compilaciones reales en una sola JVM (ver el informe de la sesión para
    // el tiempo medido real) -- nunca el límite de 5s de `ejecutar.ts` (pensado para UN programa).
    const limiteMs = 10 * 60 * 1000;
    const temporizador = setTimeout(() => {
      proceso.kill('SIGKILL');
      rechazarPromesa(new Error(`CompiladorEnLote.java no terminó en ${limiteMs} ms (¿colgado?) -- salida parcial:\n${salidaAcumulada.slice(-2000)}`));
    }, limiteMs);

    proceso.stdout.on('data', (fragmento: Buffer) => {
      salidaAcumulada += fragmento.toString('utf-8');
    });
    proceso.stderr.on('data', (fragmento: Buffer) => {
      errorAcumulado += fragmento.toString('utf-8');
    });

    proceso.on('close', (codigo) => {
      clearTimeout(temporizador);
      if (codigo !== 0) {
        rechazarPromesa(new Error(`CompiladorEnLote.java terminó con código ${codigo}. stderr:\n${errorAcumulado}`));
        return;
      }
      const resultados = new Map<string, RespuestaJava>();
      for (const linea of salidaAcumulada.split('\n')) {
        if (linea.trim() === '') continue;
        const [id, compilaTexto, lineaTexto, codigoJavac, mensajeEscapado] = linea.split('\t');
        if (id === undefined || compilaTexto === undefined || lineaTexto === undefined) continue;
        resultados.set(id, {
          compila: compilaTexto === 'true',
          linea: Number(lineaTexto),
          codigoJavac: codigoJavac ?? '',
          mensajeJavac: mensajeEscapado !== undefined ? desescaparUnaLinea(mensajeEscapado) : '',
        });
      }
      resolverPromesa(resultados);
    });

    proceso.on('error', (error) => {
      clearTimeout(temporizador);
      rechazarPromesa(error);
    });

    // Manifiesto completo -- UNA escritura, cerramos stdin para que el bucle `readLine` del lado
    // Java termine en EOF real (mismo patrón que `ejecutar.ts`: nunca deja el hijo esperando).
    const manifiesto = mutantes.map((m) => `${m.id}\t${Buffer.from(m.fuente, 'utf-8').toString('base64')}`).join('\n');
    proceso.stdin.end(`${manifiesto}\n`, 'utf-8');
  });
}

/** Genera TODOS los mutantes de `corpus/curso/`, los compila en una sola JVM y escribe
 * `corpus/mutantes/veredictos.jsonl` -- ADR 010, dato del oráculo, nunca escrito a mano. */
export async function generarVeredictos(raizProyecto: string = RAIZ_PROYECTO): Promise<VeredictoMutante[]> {
  const jdk = localizarJdk();
  verificarVersionJdk(jdk);

  const mutantes = generarTodosLosMutantes(raizProyecto);
  const resultados = await compilarEnLote(jdk, mutantes);

  const veredictos: VeredictoMutante[] = mutantes.map((mutante) => {
    const resultado = resultados.get(mutante.id);
    if (resultado === undefined) {
      throw new Error(`CompiladorEnLote.java no devolvió veredicto para "${mutante.id}" (manifiesto/salida desalineados).`);
    }
    return { ...mutante, ...resultado };
  });

  const dirMutantes = resolve(raizProyecto, 'corpus', 'mutantes');
  mkdirSync(dirMutantes, { recursive: true });
  writeFileSync(resolve(dirMutantes, 'veredictos.jsonl'), `${veredictos.map((v) => JSON.stringify(v)).join('\n')}\n`, 'utf-8');

  return veredictos;
}

function main(): void {
  const inicio = Date.now();
  generarVeredictos()
    .then((veredictos) => {
      const compilan = veredictos.filter((v) => v.compila).length;
      const segundos = ((Date.now() - inicio) / 1000).toFixed(1);
      console.log(
        `Mutantes: ${veredictos.length} generados y compilados en ${segundos}s ` +
          `(${compilan} compilan limpio, ${veredictos.length - compilan} con error) -- ` +
          `corpus/mutantes/veredictos.jsonl`,
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
