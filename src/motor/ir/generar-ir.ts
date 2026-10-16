// Baja el AST del subconjunto a la IR tipada (tarea 2.16, design.md §3.1, ADR 005 punto 1). Corre DESPUÉS de las pasadas de compilación
// (léxico, sintaxis, atribución, alcanzabilidad, asignación definitiva), así que el programa ya es válido: aquí no se vuelven a revisar los
// tipos, se BAJAN. Cada operación recibe su tipo, las conversiones implícitas (la promoción numérica binaria, el ensanchamiento de una
// asignación, el estrechamiento de una constante `int` a `char`) quedan como nodos `conversion` visibles, cada local tiene su ranura y cada
// llamada a la biblioteca su CLAVE de firma resuelta con las mismas sobrecargas de la atribución (`semantica/sobrecargas.ts`).
//
// Lo que el puerto de la biblioteca (`interprete/puerto-biblioteca.ts`) no sabe hacer NO se ejecuta: una llamada o un `new` cuya clave no está
// en el puerto, o cualquier `double` si el puerto no sabe escribir uno, es un `ErrorDeEjecucionNoDisponible` con el rango real (D2, regla 5 de
// CLAUDE.md) que `compilar()` traduce al aviso `ejecucion-no-disponible`. Es una ruta defensiva PERMANENTE (tarea 1.27): nunca un resultado inventado.
//
// El árbol sale SIN números de punto (`punto: -1`); `plan-evaluacion.ts` los asigna en el orden en que Java evalúa. Cada paso (declaración,
// sentencia de expresión, condición…) es un NODO con su plan; `Paso.valores` va alineado con él.
import { caracterDeLiteral } from '../biblioteca/numeros/caracter.ts';
import { promocionBinaria } from '../biblioteca/numeros/conversiones.ts';
import { INT_MAXIMO, INT_MINIMO } from '../biblioteca/numeros/enteros.ts';
import { LONG_MAXIMO, LONG_MINIMO } from '../biblioteca/numeros/largos.ts';
import type { FirmaMiembro } from '../biblioteca/datos/firmas-jdk.generado.ts';
import type { Rango } from '../fuente/rango.ts';
import { TablaDeLineas } from '../fuente/tabla-de-lineas.ts';
import { PUERTO_VACIO, type PuertoBiblioteca } from '../interprete/puerto-biblioteca.ts';
import { Alcance, type SimboloVariable } from '../semantica/alcance.ts';
import { constanteDeVariable, valorConstante, valorSiSeSabe } from '../semantica/constantes.ts';
import { resolverSobrecarga } from '../semantica/sobrecargas.ts';
import {
  argumentoDeSobrecarga,
  campoReflejadoDeSystem,
  claseDelObjeto,
  esNombreDeClaseDelCatalogo,
  tipoDeExpresion,
  tipoDeNombreDeTipo,
} from '../semantica/tipos.ts';
import type {
  NodoBloque,
  NodoDeclaracionLocal,
  NodoElementoBloque,
  NodoExpresion,
  NodoFor,
  NodoLlamada,
  NodoNuevaInstancia,
  NodoPrograma,
  NodoSentencia,
  NodoSentenciaExpresion,
  NodoSwitch,
} from '../sintaxis/ast.ts';
import { ErrorDeEjecucionNoDisponible } from './error-de-ejecucion-no-disponible.ts';
import type {
  AritmeticaIr,
  ClaseDeNodo,
  CondicionIr,
  DeclaracionIr,
  DeclaradorIr,
  ElementoSwitchIr,
  ExpresionIr,
  ExpresionSentenciaIr,
  ForIr,
  LecturaIr,
  LlamadaIr,
  NodoIr,
  OperadorAritmeticoIr,
  OperadorComparacionIr,
  ProgramaIr,
  PuntoDelPlan,
  RanuraIr,
  RaizIr,
  SentenciaIr,
  SwitchIr,
  TipoIr,
  TipoNumericoIr,
} from './ir.ts';
import { ConstructorDePlan, numerarExpresion } from './plan-evaluacion.ts';

export interface OpcionesDeGeneracion {
  /** El texto del programa (ya con los fines de línea normalizados): de aquí salen las líneas y el texto de cada expresión. */
  readonly fuente: string;
  /** Lo que la biblioteca sabe ejecutar: decide qué llamadas y qué tipos se pueden bajar. */
  readonly puerto: PuertoBiblioteca;
}

/** Baja `programa` a IR. Sin `main` no hay cuerpo que bajar: el programa queda vacío (el arranque lo reporta `crearEjecucion`, tarea 1.15). */
export function generarIr(programa: NodoPrograma, opciones: OpcionesDeGeneracion = { fuente: '', puerto: PUERTO_VACIO }): ProgramaIr {
  return new GeneradorDeIr(programa, opciones).generar();
}

