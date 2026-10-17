// Arma los DATOS de la explicación de cada paso (tarea 2.19, design.md §3.3, ADR 015): la clave y lo que su frase necesita —el texto de la expresión,
// la misma con sus variables sustituidas por su valor, el resultado—, con los valores escritos como Java los escribe. Lee el registro del paso que
// acaba de ejecutarse (`contexto.paso`); no ejecuta nada. Las frases las pone el catálogo `src/textos/es-MX/explicaciones.ts`, no el motor.
import type { CondicionIr, DeclaracionIr, ExpresionIr, ExpresionSentenciaIr, LlamadaIr, RaizIr, TipoIr } from '../ir/ir.ts';
import type { ConversionAlGuardar, DatosPorClave, DiagnosticoDeCiclo, EfectoDeIncremento, ExplicacionPaso, LecturaExplicada, TipoDeCiclo } from '../traza/explicacion.ts';
import type { ContextoDeEjecucion } from './contexto.ts';
import { CadenaJava } from '../biblioteca/index.ts';
import type { ValorEjecucion } from './puerto-biblioteca.ts';

const ESCAPES_DE_CARACTER: ReadonlyMap<string, string> = new Map([
  ['\n', '\\n'],
  ['\t', '\\t'],
  ['\r', '\\r'],
  ['\\', '\\\\'],
]);

/** El texto como va entre comillas en el código de Java: los saltos de línea y la barra se escriben escapados, y la comilla que lo encierra también. */
function escapar(texto: string, comilla: string): string {
  let salida = '';
  for (const caracter of texto) {
    salida += caracter === comilla ? `\\${caracter}` : (ESCAPES_DE_CARACTER.get(caracter) ?? caracter);
  }
  return salida;
}

/** Un valor como Java lo escribe en el código: `5`, `'A'`, `"hola"`, `true`, `2.5`. */
export function formatearValor(valor: ValorEjecucion, tipo: TipoIr | null, contexto: ContextoDeEjecucion): string {
  switch (tipo) {
    case 'int':
    case 'long':
      return String(valor);
    case 'boolean':
      return String(valor);
    case 'char':
      return `'${escapar(String.fromCharCode(valor as number), "'")}'`;
    case 'String':
      return `"${escapar((valor as CadenaJava).texto, '"')}"`;
    case 'double': {
      const aTexto = contexto.puerto.doubleATexto;
      return aTexto === null ? String(valor) : aTexto(valor as number);
    }
    case 'Scanner':
      return 'un Scanner';
    case 'Random':
      return 'un Random';
    case null:
      return String(valor);
  }
}

function valorDelPunto(contexto: ContextoDeEjecucion, punto: number, tipo: TipoIr | null): string | null {
  const valor = contexto.paso.registro[punto];
  return valor === null || valor === undefined ? null : formatearValor(valor, tipo, contexto);
}

function textoEnRango(raiz: RaizIr, desde: number, hasta: number): string {
  return raiz.texto.slice(desde - raiz.inicio, hasta - raiz.inicio);
}

/** Las lecturas de variable con valor registrado cuyo texto cae dentro de [desde, hasta), en el orden en que aparecen en el texto. */
function lecturasEnRango(contexto: ContextoDeEjecucion, nodo: number, desde: number, hasta: number): { inicio: number; fin: number; nombre: string; valor: string }[] {
  const plan = contexto.programa.nodos[nodo].plan;
  const lecturas: { inicio: number; fin: number; nombre: string; valor: string }[] = [];
  plan.forEach((punto, indice) => {
    if (punto.forma !== 'lectura' || punto.nombre === undefined || punto.rango.inicio < desde || punto.rango.fin > hasta) return;
    // Un `Scanner` o un `Random` no es un valor que se pueda poner en lugar de la variable (`un Scanner.nextInt()` no dice nada): se queda escrito como `sc`.
    if (punto.tipo === 'Scanner' || punto.tipo === 'Random') return;
    const valor = valorDelPunto(contexto, indice, punto.tipo);
    if (valor !== null) lecturas.push({ inicio: punto.rango.inicio, fin: punto.rango.fin, nombre: punto.nombre, valor });
  });
  return lecturas.sort((a, b) => a.inicio - b.inicio);
}

