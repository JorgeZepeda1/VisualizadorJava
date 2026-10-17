// La explicación de un paso como DATOS (tarea 2.19, design.md §3.3, ADR 015). El motor no escribe frases: cada `Paso` lleva una CLAVE y los datos
// que su frase necesita —el texto de la expresión, la misma con sus variables sustituidas por su valor, el resultado—, ya con los valores
// escritos como Java los escribe (`'A'`, `"hola"`, `2.5`). El catálogo `src/textos/es-MX/explicaciones.ts` (único lugar con texto para el
// alumno, ADR 015) convierte cada clave en una frase en español de México; la interfaz solo la muestra. Definición de tipos — se ejercita en
// `interprete/explicar.test.ts` (qué datos arma el motor) y `textos/es-MX/explicaciones.test.ts` (qué frase sale).

/** Una variable que la expresión leyó y el valor que tenía en ese momento, ya escrito como Java lo escribe. */
export interface LecturaExplicada {
  readonly nombre: string;
  readonly valor: string;
}

export type TipoDeCiclo = 'while' | 'for' | 'do-while';

/**
 * Guardar en una variable de otro tipo CONVIERTE el valor (JLS 5.2): en `double promedio = suma / 3;` el cálculo da `8` (un `int`) y lo que queda guardado es `8.0`. `valor` de la explicación es lo guardado;
 * esto es lo que dio el cálculo ANTES de convertir, para no decir que `25 / 3` da 8.0. Solo se manda cuando la conversión cambia cómo se escribe el valor (un `int` que entra a un `long` se escribe igual).
 * Sale del registro del motor (el punto de la subexpresión), nunca se recalcula.
 */
export interface ConversionAlGuardar {
  /** El tipo de la variable, que es el destino de la conversión (`double`, `char`…). */
  readonly tipo: string;
  /** El valor que dio el cálculo antes de convertirlo, escrito como Java lo escribe (`8`, `'a'`, `65`). */
  readonly antes: string;
}

/**
 * Un `++` o `--` que va DENTRO de una expresión mayor (`int c = i++ + i;`): lo que vale la expresión `i++` y lo que dejó en la variable. Sin esto el alumno ve «`i++ + 8`» y no sabe de dónde sale el 8.
 * Los valores los midió el motor al evaluar; los efectos van en el orden en que Java los evalúa y solo los que SÍ se evaluaron (un `++` tras un `&&` que dio falso no deja efecto).
 */
export interface EfectoDeIncremento {
  /** El texto tal como está escrito: `i++`, `--j`. */
  readonly expresion: string;
  readonly nombre: string;
  /** Lo que vale la expresión (el valor de antes en un postfijo, el de después en un prefijo). */
  readonly valor: string;
  /** Lo que quedó en la variable. */
  readonly nuevo: string;
}

/**
 * La evidencia de un ciclo que no termina (tarea 3.3, REQ-EJEC-007): el ciclo más interno que seguía activo cuando el visualizador detuvo el programa por seguridad, visto en sus
 * últimas 100 vueltas. Sale de la traza, nunca de una suposición. Viaja en `FinEjecucion.diagnostico` y en los datos del paso `detenido`.
 */
export interface DiagnosticoDeCiclo {
  readonly ciclo: TipoDeCiclo;
  /** La línea donde está la condición del ciclo. */
  readonly linea: number;
  /** La condición tal como está escrita (`intentos <= 5`). */
  readonly condicion: string;
  /** Cuántas revisiones de la condición se miraron (2 a 100). */
  readonly vueltas: number;
  /**
   * Las variables de la condición que valieron LO MISMO en todas esas vueltas, con su valor escrito como Java lo escribe (`intentos` valió `1`). Solo se llena cuando ninguna variable de
   * la condición cambió: si alguna sí cambió (el ciclo puede ser solo largo), o la condición lee la entrada o un `Random`, queda vacía y no hay nada que citar.
   */
  readonly sinCambio: readonly LecturaExplicada[];
}