// ---------------------------------------------------------------------------------------------------------------------------------

const TIPOS_NUMERICOS: ReadonlySet<TipoIr> = new Set<TipoIr>(['int', 'long', 'double', 'char']);

function esNumerico(tipo: TipoIr | null): tipo is TipoNumericoIr {
  return tipo !== null && TIPOS_NUMERICOS.has(tipo);
}

/** Las firmas de `print`/`println` que el propio intérprete resuelve (no necesitan la biblioteca; `double` sí necesita `Double.toString`, lo decide el tipo). */
const CLAVES_NATIVAS: ReadonlySet<string> = new Set(
  ['print', 'println'].flatMap((metodo) =>
    ['boolean', 'char', 'double', 'int', 'long', 'java.lang.String'].map((parametro) => `PrintStream.${metodo}(${parametro})`),
  ).concat(['PrintStream.println()']),
);

/** Constantes de campos estáticos que el propio intérprete conoce (las demás, como `Math.PI`, también: son valores fijos del JDK). */
const CAMPOS_CONSTANTES: ReadonlyMap<string, { readonly tipo: TipoIr; readonly valor: number | bigint }> = new Map([
  ['Integer.MAX_VALUE', { tipo: 'int' as const, valor: INT_MAXIMO }],
  ['Integer.MIN_VALUE', { tipo: 'int' as const, valor: INT_MINIMO }],
  ['Long.MAX_VALUE', { tipo: 'long' as const, valor: LONG_MAXIMO }],
  ['Long.MIN_VALUE', { tipo: 'long' as const, valor: LONG_MINIMO }],
  ['Double.MAX_VALUE', { tipo: 'double' as const, valor: Number.MAX_VALUE }],
  ['Double.MIN_VALUE', { tipo: 'double' as const, valor: Number.MIN_VALUE }],
  ['Math.PI', { tipo: 'double' as const, valor: Math.PI }],
  ['Math.E', { tipo: 'double' as const, valor: Math.E }],
]);

function noDisponible(mensaje: string, rango: Rango): never {
  throw new ErrorDeEjecucionNoDisponible(mensaje, rango);
}

function rangoDe(nodo: NodoExpresion): Rango {
  return nodo.parentesis ?? nodo.rango;
}

function claveDeFirma(firma: FirmaMiembro): string {
  const nombre = firma.genero === 'constructor' ? '<init>' : firma.nombre;
  return `${firma.clase}.${nombre}(${firma.parametros.join(',')})`;
}

/** El tipo de un valor devuelto por la biblioteca (`Class#getTypeName()`); `null` para `void` y para lo que el subconjunto no modela como valor (`PrintStream`). */
function tipoDeRetorno(reflejado: string): TipoIr | null {
  switch (reflejado) {
    case 'int':
    case 'long':
    case 'double':
    case 'boolean':
    case 'char':
      return reflejado;
    case 'java.lang.String':
      return 'String';
    case 'java.util.Scanner':
      return 'Scanner';
    case 'java.util.Random':
      return 'Random';
    default:
      return null;
  }
}

function tipoDeTipo(tipo: ReturnType<typeof tipoDeNombreDeTipo>, rango: Rango): TipoIr {
  if (tipo === 'desconocido') return noDisponible('tipo fuera del subconjunto', rango);
  return tipo;
}

interface RaizCruda {
  readonly expresion: ExpresionIr;
  readonly texto: string;
  readonly inicio: number;
  readonly conBiblioteca: boolean;
}

interface NodoBorrador {
  readonly id: number;
  readonly clase: ClaseDeNodo;
  readonly rango: Rango;
  readonly linea: number;
  vivas: readonly number[];
  plan: readonly PuntoDelPlan[];
}

class GeneradorDeIr {
  private readonly programa: NodoPrograma;
  private readonly fuente: string;
  private readonly puerto: PuertoBiblioteca;
  private readonly tabla: TablaDeLineas;
  private readonly alcance: Alcance;
  private readonly ranuras: RanuraIr[] = [];
  private readonly ranuraDe = new Map<SimboloVariable, number>();
  private readonly nodos: NodoBorrador[] = [];
  private huboBiblioteca = false;

  constructor(programa: NodoPrograma, opciones: OpcionesDeGeneracion) {
    this.programa = programa;
    this.fuente = opciones.fuente;
    this.puerto = opciones.puerto;
    this.tabla = new TablaDeLineas(opciones.fuente);
    this.alcance = new Alcance(new Set([programa.clase.nombre]));
  }