/** El texto de la raíz entre [desde, hasta) con cada lectura de variable cambiada por su valor: `total + precio * 2` -> `100 + 25 * 2`. */
function sustituir(contexto: ContextoDeEjecucion, nodo: number, raiz: RaizIr, desde: number, hasta: number): string {
  let texto = textoEnRango(raiz, desde, hasta);
  for (const lectura of lecturasEnRango(contexto, nodo, desde, hasta).reverse()) {
    texto = texto.slice(0, lectura.inicio - desde) + lectura.valor + texto.slice(lectura.fin - desde);
  }
  return texto;
}

function lecturasExplicadas(contexto: ContextoDeEjecucion, nodo: number, raiz: RaizIr): LecturaExplicada[] {
  const vistas = new Set<string>();
  const resultado: LecturaExplicada[] = [];
  for (const lectura of lecturasEnRango(contexto, nodo, raiz.inicio, raiz.inicio + raiz.texto.length)) {
    if (vistas.has(lectura.nombre)) continue;
    vistas.add(lectura.nombre);
    resultado.push({ nombre: lectura.nombre, valor: lectura.valor });
  }
  return resultado;
}

function sustituirTodo(contexto: ContextoDeEjecucion, nodo: number, raiz: RaizIr): string {
  return sustituir(contexto, nodo, raiz, raiz.inicio, raiz.inicio + raiz.texto.length);
}

// --- Lo que pasa ANTES de guardar: la conversión, el recorte y los ++ de adentro ----------------------------------------------------

/** La expresión sin la conversión implícita que la envuelve (la de guardar, o la de promover el lado derecho de `x op= e`): lo que dio el cálculo ANTES de convertir. */
function sinConversionDelTotal(expresion: ExpresionIr): ExpresionIr {
  return expresion.forma === 'conversion' && expresion.delTotal === true ? expresion.operando : expresion;
}

/**
 * Si guardar el resultado CONVIERTE el valor y eso cambia cómo se escribe (`double promedio = suma / 3;`: el cálculo da `8`, se guarda `8.0`), lo que dio el cálculo ANTES de convertir. El valor sale del
 * registro del punto de la subexpresión, no se recalcula. Un `int` que entra a un `long` se escribe igual, y un cast del alumno ya forma parte de lo que se calcula: no hay nada que aclarar.
 */
function conversionAlGuardar(contexto: ContextoDeEjecucion, expresion: ExpresionIr): ConversionAlGuardar | null {
  if (expresion.forma !== 'conversion' || expresion.delTotal !== true) return null;
  const antes = valorDelPunto(contexto, expresion.operando.punto, expresion.de);
  const despues = valorDelPunto(contexto, expresion.punto, expresion.tipo);
  if (antes === null || despues === null || antes === despues) return null;
  return { tipo: expresion.tipo, antes };
}

/** Los `++` y `--` que van dentro de [desde, hasta) y SÍ se evaluaron, en el orden de Java, con lo que valió cada uno y lo que dejó en su variable (del registro y de los cambios del paso). */
function efectosDeIncremento(contexto: ContextoDeEjecucion, nodo: number, raiz: RaizIr, desde: number, hasta: number): EfectoDeIncremento[] {
  const efectos: EfectoDeIncremento[] = [];
  contexto.programa.nodos[nodo].plan.forEach((punto, indice) => {
    if (punto.forma !== 'incremento' || punto.nombre === undefined || punto.tipo === null || punto.rango.inicio < desde || punto.rango.fin > hasta) return;
    const valor = valorDelPunto(contexto, indice, punto.tipo);
    const nuevo = contexto.paso.cambios.find((cambio) => cambio.punto === indice)?.nuevo;
    if (valor === null || (typeof nuevo !== 'number' && typeof nuevo !== 'bigint')) return;
    efectos.push({ expresion: textoEnRango(raiz, punto.rango.inicio, punto.rango.fin), nombre: punto.nombre, valor, nuevo: formatearValor(nuevo, punto.tipo, contexto) });
  });
  return efectos;
}

/** Lo que se agrega a los datos de un paso con expresión a la derecha: la conversión de guardar y los efectos de `++`/`--`, solo si los hay. */
function datosDelCalculo(
  contexto: ContextoDeEjecucion,
  nodo: number,
  raiz: RaizIr,
  valor: ExpresionIr,
  desde: number,
  hasta: number,
): { readonly conversion?: ConversionAlGuardar; readonly efectos?: readonly EfectoDeIncremento[] } {
  const conversion = conversionAlGuardar(contexto, valor);
  const efectos = efectosDeIncremento(contexto, nodo, raiz, desde, hasta);
  return { ...(conversion === null ? {} : { conversion }), ...(efectos.length === 0 ? {} : { efectos }) };
}

