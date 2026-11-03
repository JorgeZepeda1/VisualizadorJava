// Modelo del libro de temas (R0.13, design §5.1, REQ-LIBRO-002, ADR 015): los tipos con los que se escribe cada tema del robot del libro. El contenido es un dato tipado, no Markdown: así el compilador exige
// las ocho secciones, las dos tareas de «Ahora hazlo tú» y las tres viñetas del resumen, y la interfaz (R2) los dibuja sin interpretar nada. Las frases marcan el código en línea con comillas invertidas,
// como el resto del catálogo (`presentacion/segmentos-de-codigo.ts`). Ningún tema escribe una salida de consola: cada salida que el libro muestre sale del golden del programa (REQ-LIBRO-003).

/** Los 34 temas de la lista cerrada (design §5.2, PQ-3). El id empieza por la unidad: `u6-while`. Es la única lista escrita a mano de ids; el tipo `IdTema` sale de ella. */
export const IDS_DE_TEMAS = [
  'u3-programa-y-main',
  'u3-salida',
  'u3-variables-y-tipos',
  'u3-asignacion',
  'u3-entrada-con-scanner',
  'u3-tipos-de-errores',
  'u4-operadores-aritmeticos',
  'u4-division-entera-y-modulo',
  'u4-incremento-y-decremento',
  'u4-precedencia',
  'u4-conversiones',
  'u4-math-y-random',
  'u4-textos-y-concatenacion',
  'u4-comparaciones',
  'u4-operadores-logicos',
  'u5-el-if',
  'u5-if-con-else',
  'u5-comparar-textos',
  'u5-else-if',
  'u5-decisiones-anidadas',
  'u5-switch',
  'u6-que-es-un-ciclo',
  'u6-while',
  'u6-contador-acumulador-bandera',
  'u6-do-while',
  'u6-for',
  'u6-ciclos-incrementales-y-decrementales',
  'u6-error-por-uno-y-ciclo-infinito',
  'u6-repetir-hasta-que-el-usuario-quiera',
  'u6-ciclos-anidados',
  'u6-break-y-continue',
  'u7-prueba-de-escritorio',
  'u7-depurar-con-el-visualizador',
  'u7-casos-de-prueba',
] as const;

export type IdTema = (typeof IDS_DE_TEMAS)[number];
export type Unidad = 3 | 4 | 5 | 6 | 7;
export type Oleada = 1 | 2;
export type EstadoDelTema = 'borrador' | 'aprobado';

/** Un programa del libro vive en `corpus/libro/<id-tema>/<programa>.java`: `u6-while/contar-en-voz-alta`. */
export type IdPrograma = `${IdTema}/${string}`;

/** Para qué sirve un programa dentro del tema (su `.meta.json` en el corpus lo repite y una prueba exige que coincidan). */
export type PapelDelPrograma = 'para-empezar' | 'paso-a-paso' | 'error-tipico' | 'ponte-a-prueba' | 'solucion';

/** Lo que el índice sabe de un tema sin cargar su contenido: va en el fragmento principal; el contenido de cada unidad se carga aparte (design §5.5). */
export interface EntradaDelIndice {
  readonly id: IdTema;
  readonly unidad: Unidad;
  readonly oleada: Oleada;
  /** Posición dentro de su unidad, empezando en 1, en el orden en que conviene leer los temas. */
  readonly orden: number;
  readonly titulo: string;
  /** Solo el PO aprueba un tema (REQ-LIBRO-007): nadie lo marca `aprobado` sin su visto bueno explícito. */
  readonly estado: EstadoDelTema;
  readonly aprobacion?: { readonly fecha: string; readonly huella: string };
}

export type Bloque =
  | { readonly tipo: 'parrafo'; readonly texto: string }
  | { readonly tipo: 'lista'; readonly elementos: readonly string[] }
  /** La forma general de la construcción: es código, no prosa (no cuenta como palabras ni se revisa como voz). */
  | { readonly tipo: 'forma'; readonly texto: string }
  | { readonly tipo: 'nota'; readonly texto: string };

export interface ErrorTipico {
  readonly texto: string;
  readonly programa: IdPrograma;
  /**
   * El mensaje que hoy da el visualizador para este programa contradice la explicación del tema (panel R0, experto en Java A4): para una variable declarada en un bloque que ya cerró dice «¿La declaraste
   * antes?», y sí la declaró. Mientras el motor no distinga el caso, el borrador no cita ese mensaje: muestra lo que dijo javac y la explicación, y el revisor (R3, E2) dará el mensaje propio.
   */
  readonly mensajeDelVisualizadorPendiente?: true;
}

/** Una predicción: el alumno lee el programa y adivina; la respuesta que ve es el golden de ese programa. */
export interface PreguntaDePrueba {
  readonly pregunta: string;
  readonly programa: IdPrograma;
}

/**
 * Una tarea de «Ahora hazlo tú». El alumno NO ve la solución (PQ-5): ve la consigna y, para comprobar, la entrada y la salida del golden de `solucion`, que queda en el corpus para el docente.
 * Por eso la consigna fija el formato de lo que se imprime: sin eso el alumno no podría comparar.
 */
export interface TareaDeModificar {
  readonly tipo: 'modificar';
  readonly consigna: string;
  readonly solucion: IdPrograma;
}

export interface TareaDeCrear {
  readonly tipo: 'crear';
  readonly consigna: string;
  readonly solucion: IdPrograma;
}

export type Tarea = TareaDeModificar | TareaDeCrear;

/** Lo que se redacta de un tema: las ocho secciones de REQ-LIBRO-002, en su orden. */
export interface ContenidoDelTema {
  /** 1. «Para empezar»: una situación y un programa corto; el alumno predice antes de «Ver la salida». */
  readonly paraEmpezar: { readonly situacion: string; readonly programa: IdPrograma };
  /** 2. «La idea»: de 3 a 5 frases, una sola idea por tema. */
  readonly idea: readonly string[];
  /** 3. «Cómo se escribe»: la forma general y el orden en que Java la ejecuta. */
  readonly comoSeEscribe: readonly Bloque[];
  /** 4. «Míralo paso a paso»: el programa que se abre en el visualizador, con qué mirar en él. `sugerirReto` propone encender el modo reto (hay condiciones que predecir). */
  readonly pasoAPaso: { readonly queObservar: string; readonly programa: IdPrograma; readonly sugerirReto: boolean };
  /** 5. «Errores típicos»: cada uno con un mini ejemplo del corpus (corre y da otra cosa, o javac lo rechaza). */
  readonly erroresTipicos: readonly ErrorTipico[];
  /** 6. «Ponte a prueba»: 2 o 3 predicciones; la respuesta es el golden. */
  readonly ponteAPrueba: readonly PreguntaDePrueba[];
  /** 7. «Ahora hazlo tú»: una tarea de modificar y una de crear, en ese orden (PRIMM). */
  readonly ahoraHazloTu: readonly [TareaDeModificar, TareaDeCrear];
  /** 8. «En resumen»: tres viñetas. */
  readonly resumen: readonly [string, string, string];
  readonly relacionados?: readonly IdTema[];
}

export interface Tema extends EntradaDelIndice, ContenidoDelTema {}