  generar(): ProgramaIr {
    const clase = this.programa.clase;
    const paquete = this.programa.paquete?.nombre ?? null;
    const base = {
      nombreClase: clase.nombre,
      nombreCalificado: paquete === null ? clase.nombre : `${paquete}.${clase.nombre}`,
      archivo: `${clase.nombre}.java`,
    };
    if (clase.main === null) return { sentencias: [], ranuras: [], nodos: [], ...base };
    // El parámetro de `main` vive en el alcance (como en la atribución) pero no es una ranura: usarlo ya fue un aviso de arreglo.
    this.alcance.entrarBloque();
    this.alcance.declarar({ nombre: clase.main.parametro, tipo: 'desconocido', esFinal: false, rango: clase.main.rango });
    this.alcance.entrarBloque();
    const sentencias = clase.main.cuerpo.elementos.map((elemento) => this.bajarElemento(elemento));
    this.alcance.salirBloque();
    this.alcance.salirBloque();
    const nodos: NodoIr[] = this.nodos.map((nodo) => ({ id: nodo.id, clase: nodo.clase, rango: nodo.rango, linea: nodo.linea, vivas: nodo.vivas, plan: nodo.plan }));
    return { sentencias, ranuras: this.ranuras, nodos, ...base };
  }

  // --- Nodos y planes --------------------------------------------------------------------------------------------------------

  private reservarNodo(clase: ClaseDeNodo, rango: Rango): number {
    const id = this.nodos.length;
    this.nodos.push({ id, clase, rango, linea: this.tabla.ubicar(rango.inicio).linea, vivas: [], plan: [] });
    return id;
  }

  private ranurasVivas(): number[] {
    const vivas: number[] = [];
    for (const nombre of this.alcance.nombresVisibles()) {
      const simbolo = this.alcance.buscar(nombre);
      const ranura = simbolo === null ? undefined : this.ranuraDe.get(simbolo);
      if (ranura !== undefined) vivas.push(ranura);
    }
    return vivas.sort((a, b) => a - b);
  }

  private cerrarNodo(id: number, plan: readonly PuntoDelPlan[]): void {
    const nodo = this.nodos[id];
    nodo.plan = plan;
    nodo.vivas = this.ranurasVivas();
  }

  /** Numera las raíces de UN nodo en un mismo plan (una declaración con varios inicializadores comparte el plan) y cierra el nodo. */
  private numerarRaices(nodo: number, crudas: readonly RaizCruda[]): RaizIr[] {
    const plan = new ConstructorDePlan();
    const raices = crudas.map((cruda) => ({
      expresion: numerarExpresion(cruda.expresion, plan),
      texto: cruda.texto,
      inicio: cruda.inicio,
      conBiblioteca: cruda.conBiblioteca,
    }));
    // Un `double` solo se puede mostrar si la biblioteca sabe escribirlo (Double.toString): si no, el programa no se ejecuta (D2).
    if (this.puerto.doubleATexto === null) {
      const punto = plan.puntos.find((p) => p.tipo === 'double');
      if (punto !== undefined) noDisponible('un double necesita Double.toString', punto.rango);
    }
    this.cerrarNodo(nodo, plan.puntos);
    return raices;
  }

  private bajarRaiz(ast: NodoExpresion, rangoDelTexto: Rango = rangoDe(ast)): RaizCruda {
    this.huboBiblioteca = false;
    const expresion = this.bajar(ast);
    return {
      expresion,
      texto: this.fuente.slice(rangoDelTexto.inicio, rangoDelTexto.fin),
      inicio: rangoDelTexto.inicio,
      conBiblioteca: this.huboBiblioteca,
    };
  }

  // --- Sentencias ------------------------------------------------------------------------------------------------------------

  private bajarElemento(elemento: NodoElementoBloque): SentenciaIr {
    if (elemento.tipo === 'declaracion-local') return this.bajarDeclaracion(elemento);
    return this.bajarSentencia(elemento);
  }

  private bajarBloque(bloque: NodoBloque): SentenciaIr {
    this.alcance.entrarBloque();
    const sentencias = bloque.elementos.map((elemento) => this.bajarElemento(elemento));
    this.alcance.salirBloque();
    return { forma: 'bloque', sentencias };
  }