// --- Por clase de paso -------------------------------------------------------------------------------------------------------------

export function explicarDeclaracion(contexto: ContextoDeEjecucion, declaracion: DeclaracionIr): ExplicacionPaso {
  const valores = declaracion.declaradores.map((declarador) => {
    if (declarador.inicializador === null) return null;
    return valorDelPunto(contexto, declarador.inicializador.expresion.punto, declarador.tipo);
  });
  if (declaracion.declaradores.length > 1) {
    return {
      clave: 'declaracion-varias',
      datos: { variables: declaracion.declaradores.map((declarador, indice) => ({ nombre: declarador.nombre, tipo: declarador.tipo, valor: valores[indice] })) },
    };
  }
  const [declarador] = declaracion.declaradores;
  const valor = valores[0];
  if (declarador.inicializador === null || valor === null) return { clave: 'declaracion-sin-valor', datos: { nombre: declarador.nombre, tipo: declarador.tipo } };
  const inicializador = declarador.inicializador;
  return {
    clave: 'declaracion-con-valor',
    datos: {
      nombre: declarador.nombre,
      tipo: declarador.tipo,
      expresion: inicializador.texto,
      sustituida: sustituirTodo(contexto, declaracion.nodo, inicializador),
      valor,
      ...(esLecturaDelTeclado(inicializador.expresion) ? { leeDelTeclado: true as const } : {}),
      ...datosDelCalculo(contexto, declaracion.nodo, inicializador, inicializador.expresion, inicializador.inicio, inicializador.inicio + inicializador.texto.length),
    },
  };
}

/** ¿La expresión es UNA lectura del teclado (`sc.nextInt()`, `sc.nextLine()`…), con o sin la conversión implícita al tipo de la variable? Entonces su valor es lo que el usuario escribió. */
function esLecturaDelTeclado(expresion: ExpresionIr): boolean {
  let actual = expresion;
  while (actual.forma === 'conversion') actual = actual.operando;
  return actual.forma === 'llamada' && actual.clave.startsWith('Scanner.next');
}

function textoDeLaSalida(contexto: ContextoDeEjecucion, flujo: 'out' | 'err'): { texto: string; saltoDeLinea: boolean } {
  const completo = contexto.paso.salida.filter((segmento) => segmento.flujo === flujo).map((segmento) => segmento.texto).join('');
  const saltoDeLinea = completo.endsWith('\n');
  return { texto: saltoDeLinea ? completo.slice(0, -1) : completo, saltoDeLinea };
}

