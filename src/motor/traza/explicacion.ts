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

export interface DatosPorClave {
  /** `int edad = 17;` (un solo declarador con valor). `sustituida` es `expresion` con sus variables cambiadas por su valor; `valor` es el resultado. */
  readonly 'declaracion-con-valor': { readonly nombre: string; readonly tipo: string; readonly expresion: string; readonly sustituida: string; readonly valor: string };
  /** `int total;` — la variable existe pero todavía no tiene valor. */
  readonly 'declaracion-sin-valor': { readonly nombre: string; readonly tipo: string };
  /** `int a = 1, b, c = 3;` — varios declaradores en un solo paso. `valor` es `null` si ese declarador no tiene inicializador. */
  readonly 'declaracion-varias': { readonly variables: readonly { readonly nombre: string; readonly tipo: string; readonly valor: string | null }[] };
  /** `x = x + 1;` — `expresion` es el lado derecho. `anterior` es lo que valía `nombre` (`null` si todavía no tenía valor). */
  readonly asignacion: { readonly nombre: string; readonly expresion: string; readonly sustituida: string; readonly valor: string; readonly anterior: string | null };
  /** `total += precio;` — `operador` es `+=`, `-=`, `*=`, `/=` o `%=`; `derecho` es el valor del lado derecho; `anterior` lo que valía `nombre`. */
  readonly 'asignacion-compuesta': {
    readonly nombre: string;
    readonly operador: string;
    readonly expresion: string;
    readonly sustituida: string;
    readonly derecho: string;
    readonly anterior: string;
    readonly valor: string;
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
  /** El visualizador detuvo la ejecución por su cuenta. */
  readonly detenido: { readonly causa: 'limite-pasos' | 'limite-caracteres' | 'no-disponible-en-ejecucion' | 'error-interno' };
}

export type ClaveExplicacion = keyof DatosPorClave;

/** Una clave con sus datos: lo que lleva `Paso.explicacion`. */
export type ExplicacionPaso = { readonly [K in ClaveExplicacion]: { readonly clave: K; readonly datos: DatosPorClave[K] } }[ClaveExplicacion];