  private bajarDeclaracion(declaracion: NodoDeclaracionLocal): DeclaracionIr {
    const tipo = tipoDeTipo(tipoDeNombreDeTipo(declaracion.nombreTipo), declaracion.rango);
    if (tipo === 'double' && this.puerto.doubleATexto === null) noDisponible('un double necesita Double.toString', declaracion.rango);
    const nodo = this.reservarNodo('declaracion', declaracion.rango);
    const declaradores: Array<Omit<DeclaradorIr, 'inicializador'> & { cruda: RaizCruda | null }> = [];
    for (const declarador of declaracion.declaradores) {
      // Como la atribución (JLS 6.3, 4.12.4): la variable está en alcance en su propio inicializador y, si es `final` con valor constante, guarda ese valor.
      const valorInicial = declarador.inicializador === null ? null : valorConstante(declarador.inicializador, this.alcance);
      const constante = declaracion.esFinal ? constanteDeVariable(declaracion.nombreTipo, valorInicial) : undefined;
      const simbolo: SimboloVariable = { nombre: declarador.nombre, tipo: declaracion.nombreTipo, esFinal: declaracion.esFinal, rango: declarador.rango, constante };
      this.alcance.declarar(simbolo);
      const ranura = this.ranuras.length;
      this.ranuras.push({ indice: ranura, nombre: declarador.nombre, tipo, nodo, esFinal: declaracion.esFinal });
      this.ranuraDe.set(simbolo, ranura);
      let cruda: RaizCruda | null = null;
      if (declarador.inicializador !== null) {
        const base = this.bajarRaiz(declarador.inicializador);
        cruda = { ...base, expresion: this.convertirAsignacion(base.expresion, tipo) };
      }
      declaradores.push({ ranura, nombre: declarador.nombre, tipo, cruda });
    }
    const raices = this.numerarRaices(
      nodo,
      declaradores.flatMap((d) => (d.cruda === null ? [] : [d.cruda])),
    );
    let siguiente = 0;
    return {
      forma: 'declaracion',
      nodo,
      declaradores: declaradores.map((d) => ({ ranura: d.ranura, nombre: d.nombre, tipo: d.tipo, inicializador: d.cruda === null ? null : raices[siguiente++] })),
    };
  }

  private bajarCondicion(ast: NodoExpresion, clase: 'condicion-if' | 'condicion-ciclo'): CondicionIr {
    const nodo = this.reservarNodo(clase, rangoDe(ast));
    const [raiz] = this.numerarRaices(nodo, [this.bajarRaiz(ast)]);
    return { nodo, raiz };
  }

  private bajarSentencia(sentencia: NodoSentencia): SentenciaIr {
    switch (sentencia.tipo) {
      case 'bloque':
        return this.bajarBloque(sentencia);
      case 'impresion': {
        const nodo = this.reservarNodo('expresion', sentencia.rango);
        this.huboBiblioteca = false;
        const llamada = this.construirLlamada(sentencia.rango, 'PrintStream', sentencia.metodo, null, 'out', sentencia.argumento === null ? [] : [sentencia.argumento]);
        const texto = this.fuente.slice(sentencia.rango.inicio, sentencia.rango.fin).replace(/;\s*$/, '');
        const raices = this.numerarRaices(nodo, [{ expresion: llamada, texto, inicio: sentencia.rango.inicio, conBiblioteca: this.huboBiblioteca }]);
        return { forma: 'expresion', nodo, clasePaso: 'impresion', raices };
      }
      case 'sentencia-expresion':
        return this.bajarListaDeExpresiones([sentencia], sentencia.rango);
      case 'sentencia-vacia':
        return { forma: 'vacia', nodo: this.cerrarSinPlan(this.reservarNodo('vacia', sentencia.rango)) };
      case 'retorno':
        return { forma: 'return', nodo: this.cerrarSinPlan(this.reservarNodo('return', sentencia.rango)) };
      case 'break':
        return { forma: 'break', nodo: this.cerrarSinPlan(this.reservarNodo('break', sentencia.rango)) };
      case 'continue':
        return { forma: 'continue', nodo: this.cerrarSinPlan(this.reservarNodo('continue', sentencia.rango)) };
      case 'if': {
        const condicion = this.bajarCondicion(sentencia.condicion, 'condicion-if');
        const entonces = this.bajarSentencia(sentencia.entonces);
        const sino = sentencia.sino === null ? null : this.bajarSentencia(sentencia.sino);
        return { forma: 'if', condicion, entonces, sino };
      }
      case 'while': {
        const nodo = this.cerrarSinPlan(this.reservarNodo('while', sentencia.rango));
        const condicion = this.bajarCondicion(sentencia.condicion, 'condicion-ciclo');
        return { forma: 'while', nodo, condicion, cuerpo: this.bajarSentencia(sentencia.cuerpo) };
      }
      case 'do-while': {
        const nodo = this.cerrarSinPlan(this.reservarNodo('do-while', sentencia.rango));
        const cuerpo = this.bajarSentencia(sentencia.cuerpo);
        return { forma: 'do-while', nodo, cuerpo, condicion: this.bajarCondicion(sentencia.condicion, 'condicion-ciclo') };
      }
      case 'for':
        return this.bajarFor(sentencia);
      case 'switch':
        return this.bajarSwitch(sentencia);
      case 'no-soportado':
        return noDisponible('construcción fuera del subconjunto', sentencia.rango);
    }
  }

  private cerrarSinPlan(nodo: number): number {
    this.cerrarNodo(nodo, []);
    return nodo;
  }

