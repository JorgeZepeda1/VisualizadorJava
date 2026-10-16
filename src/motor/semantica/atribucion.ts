// Pasada de atribución (tarea 1.7, ADR 004 pasada 2): símbolos, alcance/sombreado (REQ-COMP-002/
// 003), selector de `switch` y — pendiente heredado del sub-lote 1-B — contexto de `break`/
// `continue` (verificado contra javac 17 real esta sesión: AMBOS viven en la MISMA pasada que un
// error de tipos, no en alcanzabilidad — ver engram `sdd/visualizador-java/apply-progress`).
//
// Tarea 1.32 (familias de atribución que encontró el generador diferencial de la 1.31, JLS 5.5/15.11/15.12/6.3/6.5.2): casts que Java
// no permite, un miembro pedido a un valor primitivo o a una llamada `void`, `final` modificada con `++`/`--`, un método de instancia
// llamado con el nombre de la clase, `Scanner`/`Random` sin `import` como receptor o como tipo de un cast, y el alcance de una variable
// en su propio inicializador. Un tipo o una clase que el subconjunto no simula (`Long m = 0;`) es un AVISO, nunca una regla de javac
// modelada a medias (D2).
//
// Recorre TODO el árbol (nunca se detiene en el primer problema, igual que `recolectarNoSoportados`
// en 1.6/1.17) y devuelve la lista COMPLETA ordenada por posición en el texto; quien la conecte a
// `compilador.ts` (tarea 1.14) decide quedarse solo con el primero, siguiendo ADR 004.
import type {
  NodoAccesoMiembro,
  NodoAsignacion,
  NodoBloque,
  NodoConversion,
  NodoDeclaracionLocal,
  NodoElementoBloque,
  NodoElementoSwitch,
  NodoExpresion,
  NodoFor,
  NodoIncrementoDecremento,
  NodoLlamada,
  NodoNombre,
  NodoNuevaInstancia,
  NodoPrograma,
  NodoSentencia,
  NodoSwitch,
  NodoUnaria,
} from '../sintaxis/ast.ts';
import type { Rango } from '../fuente/rango.ts';
import { CODIGOS_NO_SOPORTADO } from '../sintaxis/no-soportado.ts';
import { Alcance } from './alcance.ts';
import { construirAmbito, type AmbitoDeNombres } from './ambito-de-nombres.ts';
import { CONSTRUCTORES_SOPORTADOS, clasificarCampo, clasificarMetodo } from './catalogo-api.ts';
import { claseQueChocaComoPaquete, clasesDelPaquete, existeClaseDelJdk, existePaqueteOTipoDelJdk } from './catalogo-clases.ts';
import { constanteDeVariable, valorConstante, valorSiSeSabe } from './constantes.ts';
import type { ProblemaAtribucion } from './diagnostico.ts';
import { esPaqueteReservadoPorJava } from './paquete-del-lanzador.ts';
import { resolverSobrecarga } from './sobrecargas.ts';
import { verificarEtiquetasDeCase, verificarSelectorDeSwitch } from './switch.ts';
import {
  argumentoDeSobrecarga,
  campoReflejadoDeSystem,
  claseDelObjeto,
  esCastPermitido,
  esNombreDeClaseDelCatalogo,
  esLlamadaDeTipoNoModelado,
  esLlamadaSinValor,
  esTipoPrimitivo,
  NOMBRES_DE_CLASE_RECONOCIDOS,
  nombreDeArgumentoParaMostrar,
  tipoDeExpresion,
  tipoDeNombreDeTipo,
  tipoDeOperadorAritmetico,
  type Tipo,
} from './tipos.ts';
import {
  CLASES_QUE_REQUIEREN_IMPORT,
  codigoDeAsignacionInvalida,
  esAsignable,
  esConvertibleImplicitamenteEnAsignacionCompuesta,
  nombreDeClaseImportadaEsValido,
  operandoNoEsVariableValida,
  operandosValidosParaAritmetica,
  operandoValidoParaIncrementoDecremento,
  operandoValidoParaUnario,
  resultadoNombreDeTipo,
  sugerenciaDeMayuscula,
  tiposComparablesConIgualdad,
} from './verificaciones-de-tipo.ts';

/** `enCiclo`: hay al menos un `while`/`do-while`/`for` envolvente (destino real de `continue`,
 * que ATRAVIESA cualquier `switch` intermedio — verificado contra javac). `enCicloOSwitch`: además
 * cuenta un `switch` envolvente (destino real de `break`, JLS 14.15/14.21). */
interface ContextoFlujo {
  readonly enCiclo: boolean;
  readonly enCicloOSwitch: boolean;
}

const CONTEXTO_INICIAL: ContextoFlujo = { enCiclo: false, enCicloOSwitch: false };
const CONTEXTO_DENTRO_DE_CICLO: ContextoFlujo = { enCiclo: true, enCicloOSwitch: true };

/** El tipo del parámetro de `main` (`String[] args`, `String... args`, `String args[]`: los tres son un arreglo de `String`). */
const TIPO_DEL_PARAMETRO_DE_MAIN = 'String[]';

export function atribuir(programa: NodoPrograma): ProblemaAtribucion[] {
  const problemas: ProblemaAtribucion[] = [];
  // Tarea 1.36 (C-3, JLS 7.4.1): el `package` va primero, como en javac (lo declara la fase que entra las clases, antes de resolver los tipos): `package java.util;` es «package exists in
  // another module», y `package java.lang.String;` choca con una clase. Un `package` normal (`miproyecto;`, el de NetBeans) sigue sin problemas.
  if (programa.paquete !== null) {
    const { nombre, rango } = programa.paquete;
    // Tarea 1.37 (C-6, `pkg.clashes.with.class.of.same.name`): el nombre del paquete (o un prefijo suyo) es el de una clase que el compilador ya conoce al leer el `package` —todo `java.lang`, público o
    // no, y las pocas que javac crea de antemano—: error modelado, la lista sale del oráculo. Va DESPUÉS de `package.in.other.module`, como en javac (esa se informa al entrar las clases).
    const claseQueChoca = claseQueChocaComoPaquete(nombre);
    if (clasesDelPaquete(nombre).size > 0) {
      problemas.push({ codigo: 'paquete-del-jdk', rango, datos: { nombre } });
    } else if (claseQueChoca !== null) {
      problemas.push({ codigo: 'paquete-con-nombre-de-clase', rango, datos: { nombre, clase: claseQueChoca } });
    } else if (existeClaseDelJdk(nombre) && !esPaqueteReservadoPorJava(nombre)) {
      // Una clase pública FUERA de `java` que el compilador aún NO conoce al leer el `package` (`javax.swing.JFrame`): javac la compila y el JDK real la ejecuta, pero el visualizador no comprueba los paquetes que
      // se llaman como una clase: aviso conservador (tarea 1.36). Las de DENTRO de `java` (`java.util.Map`) no pasan por aquí: el lanzador no arranca nada que esté en `java`, y eso lo avisa
      // `verificarPaqueteDelLanzador` (tarea 1.38) con su razón exacta, cuando las pasadas de javac ya aceptaron el programa.
      problemas.push({ codigo: CODIGOS_NO_SOPORTADO.paqueteConNombreDeClase, categoria: 'no-disponible', rango, datos: { nombre } });
    }
  }
  // Tarea 1.21 (sub-lote 1-D4, REQ-SUB-001): los imports existen y se validan SIN IMPORTAR si hay
  // "main" o no (a diferencia del resto de esta pasada, que necesita un cuerpo que recorrer) --
  // verificado contra javac 17 real: un import roto se rechaza aunque la clase no tenga "main".
  // ANTES del corte de "sin main" de abajo, nunca después.
  for (const importacion of programa.importaciones) {
    // Tarea 1.34 (C, JLS 7.5.1): un `import` de UN solo tipo cuyo nombre simple es el de la clase del archivo es un error («Scanner is already defined in this
    // compilation unit»), señalado en el `import`. Con comodín no choca: la clase del archivo tapa a las importadas bajo demanda. Solo si el import existe: uno que
    // no existe ya es `importacion-no-reconocida` (javac reporta ese primero).
    if (!importacion.comodin && nombreSimpleDeLaImportacion(importacion.nombre) === programa.clase.nombre && existeClaseDelJdk(importacion.nombre)) {
      problemas.push({ codigo: 'clase-repetida-con-import', rango: importacion.rango, datos: { nombre: programa.clase.nombre, importacion: importacion.nombre } });
      continue;
    }
    if (importacion.comodin) {
      // Tarea 1.35 (JLS 7.5.2, SUGGESTION-3 de la re-verificación): `import paquete.*;` solo vale si el paquete existe (o es un tipo, y se importan sus miembros). Antes nunca se
      // validaba: `import java.sqrt.*;` terminaba en `ok` y, con un uso de `Scanner` más abajo, en el error del USO y no en la línea del `import` (javac: «package java.sqrt does not exist»).
      if (!existePaqueteOTipoDelJdk(importacion.nombre)) {
        problemas.push({ codigo: 'importacion-no-reconocida', rango: importacion.rango, datos: { nombre: `${importacion.nombre}.*` } });
      }
      continue;
    }
    if (nombreDeClaseImportadaEsValido(importacion.nombre)) continue;
    if (existeClaseDelJdk(importacion.nombre)) {
      // Tarea 1.29 (design.md §2.3: «clase existente no soportada → NO-DISP; inexistente → error»):
      // `java.util.Locale`, `javax.swing.JOptionPane`… existen y javac los compila — un aviso, nunca
      // el «no reconozco» de un nombre mal escrito.
      problemas.push({
        codigo: CODIGOS_NO_SOPORTADO.claseNoSoportada,
        categoria: 'no-disponible',
        rango: importacion.rango,
        datos: { nombre: importacion.nombre },
      });
      continue;
    }
    problemas.push({ codigo: 'importacion-no-reconocida', rango: importacion.rango, datos: { nombre: importacion.nombre } });
  }
  // Tarea 1.15 (REQ-COMP-008): sin "main" no hay cuerpo que recorrer -- nada MÁS que reportar aquí
  // (el error real es de ARRANQUE, pasada 5, no de atribución).
  if (programa.clase.main === null) return problemas.slice().sort((a, b) => a.rango.inicio - b.rango.inicio);
  // Tarea 1.34 (C, JLS 6.4.1): la clase del programa es un tipo propio que tapa a los del JDK de igual nombre (`public class Math`).
  const alcance = new Alcance(new Set([programa.clase.nombre]));
  const ambito = construirAmbito(programa);
  alcance.entrarBloque();
  // El parámetro de main vive en el alcance para que usarlo no dé "variable no declarada";
  // indexarlo ([]) es NO-DISP (arreglos, REQ-SUB-007), ajeno a esta pasada.
  // Tarea 1.34 (cierre por defecto): su tipo es el de un ARREGLO (`String[]`), fuera del subconjunto — `tipoDeNombreDeTipo` lo sigue dando por «desconocido» (el
  // sumidero de cascada de siempre), pero ahora se sabe POR QUÉ: usar `args` como valor (`args.length()`, `int n = args;`) es el aviso de arreglo, no un «sí».
  alcance.declarar({
    nombre: programa.clase.main.parametro,
    tipo: TIPO_DEL_PARAMETRO_DE_MAIN,
    esFinal: false,
    rango: programa.clase.main.rango,
  });
  visitarBloque(programa.clase.main.cuerpo, alcance, ambito, CONTEXTO_INICIAL, problemas);
  alcance.salirBloque();
  return problemas.slice().sort((a, b) => a.rango.inicio - b.rango.inicio);
}