export interface DatosPorClave {
  /** `int edad = 17;` (un solo declarador con valor). `sustituida` es `expresion` con sus variables cambiadas por su valor; `valor` es el resultado. */
  readonly 'declaracion-con-valor': {
    readonly nombre: string;
    readonly tipo: string;
    readonly expresion: string;
    readonly sustituida: string;
    readonly valor: string;
    /** Presente (y `true`) cuando la expresión ES una sola lectura del teclado (`sc.nextInt()`): el valor es lo que el usuario escribió. */
    readonly leeDelTeclado?: true;
    /** Presente cuando guardar convierte el valor y cambia cómo se escribe (`double promedio = suma / 3;`: el cálculo da 8, se guarda 8.0). */
    readonly conversion?: ConversionAlGuardar;
    /** Presente cuando la expresión lleva `++` o `--` dentro. */
    readonly efectos?: readonly EfectoDeIncremento[];
  };
  /** `int total;` — la variable existe pero todavía no tiene valor. */
  readonly 'declaracion-sin-valor': { readonly nombre: string; readonly tipo: string };
  /** `int a = 1, b, c = 3;` — varios declaradores en un solo paso. `valor` es `null` si ese declarador no tiene inicializador. */
  readonly 'declaracion-varias': { readonly variables: readonly { readonly nombre: string; readonly tipo: string; readonly valor: string | null }[] };
  /** `x = x + 1;` — `expresion` es el lado derecho. `anterior` es lo que valía `nombre` (`null` si todavía no tenía valor). */
  readonly asignacion: {
    readonly nombre: string;
    readonly expresion: string;
    readonly sustituida: string;
    readonly valor: string;
    readonly anterior: string | null;
    /** Presente (y `true`) cuando el lado derecho ES una sola lectura del teclado (`x = sc.nextInt();`). */
    readonly leeDelTeclado?: true;
    /** Presente cuando guardar convierte el valor y cambia cómo se escribe (`g = a / b;` con `double g`: el cálculo da 3, se guarda 3.0). */
    readonly conversion?: ConversionAlGuardar;
    /** Presente cuando el lado derecho lleva `++` o `--` dentro (`i = i++;`). */
    readonly efectos?: readonly EfectoDeIncremento[];
  };
  /**
   * `total += precio;` — `operador` es `+=`, `-=`, `*=`, `/=` o `%=`; `derecho` es el valor del lado derecho TAL COMO lo escribió el alumno (antes de promoverlo a la operación: en `d += 2` con `double d` es `2`,
   * no `2.0`); `anterior` lo que valía `nombre`; `valor` lo que quedó guardado.
   */
  readonly 'asignacion-compuesta': {
    readonly nombre: string;
    readonly operador: string;
    readonly expresion: string;
    readonly sustituida: string;
    readonly derecho: string;
    readonly anterior: string;
    readonly valor: string;
    /**
     * Presente cuando guardar RECORTA el resultado de la operación (JLS 15.26.2: `x op= e` es `x = (T)(x op e)`): `int x = 10; x += 2.7;` suma 12.7 y, como `x` es `int`, se queda con 12. `tipo` es el de la
     * variable y `operado` lo que dio la operación antes de recortar, medido por el motor.
     */
    readonly recorte?: { readonly tipo: string; readonly operado: string };
    /** Presente cuando el lado derecho lleva `++` o `--` dentro (`s += a++;`). */
    readonly efectos?: readonly EfectoDeIncremento[];
  };
  /** `i++` o `++i` como sentencia. */
  readonly incremento: { readonly nombre: string; readonly anterior: string; readonly valor: string };
  /** `i--` o `--i` como sentencia. */
  readonly decremento: { readonly nombre: string; readonly anterior: string; readonly valor: string };
  /** El inicio o la actualización de un `for` con varias expresiones (`i = 0, j = 9`): un solo paso con todas. */
  readonly 'acciones-del-for': { readonly acciones: readonly string[] };
  /** `System.out.println(...)`, `print`, `printf`, o lo mismo en `System.err`. `texto` es lo que se escribió, sin el salto de línea. */
  readonly impresion: { readonly texto: string; readonly flujo: 'out' | 'err'; readonly saltoDeLinea: boolean };
  /** Una llamada que no imprime (`sc.nextInt();`, `sc.close();`) o un `new` suelto. */
  readonly expresion: { readonly expresion: string };
  /** La condición de un `if` o de un `else if`. */
  readonly 'condicion-if': {
    readonly condicion: string;
    readonly sustituida: string;
    readonly lecturas: readonly LecturaExplicada[];
    readonly resultado: boolean;
    readonly tieneSino: boolean;
  };
  /** La condición de un `while`, `for` o `do-while`. `vuelta` es la cuenta de veces que se revisa esa condición en esta ejecución del ciclo. */
  readonly 'condicion-ciclo': {
    readonly ciclo: TipoDeCiclo;
    readonly condicion: string;
    readonly sustituida: string;
    readonly lecturas: readonly LecturaExplicada[];
    readonly resultado: boolean;
    readonly vuelta: number;
  };
  readonly 'switch-elige-caso': { readonly expresion: string; readonly valor: string; readonly etiqueta: string };
  readonly 'switch-elige-defecto': { readonly expresion: string; readonly valor: string };
  readonly 'switch-sin-coincidencia': { readonly expresion: string; readonly valor: string };
  /** Paso a un grupo sin `break` antes: `etiqueta` es el texto del `case`, o `null` si es el `default`. */
  readonly 'switch-cae': { readonly etiqueta: string | null };
  /** `en` es lo que termina: el ciclo o el `switch` más cercano. */
  readonly break: { readonly en: 'ciclo' | 'switch' };
  readonly continue: { readonly ciclo: TipoDeCiclo };
  readonly return: Record<never, never>;
  readonly vacia: Record<never, never>;
  /** Java detuvo el programa: `clase` es el nombre calificado (`java.lang.ArithmeticException`), `mensaje` el de Java (`null` si no tiene). */
  readonly excepcion: { readonly clase: string; readonly mensaje: string | null };
  /**
   * El visualizador detuvo la ejecución por su cuenta. `diagnostico` (solo en `limite-pasos` y `limite-tiempo`, y solo si el programa estaba dentro de un ciclo con condición) es la evidencia
   * del ciclo que no terminaba (tarea 3.3).
   */
  readonly detenido: {
    readonly causa: 'limite-pasos' | 'limite-caracteres' | 'limite-tiempo' | 'no-disponible-en-ejecucion' | 'error-interno';
    readonly diagnostico?: DiagnosticoDeCiclo;
  };
}

export type ClaveExplicacion = keyof DatosPorClave;

/** Una clave con sus datos: lo que lleva `Paso.explicacion`. */
export type ExplicacionPaso = { readonly [K in ClaveExplicacion]: { readonly clave: K; readonly datos: DatosPorClave[K] } }[ClaveExplicacion];