  /** Una o varias sentencias de expresión (las del inicio o la actualización de un `for` van juntas en un solo paso). */
  private bajarListaDeExpresiones(sentencias: readonly NodoSentenciaExpresion[], rango: Rango): ExpresionSentenciaIr {
    const nodo = this.reservarNodo('expresion', rango);
    const crudas = sentencias.map((s) => this.bajarRaiz(s.expresion));
    const raices = this.numerarRaices(nodo, crudas);
    const formas = raices.map((raiz) => raiz.expresion);
    let clasePaso: ExpresionSentenciaIr['clasePaso'] = 'expresion';
    if (formas.every((e) => e.forma === 'asignacion' || e.forma === 'asignacion-compuesta' || e.forma === 'incremento')) clasePaso = 'asignacion';
    else if (formas.length === 1 && formas[0].forma === 'llamada' && formas[0].clave.startsWith('PrintStream.')) clasePaso = 'impresion';
    return { forma: 'expresion', nodo, clasePaso, raices };
  }

  private bajarFor(sentencia: NodoFor): ForIr {
    this.alcance.entrarBloque();
    const nodo = this.cerrarSinPlan(this.reservarNodo('for', sentencia.rango));
    let inicio: ForIr['inicio'] = null;
    if (sentencia.inicializacionDeclaracion !== null) inicio = this.bajarDeclaracion(sentencia.inicializacionDeclaracion);
    else if (sentencia.inicializacionExpresiones.length > 0) inicio = this.bajarListaDeExpresiones(sentencia.inicializacionExpresiones, sentencia.inicializacionExpresiones[0].rango);
    const condicion = sentencia.condicion === null ? null : this.bajarCondicion(sentencia.condicion, 'condicion-ciclo');
    const cuerpo = this.bajarSentencia(sentencia.cuerpo);
    const actualizacion = sentencia.actualizacion.length === 0 ? null : this.bajarListaDeExpresiones(sentencia.actualizacion, sentencia.actualizacion[0].rango);
    this.alcance.salirBloque();
    return { forma: 'for', nodo, inicio, condicion, actualizacion, cuerpo };
  }

  private bajarSwitch(sentencia: NodoSwitch): SwitchIr {
    const nodo = this.reservarNodo('switch', sentencia.rango);
    const [selector] = this.numerarRaices(nodo, [this.bajarRaiz(sentencia.selector)]);
    const tipoSelector = selector.expresion.tipo;
    if (tipoSelector !== 'int' && tipoSelector !== 'char' && tipoSelector !== 'String') return noDisponible('selector de switch fuera del subconjunto', sentencia.rango);
    // El bloque de un `switch` es un solo alcance (design.md §2.7).
    this.alcance.entrarBloque();
    const elementos: ElementoSwitchIr[] = [];
    for (const elemento of sentencia.elementos) {
      if (elemento.tipo === 'etiqueta-case') {
        const constante = valorSiSeSabe(valorConstante(elemento.valor, this.alcance));
        if (constante === null || (constante.tipo !== 'int' && constante.tipo !== 'char' && constante.tipo !== 'String')) return noDisponible('etiqueta de case sin valor conocido', elemento.rango);
        const etiqueta = this.cerrarSinPlan(this.reservarNodo('caso', elemento.rango));
        elementos.push({ forma: 'caso', nodo: etiqueta, valor: constante.valor, texto: this.fuente.slice(elemento.valor.rango.inicio, elemento.valor.rango.fin) });
      } else if (elemento.tipo === 'etiqueta-default') {
        elementos.push({ forma: 'defecto', nodo: this.cerrarSinPlan(this.reservarNodo('defecto', elemento.rango)) });
      } else {
        elementos.push({ forma: 'sentencia', sentencia: this.bajarElemento(elemento) });
      }
    }
    this.alcance.salirBloque();
    return { forma: 'switch', nodo, selector, tipoSelector, elementos };
  }

  // --- Expresiones -----------------------------------------------------------------------------------------------------------

  private constante(tipo: TipoIr, valor: number | bigint | boolean | string, rango: Rango): ExpresionIr {
    return { forma: 'constante', tipo, punto: -1, rango, valor };
  }

  /** `expresion` convertida a `a` con una conversión implícita visible; la misma expresión si ya es de ese tipo. */
  private convertir(expresion: ExpresionIr, a: TipoNumericoIr, implicita: boolean): ExpresionIr {
    if (expresion.tipo === a || !esNumerico(expresion.tipo)) return expresion;
    return { forma: 'conversion', tipo: a, de: expresion.tipo, punto: -1, rango: expresion.rango, operando: expresion, implicita };
  }

  /** Conversión de asignación (JLS 5.2): ensanchamiento, o estrechamiento de una constante `int` a `char`. */
  private convertirAsignacion(expresion: ExpresionIr, destino: TipoIr): ExpresionIr {
    return esNumerico(destino) ? this.convertir(expresion, destino, true) : expresion;
  }