/** `java.util.Map.Entry` → `Entry`: el nombre simple con el que un `import` de un solo tipo deja ver a su clase (JLS 7.5.1). */
function nombreSimpleDeLaImportacion(nombre: string): string {
  return nombre.slice(nombre.lastIndexOf('.') + 1);
}

function visitarBloque(
  bloque: NodoBloque,
  alcance: Alcance,
  ambito: AmbitoDeNombres,
  contexto: ContextoFlujo,
  problemas: ProblemaAtribucion[],
): void {
  alcance.entrarBloque();
  for (const elemento of bloque.elementos) visitarElementoBloque(elemento, alcance, ambito, contexto, problemas);
  alcance.salirBloque();
}

function visitarElementoBloque(
  elemento: NodoElementoBloque,
  alcance: Alcance,
  ambito: AmbitoDeNombres,
  contexto: ContextoFlujo,
  problemas: ProblemaAtribucion[],
): void {
  if (elemento.tipo === 'declaracion-local') {
    visitarDeclaracionLocal(elemento, alcance, ambito, problemas);
    return;
  }
  visitarSentencia(elemento, alcance, ambito, contexto, problemas);
}

function visitarDeclaracionLocal(
  declaracion: NodoDeclaracionLocal,
  alcance: Alcance,
  ambito: AmbitoDeNombres,
  problemas: ProblemaAtribucion[],
): void {
  // err18/err20 de exploracion/03 ("string nombre" en minúscula / "Scanner" sin import): el nombre
  // de tipo se valida UNA vez por declaración (no por declarador) — javac lo hace en el mismo
  // punto. "tipo-no-reconocido" (genuinamente desconocido) y "tipo-requiere-import" (real, de
  // java.util, sin importar) son códigos DISTINTOS — nunca el mismo mensaje para los dos casos.
  const problemaDelTipo = problemaDeNombreDeTipo(declaracion.nombreTipo, declaracion.rango, ambito);
  if (problemaDelTipo !== null) problemas.push(problemaDelTipo);
  // Corrección obligatoria (sub-lote 1-D2c): descubierta al conectar la biblioteca real —
  // `alcance.declarar` guardaba SIEMPRE `declaracion.nombreTipo` tal cual, incluso cuando el tipo
  // NO se reconoció de verdad ("tipo-no-reconocido"/"tipo-requiere-import" arriba). Antes era
  // inofensivo (nada más miraba el tipo guardado), pero ahora que `visitarLlamadaDeMiembro`/
  // `visitarAccesoMiembro` SÍ lo consultan para resolver miembros reales, "Scanner sc = ...;" SIN
  // import producía un SEGUNDO problema (NO-DISP para "sc.hasNextInt()") además del real
  // ("tipo-requiere-import") -- verificado contra javac 17 real: con el import faltante, javac
  // NUNCA llega a resolver el miembro (cascada suprimida en su propio recovery, D2 nunca fue tan
  // permisivo). "desconocido" (el mismo sumidero de cascada de siempre) hace que cualquier uso
  // posterior de la variable no dispare ningún problema adicional por esta misma causa.
  const tipoDelSimbolo = problemaDelTipo === null ? declaracion.nombreTipo : 'desconocido';
  for (const declarador of declaracion.declaradores) {
    // Comparte el plegado (REFACTOR de la tarea 1.10) con la verificación de asignación DE ABAJO
    // Y con el campo "constante" del símbolo (deuda 3 del commit 999a8ca, JLS 4.12.4).
    const valorInicializador = declarador.inicializador !== null ? valorConstante(declarador.inicializador, alcance) : null;
    // Deuda 3 del commit 999a8ca (JLS 4.12.4): una local "final" con inicializador CONSTANTE es
    // una VARIABLE CONSTANTE -- participa en expresiones constantes (etiquetas de "case",
    // alcanzabilidad, internado de String). `undefined` si no aplica (no es "final", o el
    // inicializador no es constante) -- `valorConstante` ya sabe leerlo de vuelta (constantes.ts).
    // Tarea 1.35 (JLS 4.12.4 y 5.2): el valor se guarda convertido al tipo DECLARADO (`final int A = 'a'` guarda el `int` 97), no tal cual salió del inicializador.
    const constante = declaracion.esFinal ? constanteDeVariable(declaracion.nombreTipo, valorInicializador) : undefined;
    // Tarea 1.32 (N6, JLS 6.3): «el alcance de una variable local empieza en SU PROPIO inicializador» — se declara ANTES de visitarlo.
    // Así `Scanner System = new Scanner(System.in);` ve la variable `System` (JLS 6.5.2: una variable en alcance se clasifica como
    // expresión antes que como tipo), `int y = (y = 5) + 1;` es válido y `int x = x + 1;` deja de ser «no existe la variable x»
    // (es «podría no tener un valor», de la pasada de asignación definitiva). Antes se declaraba DESPUÉS del inicializador.
    const resultado = alcance.declarar({
      nombre: declarador.nombre,
      tipo: tipoDelSimbolo,
      esFinal: declaracion.esFinal,
      rango: declarador.rango,
      constante,
    });
    if (!resultado.ok) {
      problemas.push({
        codigo: 'variable-ya-definida',
        rango: declarador.rango,
        datos: { nombre: declarador.nombre, rangoExistente: resultado.existente.rango },
      });
    }
    if (declarador.inicializador !== null) {
      // Tarea 1.34: si el TIPO declarado ya dio su problema (`PrintStream p = System.out;` sin `import`), el valor que se le asigna es de un tipo que no se sabe
      // y que ya no importa: lo decide ese problema. Se visita como valor (`void`, símbolos…) pero sin el cierre por defecto: sería una cascada.
      const antes = problemas.length;
      visitarExpresion(declarador.inicializador, alcance, ambito, problemas);
      if (!verificarQueTengaValor(declarador.inicializador, alcance, problemas) && problemaDelTipo === null) {
        cerrarSiNoSeSabeSuTipo(declarador.inicializador, alcance, problemas, antes);
      }
      // err04/err12 de exploracion/03 (JLS 5.2): solo si el TIPO de destino se reconoce (si no,
      // ya se reportó un problema arriba — nunca dos problemas por la misma causa).
      const destino = tipoDeNombreDeTipo(declaracion.nombreTipo);
      const origen = tipoDeExpresion(declarador.inicializador, alcance);
      if (destino !== 'desconocido' && !esAsignable(origen, destino, valorSiSeSabe(valorInicializador))) {
        problemas.push({
          codigo: codigoDeAsignacionInvalida(origen, destino),
          rango: declarador.inicializador.rango,
          datos: { origen, destino },
        });
      }
    }
  }
}

function visitarSentencia(
  sentencia: NodoSentencia,
  alcance: Alcance,
  ambito: AmbitoDeNombres,
  contexto: ContextoFlujo,
  problemas: ProblemaAtribucion[],
): void {
  switch (sentencia.tipo) {
    case 'bloque':
      visitarBloque(sentencia, alcance, ambito, contexto, problemas);
      return;
    case 'impresion':
      verificarSystemNoTapada(sentencia.rango, alcance, problemas);
      // Corrección obligatoria (sub-lote 1-C2): "println()" sin argumentos tiene `argumento:null`
      // (nunca hay símbolos que resolver en ese caso).
      if (sentencia.argumento !== null) visitarValor(sentencia.argumento, alcance, ambito, problemas);
      return;
    case 'retorno':
      // Tarea 1.33 (WARNING-2, `Attr.visitReturn`): `main` es `void`, así que un `return` con valor es «incompatible types: unexpected return value»,
      // señalado en la EXPRESIÓN. javac lo reporta primero y luego atribuye la expresión (sus propios errores vienen después, y en la misma posición
      // javac ya no repite ninguno): `return sinDeclarar;` da UN error, el del `return`.
      if (sentencia.valor !== null) {
        problemas.push({ codigo: 'retorno-con-valor', rango: sentencia.valor.rango, datos: {} });
        visitarValor(sentencia.valor, alcance, ambito, problemas);
      }
      return;
    case 'sentencia-vacia':
    case 'no-soportado':
      return;
    case 'sentencia-expresion':
      visitarExpresion(sentencia.expresion, alcance, ambito, problemas);
      return;
    case 'if':
      visitarValor(sentencia.condicion, alcance, ambito, problemas);
      verificarCondicionBooleana(sentencia.condicion, alcance, problemas);
      visitarSentencia(sentencia.entonces, alcance, ambito, contexto, problemas);
      if (sentencia.sino !== null) visitarSentencia(sentencia.sino, alcance, ambito, contexto, problemas);
      return;
    case 'while':
      visitarValor(sentencia.condicion, alcance, ambito, problemas);
      verificarCondicionBooleana(sentencia.condicion, alcance, problemas);
      visitarSentencia(sentencia.cuerpo, alcance, ambito, CONTEXTO_DENTRO_DE_CICLO, problemas);
      return;
    case 'do-while':
      visitarSentencia(sentencia.cuerpo, alcance, ambito, CONTEXTO_DENTRO_DE_CICLO, problemas);
      visitarValor(sentencia.condicion, alcance, ambito, problemas);
      verificarCondicionBooleana(sentencia.condicion, alcance, problemas);
      return;
    case 'for':
      visitarFor(sentencia, alcance, ambito, problemas);
      return;
    case 'switch':
      visitarSwitch(sentencia, alcance, ambito, contexto, problemas);
      return;
    case 'break':
      if (!contexto.enCicloOSwitch) {
        problemas.push({ codigo: 'break-fuera-de-contexto', rango: sentencia.rango, datos: {} });
      }
      return;
    case 'continue':
      if (!contexto.enCiclo) {
        problemas.push({ codigo: 'continue-fuera-de-contexto', rango: sentencia.rango, datos: {} });
      }
      return;
  }
}