export function explicarExpresion(contexto: ContextoDeEjecucion, sentencia: ExpresionSentenciaIr): ExplicacionPaso {
  if (sentencia.raices.length > 1) return { clave: 'acciones-del-for', datos: { acciones: sentencia.raices.map((raiz) => raiz.texto) } };
  const raiz = sentencia.raices[0];
  const e = raiz.expresion;
  switch (e.forma) {
    case 'asignacion': {
      const anterior = contexto.paso.anteriores.get(e.punto);
      return {
        clave: 'asignacion',
        datos: {
          nombre: e.nombre,
          expresion: textoEnRango(raiz, e.valor.rango.inicio, e.valor.rango.fin),
          sustituida: sustituir(contexto, sentencia.nodo, raiz, e.valor.rango.inicio, e.valor.rango.fin),
          valor: valorDelPunto(contexto, e.punto, e.tipo) ?? '',
          anterior: anterior === undefined ? null : formatearValor(anterior, e.tipo, contexto),
          ...(esLecturaDelTeclado(e.valor) ? { leeDelTeclado: true as const } : {}),
          ...datosDelCalculo(contexto, sentencia.nodo, raiz, e.valor, e.valor.rango.inicio, e.valor.rango.fin),
        },
      };
    }
    case 'asignacion-compuesta': {
      const derecho = sinConversionDelTotal(e.valor);
      const valor = valorDelPunto(contexto, e.punto, e.tipo) ?? '';
      const operado = contexto.paso.sinRecortar.get(e.punto);
      const operadoTexto = operado === undefined ? null : formatearValor(operado, e.tipoOperacion, contexto);
      const efectos = efectosDeIncremento(contexto, sentencia.nodo, raiz, e.valor.rango.inicio, e.valor.rango.fin);
      return {
        clave: 'asignacion-compuesta',
        datos: {
          nombre: e.nombre,
          operador: `${e.operador}=`,
          expresion: textoEnRango(raiz, e.valor.rango.inicio, e.valor.rango.fin),
          sustituida: sustituir(contexto, sentencia.nodo, raiz, e.valor.rango.inicio, e.valor.rango.fin),
          derecho: valorDelPunto(contexto, derecho.punto, derecho.tipo) ?? '',
          anterior: valorDelPunto(contexto, e.lectura.punto, e.lectura.tipo) ?? '',
          valor,
          // Guardar recorta el resultado de la operación: `int x = 10; x += 2.7;` da 12.7 y se queda con 12.
          ...(operadoTexto === null || operadoTexto === valor ? {} : { recorte: { tipo: e.tipo, operado: operadoTexto } }),
          ...(efectos.length === 0 ? {} : { efectos }),
        },
      };
    }
    case 'incremento': {
      const anterior = contexto.paso.anteriores.get(e.punto);
      const actual = contexto.ranuras[e.ranura];
      const datos = {
        nombre: e.nombre,
        anterior: anterior === undefined ? '' : formatearValor(anterior, e.tipo, contexto),
        valor: actual === undefined ? '' : formatearValor(actual, e.tipo, contexto),
      };
      return e.delta === 1 ? { clave: 'incremento', datos } : { clave: 'decremento', datos };
    }
    case 'llamada':
      if (sentencia.clasePaso === 'impresion') return explicarImpresion(contexto, e);
      return { clave: 'expresion', datos: { expresion: raiz.texto } };
    default:
      return { clave: 'expresion', datos: { expresion: raiz.texto } };
  }
}

function explicarImpresion(contexto: ContextoDeEjecucion, llamada: LlamadaIr): ExplicacionPaso {
  const flujo = llamada.flujo ?? 'out';
  const { texto, saltoDeLinea } = textoDeLaSalida(contexto, flujo);
  return { clave: 'impresion', datos: { texto, flujo, saltoDeLinea } };
}

export function explicarCondicionIf(contexto: ContextoDeEjecucion, condicion: CondicionIr, resultado: boolean, tieneSino: boolean): ExplicacionPaso {
  return {
    clave: 'condicion-if',
    datos: {
      condicion: condicion.raiz.texto,
      sustituida: sustituirTodo(contexto, condicion.nodo, condicion.raiz),
      lecturas: lecturasExplicadas(contexto, condicion.nodo, condicion.raiz),
      resultado,
      tieneSino,
    },
  };
}

export function explicarCondicionCiclo(contexto: ContextoDeEjecucion, condicion: CondicionIr, ciclo: TipoDeCiclo, resultado: boolean, vuelta: number): ExplicacionPaso {
  return {
    clave: 'condicion-ciclo',
    datos: {
      ciclo,
      condicion: condicion.raiz.texto,
      sustituida: sustituirTodo(contexto, condicion.nodo, condicion.raiz),
      lecturas: lecturasExplicadas(contexto, condicion.nodo, condicion.raiz),
      resultado,
      vuelta,
    },
  };
}

export function explicarSeleccionDeSwitch(
  contexto: ContextoDeEjecucion,
  selector: RaizIr,
  resultado: { readonly tipo: 'caso'; readonly etiqueta: string } | { readonly tipo: 'defecto' } | { readonly tipo: 'ninguno' },
): ExplicacionPaso {
  const expresion = selector.texto;
  const valor = valorDelPunto(contexto, selector.expresion.punto, selector.expresion.tipo) ?? '';
  if (resultado.tipo === 'caso') return { clave: 'switch-elige-caso', datos: { expresion, valor, etiqueta: resultado.etiqueta } };
  if (resultado.tipo === 'defecto') return { clave: 'switch-elige-defecto', datos: { expresion, valor } };
  return { clave: 'switch-sin-coincidencia', datos: { expresion, valor } };
}

/** Los datos de la explicación del paso final de una excepción o de una detención. */
export function explicarFin(causa: DatosPorClave['detenido']['causa'], diagnostico?: DiagnosticoDeCiclo): ExplicacionPaso {
  return { clave: 'detenido', datos: diagnostico === undefined ? { causa } : { causa, diagnostico } };
}