  private bajar(nodo: NodoExpresion): ExpresionIr {
    const rango = rangoDe(nodo);
    // Una expresión constante de texto (`"ho" + "la"`, `P + "b"` con `final String P = "a"`) es UN valor internado (JLS 15.29): por eso `"ho" + "la" == "hola"` es true.
    if ((nodo.tipo === 'binaria' || nodo.tipo === 'nombre' || nodo.tipo === 'conversion') && tipoDeExpresion(nodo, this.alcance) === 'String') {
      const constante = valorSiSeSabe(valorConstante(nodo, this.alcance));
      if (constante !== null && constante.tipo === 'String') return this.constante('String', constante.valor, rango);
    }
    switch (nodo.tipo) {
      case 'literal-entero':
        return this.constante('int', Number(BigInt.asIntN(32, nodo.valor)), rango);
      case 'literal-largo':
        return this.constante('long', BigInt.asIntN(64, nodo.valor), rango);
      case 'literal-doble':
        return this.constante('double', nodo.valor, rango);
      case 'literal-caracter':
        return this.constante('char', caracterDeLiteral(nodo.valor), rango);
      case 'literal-cadena':
        return this.constante('String', nodo.valor, rango);
      case 'literal-booleano':
        return this.constante('boolean', nodo.valor, rango);
      case 'nombre':
        return this.bajarLectura(nodo.nombre, rango);
      case 'binaria':
        return this.bajarBinaria(nodo, rango);
      case 'unaria':
        return this.bajarUnaria(nodo, rango);
      case 'asignacion':
        return this.bajarAsignacion(nodo, rango);
      case 'incremento-decremento': {
        const lectura = this.bajarLectura(this.nombreDeLocal(nodo.operando, rango), rango);
        if (lectura.tipo !== 'int' && lectura.tipo !== 'long' && lectura.tipo !== 'double' && lectura.tipo !== 'char') return noDisponible('incremento de un tipo fuera del subconjunto', rango);
        return {
          forma: 'incremento',
          tipo: lectura.tipo,
          punto: -1,
          rango,
          ranura: lectura.ranura,
          nombre: lectura.nombre,
          delta: nodo.operador === '++' ? 1 : -1,
          posicion: nodo.posicion,
        };
      }
      case 'llamada':
        return this.bajarLlamada(nodo, rango);
      case 'acceso-miembro': {
        if (nodo.objeto.tipo === 'nombre' && esNombreDeClaseDelCatalogo(nodo.objeto, this.alcance)) {
          const campo = CAMPOS_CONSTANTES.get(`${nodo.objeto.nombre}.${nodo.miembro}`);
          if (campo !== undefined) return this.constante(campo.tipo, campo.valor, rango);
        }
        return noDisponible('campo de la biblioteca fuera del subconjunto', rango);
      }
      case 'nueva-instancia':
        return this.bajarNuevo(nodo, rango);
      case 'conversion': {
        const destino = tipoDeTipo(tipoDeNombreDeTipo(nodo.nombreTipo), rango);
        const operando = this.bajar(nodo.operando);
        // Un cast a un tipo de referencia o booleano, o al mismo tipo, no cambia nada (el compilador solo lo acepta entre iguales); entre numéricos es un nodo explícito.
        if (esNumerico(destino) && esNumerico(operando.tipo)) return this.convertir(operando, destino, false);
        return operando;
      }
      case 'expresion-no-soportada':
        return noDisponible('expresión fuera del subconjunto', rango);
    }
  }

  private nombreDeLocal(expresion: NodoExpresion, rango: Rango): string {
    if (expresion.tipo !== 'nombre') return noDisponible('el objetivo de una asignación debe ser una variable', rango);
    return expresion.nombre;
  }

  private simboloDe(nombre: string, rango: Rango): { simbolo: SimboloVariable; ranura: number } {
    const simbolo = this.alcance.buscar(nombre);
    const ranura = simbolo === null ? undefined : this.ranuraDe.get(simbolo);
    if (simbolo === null || ranura === undefined) return noDisponible(`"${nombre}" no es una variable local`, rango);
    return { simbolo, ranura };
  }

  private bajarLectura(nombre: string, rango: Rango): LecturaIr {
    const { simbolo, ranura } = this.simboloDe(nombre, rango);
    return { forma: 'lectura', tipo: tipoDeTipo(tipoDeNombreDeTipo(simbolo.tipo), rango), punto: -1, rango, ranura, nombre };
  }