/**
 * Tarea 1.29: el receptor de `objeto.miembro` / `objeto.metodo(...)`. Además de una expresión normal
 * puede ser el NOMBRE de una clase real del JDK que el programa ve (`Boolean.parseBoolean(...)`,
 * `Locale.US`, JLS 6.5.2: un nombre simple que no es una variable puede ser un tipo) — un aviso, no un
 * error. SOLO aquí, como qualifier: un nombre de clase suelto como VALOR (`int y = Boolean;`,
 * `x = MiClase;`) sigue siendo «cannot find symbol: variable» en javac (`visitarNombreComoValor` lo
 * reporta). Una VARIABLE con el mismo nombre oculta a la clase (JLS 6.4.2), y las clases del catálogo ya
 * se resuelven más abajo (`claseDelObjeto`).
 *
 * La clase del PROPIO programa es receptor válido solo para su `main` (`Bienvenida.main(args)`,
 * recursión: REQ-SUB-007): sin otros miembros (con ellos, el aviso de sintaxis se reportó antes que
 * esta pasada) `Bienvenida.out` es un error de javac — los mutantes de C7 lo comprobaron: 29 que
 * cambian `System` por el nombre de la clase daban «no disponible» en vez de «cannot find symbol».
 *
 * Tarea 1.32: devuelve `false` cuando el receptor YA produjo su propio problema (un `import` que falta, una clase real fuera del
 * subconjunto, un nombre completo) y por tanto no hay miembro que resolver; `true` cuando la resolución del miembro puede seguir.
 */
function visitarReceptor(
  objeto: NodoExpresion,
  miembro: string,
  comoLlamada: boolean,
  alcance: Alcance,
  ambito: AmbitoDeNombres,
  problemas: ProblemaAtribucion[],
): boolean {
  // Tarea 1.32 (N5, JLS 6.5.2): el NOMBRE de una clase del catálogo (`Math`, `String`, `Scanner`…) que ninguna variable tapa es una
  // referencia estática. `Scanner` y `Random` (java.util) solo existen para el programa con su `import`: sin él javac dice «cannot
  // find symbol» y el miembro ni se busca (ni un método de instancia, F6, ni uno que no existe).
  if (objeto.tipo === 'nombre' && esNombreDeClaseDelCatalogo(objeto, alcance)) {
    if (CLASES_QUE_REQUIEREN_IMPORT.has(objeto.nombre) && !ambito.importadasDeJavaUtil.has(objeto.nombre)) {
      problemas.push({ codigo: 'tipo-requiere-import', rango: objeto.rango, datos: { nombre: objeto.nombre } });
      return false;
    }
    return true;
  }
  // Tarea 1.34 (C, JLS 6.4.1): la clase del PROPIO programa se llama como una del catálogo (`public class Math`): tapa a la del JDK, así que `Math.sqrt(4)` pide a
  // SU clase un miembro que no tiene (javac: «cannot find symbol»); solo su `main` existe (la recursión, REQ-SUB-007: aviso). Una clase que no se llama como una
  // del catálogo sigue por la rama de abajo, sin cambios.
  if (
    objeto.tipo === 'nombre' &&
    objeto.parentesis === undefined &&
    alcance.buscar(objeto.nombre) === null &&
    alcance.esTipoPropio(objeto.nombre) &&
    NOMBRES_DE_CLASE_RECONOCIDOS.has(objeto.nombre)
  ) {
    if (miembro === 'main') {
      problemas.push(avisoDeClaseNoSoportada(objeto.nombre, objeto.rango));
    } else {
      problemas.push({ codigo: comoLlamada ? 'miembro-no-declarado' : 'campo-no-declarado', rango: objeto.rango, datos: { clase: objeto.nombre, nombre: miembro } });
    }
    return false;
  }
  if (objeto.tipo === 'nombre' && objeto.parentesis === undefined && !NOMBRES_DE_CLASE_RECONOCIDOS.has(objeto.nombre) && alcance.buscar(objeto.nombre) === null) {
    const esClaseValidaComoReceptor =
      ambito.esClaseDelJdkVisible(objeto.nombre) || (ambito.esClaseDelPrograma(objeto.nombre) && miembro === 'main');
    if (esClaseValidaComoReceptor) {
      problemas.push(avisoDeClaseNoSoportada(objeto.nombre, objeto.rango));
      return false;
    }
  }
  // Nombre COMPLETO de una clase (`java.lang.Math.max(1, 2)`, `java.lang.System.out.println(1)`): una cadena
  // de nombres cuyo primer nombre no es una variable ni una clase del catálogo y que EMPIEZA por una clase real
  // del JDK — aviso con esa clase. Si ningún prefijo lo es, cae al error de siempre por el primer nombre.
  if (objeto.tipo === 'acceso-miembro') {
    const cadena = nombreCalificadoDeLaCadena(objeto);
    const primero = cadena?.split('.')[0];
    if (cadena !== null && primero !== undefined && !NOMBRES_DE_CLASE_RECONOCIDOS.has(primero) && alcance.buscar(primero) === null) {
      const clase = prefijoQueEsClaseDelJdk(cadena);
      if (clase !== null) {
        problemas.push(avisoDeNombreCalificado(clase, objeto.rango));
        return false;
      }
    }
  }
  visitarExpresion(objeto, alcance, ambito, problemas);
  return true;
}

/**
 * El problema (error o aviso) que produce usar `nombreTipo` como TIPO — una declaración, un `new`, un cast —, o `null` si es un tipo
 * del subconjunto que el programa ve. Un solo lugar para las cuatro respuestas de `resultadoNombreDeTipo` (tarea 1.32: antes la
 * declaración y el `new` repetían el mismo bloque, y el cast, que también nombra un tipo, no lo validaba).
 */
function problemaDeNombreDeTipo(nombreTipo: string, rango: Rango, ambito: AmbitoDeNombres): ProblemaAtribucion | null {
  switch (resultadoNombreDeTipo(nombreTipo, ambito)) {
    case 'valido':
      return null;
    case 'no-reconocido':
      return { codigo: 'tipo-no-reconocido', rango, datos: { nombre: nombreTipo } };
    case 'requiere-import':
      return { codigo: 'tipo-requiere-import', rango, datos: { nombre: nombreTipo } };
    case 'existente-no-soportada':
      return avisoDeClaseNoSoportada(nombreTipo, rango);
    case 'calificado-existente':
      return avisoDeNombreCalificado(nombreTipo, rango);
  }
}

/** Tarea 1.29: el aviso de un nombre de clase escrito CON su paquete (`java.util.Scanner`). */
function avisoDeNombreCalificado(nombre: string, rango: Rango): ProblemaAtribucion {
  return { codigo: CODIGOS_NO_SOPORTADO.nombreCalificado, categoria: 'no-disponible', rango, datos: { nombre } };
}

/** "java.lang.System.out" para la cadena `acceso-miembro(acceso-miembro(acceso-miembro(java, lang), System), out)`,
 * o `null` si la expresión no es una cadena de nombres simples (una llamada, un literal, un paréntesis…). */
function nombreCalificadoDeLaCadena(expresion: NodoExpresion): string | null {
  if (expresion.tipo === 'nombre') return expresion.nombre;
  if (expresion.tipo !== 'acceso-miembro') return null;
  const receptor = nombreCalificadoDeLaCadena(expresion.objeto);
  return receptor === null ? null : `${receptor}.${expresion.miembro}`;
}

/** El prefijo MÁS LARGO de "a.b.C.d" que es una clase real del JDK ("a.b.C"), o `null` si ninguno lo es —
 * un tipo anidado ("java.util.Map.Entry") gana sobre su clase exterior, un miembro ("System.out") no cuenta. */
function prefijoQueEsClaseDelJdk(nombreCalificado: string): string | null {
  for (let punto = nombreCalificado.length; punto !== -1; punto = nombreCalificado.lastIndexOf('.', punto - 1)) {
    const prefijo = nombreCalificado.slice(0, punto);
    if (existeClaseDelJdk(prefijo)) return prefijo;
    if (punto === 0) break;
  }
  return null;
}

/** Tarea 1.29: el aviso de una clase REAL fuera del subconjunto (`StringBuilder`, `Locale`, la propia
 * clase del programa…), con el nombre tal como lo escribió el alumno (design.md §2.3). */
function avisoDeClaseNoSoportada(nombre: string, rango: Rango): ProblemaAtribucion {
  return { codigo: CODIGOS_NO_SOPORTADO.claseNoSoportada, categoria: 'no-disponible', rango, datos: { nombre } };
}