  private bajarBinaria(nodo: Extract<NodoExpresion, { tipo: 'binaria' }>, rango: Rango): ExpresionIr {
    const izquierda = this.bajar(nodo.izquierda);
    const derecha = this.bajar(nodo.derecha);
    const operador = nodo.operador;
    if (operador === '&&' || operador === '||') {
      return { forma: 'logica', tipo: 'boolean', operador, punto: -1, rango, izquierda, derecha };
    }
    if (operador === '==' || operador === '!=' || operador === '<' || operador === '>' || operador === '<=' || operador === '>=') {
      return this.bajarComparacion(operador, izquierda, derecha, rango);
    }
    if (operador === '+' && (izquierda.tipo === 'String' || derecha.tipo === 'String')) {
      this.exigirTextoDeJava(izquierda, rango);
      this.exigirTextoDeJava(derecha, rango);
      return { forma: 'concatenacion', tipo: 'String', punto: -1, rango, izquierda, derecha };
    }
    if (operador !== '+' && operador !== '-' && operador !== '*' && operador !== '/' && operador !== '%') return noDisponible(`operador "${operador}" fuera del subconjunto`, rango);
    if (!esNumerico(izquierda.tipo) || !esNumerico(derecha.tipo)) return noDisponible('operandos no numéricos', rango);
    const tipo = promocionBinaria(izquierda.tipo, derecha.tipo);
    const aritmetica: AritmeticaIr = {
      forma: 'aritmetica',
      tipo,
      operador: operador as OperadorAritmeticoIr,
      punto: -1,
      rango,
      izquierda: this.convertir(izquierda, tipo, true),
      derecha: this.convertir(derecha, tipo, true),
    };
    return aritmetica;
  }

  /** `String.valueOf` de un `Scanner` o un `Random` (su `toString` de Java, con dirección y estado) no se modela: no se ejecuta (D2). */
  private exigirTextoDeJava(operando: ExpresionIr, rango: Rango): void {
    if (operando.tipo === 'Scanner' || operando.tipo === 'Random') noDisponible('el texto de un objeto de la biblioteca', rango);
  }

  private bajarComparacion(operador: OperadorComparacionIr, izquierda: ExpresionIr, derecha: ExpresionIr, rango: Rango): ExpresionIr {
    if (esNumerico(izquierda.tipo) && esNumerico(derecha.tipo)) {
      const tipoOperandos = promocionBinaria(izquierda.tipo, derecha.tipo);
      return {
        forma: 'comparacion',
        tipo: 'boolean',
        operador,
        tipoOperandos,
        punto: -1,
        rango,
        izquierda: this.convertir(izquierda, tipoOperandos, true),
        derecha: this.convertir(derecha, tipoOperandos, true),
      };
    }
    const tipoOperandos = izquierda.tipo === 'boolean' ? 'boolean' : 'referencia';
    return { forma: 'comparacion', tipo: 'boolean', operador, tipoOperandos, punto: -1, rango, izquierda, derecha };
  }

  private bajarUnaria(nodo: Extract<NodoExpresion, { tipo: 'unaria' }>, rango: Rango): ExpresionIr {
    const operando = this.bajar(nodo.operando);
    if (nodo.operador === '!') return { forma: 'negacion', tipo: 'boolean', punto: -1, rango, operando };
    if (!esNumerico(operando.tipo)) return noDisponible('operando no numérico', rango);
    // Promoción numérica unaria (JLS 5.6.1): un `char` se vuelve `int`; el resto conserva su tipo.
    const tipo = operando.tipo === 'char' ? 'int' : operando.tipo;
    const promovido = this.convertir(operando, tipo, true);
    if (nodo.operador === '+') return promovido;
    return { forma: 'menos', tipo, punto: -1, rango, operando: promovido };
  }

  private bajarAsignacion(nodo: Extract<NodoExpresion, { tipo: 'asignacion' }>, rango: Rango): ExpresionIr {
    const nombre = this.nombreDeLocal(nodo.objetivo, rango);
    const lectura = this.bajarLectura(nombre, nodo.objetivo.rango);
    const valor = this.bajar(nodo.valor);
    if (nodo.operador === '=') {
      return { forma: 'asignacion', tipo: lectura.tipo, punto: -1, rango, ranura: lectura.ranura, nombre, valor: this.convertirAsignacion(valor, lectura.tipo) };
    }
    const operador = nodo.operador.slice(0, -1) as OperadorAritmeticoIr;
    if (lectura.tipo === 'String') {
      this.exigirTextoDeJava(valor, rango);
      return { forma: 'asignacion-compuesta', tipo: 'String', punto: -1, rango, ranura: lectura.ranura, nombre, operador, tipoOperacion: 'String', lectura, valor };
    }
    if (!esNumerico(lectura.tipo) || !esNumerico(valor.tipo)) return noDisponible('asignación compuesta fuera del subconjunto', rango);
    const tipoOperacion = promocionBinaria(lectura.tipo, valor.tipo);
    return {
      forma: 'asignacion-compuesta',
      tipo: lectura.tipo,
      punto: -1,
      rango,
      ranura: lectura.ranura,
      nombre,
      operador,
      tipoOperacion,
      lectura,
      valor: this.convertir(valor, tipoOperacion, true),
    };
  }

  // --- Biblioteca -------------------------------------------------------------------------------------------------------------