/** err13/err33 de exploracion/03 ("incompatible types: int cannot be converted to boolean"): la
 * condición de `if`/`while`/`do-while`/`for` debe ser `boolean` — Java NUNCA trata un número como
 * verdadero/falso (a diferencia de JS/Python). `'desconocido'` no se reporta (D2). */
function verificarCondicionBooleana(condicion: NodoExpresion, alcance: Alcance, problemas: ProblemaAtribucion[]): void {
  const tipo = tipoDeExpresion(condicion, alcance);
  if (tipo === 'desconocido' || tipo === 'boolean') return;
  problemas.push({ codigo: 'condicion-no-booleana', rango: condicion.rango, datos: { tipo } });
}

function visitarFor(
  sentencia: NodoFor,
  alcance: Alcance,
  ambito: AmbitoDeNombres,
  problemas: ProblemaAtribucion[],
): void {
  // El propio "for" es un alcance (design.md §2.3): sus variables cubren condición, actualización
  // Y el cuerpo — verificado contra javac que redeclarar el índice DENTRO del cuerpo con llaves
  // también es "already defined" (el cuerpo, si es un NodoBloque, abre su PROPIO alcance anidado
  // al visitarlo más abajo, adentro de este).
  alcance.entrarBloque();
  if (sentencia.inicializacionDeclaracion !== null) {
    visitarDeclaracionLocal(sentencia.inicializacionDeclaracion, alcance, ambito, problemas);
  }
  for (const expresionSentencia of sentencia.inicializacionExpresiones) {
    visitarExpresion(expresionSentencia.expresion, alcance, ambito, problemas);
  }
  if (sentencia.condicion !== null) {
    visitarValor(sentencia.condicion, alcance, ambito, problemas);
    verificarCondicionBooleana(sentencia.condicion, alcance, problemas);
  }
  visitarSentencia(sentencia.cuerpo, alcance, ambito, CONTEXTO_DENTRO_DE_CICLO, problemas);
  for (const expresionSentencia of sentencia.actualizacion) {
    visitarExpresion(expresionSentencia.expresion, alcance, ambito, problemas);
  }
  alcance.salirBloque();
}

function visitarSwitch(
  sentencia: NodoSwitch,
  alcance: Alcance,
  ambito: AmbitoDeNombres,
  contexto: ContextoFlujo,
  problemas: ProblemaAtribucion[],
): void {
  visitarValor(sentencia.selector, alcance, ambito, problemas);
  const problemaSelector = verificarSelectorDeSwitch(sentencia, alcance);
  if (problemaSelector !== null) problemas.push(problemaSelector);
  // err34/flow05 de exploracion/03 (tarea 1.11): etiquetas de "case" no constantes o duplicadas.
  problemas.push(...verificarEtiquetasDeCase(sentencia, alcance));

  // "El bloque de un switch es un solo alcance" (design.md §2.7): un único entrarBloque/
  // salirBloque para TODA la lista plana de etiquetas+elementos (nunca uno por "case").
  alcance.entrarBloque();
  // `continue` sigue viendo el ciclo envolvente (si lo hay) a través del switch; `break` gana el
  // switch como destino válido adicional, sin perder el ciclo si también lo hay (contexto.enCiclo
  // se conserva tal cual, nunca se resetea a false).
  const contextoSwitch: ContextoFlujo = { enCiclo: contexto.enCiclo, enCicloOSwitch: true };
  for (const elemento of sentencia.elementos) {
    visitarElementoSwitch(elemento, alcance, ambito, contextoSwitch, problemas);
  }
  alcance.salirBloque();
}

function visitarElementoSwitch(
  elemento: NodoElementoSwitch,
  alcance: Alcance,
  ambito: AmbitoDeNombres,
  contexto: ContextoFlujo,
  problemas: ProblemaAtribucion[],
): void {
  if (elemento.tipo === 'etiqueta-case') {
    visitarValor(elemento.valor, alcance, ambito, problemas);
    return;
  }
  if (elemento.tipo === 'etiqueta-default') return;
  visitarElementoBloque(elemento, alcance, ambito, contexto, problemas);
}

/**
 * Tarea 1.32 (F1, JLS 5.5): `(Tipo) operando`. Como en javac (`Attr.visitTypeCast`): primero el NOMBRE del tipo (se valida como el de
 * una declaración: `(Foo) 5` no existe, `(Scanner) x` sin `import` no se ve, `(Integer) x` es un tipo que el subconjunto no
 * simula), luego el operando (un valor) y por último si el cast es posible (`esCastPermitido`), señalando el OPERANDO. Un cast
 * inválido se tipa «desconocido» (`tipoDeExpresion`), así que el error no se repite en la asignación que lo contiene.
 */
function visitarConversion(nodo: NodoConversion, alcance: Alcance, ambito: AmbitoDeNombres, problemas: ProblemaAtribucion[]): void {
  const problemaDelTipo = problemaDeNombreDeTipo(nodo.nombreTipo, nodo.rango, ambito);
  if (problemaDelTipo !== null) problemas.push(problemaDelTipo);
  visitarValor(nodo.operando, alcance, ambito, problemas);
  if (problemaDelTipo !== null) return;
  const origen = tipoDeExpresion(nodo.operando, alcance);
  const destino = tipoDeNombreDeTipo(nodo.nombreTipo);
  if (esCastPermitido(origen, destino)) return;
  problemas.push({ codigo: 'cast-invalido', rango: nodo.operando.rango, datos: { origen, destino } });
}

/**
 * Tarea 1.32 (hermano de N5): visita el DESTINO de una asignación o el operando de `++`/`--`. El nombre de una clase en esa posición ya
 * lo reporta `verificarObjetivoDeAsignacion`/`verificarOperandoIncrementoDecremento` (`objetivo-no-es-variable`, tarea 1.21): no se
 * repite como «variable no declarada», que es lo que ahora significa un nombre de clase en posición de VALOR.
 */
function visitarDestino(destino: NodoExpresion, alcance: Alcance, ambito: AmbitoDeNombres, problemas: ProblemaAtribucion[]): void {
  if (esNombreDeClaseDelCatalogo(destino, alcance)) return;
  const antes = problemas.length;
  visitarExpresion(destino, alcance, ambito, problemas);
  // Tarea 1.34 (cierre por defecto): un destino cuyo tipo no se sabe (`args = 5;`, `args++;`) tampoco pasa en silencio.
  cerrarSiNoSeSabeSuTipo(destino, alcance, problemas, antes);
}

/**
 * Tarea 1.32 (F5): visita una expresión que se usa como VALOR (inicializador, argumento, operando, condición, selector, operando
 * de un cast, receptor…) y, además, exige que tenga uno. Una llamada a un método `void` solo es válida como SENTENCIA (o en la
 * actualización de un `for`): ahí se llama `visitarExpresion` directo.
 */
function visitarValor(expresion: NodoExpresion, alcance: Alcance, ambito: AmbitoDeNombres, problemas: ProblemaAtribucion[]): void {
  const antes = problemas.length;
  visitarExpresion(expresion, alcance, ambito, problemas);
  if (verificarQueTengaValor(expresion, alcance, problemas)) return;
  cerrarSiNoSeSabeSuTipo(expresion, alcance, problemas, antes);
}

/**
 * Tarea 1.34: el ARGUMENTO de una llamada o de un `new`. Igual que un valor cualquiera, salvo que `System.in`/`System.out`/`System.err` valen: su tipo SÍ se sabe
 * (`argumentoDeSobrecarga` los resuelve por su nombre reflejado real) y quien lo juzga es la sobrecarga — `new Scanner(System.in)` es válido, `Math.abs(System.in)` es
 * `sin-sobrecarga-aplicable`. En cualquier otra posición (`int x = System.in;`, un operando) esos mismos valores son de un tipo que el subconjunto no modela.
 */
function visitarArgumento(argumento: NodoExpresion, alcance: Alcance, ambito: AmbitoDeNombres, problemas: ProblemaAtribucion[]): void {
  const antes = problemas.length;
  visitarExpresion(argumento, alcance, ambito, problemas);
  if (verificarQueTengaValor(argumento, alcance, problemas)) return;
  if (campoReflejadoDeSystem(argumento, alcance) !== null) return;
  cerrarSiNoSeSabeSuTipo(argumento, alcance, problemas, antes);
}

/**
 * Tarea 1.34 — CERRAR POR DEFECTO. Hasta ahora `'desconocido'` era un sumidero de cascada (design.md §2.1: «nunca se informa un error que Java podría no dar») y
 * también la salida por omisión de lo que el motor no sabía: una expresión de un tipo que el subconjunto no modela, usada como valor, no producía NADA y el programa
 * terminaba en «Java sí acepta tu programa». «No sé» no es «sí». Esta función se llama sobre cada expresión en posición de VALOR (inicializador, argumento, operando,
 * condición, selector, destino, receptor…) justo después de visitarla, y cierra el tipo desconocido que NADIE explicó. De dónde sale un tipo desconocido:
 *   - de una regla que ya produjo su problema dentro de la visita (el nombre no existe, la sobrecarga no aplica, la clase no está soportada…): EXPLICADO, no se agrega otro
 *     (`problemas.length !== cantidadAntes`: sin cascada, el primero por posición es el que ve el alumno);
 *   - de lo que una operación, una asignación, un cast o un `new` HEREDAN de lo que contienen: ya se cerró en cada operando, que pasó por este mismo embudo;
 *   - de una variable cuyo tipo no se sabe: o su declaración ya dio su problema (`Foo x;`), o es un arreglo (`args`) y `visitarNombreComoValor` ya avisó de él;
 *   - de un campo o una llamada de biblioteca cuyo tipo el subconjunto no modela (`System.in`, `System.out`, `System.err`; el resultado de un método que devuelve
 *     un objeto que no se simula): el ORIGEN que nadie explicó — es el único caso que cierra esta función, con `valor-de-tipo-no-modelado`.
 * Cuando una regla de javac del subconjunto sí rechaza el programa, la regla modelada va ANTES (es un problema dentro de la visita) y esto no se ejecuta.
 */
function cerrarSiNoSeSabeSuTipo(expresion: NodoExpresion, alcance: Alcance, problemas: ProblemaAtribucion[], cantidadAntes: number): void {
  if (problemas.length !== cantidadAntes) return;
  if (!esOrigenDeUnTipoDesconocido(expresion, alcance)) return;
  problemas.push({
    codigo: CODIGOS_NO_SOPORTADO.valorDeTipoNoModelado,
    categoria: 'no-disponible',
    rango: expresion.rango,
    datos: { valor: valorTalComoSeEscribio(expresion) },
  });
}

/**
 * ¿`expresion` es el ORIGEN de un tipo desconocido —no lo hereda de un operando—? Un campo (`System.in`) o una llamada de biblioteca cuyo resultado no se modela. Una
 * llamada solo cuenta si se sabe de qué clase es el receptor y de qué tipo es cada argumento: si no, su resultado desconocido viene de ellos (y ahí se cerró o se explicó).
 */
function esOrigenDeUnTipoDesconocido(expresion: NodoExpresion, alcance: Alcance): boolean {
  if (tipoDeExpresion(expresion, alcance) !== 'desconocido') return false;
  if (expresion.tipo === 'acceso-miembro') return true;
  if (expresion.tipo !== 'llamada') return false;
  if (expresion.callee.tipo !== 'acceso-miembro' || claseDelObjeto(expresion.callee.objeto, alcance) === null) return false;
  return expresion.argumentos.every((argumento) => argumentoDeSobrecarga(argumento, alcance) !== 'desconocido');
}

/** El valor tal como lo escribió el alumno para el texto del aviso: `System.in`, `System.out.printf(...)`; `null` si no es un nombre ni una llamada a uno. */
function valorTalComoSeEscribio(expresion: NodoExpresion): string | null {
  if (expresion.tipo === 'llamada') {
    const llamado = nombreCalificadoDeLaCadena(expresion.callee);
    return llamado === null ? null : `${llamado}(...)`;
  }
  return nombreCalificadoDeLaCadena(expresion);
}

/**
 * Tarea 1.32 (F5, JLS 15.12.3 + 14.8: una llamada `void` es una expresión SIN tipo): `int b = System.out.print(7);`,
 * `System.out.print(System.out.print(0))` o `if (sc.close())` se rechazan en javac 17 (`prob.found.req` / `void.not.allowed.here`).
 * Reporta `llamada-sin-valor` y devuelve `true` si la expresión es una llamada `void` — quien la llama omite entonces el resto de
 * sus comprobaciones de tipo (la llamada se tipa «desconocido», así que ninguna se dispararía de todos modos: sin cascada, como
 * javac, que reporta el `void` y no lo que le pase después). `llamada` es el nombre tal como lo escribió el alumno
 * (`System.out.print`, `sc.close`) o, si el receptor no es una cadena de nombres, solo el del método.
 */
function verificarQueTengaValor(expresion: NodoExpresion, alcance: Alcance, problemas: ProblemaAtribucion[]): boolean {
  if (expresion.tipo !== 'llamada') return false;
  const nombreDelMetodo = expresion.callee.tipo === 'acceso-miembro' ? expresion.callee.miembro : '';
  const llamada = nombreCalificadoDeLaCadena(expresion.callee) ?? nombreDelMetodo;
  if (esLlamadaSinValor(expresion, alcance)) {
    problemas.push({ codigo: 'llamada-sin-valor', rango: expresion.rango, datos: { llamada } });
    return true;
  }
  // Tarea 1.33: `System.out.printf(...)` SÍ devuelve un valor (el `PrintStream`), pero el subconjunto no modela ese tipo: usarlo como valor no es un
  // error de javac que aquí se pueda afirmar ni negar, es una construcción de Java que el visualizador todavía no maneja (aviso, nunca un
  // resultado inventado, D2). Sin cascada: quien lo llama omite sus comprobaciones de tipo, igual que con una llamada `void`.
  if (esLlamadaDeTipoNoModelado(expresion, alcance)) {
    problemas.push({ codigo: CODIGOS_NO_SOPORTADO.valorDeTipoNoSoportado, categoria: 'no-disponible', rango: expresion.rango, datos: { llamada } });
    return true;
  }
  return false;
}

/**
 * Tarea 1.32 (F2, JLS 15.11 + 15.12: solo un valor de REFERENCIA tiene miembros): `n.length()` con `int n`, `0L.foo()`,
 * `'a'.equals(5)`, `(x + 2).toString()` o `s.length().foo()` se rechazan en javac 17 con «int cannot be dereferenced»
 * (`cant.deref`). `datos.receptor` es el nombre de la variable cuando el receptor es una (el texto la nombra). Devuelve `true` si
 * reportó el problema — quien la llama no resuelve el miembro (no hay clase donde buscarlo).
 */
function verificarQueNoSeaPrimitivo(
  receptor: NodoExpresion,
  miembro: string,
  rango: Rango,
  alcance: Alcance,
  problemas: ProblemaAtribucion[],
): boolean {
  const tipo = tipoDeExpresion(receptor, alcance);
  if (!esTipoPrimitivo(tipo)) return false;
  const datos = receptor.tipo === 'nombre' ? { tipo, nombre: miembro, receptor: receptor.nombre } : { tipo, nombre: miembro };
  problemas.push({ codigo: 'miembro-de-primitivo', rango, datos });
  return true;
}

/**
 * Tarea 1.32 (F2/N6, JLS 6.4.2 + 6.5.2): `System.out.println(...)` tiene una gramática propia (`NodoImpresion`) que da por hecho que
 * `System` es la CLASE, pero un nombre simple que es una VARIABLE en alcance se clasifica como expresión antes que como tipo: con
 * `int System = 3;` es `System.out` sobre un `int` (javac: «int cannot be dereferenced»), con `String System = "a";` es un campo
 * `out` que `String` no tiene (javac: «cannot find symbol»). Una variable de un tipo que el subconjunto no modela ya avisó en su
 * declaración (`Long System;`): sin cascada.
 */
function verificarSystemNoTapada(rango: Rango, alcance: Alcance, problemas: ProblemaAtribucion[]): void {
  const variable = alcance.buscar('System');
  if (variable === null) {
    // Tarea 1.34 (C, JLS 6.4.1): la clase del programa se llama `System` (tapa a `java.lang.System`): `System.out` es SU campo `out`, que no tiene.
    if (alcance.esTipoPropio('System')) problemas.push({ codigo: 'campo-no-declarado', rango, datos: { clase: 'System', nombre: 'out' } });
    return;
  }
  // Tarea 1.35: el PARÁMETRO de `main` es un arreglo (`String[]`, fuera del subconjunto) y, si se llama `System`, tapa a la clase (javac: «cannot find symbol»). Su tipo es «desconocido»
  // para `tipoDeNombreDeTipo`, así que sin esta rama `System.out.println(1);` se aceptaba: un arreglo usado como valor es el aviso de siempre.
  if (variable.tipo.endsWith('[]')) {
    problemas.push({ codigo: CODIGOS_NO_SOPORTADO.arreglo, categoria: 'no-disponible', rango, datos: { tipoArreglo: variable.tipo } });
    return;
  }
  const tipo = tipoDeNombreDeTipo(variable.tipo);
  if (esTipoPrimitivo(tipo)) {
    problemas.push({ codigo: 'miembro-de-primitivo', rango, datos: { tipo, nombre: 'out', receptor: 'System' } });
  } else if (tipo !== 'desconocido') {
    problemas.push({ codigo: 'campo-no-declarado', rango, datos: { clase: tipo, nombre: 'out' } });
  }
}

function visitarExpresion(
  expresion: NodoExpresion,
  alcance: Alcance,
  ambito: AmbitoDeNombres,
  problemas: ProblemaAtribucion[],
): void {
  switch (expresion.tipo) {
    case 'literal-entero':
    case 'literal-largo':
    case 'literal-doble':
    case 'literal-caracter':
    case 'literal-cadena':
    case 'literal-booleano':
    case 'expresion-no-soportada':
      return;
    case 'nombre':
      visitarNombreComoValor(expresion, alcance, problemas);
      return;
    case 'binaria':
      visitarValor(expresion.izquierda, alcance, ambito, problemas);
      visitarValor(expresion.derecha, alcance, ambito, problemas);
      verificarOperandosBinaria(expresion, alcance, problemas);
      return;
    case 'unaria':
      visitarValor(expresion.operando, alcance, ambito, problemas);
      verificarOperandoUnaria(expresion, alcance, problemas);
      return;
    case 'asignacion':
      visitarDestino(expresion.objetivo, alcance, ambito, problemas);
      // Tarea 1.32 (F3): javac lo reporta en ESTA pasada (`Attr.visitIdent` → `checkAssignable`), antes que los errores de tipos.
      verificarModificacionDeFinal(expresion.objetivo, alcance, problemas);
      visitarValor(expresion.valor, alcance, ambito, problemas);
      verificarObjetivoDeAsignacion(expresion, alcance, problemas);
      verificarAsignacionSimple(expresion, alcance, problemas);
      verificarAsignacionCompuesta(expresion, alcance, problemas);
      return;
    case 'incremento-decremento':
      visitarDestino(expresion.operando, alcance, ambito, problemas);
      verificarOperandoIncrementoDecremento(expresion, alcance, problemas);
      return;
    case 'llamada':
      visitarLlamada(expresion, alcance, ambito, problemas);
      return;
    case 'acceso-miembro':
      visitarAccesoMiembro(expresion, alcance, ambito, problemas);
      return;
    case 'nueva-instancia':
      visitarNuevaInstancia(expresion, alcance, ambito, problemas);
      return;
    case 'conversion':
      visitarConversion(expresion, alcance, ambito, problemas);
      return;
  }
}

/** err28 (`==`/`!=`, "bad operand types") y err35 (aritmética/relacional, "bad operand types for
 * binary operator") de exploracion/03 — mismo punto, tres reglas distintas según la FAMILIA del
 * operador (design.md §2.7). Los operadores de bits/`instanceof`/`?:` nunca llegan como
 * `NodoBinaria` (son NO-DISP desde la sintaxis, 1.3).
 */