  private bajarLlamada(nodo: NodoLlamada, rango: Rango): ExpresionIr {
    const callee = nodo.callee;
    if (callee.tipo !== 'acceso-miembro') return noDisponible('llamada a un método propio', rango);
    const objeto = callee.objeto;
    if (campoReflejadoDeSystem(objeto, this.alcance) === 'java.io.PrintStream') {
      const flujo = objeto.tipo === 'acceso-miembro' && objeto.miembro === 'err' ? 'err' : 'out';
      return this.construirLlamada(rango, 'PrintStream', callee.miembro, null, flujo, nodo.argumentos);
    }
    if (objeto.tipo === 'nombre' && esNombreDeClaseDelCatalogo(objeto, this.alcance)) {
      return this.construirLlamada(rango, objeto.nombre, callee.miembro, null, null, nodo.argumentos);
    }
    const clase = claseDelObjeto(objeto, this.alcance);
    if (clase === null) return noDisponible('receptor fuera del subconjunto', rango);
    return this.construirLlamada(rango, clase, callee.miembro, this.bajar(objeto), null, nodo.argumentos);
  }

  private construirLlamada(
    rango: Rango,
    clase: string,
    miembro: string,
    receptor: ExpresionIr | null,
    flujo: 'out' | 'err' | null,
    argumentosAst: readonly NodoExpresion[],
  ): LlamadaIr {
    const firma = resolverSobrecarga(clase, miembro, argumentosAst.map((argumento) => argumentoDeSobrecarga(argumento, this.alcance)));
    if (firma === null) return noDisponible(`sin firma para ${clase}.${miembro}`, rango);
    const clave = claveDeFirma(firma);
    const esNativa = CLAVES_NATIVAS.has(clave);
    if (!esNativa && !this.puerto.operaciones.has(clave)) return noDisponible(`la biblioteca no sabe ejecutar ${clave}`, rango);
    if (!esNativa) this.huboBiblioteca = true;
    const bajados = argumentosAst.map((argumento) => this.bajar(argumento));
    const fijos = firma.esVarargs ? firma.parametros.length - 1 : firma.parametros.length;
    return {
      forma: 'llamada',
      tipo: tipoDeRetorno(firma.retorno),
      punto: -1,
      rango,
      clave,
      receptor,
      flujo,
      argumentos: bajados.slice(0, fijos).map((argumento, indice) => this.adaptarArgumento(argumento, firma.parametros[indice], rango)),
      variables: firma.esVarargs ? bajados.slice(fijos) : null,
      esNativa,
    };
  }

  /** Lleva un argumento al tipo del parámetro de la firma resuelta (ensanchamiento numérico); lo que el subconjunto no modela (`float`, `Object` con un primitivo) no se ejecuta. */
  private adaptarArgumento(argumento: ExpresionIr, parametro: string, rango: Rango): ExpresionIr {
    switch (parametro) {
      case 'int':
      case 'long':
      case 'double':
      case 'char':
        return this.convertir(argumento, parametro, true);
      case 'boolean':
      case 'java.lang.String':
      case 'java.util.Random':
      case 'java.util.Scanner':
        return argumento;
      case 'java.lang.CharSequence':
        // Un `String` es una `CharSequence` (ensanchamiento de referencia, JLS 5.1.5): se pasa tal cual.
        if (argumento.tipo === 'String') return argumento;
        return noDisponible('una CharSequence que no es un String', rango);
      case 'java.lang.Object':
        if (argumento.tipo === 'String' || argumento.tipo === 'Scanner' || argumento.tipo === 'Random') return argumento;
        return noDisponible('un primitivo como Object', rango);
      default:
        return noDisponible(`parámetro ${parametro} fuera del subconjunto`, rango);
    }
  }

  private bajarNuevo(nodo: NodoNuevaInstancia, rango: Rango): ExpresionIr {
    const tipo = tipoDeTipo(tipoDeNombreDeTipo(nodo.nombreTipo), rango);
    const firma = resolverSobrecarga(nodo.nombreTipo, '<init>', nodo.argumentos.map((argumento) => argumentoDeSobrecarga(argumento, this.alcance)));
    if (firma === null) return noDisponible(`sin constructor para ${nodo.nombreTipo}`, rango);
    const clave = claveDeFirma(firma);
    if (!this.puerto.operaciones.has(clave)) return noDisponible(`la biblioteca no sabe ejecutar ${clave}`, rango);
    this.huboBiblioteca = true;
    // `new Scanner(System.in)`: el `System.in` ya lo dice la clave del constructor; no queda como argumento.
    const argumentos = nodo.argumentos.flatMap((argumento, indice) =>
      campoReflejadoDeSystem(argumento, this.alcance) === 'java.io.InputStream' ? [] : [this.adaptarArgumento(this.bajar(argumento), firma.parametros[indice], rango)],
    );
    return { forma: 'nuevo', tipo, punto: -1, rango, clave, argumentos };
  }
}