function verificarOperandosBinaria(
  expresion: Extract<NodoExpresion, { tipo: 'binaria' }>,
  alcance: Alcance,
  problemas: ProblemaAtribucion[],
): void {
  const izquierda = tipoDeExpresion(expresion.izquierda, alcance);
  const derecha = tipoDeExpresion(expresion.derecha, alcance);
  if (expresion.operador === '==' || expresion.operador === '!=') {
    if (!tiposComparablesConIgualdad(izquierda, derecha)) {
      problemas.push({ codigo: 'tipos-incomparables', rango: expresion.rango, datos: { izquierda, derecha } });
    }
    return;
  }
  if (expresion.operador === '&&' || expresion.operador === '||') {
    // Java exige "boolean" en AMBOS lados (nunca un número, a diferencia de JS) — mismo criterio
    // que `verificarCondicionBooleana`, pero aquí ambos operandos, no uno solo.
    const ambosBooleanos = (t: Tipo) => t === 'boolean' || t === 'desconocido';
    if (!ambosBooleanos(izquierda) || !ambosBooleanos(derecha)) {
      problemas.push({
        codigo: 'operandos-invalidos-operador-binario',
        rango: expresion.rango,
        datos: { operador: expresion.operador, izquierda, derecha },
      });
    }
    return;
  }
  // Aritmética (+ - * / %) y relacional (< > <= >=): design.md §2.4 nivel 9/11/12 — ambas familias
  // exigen operandos numéricos (salvo "+" con String, que concatena, nunca un error).
  if (!operandosValidosParaAritmetica(expresion.operador, izquierda, derecha)) {
    problemas.push({
      codigo: 'operandos-invalidos-operador-binario',
      rango: expresion.rango,
      datos: { operador: expresion.operador, izquierda, derecha },
    });
  }
}

/** Tarea 1.21 (sub-lote 1-D4, JLS 5.6.1): "!x" exige "boolean"; "+x"/"-x" exigen un tipo numérico
 * (`operandoValidoParaUnario`, verificaciones-de-tipo.ts) — verificado contra javac 17 real: "bad
 * operand type X for unary operator 'Y'". 'desconocido' nunca reporta nada (D2). */
function verificarOperandoUnaria(expresion: NodoUnaria, alcance: Alcance, problemas: ProblemaAtribucion[]): void {
  const operando = tipoDeExpresion(expresion.operando, alcance);
  if (operandoValidoParaUnario(expresion.operador, operando)) return;
  problemas.push({
    codigo: 'operando-invalido-operador-unario',
    rango: expresion.rango,
    datos: { operador: expresion.operador, operando },
  });
}

/** Tarea 1.21 (sub-lote 1-D4, JLS 15.14/15.15/4.12.3, cierre de C7): (1) el operando debe ser una
 * VARIABLE real (`operandoNoEsVariableValida` -- verificado: "fila++ ++;" da "unexpected type,
 * required: variable, found: value", porque el operando del "++" EXTERIOR es "fila++", un VALOR,
 * no una variable) ANTES de mirar el tipo (una vez que se sabe que es una variable, (2) "x++"/
 * "--x" exigen que sea numérica -- mismo criterio que "+x"/"-x" arriba, verificado contra javac 17
 * real: "bad operand type X for unary operator '++'/'--'"). Los dos casos usan códigos DISTINTOS
 * -- nunca el mismo mensaje para "no es una variable" y "es una variable del tipo equivocado". */
function verificarOperandoIncrementoDecremento(
  expresion: NodoIncrementoDecremento,
  alcance: Alcance,
  problemas: ProblemaAtribucion[],
): void {
  if (operandoNoEsVariableValida(expresion.operando, alcance)) {
    problemas.push({ codigo: 'objetivo-no-es-variable', rango: expresion.rango, datos: {} });
    return;
  }
  // Tarea 1.32 (F3): «cannot assign a value to final variable k» gana al error de tipo del operando (`final String s; s++;`).
  if (verificarModificacionDeFinal(expresion.operando, alcance, problemas)) return;
  const operando = tipoDeExpresion(expresion.operando, alcance);
  if (operandoValidoParaIncrementoDecremento(operando)) return;
  problemas.push({
    codigo: 'operando-invalido-operador-unario',
    rango: expresion.rango,
    datos: { operador: expresion.operador, operando },
  });
}

/** Tarea 1.32 (F3, JLS 15.26/15.14/15.15 + 4.12.4, exploracion/03 §4.4 punto 7 «err10c»): una variable `final` solo admite UN valor.
 * Como «final sin inicializador» es NO-DISP desde la sintaxis (REQ-SUB-007), toda `final` que llega aquí YA tiene su valor desde la
 * declaración, así que CUALQUIER modificación posterior —`k = 2`, `k += 2`, `k++`, `--k`— es un error, sin mirar el flujo. javac lo
 * da en la pasada de ATRIBUCIÓN (`cant.assign.val.to.final.var`), junto con los errores de tipos y por orden de aparición; antes
 * este motor lo detectaba en la de asignación definitiva (pasada 4) y solo para `=`/`op=`, y `k++` no se detectaba en ninguna.
 * `true` si reportó el problema. */
function verificarModificacionDeFinal(objetivo: NodoExpresion, alcance: Alcance, problemas: ProblemaAtribucion[]): boolean {
  if (objetivo.tipo !== 'nombre') return false;
  const simbolo = alcance.buscar(objetivo.nombre);
  if (simbolo === null || !simbolo.esFinal) return false;
  problemas.push({ codigo: 'variable-final-reasignada', rango: objetivo.rango, datos: { nombre: objetivo.nombre } });
  return true;
}

/** Tarea 1.21 (sub-lote 1-D4, JLS 15.26/4.12.3, cierre de C7): el objetivo de CUALQUIER asignación
 * ("=" incluida, no solo compuesta) debe ser una VARIABLE real -- verificado contra javac 17 real:
 * "Scanner = new Scanner(System.in);" da "cannot find symbol: variable Scanner" ("Scanner" existe
 * como CLASE, un espacio de símbolos DISTINTO, JLS 6.5.6 -- `visitarNombreComoValor` lo trata como
 * referencia estática válida en posición de VALOR, pero nunca es válido en posición de OBJETIVO).
 * Independiente de `verificarAsignacionCompuesta` (abajo): esa solo mira operadores COMPUESTOS;
 * esta corre siempre, "=" incluido. */
function verificarObjetivoDeAsignacion(expresion: NodoAsignacion, alcance: Alcance, problemas: ProblemaAtribucion[]): void {
  if (!operandoNoEsVariableValida(expresion.objetivo, alcance)) return;
  problemas.push({ codigo: 'objetivo-no-es-variable', rango: expresion.rango, datos: {} });
}

/** Tarea NUEVA (sub-lote 1-D5, JLS 5.2/15.26.1: "el tipo de una expresión de asignación es el de
 * la variable asignada"): una asignación SIMPLE ("x = expr;", fuera de una declaración) exige la
 * MISMA conversión de asignación que un inicializador de declaración (`visitarDeclaracionLocal`,
 * arriba) — reusa `esAsignable`/`codigoDeAsignacionInvalida`/`valorConstante`, las MISMAS que ya
 * usa una declaración, nunca una segunda tabla de reglas. Verificado contra javac 17 real esta
 * sesión: "int x; x = \"hola\";" → "incompatible types: String cannot be converted to int"; "int
 * x; x = 3.5;" → "possible lossy conversion from double to int"; "char c; c = 65;" COMPILA limpio
 * (constante que cabe, igual que una declaración); "double d; d = 5;" COMPILA limpio
 * (ensanchamiento). `destino === 'desconocido'` cubre D2 para AMBOS casos de cascada: un objetivo
 * genuinamente no declarado (ya reportado por `visitarNombreComoValor`) Y un objetivo que no es una
 * variable real (ya reportado por `verificarObjetivoDeAsignacion`, arriba) — en los dos,
 * `tipoDeExpresion` sobre el nombre da 'desconocido' porque `alcance.buscar` no lo encuentra, sin
 * necesitar un segundo chequeo aquí. */
function verificarAsignacionSimple(expresion: NodoAsignacion, alcance: Alcance, problemas: ProblemaAtribucion[]): void {
  if (expresion.operador !== '=') return;
  const destino = tipoDeExpresion(expresion.objetivo, alcance);
  if (destino === 'desconocido') return;
  const origen = tipoDeExpresion(expresion.valor, alcance);
  const constanteOrigen = valorSiSeSabe(valorConstante(expresion.valor, alcance)); // tarea 1.36: solo importa el valor de una constante entera (estrechamiento); lo desconocido es texto o boolean
  if (esAsignable(origen, destino, constanteOrigen)) return;
  problemas.push({
    codigo: codigoDeAsignacionInvalida(origen, destino),
    rango: expresion.valor.rango,
    datos: { origen, destino },
  });
}

/** Tarea 1.21 (JLS 15.26.2, "E1 op= E2" ≡ "E1 = (T)(E1 op E2)"): una asignación COMPUESTA revisa
 * DOS cosas, en orden,
 * igual que javac: (1) el operador BASE ("+ - * / %") debe aplicar entre el tipo del objetivo y el
 * del valor (`operandosValidosParaAritmetica`, MISMA regla que un "+"/"-" suelto — verificado:
 * "boolean b; b += false;"/"int x; x *= \"3\";" dan "bad operand types for binary operator"); (2)
 * si aplica, el resultado (YA promovido/concatenado, `tipoDeOperadorAritmetico`) debe poder
 * castearse de vuelta al tipo del objetivo (`esConvertibleImplicitamenteEnAsignacionCompuesta` —
 * verificado: "int x; x += \"a\";" da "incompatible types: String cannot be converted to int", una
 * frase DISTINTA de "bad operand types" pese a que el operador "+" sí aplicó). */
function verificarAsignacionCompuesta(expresion: NodoAsignacion, alcance: Alcance, problemas: ProblemaAtribucion[]): void {
  if (expresion.operador === '=') return;
  const operadorBase = expresion.operador.slice(0, -1);
  const objetivo = tipoDeExpresion(expresion.objetivo, alcance);
  const valor = tipoDeExpresion(expresion.valor, alcance);
  if (objetivo === 'desconocido' || valor === 'desconocido') return; // D2
  if (!operandosValidosParaAritmetica(operadorBase, objetivo, valor)) {
    problemas.push({
      codigo: 'operandos-invalidos-operador-binario',
      rango: expresion.rango,
      datos: { operador: expresion.operador, izquierda: objetivo, derecha: valor },
    });
    return;
  }
  const resultado = tipoDeOperadorAritmetico(operadorBase, objetivo, valor);
  if (!esConvertibleImplicitamenteEnAsignacionCompuesta(resultado, objetivo)) {
    problemas.push({
      codigo: codigoDeAsignacionInvalida(resultado, objetivo),
      rango: expresion.rango,
      datos: { origen: resultado, destino: objetivo },
    });
  }
}

function visitarNombreComoValor(nodo: NodoNombre, alcance: Alcance, problemas: ProblemaAtribucion[]): void {
  // Tarea 1.32 (hermano de N5, JLS 6.5.2): el nombre de una clase del catálogo (`Math`, `String`, `Scanner`…) solo es válido como TIPO o
  // como RECEPTOR de un miembro (`visitarReceptor` lo resuelve sin pasar por aquí): como VALOR (`int y = Math;`) javac dice «cannot find
  // symbol: variable Math» aunque la clase exista. Antes se daba por buena («referencia estática»), y era un falso acepto.
  const variable = alcance.buscar(nodo.nombre);
  if (variable !== null) {
    // Tarea 1.34 (cierre por defecto): una variable cuyo tipo es un ARREGLO (`args`, el único que el subconjunto deja nombrar: el parámetro de `main`) usada como valor
    // —`args.length()`, `int n = args;`, `args = 5;`— es el aviso de arreglos de REQ-SUB-007, nunca «Java sí acepta tu programa». Una variable de un tipo que no se sabe
    // por otra razón (`Foo x;`) ya dio su problema en la declaración: sin cascada.
    if (variable.tipo.endsWith('[]')) {
      problemas.push({ codigo: CODIGOS_NO_SOPORTADO.arreglo, categoria: 'no-disponible', rango: nodo.rango, datos: { tipoArreglo: variable.tipo } });
    }
    return;
  }
  const sugerencia = sugerenciaDeMayuscula(nodo.nombre);
  problemas.push({
    codigo: 'variable-no-declarada',
    rango: nodo.rango,
    datos: sugerencia === undefined ? { nombre: nodo.nombre } : { nombre: nodo.nombre, sugerencia },
  });
}

// Tarea 1.35: el nombre del único método propio que la atribución llega a ver (el que lanza el programa).
const NOMBRE_DEL_METODO_PRINCIPAL = 'main';

function visitarLlamada(
  nodo: NodoLlamada,
  alcance: Alcance,
  ambito: AmbitoDeNombres,
  problemas: ProblemaAtribucion[],
): void {
  if (nodo.callee.tipo === 'nombre') {
    if (nodo.callee.nombre === NOMBRE_DEL_METODO_PRINCIPAL) {
      // Tarea 1.35 (REQ-SUB-007, javac compila `main(args);`): el único método propio que esta pasada ve es `main` (todo método que el alumno declara ya avisó en su
      // declaración y el programa no llega aquí): llamarlo por su nombre es una llamada a un método propio, un aviso — nunca «el método "main" no existe».
      problemas.push({
        codigo: CODIGOS_NO_SOPORTADO.llamadaAMetodoPropio,
        categoria: 'no-disponible',
        rango: nodo.callee.rango,
        datos: { nombre: nodo.callee.nombre },
      });
    } else {
      // Ningún otro método propio existe en el subconjunto (REQ-SUB-007): una llamada de nombre libre
      // (sin "objeto.") SIEMPRE es "método no declarado" (err03 de exploracion/03).
      problemas.push({
        codigo: 'metodo-no-declarado',
        rango: nodo.callee.rango,
        datos: { nombre: nodo.callee.nombre },
      });
    }
  } else if (nodo.callee.tipo === 'acceso-miembro') {
    // Sub-lote 1-D2c: "objeto.metodo(...)" real -- resuelto contra el catálogo (abajo), en vez de
    // solo recorrer el receptor como valor genérico (lo que hacía que NINGÚN método de biblioteca
    // se validara jamás — hueco flageado por 1-D2b, task_c0cf2e6c).
    visitarLlamadaDeMiembro(nodo, nodo.callee, alcance, ambito, problemas);
  } else {
    visitarExpresion(nodo.callee, alcance, ambito, problemas);
  }
  for (const argumento of nodo.argumentos) visitarArgumento(argumento, alcance, ambito, problemas);
}

/**
 * Sub-lote 1-D2c (REQ-SUB-005/007, task_c0cf2e6c): `objeto.metodo(...)` contra el catálogo real
 * del JDK (`catalogo-api.ts`/`sobrecargas.ts`, tareas 1.8/1.9) — cada veredicto verificado contra
 * javac 17 real (carpeta temporal, borrada tras verificar; ver el informe de la sesión):
 *   - `s.lenght()`/`Math.raiz(4)` (no existe NINGÚN miembro con ese nombre) -> "cannot find
 *     symbol: method X()" real -> "miembro-no-declarado"
 *   - `s.split(",")`/`Math.sin(x)`/`sc.hasNextInt()` (existe en el JDK, fuera de REQ-SUB-005) ->
 *     javac SÍ compila -> aviso NO-DISP (categoria 'no-disponible'), NUNCA un error inventado
 *   - `Math.max("a",1)`/`s.charAt("0")` (existe y soportado, pero NINGÚN argumento real encaja en
 *     ninguna sobrecarga real) -> "no suitable method found"/"incompatible types" reales (dos
 *     frases distintas de javac para el MISMO problema, D2: un solo código nuestro) ->
 *     "sin-sobrecarga-aplicable"
 *   - soportado y una sobrecarga real SÍ aplica -> nada que reportar aquí; `tipos.ts` resuelve el
 *     tipo de retorno real por separado (misma `resolverSobrecarga`, nunca una segunda tabla)
 * `clase === null` (el receptor ya es inválido, o de un tipo sin miembros en este subconjunto —
 * p. ej. un primitivo) no reporta NADA aquí: D2, cascada suprimida por quien ya reportó el
 * problema real del receptor (o por el hueco YA documentado de "primitivo no se puede
 * dereferenciar", ajeno a esta tarea).
 */
function visitarLlamadaDeMiembro(
  nodo: NodoLlamada,
  callee: NodoAccesoMiembro,
  alcance: Alcance,
  ambito: AmbitoDeNombres,
  problemas: ProblemaAtribucion[],
): void {
  const antes = problemas.length;
  if (!visitarReceptor(callee.objeto, callee.miembro, true, alcance, ambito, problemas)) return;
  if (verificarQueTengaValor(callee.objeto, alcance, problemas)) return;
  if (verificarQueNoSeaPrimitivo(callee.objeto, callee.miembro, callee.rango, alcance, problemas)) return;
  const clase = claseDelObjeto(callee.objeto, alcance);
  if (clase === null) {
    // Tarea 1.34 (cierre por defecto): un receptor sin clase del subconjunto (`args.length()`, `System.in.nextInt()`, `System.in.read()`) no deja pasar la
    // llamada en silencio: ni se sabe qué miembros tiene ni si javac la acepta.
    cerrarSiNoSeSabeSuTipo(callee.objeto, alcance, problemas, antes);
    return;
  }
  const clasificacion = clasificarMetodo(clase, callee.miembro);
  if (clasificacion === 'no-existe') {
    problemas.push({ codigo: 'miembro-no-declarado', rango: callee.rango, datos: { clase, nombre: callee.miembro } });
    return;
  }
  if (clasificacion === 'existe-no-soportado') {
    // Tarea 1.25 (hallazgo real, encontrado por esta MISMA tarea, no reportado por el orquestador:
    // ninguna muestra de `corpus/compilacion/avisos/` ejercita este código — solo la atribución lo
    // produce): el texto es-MX nombra el miembro CONCRETO desde la tarea 1.24 (`{ clase, nombre }`),
    // pero este sitio mandaba `datos: {}` — el alumno veía "el miembro `undefined` de `undefined`"
    // en vez de, p. ej., "split" de "String". Tarea 1.26: código propio para MÉTODO (antes
    // compartido con campo/constructor bajo "miembro-de-biblioteca-no-soportado").
    problemas.push({
      codigo: CODIGOS_NO_SOPORTADO.metodoDeBiblioteca,
      categoria: 'no-disponible',
      rango: callee.rango,
      datos: { clase, nombre: callee.miembro },
    });
    return;
  }
  // Tarea NUEVA (sub-lote 1-D5): `tiposDeArgumentos` (SOLO para el mensaje) usa
  // `nombreDeArgumentoParaMostrar` -- MISMO nombre simple que javac muestra en sus propios mensajes
  // ("PrintStream"/"InputStream" para System.out/System.in, nunca "desconocido" -- antes de esta
  // corrección, un `Tipo` cerrado directo SIEMPRE daba 'desconocido' para estos 3 casos, ver tipos.ts).
  const tiposDeArgumentos = nodo.argumentos.map((argumento) => nombreDeArgumentoParaMostrar(argumento, alcance));
  // Tarea 1.21 (sub-lote 1-D4): la RESOLUCIÓN en sí usa `argumentoDeSobrecarga` (nunca solo
  // `tipoDeExpresion`), para que "System.in"/"System.out"/"System.err" participen con su nombre
  // reflejado real en vez de apagar la cascada como 'desconocido' -- `tiposDeArgumentos`, arriba,
  // sigue siendo el que se MUESTRA en el mensaje (ver "sin-sobrecarga-aplicable" en
  // textos/es-MX/problemas.ts), nunca el que decide la resolución.
  const argumentos = nodo.argumentos.map((argumento) => argumentoDeSobrecarga(argumento, alcance));
  // D2 (nunca un resultado inventado): un argumento genuinamente 'desconocido' (p. ej. una llamada
  // anidada que en sí no resolvió, o un símbolo no declarado) NO significa "ningún tipo encaja" --
  // significa "no sabemos todavía". Reportar "sin-sobrecarga-aplicable" aquí sería inventar un
  // error que javac nunca daría -- mismo sumidero de cascada que ya usa TODO el resto de esta
  // pasada. El chequeo es sobre `argumentos` (NO `tiposDeArgumentos`): un `{reflejado}` (System.x)
  // SIEMPRE es un tipo conocido, nunca dispara este sumidero.
  if (argumentos.includes('desconocido')) return;
  const firma = resolverSobrecarga(clase, callee.miembro, argumentos);
  if (firma === null) {
    problemas.push({
      codigo: 'sin-sobrecarga-aplicable',
      rango: nodo.rango,
      datos: { clase, nombre: callee.miembro, argumentos: tiposDeArgumentos },
    });
    return;
  }
  // Tarea 1.32 (F6, JLS 15.12.3): con el NOMBRE de la clase como receptor la sobrecarga elegida debe ser `static`.
  if (esNombreDeClaseDelCatalogo(callee.objeto, alcance) && !firma.esEstatico) {
    problemas.push({ codigo: 'metodo-de-instancia-sin-objeto', rango: callee.rango, datos: { clase, nombre: callee.miembro } });
  }
}

/**
 * Sub-lote 1-D2c: acceso a miembro usado como VALOR, sin llamar (`Math.PI`, `Integer.MAX_VALUE`)
 * — espacio de nombres SEPARADO del de métodos (JLS 6.5.6.1 vs 6.5.6.2, `clasificarCampo` filtra
 * por género): un método real del mismo nombre (`s.length`, sin paréntesis) NUNCA cuenta como
 * campo — verificado contra javac 17 real: "cannot find symbol: variable length". Mismas 3
 * categorías que `visitarLlamadaDeMiembro` salvo "sin-sobrecarga-aplicable" (un campo no tiene
 * sobrecargas que resolver).
 */
function visitarAccesoMiembro(
  nodo: NodoAccesoMiembro,
  alcance: Alcance,
  ambito: AmbitoDeNombres,
  problemas: ProblemaAtribucion[],
): void {
  const antes = problemas.length;
  if (!visitarReceptor(nodo.objeto, nodo.miembro, false, alcance, ambito, problemas)) return;
  if (verificarQueTengaValor(nodo.objeto, alcance, problemas)) return;
  if (verificarQueNoSeaPrimitivo(nodo.objeto, nodo.miembro, nodo.rango, alcance, problemas)) return;
  const clase = claseDelObjeto(nodo.objeto, alcance);
  if (clase === null) {
    cerrarSiNoSeSabeSuTipo(nodo.objeto, alcance, problemas, antes); // tarea 1.34: `args.length` (un campo de algo que no se sabe qué es)
    return;
  }
  const clasificacion = clasificarCampo(clase, nodo.miembro);
  if (clasificacion === 'no-existe') {
    problemas.push({ codigo: 'campo-no-declarado', rango: nodo.rango, datos: { clase, nombre: nodo.miembro } });
    return;
  }
  if (clasificacion === 'existe-no-soportado') {
    // Tarea 1.25 (mismo hallazgo que `visitarLlamadaDeMiembro` arriba, sitio de emisión DISTINTO —
    // acceso de CAMPO, no llamada): "Integer.SIZE" mostraba "el miembro `undefined` de `undefined`".
    // Tarea 1.26: código propio para CAMPO (antes compartido con método/constructor).
    problemas.push({
      codigo: CODIGOS_NO_SOPORTADO.campoDeBiblioteca,
      categoria: 'no-disponible',
      rango: nodo.rango,
      datos: { clase, nombre: nodo.miembro },
    });
  }
}

/**
 * Sub-lote 1-D3 (JLS 15.9, REQ-SUB-005): "new Clase(...)" contra los constructores REALES de
 * `FIRMAS_JDK` (`genero:'constructor'`, `nombre:'<init>'`) — ANTES de esta tarea, `nueva-instancia`
 * solo recorría sus argumentos como valores sueltos (nunca se validaba el propio "new"), así que
 * "Scanner sc = new Scanner();" (Scanner NO tiene constructor de aridad 0 en el JDK real) se
 * aceptaba en silencio. Los 4 desenlaces, cada uno verificado contra javac 17 real (carpeta
 * temporal, borrada tras verificar; ver el informe de la sesión):
 *   - `nombreTipo` no reconocido ("new Foo()") -> "cannot find symbol: class Foo" -> MISMO código
 *     que una declaración con un tipo desconocido ("tipo-no-reconocido") -- `resultadoNombreDeTipo`
 *     reusada tal cual (nunca una segunda implementación que podría divergir); D2 no distingue
 *     "el nombre aparece en una declaración" de "el nombre aparece tras new": javac tampoco lo hace
 *     en su intención real (símbolo de clase no resuelto).
 *   - `nombreTipo` real de java.util SIN su import ("new Scanner(...)" sin "import
 *     java.util.Scanner;") -> "tipo-requiere-import" (MISMO mecanismo que una declaración).
 *   - constructor real pero NINGÚN argumento encaja ("new Scanner()", Scanner no tiene aridad 0) ->
 *     "no suitable constructor found for Scanner(no arguments)" -> "sin-constructor-aplicable" --
 *     MISMA `resolverSobrecarga` (JLS 15.12.2) que ya resuelve métodos, con nombre='<init>'.
 *   - constructor real, aplica, pero FUERA de REQ-SUB-005 ("new Scanner(\"texto\")", Scanner SÍ
 *     tiene Scanner(String) real) -> javac SÍ compila -> aviso NO-DISP (categoria
 *     'no-disponible'), NUNCA un error inventado (D2) -- `CONSTRUCTORES_SOPORTADOS` filtra por
 *     FIRMA completa (clase+parámetros), más angosto que `MIEMBROS_SOPORTADOS` (métodos: CUALQUIER
 *     sobrecarga real de un nombre soportado cuenta como soportada) porque REQ-SUB-005 es
 *     explícito para constructores: "un único new Scanner(System.in)", "new String(texto)".
 * `new Random()`/`new Random(42)`/`new String("hola")`/`new Scanner(System.in)` (los 4 casos
 * EXPLÍCITAMENTE soportados de REQ-SUB-005) verificados limpios contra javac real.
 *
 * Fuera de alcance A PROPÓSITO (documentado, no un olvido — ver apply-progress de 1-D2c): un
 * argumento `'desconocido'` nunca dispara "sin-constructor-aplicable" (mismo sumidero de cascada
 * D2 que ya usa `visitarLlamadaDeMiembro`).
 */
function visitarNuevaInstancia(
  nodo: NodoNuevaInstancia,
  alcance: Alcance,
  ambito: AmbitoDeNombres,
  problemas: ProblemaAtribucion[],
): void {
  for (const argumento of nodo.argumentos) visitarArgumento(argumento, alcance, ambito, problemas);

  const problemaDelTipo = problemaDeNombreDeTipo(nodo.nombreTipo, nodo.rango, ambito);
  if (problemaDelTipo !== null) {
    problemas.push(problemaDelTipo);
    return;
  }

  // Tarea 1.21 (sub-lote 1-D4, gap "System.in/out/err como argumentos") + tarea NUEVA (sub-lote
  // 1-D5, nombre de tipo en el mensaje): `tiposDeArgumentos` (SOLO para el mensaje) usa
  // `nombreDeArgumentoParaMostrar` -- da "InputStream"/"PrintStream" para System.in/out/err (nunca
  // "desconocido", igual que javac) mientras que `argumentos` (abajo, lo que de verdad resuelve la
  // sobrecarga) sigue usando `argumentoDeSobrecarga` -- antes de la tarea 1.21, "new
  // Scanner(System.in)" se aceptaba en silencio SOLO porque el sumidero de cascada se disparaba
  // sobre el "new" COMPLETO.
  const tiposDeArgumentos = nodo.argumentos.map((argumento) => nombreDeArgumentoParaMostrar(argumento, alcance));
  const argumentos = nodo.argumentos.map((argumento) => argumentoDeSobrecarga(argumento, alcance));
  if (argumentos.includes('desconocido')) return; // D2, mismo sumidero de cascada de siempre

  const firma = resolverSobrecarga(nodo.nombreTipo, '<init>', argumentos);
  if (firma === null) {
    problemas.push({
      codigo: 'sin-constructor-aplicable',
      rango: nodo.rango,
      datos: { clase: nodo.nombreTipo, argumentos: tiposDeArgumentos },
    });
    return;
  }
  const claveDeFirma = `${nodo.nombreTipo}(${firma.parametros.join(',')})`;
  if (!CONSTRUCTORES_SOPORTADOS.has(claveDeFirma)) {
    // Tarea 1.26 (hallazgo del orquestador, reemplaza el diseño de la 1.25 para este tercer sitio de
    // emisión — CONSTRUCTOR): un constructor no tiene "nombre" propio en JLS (ver el comentario de
    // "sin-constructor-aplicable" más abajo en este mismo archivo) — antes se inventaba `nombre:
    // 'new ' + clase` para reusar el mismo código que método/campo, pero el texto resultante
    // describía una sintaxis ("Scanner.new Scanner") que Java no tiene (D2). Código propio, datos
    // SOLO `{ clase }` — el texto es-MX arma la sintaxis real (`new ${clase}`) él mismo.
    problemas.push({
      codigo: CODIGOS_NO_SOPORTADO.constructorDeBiblioteca,
      categoria: 'no-disponible',
      rango: nodo.rango,
      datos: { clase: nodo.nombreTipo },
    });
  }
}
