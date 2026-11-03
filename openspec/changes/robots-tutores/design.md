# Diseño técnico: Robots tutores (`robots-tutores`)

> Fase `sdd-design`, **actualización 1** · 2026-10-17 · Rol: **Arquitecto de Software**, con el criterio del **Diseñador Pedagógico** en el catálogo y en el libro. Fuente: `proposal.md` (R-D1–R-D8, CR1–CR15, PQ-1–PQ-6), `specs/*` (42 requisitos: 37 nuevos y 5 modificados; 100 escenarios), el panel 1 (`panel-1*.md`) y el código de los hitos 1 y 2. Lo comprobado contra el código va marcado **[verificado en diseño]**. Cada decisión no trivial tendrá su ADR (017–020, primeras tareas de cada hito).
>
> **Tamaño:** la plantilla pide menos de 800 palabras; como en `visualizador-java/design.md`, este documento fija contratos y reglas exactas para que `sdd-apply` no reabra decisiones.

## 0. Resumen y mapa de decisiones

Los tres robots no agregan capas ni dependencias. El **motor** sabe cosas nuevas que la interfaz no puede calcular sin reevaluar Java; **presentación** decide quién habla y qué hay en la ranura de acciones; **textos** guarda cada frase; **interfaz** dibuja personajes, distribuciones, tarjetas, libro y franja del revisor.

| Decisión | Elegida | Descartada | Por qué | ADR |
|---|---|---|---|---|
| Tres robots (R-D5) | Tres personajes con silueta y accesorio propios, **un hablante** en una **ranura fija** | Un robot con tres papeles (diseñador); varios robots a la vez | Decisión del PO; los requisitos del diseñador evitan que compitan por la atención | 017 |
| Nota del revisor dentro de un paso | El revisor **toma el turno** del paso (dice la narración + la evidencia) | Mini retrato del revisor dentro del globo del narrador (plan anterior) | «Nada de un robot dentro del globo de otro»; sin clics extra | 017 |
| Puertas y navegación | Ranura de acciones bajo el globo: puertas (S0), Anterior/Siguiente, tarjetas del reto, acciones del fin; una sola cosa a la vez | Pantalla de inicio aparte; botones en la barra inferior | Un clic menos (diseñador H1); «Siguiente» junto a quien lo pide (H2); el reto ocupa el mismo lugar | 017 |
| Una puerta sin destino | Aparece cuando su destino tiene contenido publicado (PQ-2) | Puerta a «Este capítulo llega pronto» | Ninguna puerta lleva a un callejón | 017 |
| Proyector (5.5) | Distribución «reto proyectado»: código 58 %, 24 px con ajuste de línea, variables sin «Tipo», consola con sus últimas líneas | Escalar todo al 150 % | El diseñador midió que el reto solo cabe así; 53 caracteres a 24 px no caben a 1024 sin partir la línea | 017 |
| Galería en R0 | Solo el corpus curricular y los ejercicios del PO, ya verificados | Esperar la 5.2 con autoría | La navegación «Ejemplos» y la puerta del ejemplo la necesitan; la autoría sigue en 5.2/5.3 | 017 |
| `import.meta.glob` del corpus | Solo en `src/interfaz/datos/` (diferido); presentación recibe texto crudo | En `textos` o `presentacion` | Mantiene puras y sin Vite a las capas sin DOM; la matriz de ADR 001 no cambia | 017 |
| Sustitución en el globo (PQ-6) | La narración la conserva; el panel da el detalle por pieza; «un dueño por dato» se aplica a la vuelta y al vocabulario | Solo en el panel (H7) | El globo es la región `aria-live` y lo que se ve en proyector | 017 |
| Opciones del reto | «Consecuencia, porque razón» como **afirmaciones** verificables contra la traza | Solo destino (B); dos tiempos (C), que queda de salida | Con razón la tercera opción nunca es relleno y existe el «Casi» | 018 |
| Cuándo no hay reto | El motor marca cada condición: `admiteReto` y su motivo (constante, lee entrada, azar, con efectos, sin sustitución) | Decidirlo en la interfaz | Constante es JLS 15.29: solo el compilador lo sabe (D2) | 018 |
| Balance (CR5) | Dos grupos de familias de concepto (mismo veredicto / distinto) y elección que acerca a la mitad la proporción de la traza | Azar; orden fijo | Determinista, reproducible y medible; si no alcanza, el PO decide la forma C | 018 |
| «Ya entendí» ampliado | Contención estática (`cicloPadre`) + búsqueda hacia adelante en la traza ya calculada | Contar vueltas desde el principio | El fin del ciclo solo se conoce por la traza; con entrada en vivo sigue silenciado | 018 |
| Libro | Datos tipados por tema con 8 secciones; todos sus programas en `corpus/libro/` con goldens | Markdown | Cero dependencias; la regla de textos en catálogo ya existe | 019 |
| Aprobación | Estado por tema + **huella** SHA-256 de textos y programas | Bloquear el merge de borradores | `main` siempre desplegable; un cambio posterior se detecta solo | 019 |
| Trampa 3 | `Terminacion` del grupo con el análisis de alcanzabilidad que ya existe (JLS 14.22) | «La última sentencia es simple» | E7: los grupos que terminan en bloque o `if/else` también caen | 020 |
| Notas sin pérdida (E8) | El motor anota `division-entera.exacta` y `resto-del-renglon.soloBlancos` | La interfaz calcula `a % b` o revisa el texto | D2: nada se recalcula en la interfaz | 020 |
| `;` en errores (E2) | El motor agrega `cuerpoVacioAntes` al problema; el porqué de su familia lo cita | Buscar trampas con error de compilación | REQ-REV-003 sigue sin buscar trampas; el hecho llega por el error | 020 |

## 1. Arquitectura

### 1.1 Capas (ADR 001, sin cambios en la matriz)

```
 motor        ir/{generar-ir,vista-programa}  ── CondicionEnVista, RamasDeIf+, EstructuraDeSwitch, cicloPadre   (R1)
              interprete/{expresiones,explicar} ── piezas, hechos (relacion, mismo-texto | division-entera, resto-del-renglon)
              revision/ (R3) ── trampas en VistaPrograma · problemas.ts ── cuerpoVacioAntes (R3)
 textos       es-MX/{explicaciones,robot,pantalla,galeria} (R0) · reto (R1) · libro/* (R0–R4) · revisor (R3)
 presentacion hablante.ts · ranura.ts · galeria.ts (R0) · reto.ts + reto/{afirmaciones,familias,silenciado}.ts (R1)
              libro.ts (R2) · revisor.ts (R3)                                                      (puras, sin DOM)
 interfaz     componentes/{Robot,Explicacion,Saludo,Navegacion,RanuraDeAcciones,AjustesDeLaClase,Galeria} (R0)
              componentes/{TarjetasDelReto,InterruptorReto} (R1) · libro/* (R2, diferido) · {FranjaDelRevisor} (R3)
              datos/{programas-crudos,libro-crudo}.ts (únicos import.meta.glob, diferidos) · estilos/{aplicacion,proyector}.css
```

`motor/vista.ts` exporta los tipos nuevos; nadie fuera del motor importa `revision/`. El protocolo del trabajador **no cambia**: la estructura viaja dentro de `vista` en el mensaje `compilado` y los hechos dentro de cada `Paso`.

### 1.2 Contratos nuevos del motor

```ts
// src/motor/ir/vista-programa.ts — R1
interface VistaPrograma {
  /* …lo de hoy (nodos, ramasDeIf…)… */
  readonly condiciones?: readonly CondicionEnVista[];      // una por condición de if/while/do/for y selector de switch
  readonly switches?: readonly EstructuraDeSwitch[];       // R1; la trampa 3 la reutiliza en R3
  readonly trampas?: readonly Trampa[];                    // R3
}
// nodos[n] agrega: readonly cicloPadre?: number   (el while/do/for más cercano que contiene al nodo)
interface CondicionEnVista {
  readonly nodo: number; readonly construccion: 'if' | 'else-if' | 'while' | 'do-while' | 'for' | 'switch';
  readonly forma: FormaDeCondicion;                         // estática; los índices apuntan a piezas
  readonly variables: readonly string[];                    // las que lee, en orden (para «Valores ahora»)
  readonly admiteReto: boolean;
  readonly motivoSinReto?: 'constante' | 'lee-entrada' | 'azar' | 'con-efectos' | 'sin-sustitucion';
  readonly rango?: { readonly variable: string; readonly desde: string; readonly hasta: string; readonly pregunta: 'fuera' | 'dentro' };
  readonly hayInstruccionesDespues: boolean;                // ciclos: `main` sigue después del ciclo
}
type FormaDeCondicion = { tipo: 'pieza'; indice: number } | { tipo: 'no'; operando: FormaDeCondicion }
                      | { tipo: 'y' | 'o'; izquierda: FormaDeCondicion; derecha: FormaDeCondicion };
interface RamasDeIf { /* nodo, entonces, sino de hoy */ readonly sinoEsIf: boolean; readonly enEscalera: boolean; readonly entoncesTermina: Terminacion }
type Terminacion = 'normal' | 'abrupta' | 'depende';       // abrupta: nunca completa normalmente (JLS 14.22)
interface EstructuraDeSwitch { readonly nodo: number; readonly grupos: readonly GrupoDeSwitch[]; readonly tieneDefault: boolean }
interface GrupoDeSwitch { readonly etiquetas: readonly { nodo: number; texto: string | null }[]; readonly vacio: boolean; readonly termina: Terminacion; readonly lineaDelFinal: number | null }

// src/motor/traza/explicacion.ts — R1: condicion-if, condicion-ciclo y switch-elige-* agregan
readonly piezas?: readonly PiezaDeCondicion[];
interface PiezaDeCondicion { texto: string; sustituida: string | null; resultado: boolean | null; punto: number;   // null: no se revisó
                             clase: 'comparacion' | 'variable' | 'llamada' | 'constante'; operador?: '<' | '<=' | '>' | '>=' | '==' | '!=' }

// src/motor/traza/paso.ts
interface Paso { /* … */ readonly hechos?: readonly HechoDelPaso[] }
type HechoDelPaso =
  | { readonly punto: number; readonly tipo: 'relacion'; readonly relacion: 'menor' | 'igual' | 'mayor' | 'sin-orden' }   // R1: con promociones de Java; NaN → sin-orden
  | { readonly punto: number; readonly tipo: 'mismo-texto'; readonly mismoTexto: boolean }                                  // R1: ==/!= entre String (StringJava.equals)
  | { readonly punto: number; readonly tipo: 'division-entera'; readonly exacta: boolean }                                  // R3 (E8): resto 0 con la semántica de Java
  | { readonly punto: number; readonly tipo: 'resto-del-renglon'; readonly soloBlancos: boolean };                          // R3 (E8): lo que leyó nextLine()

// src/motor/problemas.ts — R3 (E2): DatosPorCodigo['variable-no-declarada'] y ['else-sin-if'] agregan
readonly cuerpoVacioAntes?: { readonly construccion: 'if' | 'for' | 'while'; readonly linea: number; readonly variable?: string };
```

- `admiteReto` y su motivo se calculan una vez en `generar-ir.ts`: **constante** con la misma prueba de expresión constante que usa `semantica/alcanzabilidad.ts` (`valorDeUnaCondicionConstante`, JLS 15.29) **[verificado en diseño]**; **lee-entrada/azar** si alguna `LlamadaIr` del árbol es de `Scanner` o de `Random`; **con-efectos** si contiene `++`, `--` o una asignación; **sin-sustitucion** si alguna pieza no tiene sustitución en el plan. El paso de condición ya lleva `control.predecible: true` (`interprete/sentencias.ts:216`) **[verificado en diseño]**: desde R1 se marca solo si `admiteReto`, y los pasos `switch-elige-*` lo llevan con la misma regla.
- `rango`: patrón `v < a || v > b` (o con `<=`/`>=`) → `fuera`, y `v >= a && v <= b` → `dentro`, con `a` y `b` constantes y `a ≤ b` decidido por el plegado de constantes del compilador.
- `piezas` las llena `explicar.ts` con la misma función que ya arma la sustitución completa; los hechos los anota `expresiones.ts` con las mismas operaciones que deciden el resultado. **[verificado en diseño]** `Paso.valores` ya trae el valor de cada punto del plan y `Paso.cambios` cada cambio con su punto (`traza/paso.ts:74–75`).
- `cuerpoVacioAntes`: `variable-no-declarada` lo agrega la atribución si la sentencia anterior del mismo bloque es un `for` con cuerpo vacío cuyo inicio declara ese nombre; `else-sin-if` lo agrega el analizador si antes de la sentencia previa al `else` hay un `if` sin `else` cuyo cuerpo es la sentencia vacía.

## 2. Pantalla (R0)

### 2.1 Flujo (diseñador S0–S6)

| Estado | Globo (un hablante) | Ranura bajo el globo | Hito |
|---|---|---|---|
| S0 Llegada | Paso a paso saluda | Puertas «Leer un tema» (si hay temas publicados), «Ver un ejemplo paso a paso», «Probar mi programa»; cada puerta lleva el **accesorio** del robot que ayuda ahí (libro, puntero, lupa), no su cara | R0 |
| S1 Tema del libro | Robot del libro presenta «Para empezar» | Tema anterior · Tema siguiente | R2 |
| S2 Paso a paso | Paso a paso narra (franja «Ejemplo del libro: … · ← Volver al tema» si viene del libro) | ◀ Anterior · Siguiente ▶ (primario) | R0, R2 |
| S3 Reto (a) → (b) | (a) la narración del paso anterior; (b) la pregunta, rótulo «Reto · línea N», robot con «?» | (b) tres tarjetas; foco en la 1 | R1 |
| S4 Revelación | La retroalimentación **en lugar** de la narración; panel de condición revelado | Siguiente ▶ con el foco | R1 |
| S5 Fin | Resumen de cómo terminó | «Probar con otros datos», «Modificar el programa» (+ «Volver al tema», «Siguiente tema» si viene del libro) | R0, R2 |
| S6 Modificar | Error → el revisor; trampas → franja del revisor | — | R0, R3 |

### 2.2 Estado y acciones (`src/interfaz/estado/reductor.ts`)

```ts
interface EstadoApp {
  /* modo 'edicion' | 'compilando' | 'visualizacion', codigo, ejecucion, aviso, navegacion de hoy */
  readonly seccion: 'paso-a-paso' | 'ejemplos' | 'libro';
  readonly saludo: boolean;                                  // S0 hasta la primera acción (puerta, edición, visualizar, enlace)
  readonly ajustes: { proyector: boolean; velocidad: NivelDeVelocidad; reto: boolean; revisor: 'al-inicio' | 'despues' };
  readonly entradaPreparada: string;                         // hoy fija en '' (Visualizador.tsx:54) [verificado en diseño]
  readonly origen: { tipo: 'propio' } | { tipo: 'galeria'; id: IdDeGaleria; demostracion: boolean }
                 | { tipo: 'libro'; tema: IdTema; ejemplo: string } | { tipo: 'enlace' };
  readonly programaGuardado: { codigo: string; entrada: string } | null;   // «Volver a mi programa»
  readonly turno: 'paso' | 'revisor';                        // R3: «Ver explicación»; cualquier navegación lo regresa a 'paso'
  readonly reto: { respuestas: ReadonlyMap<number, 0 | 1 | 2>; silenciados: readonly Silenciado[]; yaSeExplico: boolean };   // R1
}
// Acciones nuevas: ir-a-seccion · cargar-programa { codigo, entradaPreparada, origen } · volver-a-mi-programa · cambiar-ajuste
//                  (R1) alternar-reto · responder-reto { paso, opcion } · silenciar-ciclo { nodoCiclo, paso } · (R3) ver-explicacion-del-revisor
```

`cargar-programa` es la acción que también necesitaba la 5.2: la crea R0 y la reutilizan el libro y la 5.2. La `Traza` sigue fuera de React y el editor no se desmonta al cambiar de sección (REQ-PANT-002).

### 2.3 Presentación: hablante y ranura

```ts
// src/presentacion/hablante.ts
type Hablante = 'paso-a-paso' | 'revisor' | 'libro';
function derivarHablante(e: { seccion; problema: boolean; turno: 'paso' | 'revisor'; trampaEnEstePaso: boolean; retoContestadoEnEstePaso: boolean }): Hablante;
//   libro si seccion = 'libro' · revisor si problema, turno = 'revisor' o (trampaEnEstePaso y no retoContestadoEnEstePaso) · paso-a-paso en lo demás
// src/presentacion/ranura.ts
type Ranura = { tipo: 'puertas'; puertas: readonly Puerta[] } | { tipo: 'navegacion'; alPrincipio: boolean; alFinal: boolean }
            | { tipo: 'reto'; reto: RetoVista } | { tipo: 'fin'; acciones: readonly AccionDeFin[] } | { tipo: 'ninguna' };
// ModeloVista agrega: hablante, ranura, posicion: { paso: number; total: number | null }   (total solo si el programa terminó: H9)
```

### 2.4 Distribuciones (CSS con áreas de cuadrícula; `data-proyector`, `data-reto`)

| Distribución | Código | Columna derecha (orden) | Ranura | Medida que la respalda |
|---|---|---|---|---|
| Escritorio ≥ 1024 px | 55 % | robot + globo + ranura · condición · variables · consola | pegada bajo el globo | 1366×768: robot y Siguiente sin desplazar (hoy la barra queda cortada, H2) |
| Proyector (`data-proyector`) | 58 %, ≥ 24 px, `EditorView.lineWrapping` | igual; variables sin «Tipo»; consola: últimas 4 líneas; controles ≥ 44 px | igual | 1280: 742 px ≈ 51 caracteres; 1024: 594 px ≈ 41, por eso se parte la línea (REQ-AULA-004) |
| Reto pendiente (`data-reto="pendiente"`) | igual | **solo el reto**: pregunta, «Valores ahora: `cantidad` = 2», tres tarjetas; panel de condición oculto; consola compacta (2 líneas) | las tarjetas son la ranura | maqueta del diseñador: cabe a 1280×720, 1024×768 y 390 solo así (H3) |
| Celular < 700 px | 35vh, centrado en la línea actual (`scrollIntoView` al centro) | globo · variables · consola | barra inferior fija (`position: sticky`); en el reto crece hasta 60vh | 390 px: hoy el globo queda en y = 1050 con 844 de alto (H2) |

Alturas estimadas del reto pendiente a 1024×768 en proyector: encabezado 48 + pregunta (2 renglones) 80 + «Valores ahora» 32 + 3 tarjetas × 64 + separaciones 40 ≈ 392 px; tras contestar: retroalimentación 130 + tarjetas atenuadas 192 + Siguiente 56 ≈ 378 px. La prueba E2E las mide en los tres motores.

### 2.5 Galería «Ejemplos» (REQ-AULA-001)

- `src/interfaz/datos/programas-crudos.ts` (fragmento diferido): `import.meta.glob` de `corpus/curso/*.{java,entrada.txt}` y `corpus/experimentos/ejercicios-del-po/*` con `{ query: '?raw', import: 'default' }`.
- `src/presentacion/galeria.ts` (pura): arma secciones por unidad desde el texto crudo; la máquina de snacks (5 archivos con el mismo código **[verificado en diseño]**) es una entrada con 5 datos de ejemplo; la entrada preparada es el texto del `.entrada.txt` tal cual (las 20 terminan en `\n` **[verificado en diseño]**).
- `src/textos/es-MX/galeria.ts`: `IdDeGaleria` (unión cerrada), título y «Qué observar» por programa, y `demostracion` (datos) para los que abren con el revisor en «después». Propuesta para el PO: `u5-switch-sin-break-fallthrough`, `u5-escalera-else-if-orden-incorrecto`, `u6-error-por-uno`, `u6-ciclo-infinito-demo`, `u6-prediccion-while-no-ejecuta`, `u4-prediccion-or-logico`, `u4-prediccion-precedencia`.
- Guarda: todo `.java` de esas carpetas tiene entrada en el catálogo y toda `.entrada.txt` termina en `\n` (prueba que falla si se agrega un programa sin texto).

### 2.6 Voz del narrador y pistas (REQ-PANT-004, REQ-PANT-010)

- `textos/es-MX/explicaciones.ts` pasa a las plantillas T1–T3 del maestro (`panel-1-maestro.md` §4) con «Java revisa…»; en R0 la condición usa la sustitución completa que ya existe; desde R1.5, con las piezas, agrega «ningún lado da `true`» / «basta con que un lado dé `true`». **[verificado en diseño]** `v0.3.1` conserva «Reviso…» (`explicaciones.ts:70–78` del árbol de correcciones).
- `textos/es-MX/voz.test.ts`: rechaza en todo el catálogo de los robots `Reviso`, `Guardo`, `verdadero`, `falso`, `es falso`, `iteración`, `revisión N` y «trampa» sin «de Java» (con lista de excepciones revisada).
- H7: `ContadorVueltas` sale de la zona de explicación; la vuelta vive en la etiqueta del editor (`presentacion/resaltados.ts`, ya existe). H9: leyenda ▶/▷ junto al editor; la línea siguiente pasa a contorno punteado tenue; `posicion.total` es `null` hasta que la traza termina por fin de programa o excepción; teclear en modo visualización dispara el aviso «Para cambiar el código pulsa «Editar programa»» (`aria-live="polite"`). La consola vacía lleva título y «Aquí aparecerá lo que imprima tu programa».

## 3. Tres robots (REQ-PANT-008, REQ-PANT-009)

### 3.1 Personajes (propuesta para PQ-1)

| Personaje (`data-personaje`) | Nombre visible (recomendado) | Silueta (`data-forma`) | Accesorio | Color (tercera pista, contorno AA) |
|---|---|---|---|---|
| `paso-a-paso` | Robot paso a paso | `cuadrada-con-antena` (el robot de hoy) | puntero ▶ como el marcador del editor; en el reto, letrero «?» | azul |
| `revisor` | Robot revisor | `redonda-tipo-casco` | lupa con «!», la misma de la marca de trampa del editor | ámbar |
| `libro` | Robot del libro | `ancha-con-lentes` | libro abierto | verde |

`Robot.tsx` recibe `personaje` y `animo`; las tres figuras comparten `viewBox` y tamaño de ranura; los rostros (feliz, neutral, pensativo, preocupado amable de C5, seguridad) se adaptan a cada cabeza. Nombre visible bajo la figura y nombre accesible de `textos/es-MX/robot.ts` («Robot revisor: está preocupado…»). Sin animación fuera de `prefers-reduced-motion: no-preference`.

### 3.2 Quién habla y transición

Regla única en `derivarHablante` (§2.3). Al cambiar el hablante, `Explicacion` antepone en la región `aria-live` el nombre del nuevo robot («Robot revisor: …») —solo cuando cambió, para no repetirlo en cada paso— y hace un fundido de 150 ms (instantáneo con movimiento reducido). La figura nunca se mueve de su ranura. **Nunca** se pinta un robot dentro del globo: el plan anterior ponía un «mini retrato» del revisor en la nota del narrador; ahora el revisor toma el turno del paso y dice la narración del motor más su evidencia (§6.4).

## 4. Modo reto (R1)

### 4.1 Cuándo hay reto

`construirReto(siguiente, aplicados, vista, estadoReto)` devuelve algo solo si el **siguiente** paso es `condicion-if`, `condicion-ciclo` o `switch-elige-*` con `control.predecible` (= `admiteReto`) y no está silenciado (§4.7). Como el reto se pregunta en el paso anterior, el resultado todavía no está aplicado (la idea de D4). Los pasos sin reto se cuentan en la prueba de propiedad con su `motivoSinReto`.

### 4.2 Modelo: opción = consecuencia + razón como afirmaciones

```ts
// src/presentacion/reto/afirmaciones.ts
type Veredicto = 'entra' | 'no-entra' | 'va-al-sino' | 'los-dos' | 'repite' | 'sale' | { caso: string } | 'defecto' | 'ninguno';
type Afirmacion =
  | { tipo: 'veredicto'; veredicto: Veredicto }                          // vs control.resultado o la clave del switch
  | { tipo: 'pieza'; indice: number; resultado: boolean }                // vs piezas[i].resultado (nunca para una pieza con null)
  | { tipo: 'pieza-sin-revisar'; indice: number }                        // vs piezas[i].resultado === null
  | { tipo: 'como-la-revision-anterior'; pasoAnterior: number }          // vs el paso anterior del mismo nodo
  | { tipo: 'variable-vale'; nombre: string; valor: string }             // vs el estado del paso (valor escrito por el motor)
  | { tipo: 'cambio'; nombre: string; linea: number; antes: string; despues: string }   // vs Paso.cambios
  | { tipo: 'sin-cambio-en-la-vuelta'; nombres: readonly string[] }      // vs cambios entre las dos revisiones
  | { tipo: 'rango'; pregunta: 'fuera' | 'dentro' }                      // vs CondicionEnVista.rango
  | { tipo: 'grupo-termina'; termina: 'abrupta' | 'normal' }             // vs EstructuraDeSwitch, confirmado por la traza
  | { tipo: 'valor-leido'; texto: string }                               // vs valores del punto de la lectura
  | { tipo: 'regla'; regla: ReglaDeJava };                               // regla equivocada: siempre falsa, respaldada por el oráculo
interface OpcionReto { familia: FamiliaDeOpcion; consecuencia: Veredicto; afirmaciones: readonly Afirmacion[]; retro: 'acierto' | 'parcial' | 'error' }
interface RetoVista { nodo: number; linea: number; construccion: CondicionEnVista['construccion']; revision: number;
                      valoresAhora: readonly { nombre: string; valor: string }[];          // ModeloVista.variables ∩ CondicionEnVista.variables
                      opciones: readonly [OpcionReto, OpcionReto, OpcionReto]; correcta: 0 | 1 | 2; enCiclo: number | null }
export function verificar(a: Afirmacion, contexto: ContextoDeReto): boolean;   // solo LEE datos del motor
```

Los textos (`src/textos/es-MX/reto.ts`) reciben solo los datos de las afirmaciones: encabezado (consecuencia, ≤ 30 caracteres) y razón (total ≤ 100). Cada `ReglaDeJava` tiene un programa en `corpus/experimentos/reto/` cuyo golden muestra la regla verdadera (REQ-DIFF-009), p. ej. `o-revisa-el-segundo.java` (`int x = 0; boolean r = 1 < 0 || x++ == 0; System.out.println(x);` imprime `1`).

### 4.3 Catálogo de familias (v2, para la revisión del PO en R1.1)

Textos de ejemplo del maestro (`panel-1-maestro.md` §3.2). «Veredicto» dice si la consecuencia coincide con la de la correcta (**mismo**), la contradice (**contrario**) o es otra (**tercero**); es lo que cuenta el balance.

| Familia | Pos. | Aplica cuando (datos del motor) | Veredicto | Retro | Ejemplo |
|---|---|---|---|---|---|
| frontera | 2 | pieza `<`/`>` con `relacion = igual`, o `<=`/`>=` con `igual` | contrario | ✖ | «Da otra vuelta, porque 10 y 10 son iguales y `10 < 10` lo acepta.» |
| revision-anterior | 2 | el mismo nodo dio lo contrario en su revisión anterior y una variable de la condición cambió (último `Cambio`) | contrario | ✖ | «Da otra vuelta, porque `i` sigue valiendo 5 y `5 <= 5` da `true`.» |
| valor-anterior | 2 | pieza `variable` `boolean` con un `Cambio` previo | contrario | ✖ | «Se va al `else`, porque `seEncontroNegativo` vale `false`, como al crearla.» |
| textos-iguales | 2 | `==`/`!=` entre `String` con `mismo-texto: true` y resultado que sorprende | contrario | ✖ | «Entra al `if`, porque los dos textos dicen «si».» |
| rango-al-reves | 2 | `CondicionEnVista.rango` | contrario | ✖ | «Entra al `if`, porque `cantidad` vale 2, que sí está entre 1 y 3.» |
| simbolo-al-reves | 2 | condición de **una sola** comparación `<`, `<=`, `>`, `>=` con relación `menor`/`mayor` | contrario | ✖ | «Entra al `if`, porque `<` pregunta si 50 es mayor que 36, y lo es.» |
| pieza-volteada | 2 | siempre (último recurso; ≤ 20 % del corpus) | contrario | ✖ | «Entra al `if`, porque `50 > 200` da `true`.» |
| o-se-detiene-con-false | 3 | `\|\|` con la izquierda `false` | mismo si todo dio `false`; contrario si dio `true` | ◐ / ✖ | «Se salta el `if`: `2 < 1` da `false`, y con `\|\|` eso ya basta.» |
| o-necesita-los-dos | 3 | `\|\|` | mismo si dio `false`; contrario si dio `true` | ◐ / ✖ | «Se salta el `if`: con `\|\|` tendrían que dar `true` los dos lados.» |
| y-basta-uno | 3 | `&&` que dio `false` | contrario | ✖ | «Entra al `if`, porque con `&&` basta con que un lado se cumpla.» |
| escalera-revisa-todas | 3 | `if`/`else if` `true` con `sinoEsIf` | mismo | ◐ | «Entra al primer bloque y después también revisa `calificacion >= 90`.» |
| escalera-elige-la-mejor | 3 | `if`/`else if` `true` con `sinoEsIf` | contrario | ✖ | «Se salta este bloque: Java busca la condición más exacta de la escalera.» |
| dos-bloques | 3 | `if` con `else` | tercero | ✖ | «Ejecuta los dos: primero el bloque del `if` y luego el del `else`.» |
| return-no-termina | 3 | `if` `true` con `entoncesTermina = abrupta` por `return` | mismo | ◐ | «Entra al `if` y, después del `return`, sigue en la línea 59.» |
| primera-revision | 3 | `while`/`for`, revisión 1, `false` | contrario | ✖ | «Da una vuelta y luego sale, porque el `while` entra al menos una vez.» |
| for-actualiza-primero | 3 | `for`, revisión 1, `true` | mismo | ◐ | «Entra, pero antes de la primera vuelta el `for` ya hizo el `i++`.» |
| el-ciclo-cuenta-solo | 3 | `while`/`do-while`, revisión > 1, `true`, sin `Cambio` de las variables de la condición en la vuelta anterior | mismo | ◐ | «Da otra vuelta, y a la quinta sale solo, porque la condición dice `<= 5`.» |
| sale-y-termina-el-programa | 3 | ciclo `false` con `hayInstruccionesDespues` | mismo | ◐ | «Sale del ciclo y ahí se acaba el programa.» |
| do-while-una-vuelta | 3 | `do-while` `true` | contrario | ✖ | «Sale del ciclo, porque un `do-while` solo da una vuelta.» |
| *universales de respaldo* | 3 | `if-como-ciclo`/`if-espera` (todo `if`, ≤ 1 de cada 3 retos de `if` del programa); `ciclo-no-revisa` (ciclo `true`); `una-vuelta-mas` (ciclo `false`, revisión > 1) | mismo / mismo / contrario | ✖ | «Entra al `if` y, al terminar el bloque, vuelve a revisar la condición.» |
| switch: defecto | 2 | el selector coincide con un `case`; razón concreta con `valor-leido` + `cambio` si la lectura se transformó antes | otro destino | ✖ | «Salta al `default`: escribiste `a1` en minúsculas y el `case` dice "A1".» |
| switch: sin-default **(nueva, propuesta)** | 2 | el selector no coincide y hay `default` | otro destino | ✖ | «No ejecuta nada del `switch`, porque ningún `case` dice "Z9".» |
| switch: error-si-no-coincide **(nueva, propuesta)** | 2 | el selector no coincide y no hay `default` | otro destino | ✖ | «Java marca un error, porque ningún `case` coincide.» |
| switch: se-detiene / sigue-de-largo | 3 | grupo elegido no último, `termina` `normal` / `abrupta` | mismo destino | ◐ | «Salta al `case "A1"` y sigue de largo con los demás `case`.» |
| switch: revisa-los-demas **(nueva, propuesta)** | 3 | todo `switch` (respaldo) | mismo destino | ◐ | «Salta al `default` y después revisa los `case` que faltan.» |

**Quitadas por omisión:** `y-revisa-los-dos` (castiga un razonamiento correcto, maestro H4; solo volvería si el lado derecho tuviera un efecto visible) y `otra-etiqueta` (relleno; con etiquetas apiladas da la misma salida, R4.2). Las tres familias de `switch` marcadas como propuesta cubren lo que el catálogo del maestro no traía (selector que va al `default` o a ninguno) y las decide el PO en R1.1.

### 4.4 Selección determinista

1. **Opción correcta:** veredicto del motor + las piezas que deciden (`||` verdadero: la primera `true`; `||` falso: todas; `&&` falso: la primera `false` y las demás «no revisadas»; `&&` verdadero: todas; `!`: la interna; con `==`/`!=` entre `String`: la razón de identidad, E4).
2. **Opción 2 (lectura):** la primera familia que aplique en el orden de la tabla. **Variedad:** `rango-al-reves`, `simbolo-al-reves` y `pieza-volteada` no se repiten en dos retos seguidos de la traza si otra de ellas aplica.
3. **Opción 3 (concepto):** las específicas que aplican se separan en el grupo **M** (veredicto mismo) y **D** (contrario o tercero). Si los dos tienen familias, se elige el grupo que acerca a ½ la proporción de retos de la traza en que la correcta comparte veredicto (empate → D); dentro del grupo, el orden de la tabla, sin repetir la familia de la opción 3 del reto anterior si hay otra. Si no aplica ninguna específica: la universal de su construcción respetando su tope; si el tope lo impide, la siguiente familia de lectura distinta de la opción 2 (siempre queda `pieza-volteada`): **la tercera opción nunca falta**.
4. **Defensa en profundidad:** cada candidata pasa por `verificar`; si una distractora resulta verdadera o igual a otra, se descarta y se toma la siguiente de su lista.
5. **Orden en pantalla:** la correcta va en la posición `(nodo × 7 + revisión) mod 3`, reproducible para el docente que repite la clase. Presentación memoriza los retos ya construidos por índice de paso (la traza es inmutable), así que mirar la historia es lineal.

### 4.5 Balance y salida a la forma C (REQ-RETO-005)

`pruebas/propiedades/reto-del-corpus.test.ts` mide sobre todos los retos de dos veredictos del corpus ejecutable la proporción en que la consecuencia correcta se repite: debe quedar en [40 %, 60 %]; además `pieza-volteada` ≤ 20 % y los topes de `if-como-ciclo`/`if-espera`. Si falla después de ajustar el orden de familias (cada ajuste con su caso en `presentacion/reto.test.ts`), R1 se detiene: el PO elige entre otro ajuste del catálogo o la **forma C** (Sí/No y luego «¿por qué?» con tres razones), que cambia `TarjetasDelReto` a dos tiempos y conserva afirmaciones, catálogo y retroalimentación. `switch` no entra en la medida (sus opciones no son de dos veredictos); se reporta aparte.

### 4.6 Ejemplos que fijan la prueba (MaquinaSnacks `a1 2 50`, alineados con el maestro)

| Línea | Datos del motor | Correcta | Opción 2 | Opción 3 |
|---|---|---|---|---|
| 24 `switch (codigo)` | `sc.next()` leyó "a1"; `toUpperCase()` (l. 19) → "A1"; grupo "A1" termina en `break` (l. 28) | «Salta al `case "A1"`, porque `codigo` vale "A1".» | defecto con el valor tecleado | sigue-de-largo (◐) |
| 53 `cantidad < 1 \|\| cantidad > 3` | `2 < 1` false, `2 > 3` false; `rango` fuera [1, 3] | «Se salta el `if`, porque `2 < 1` y `2 > 3` dan `false`.» | rango-al-reves | o-se-detiene-con-false (◐; solo hay grupo M) |
| 66 `dinero < 1 \|\| dinero > 200` | `50 < 1` false, `50 > 200` false; `rango` fuera [1, 200] | «Se salta el `if`, porque `50 < 1` y `50 > 200` dan `false`.» | pieza-volteada (variedad: no repite `rango-al-reves`; `simbolo-al-reves` no aplica a dos comparaciones) | o-necesita-los-dos (◐; variedad) |
| 72 `dinero < total` | `50 < 36` false, relación `mayor`; con `else` | «Se va al `else`, porque `50 < 36` da `false`.» | simbolo-al-reves | dos-bloques (único específico, grupo D) |

Con `z9`, la línea 24 da `sin-default` como opción 2. Corpus: `u6-error-por-uno` (tercer `for`, `i` = 10 → frontera), `u6-suma-1-a-n` (entrada 5, `i` = 6 → revision-anterior, refuta con el `i++` de la línea 8), `u6-prediccion-while-no-ejecuta` (revisión 1 → primera-revision), `u5-escalera-else-if-orden-incorrecto` (`95 >= 70` → escalera-elige-la-mejor o escalera-revisa-todas según el balance), `u5-switch-sin-break-fallthrough` (se-detiene, refutado con la caída al `case 3`), `u6-bandera-numero-negativo` (valor-anterior, refuta con el cambio de la línea 12).

### 4.7 «Ya entendí este ciclo» (REQ-RETO-009)

`Silenciado = { nodoCiclo: number; desdePaso: number }`. Un paso de condición `p` con nodo `c` está silenciado por `S` si `p > S.desdePaso`, `p` es anterior al fin de esa instancia del ciclo y `c` es `S.nodoCiclo` o está dentro de él (siguiendo `cicloPadre`). **Fin de la instancia:** la primera revisión `false` de `S.nodoCiclo` después de `desdePaso` (`f`), o el primer paso fuera del ciclo (salida por `break` o `return`). **Excepción:** las revisiones `f` y la última `true` antes de `f` de `S.nodoCiclo` sí preguntan, **solo si `f` ya está en la traza calculada**; si no (espera un dato del teclado, el motor sigue calculando o el ciclo se detuvo por seguridad), sigue silenciado. Después del fin, el silenciado se ignora: al volver a entrar, pregunta. Presentación (`reto/silenciado.ts`) memoriza el fin por instancia. Si se silencia un ciclo externo, los internos y sus `if` también callan; las dos últimas revisiones que vuelven a preguntar son solo las del ciclo silenciado.

### 4.8 Estado y flujo

`responder-reto { paso, opcion }` registra y avanza a ese paso; con un reto pendiente, `siguiente` y el tic de la reproducción no avanzan (la reproducción se pausa) y la flecha derecha mueve el foco a la tarjeta 1; atrás y adelante conservan respuestas; «Fin» y el deslizador las saltan; `visualizar` vacía `respuestas` y `silenciados`. `derivarModeloVista` agrega `ranura.reto` y, si el paso actual ya se contestó, `retroalimentacion` (que **reemplaza** el texto del globo) y `otrasOpciones` (refutaciones de los distractores).

```mermaid
sequenceDiagram
  actor A as Alumno o grupo
  participant UI as Visualizador
  participant P as presentacion/reto.ts
  participant R as reductor
  A->>UI: «Siguiente» en el paso n
  UI->>P: construirReto(paso n+1, aplicados, vista, estado.reto)
  P-->>UI: RetoVista (3 opciones verificadas) o null
  UI-->>A: S3(b): globo con la pregunta, robot con «?», columna exclusiva, tarjetas; foco en la 1
  A->>UI: tecla 2 (elegir confirma)
  UI->>R: responder-reto {paso: n+1, opcion: 2}
  UI->>P: retroalimentacion(reto, 2)
  UI-->>A: S4: ✔/◐/✖ + palabra + borde en el globo (aria-live polite); panel de condición revelado; foco en «Siguiente»
```

### 4.9 Tarjeta (diseñador R1–R8) y columna exclusiva

| # | Regla | Dónde |
|---|---|---|
| R1 | Tarjeta a todo el ancho, ≥ 56 px, número grande [1] [2] [3], consecuencia en negritas (≤ 30) y razón debajo (total ≤ 100); `aria-keyshortcuts` 1/2/3; flecha derecha lleva el foco a la 1 | `TarjetasDelReto.tsx`, `reto.test.ts` (longitudes con los datos más largos del corpus) |
| R2 | Mismo formato en las tres para escanear | textos |
| R3 | Elegir confirma, sin botón aparte (práctica sin calificación, D1) | reductor |
| R4 | ✔ «¡Eso es!», ◐ «Casi», ✖ «No es esa» con ícono, palabra y borde (sólido, punteado, grueso); la correcta rotulada «✔ Lo que hizo Java»; la sobrante atenuada sin bajar de AA; robot feliz si acierta y pensativo si falla; resaltado ≤ 150 ms; nada con movimiento reducido; sin confeti | componente + CSS + axe |
| R5 | Al contestar, foco a «Siguiente» y resultado por `aria-live="polite"` | componente |
| R6 | En ciclos, enlace «Ya entendí este ciclo» con su descripción; la pregunta habla de «vuelta» («Terminó la vuelta 2. Java va a revisar otra vez…») | textos (preguntas exactas del maestro §3.1) |
| R7 | Interruptor «Modo reto» con «Encendido»/«Apagado» en el encabezado (`role="switch"`) | `InterruptorReto.tsx` |
| R8 | El alumno ve solo el interruptor; proyector, velocidad, revisor y nivel están en «Ajustes de la clase» (R0) | `AjustesDeLaClase.tsx` |

Con `data-reto="pendiente"` la columna derecha (en celular, la barra inferior crecida) muestra solo el reto (§2.4); «Valores ahora» lista las variables que lee la condición con el valor del estado actual (motor), nunca uno calculado.

## 5. Robot del libro (R0 borradores, R2, R4)

### 5.1 Modelo de contenido

```ts
// src/textos/es-MX/libro/tipos.ts
interface Tema {
  readonly id: IdTema; readonly unidad: 3 | 4 | 5 | 6 | 7; readonly oleada: 1 | 2; readonly orden: number; readonly titulo: string;
  readonly estado: 'borrador' | 'aprobado'; readonly aprobacion?: { readonly fecha: string; readonly huella: string };
  readonly paraEmpezar: { readonly situacion: string; readonly programa: IdPrograma };            // «¿Qué crees que imprime?» + «Ver la salida»
  readonly idea: readonly string[];                                                                // 3–5 frases
  readonly comoSeEscribe: readonly Bloque[];                                                       // forma general y orden de ejecución
  readonly pasoAPaso: { readonly programa: IdPrograma; readonly sugerirReto: boolean };
  readonly erroresTipicos: readonly { readonly texto: string; readonly programa: IdPrograma }[];
  readonly ponteAPrueba: readonly { readonly pregunta: string; readonly programa: IdPrograma }[]; // 2–3; respuesta = golden
  readonly ahoraHazloTu: readonly [Tarea, Tarea];                                                  // modificar y crear
  readonly resumen: readonly [string, string, string];
  readonly relacionados?: readonly IdTema[];
}
interface Tarea { readonly tipo: 'modificar' | 'crear'; readonly consigna: string; readonly solucion: IdPrograma }   // «Para comprobar» = entrada + golden de la solución (PQ-5: la solución no se muestra)
type Bloque = { tipo: 'parrafo'; texto: string } | { tipo: 'lista'; elementos: readonly string[] } | { tipo: 'forma'; texto: string } | { tipo: 'nota'; texto: string };
```

Reglas que la prueba exige: 8 secciones en orden; 2–3 «Ponte a prueba»; ≤ 550 palabras sin código (se reporta el promedio contra la meta de 400); ninguna salida de consola escrita en el texto (solo desde un golden); voz y vocabulario de REQ-PANT-010.

### 5.2 Temas (lista cerrada; PQ-3)

| U | Oleada 1 (21, en este orden de redacción: U6 → requisitos → U5) | Oleada 2 (13) |
|---|---|---|
| U3 | `entrada-con-scanner` | `programa-y-main` · `variables-y-tipos` (incluye constantes `final` locales) · `asignacion` · `salida` (`print`, `println`, `printf` con `%d`, `%.2f`, `%s`, `%n`) · `tipos-de-errores` |
| U4 | `comparaciones` · `operadores-logicos` · `division-entera-y-modulo` · `incremento-y-decremento` | `operadores-aritmeticos` · `precedencia` · `conversiones` · `math-y-random` · `textos-y-concatenacion` |
| U5 | `el-if` («Decisiones: el `if`») · `if-con-else` («`if` con `else`: dos caminos») · `comparar-textos` · `else-if` · `decisiones-anidadas` · `switch` | — |
| U6 | `que-es-un-ciclo` · `while` · `contador-acumulador-bandera` · `do-while` · `for` · `ciclos-incrementales-y-decrementales` · `error-por-uno-y-ciclo-infinito` · `repetir-hasta-que-el-usuario-quiera` · `ciclos-anidados` · `break-y-continue` (opcional, al final) | — |
| U7 | — | `prueba-de-escritorio` · `depurar-con-el-visualizador` · `casos-de-prueba` |

34 temas = 31 del plan anterior + `tipos-de-errores`, `textos-y-concatenacion`, `repetir-hasta-que-el-usuario-quiera` y `casos-de-prueba` − `constantes` (se une a variables). Borradores: U6 parte 1 en R0, parte 2 en R1, requisitos y U5 en R2, oleada 2 en R4.

### 5.3 Programas y oráculo; bordes del subconjunto

`corpus/libro/<id-tema>/<programa>.java` + `.entrada.txt` (si lee; cada renglón con `\n`) + `.meta.json` (`papel: 'para-empezar' | 'paso-a-paso' | 'error-tipico' | 'ponte-a-prueba' | 'solucion'`, `esperado: 'ejecuta' | 'error-compilacion'`). `herramientas/oraculo/generar-goldens.ts` agrega `libro` a las carpetas que recorre (hoy `curso` y `experimentos` **[verificado en diseño, plan anterior]**). `pruebas/diferencial/libro.test.ts`: byte a byte o veredicto y línea, y **ningún aviso de fuera de alcance ni `ejecucion-no-disponible`** en los que ejecutan. Bordes que la redacción evita (experto en Java): métodos propios y `args[0]`; `byte`, `short`, `float`; `static final` a nivel de clase; `printf` con `%x`, `%+d`, `%e`; `hasNextInt`, `nextLong`; `Integer.valueOf/toString`; `&`, `|`, `^`; `Math.pow` mientras no se ejecute, `sin`/`cos`/`log`, `nextInt(a, b)`; ternario; `switch` con flecha, `yield`, `case 1, 2:` o `enum`; `compareToIgnoreCase`, `isBlank`, `matches`, `null`; `for` mejorado; `break` con etiqueta. Hechos a cuidar en los errores típicos: Java rechaza `return; println();`, `while (true) {} println();` y el cuerpo de `while (false)`, pero **no** el de `if (false) { … }`; para la asignación definitiva basta que todas las ramas asignen.

### 5.4 Aprobación del PO (REQ-LIBRO-007)

Como en el plan anterior: la huella es SHA-256 del JSON canónico del tema (sin `estado` ni `aprobacion`) más los bytes de sus programas; la calculan `pruebas/libro/aprobaciones.test.ts` y `herramientas/libro-huella.ts` (`npm run libro:huella -- <id>`); el sitio publicado pide los temas con `mostrarBorradores = import.meta.env.DEV`. Desde R0 el PO puede revisar borradores como texto en el chat; marcar «aprobado» sin su visto bueno explícito está prohibido, como un commit sin confirmación (ADR 019).

### 5.5 En contexto, pantalla y carga

- **Editor:** `accesos-a-temas.ts` con el árbol de CodeMirror (`IfStatement`, `WhileStatement`, `DoStatement`, `ForStatement`, `SwitchStatement` de `@lezer/java` **[verificado en diseño, plan anterior]**); marca 📖 **solo en la línea del cursor** en edición, botón visible «Tema de esta línea» y `Alt+F1` (diseñador H8). **Globo:** enlace «📖 ¿Qué es un `while`?» por la clave del paso. **Reto:** la retroalimentación enlaza el tema de la construcción y el de su error (`frontera` → `error-por-uno-y-ciclo-infinito`). Solo temas publicados.
- **Pantalla:** `PantallaLibro` (índice por unidad con «Este capítulo llega pronto», tema, anterior/siguiente), `TemaDelLibro` (robot del libro en la ranura del hablante; «Ver la salida» y «Ver la respuesta» como `<details>` accesibles), `ProgramaDelLibro` (solo lectura con el resaltado de CodeMirror, salida del golden, «▶ Verlo paso a paso», «🎯 Ponerme a prueba»). `cargar-programa` con `origen: libro`; la segunda apertura de un mismo ejemplo con el reto apagado hace que el robot sugiera encenderlo.
- **Carga:** índice (ids, títulos, estado ≈ 2 KB) en el fragmento principal; cada unidad es un `import()` diferido desde `src/interfaz/datos/libro-crudo.ts`, precacheado (ADR 014).

## 6. Robot revisor (R3)

### 6.1 La pasada

`compilar()` llama a `revisar(ir, vista)` solo con resultado `ok` (REQ-REV-003) y guarda `vista.trampas`. Es lineal sobre la IR, no ejecuta nada y no cambia `ProgramaCompilado`: la traza es idéntica con y sin revisor (prueba de propiedad).

```ts
// src/motor/revision/trampas.ts
type CodigoTrampa = 'punto-y-coma-tras-condicion' | 'comparacion-de-textos-con-igual' | 'case-que-sigue-de-largo' | 'renglon-pendiente-del-scanner' | 'division-entera-a-decimal';
interface DatosPorCodigoTrampa {
  'punto-y-coma-tras-condicion': { construccion: 'if' | 'while' | 'for'; nodoCondicion: number; nodoSiguiente: number | null };
  'comparacion-de-textos-con-igual': { operador: '==' | '!='; texto: string; nodo: number; punto: number; enCondicion: boolean };
  'case-que-sigue-de-largo': { etiqueta: string | null; siguiente: string | null; nodoSiguienteEtiqueta: number };
  'renglon-pendiente-del-scanner': { lectura: 'nextInt' | 'nextDouble' | 'nextBoolean' | 'next'; lineaDeLaLectura: number; nodo: number; punto: number; entreVueltas: boolean };
  'division-entera-a-decimal': { texto: string; tipo: 'int' | 'long'; nodo: number; puntos: { izquierda: number; derecha: number; division: number; conversion: number } };
}
type Trampa = { [C in CodigoTrampa]: { codigo: C; linea: number; rango: Rango; adelantaUnReto: boolean; datos: DatosPorCodigoTrampa[C] } }[CodigoTrampa];
```

`adelantaUnReto` es `true` para la trampa 1, para la 2 con `enCondicion` y para la 3 (§6.5).

### 6.2 Las cinco reglas, con los ajustes del panel

| # | Regla sobre la IR | Ajuste del panel | Casi-trampas que la prueba exige NO reportar |
|---|---|---|---|
| 1 | `IfIr.entonces`, `WhileIr.cuerpo` o `ForIr.cuerpo` es `VaciaIr` (JLS 14.6) | E2: las formas que no compilan llegan por `cuerpoVacioAntes` (§6.3) | `if (c) { }`, `while (c) {}`, `do { … } while (c);` |
| 2 | `ComparacionIr` `==`/`!=` con dos operandos `String` (JLS 15.21.3) | E4: cubre `!=`; el aviso no dice que dará `false` (literales internados dan `true`); `switch` con `String` usa `equals` y no avisa | `s.equals(t)`, `c == 'a'`, `n == 0` |
| 3 | En `EstructuraDeSwitch`, grupo no vacío, no último, con `termina ≠ 'abrupta'` según `semantica/alcanzabilidad.ts` (JLS 14.22) | E7: también grupos que terminan en bloque o `if` que puede caer | `case 1: case 2:`, último grupo, grupo en `break`/`return`/`continue`, `if/else` con las dos ramas abruptas |
| 4 | (a) en una lista de sentencias: sentencia simple cuya **última** lectura de `Scanner` es de token, seguida —sin ninguna lectura intermedia, a ninguna profundidad— de una sentencia simple cuya **primera** lectura es `nextLine()` con valor **usado**; (b) en el cuerpo de un `while`/`for`/`do`: la última lectura del cuerpo (sentencia simple al nivel superior, sin lecturas después en el cuerpo, la actualización ni la condición) es de token y la primera (sentencia simple al nivel superior, sin lecturas antes) es `nextLine()` con valor usado. **Usado** = parte de una expresión o argumento, o guardado en una variable que se lee después. Lecturas dentro de ramas: no se avisa (límite conocido, en el ADR) | E3 | `sc.nextLine();` como sentencia; `String basura = sc.nextLine();` sin leer `basura`; `nextLine()` antes de toda lectura de token; `parseInt(sc.nextLine())` como única forma de leer |
| 5 | `ConversionIr { tipo: 'double', de: 'int' \| 'long' }` cuyo operando, bajando solo por `AritmeticaIr` enteras y `MenosIr`, contiene una `/` (JLS 15.17.2, 5.1.2) | E8 en la confirmación | `(double) a / b`, `int m = n / 2`, `"x" + a / b`, `suma / 5` con `suma` `double` |

### 6.3 El porqué de los problemas existentes y E2

`src/textos/es-MX/revisor.ts` agrega `familiaDelProblema: { [K in CodigoProblema]: FamiliaDeProblema }` y `familiaDelAviso` (exhaustivas por tipo) y un `porQue[familia]()`. Familias: `sintaxis`, `nombres`, `tipos`, `valor-sin-asignar`, `inalcanzable`, `llamadas`, `switch`, `estructura`, `limites-del-visualizador`, `arranque`, `fuera-del-alcance`. Si el problema trae `cuerpoVacioAntes`, el porqué es el hecho: «Ese `;` es todo el cuerpo del `for`; `i` solo existe dentro del `for`» / «Ese `;` es todo el cuerpo del `if`, así que el `else` ya no tiene `if`». El texto del problema sigue siendo el de `textoDelProblema` (tarea 1.28).

### 6.4 Confirmación en la ejecución (REQ-REV-006)

En el paso donde se ve la trampa, `derivarHablante` da el turno al revisor y `presentacion/revisor.ts` arma su texto: la narración del motor + la evidencia.

| Trampa | Se ve cuando… (datos del motor) | Habla solo si |
|---|---|---|
| 1 `if` | el paso de `nodoCondicion` dio `false` y el siguiente paso aplicado es `nodoSiguiente` | — |
| 1 `while`/`for` | el fin es `limite-pasos` con diagnóstico de ese ciclo | — |
| 2 | `hechos[punto]` es `mismo-texto: true` y el resultado sorprende (`==` `false`, `!=` `true`) | — |
| 3 | paso `caida-switch` hacia `nodoSiguienteEtiqueta` | — |
| 4 | paso de `nodo` con el `String` leído en `valores[punto]` | `resto-del-renglon.soloBlancos` |
| 5 | paso de `nodo` con los cuatro puntos con valor (`25 / 3` → `8` → `8.0`) | `division-entera.exacta = false` |

Si ese paso ya tiene retroalimentación del reto, la evidencia queda como enlace «Ver la trampa de Java» (que pone `turno: 'revisor'`), para no tener dos hablantes.

### 6.5 Pistas graduadas y espera con el reto (REQ-REV-007)

- **Nivel 1:** `FranjaDelRevisor` encima del editor, con la lupa: «Revisé tu programa: encontré 3 trampas de Java, en las líneas 6, 8 y 10. Tu programa compila, pero ahí Java hace algo que sorprende a muchos.» · «Ver explicación». Marca de canal en el editor: **SVG de lupa con «!»** (no ⚑, que se lee «bandera», H8), clase `cm-trampa`, título «Trampa de Java», desde el `StateField` de resaltados.
- **Nivel 2:** «Ver explicación» → `turno: 'revisor'`: el revisor explica cada trampa en el globo; «Volver al paso» o cualquier navegación devuelve el turno.
- **Nivel 3:** la confirmación de §6.4.
- **Sin trampas:** sello de una línea en la franja (texto del maestro, condensado por el PO), nunca un párrafo en el globo.
- **Con el reto encendido:** las trampas con `adelantaUnReto` no se localizan en el paso 0; la franja dice «… y una más que te enseño cuando el programa llegue ahí». La 3 entra porque su aviso resolvería la opción `se-detiene`/`sigue-de-largo`.
- **«Después»** (`ajustes.revisor`, desde el enlace o `origen.demostracion`): la franja dice solo «Revisé tu programa; si hay una trampa de Java, te la enseño cuando llegue», igual haya o no trampas, para no delatarlas por diferencia.

### 6.6 Cómo se mide «cero falsos positivos» (CR10–CR12)

1. Reglas que solo afirman hechos del lenguaje, con su argumento de JLS en el ADR 020.
2. `corpus/trampas-esperadas.json` con una entrada por cada `.java` de `curso/`, `experimentos/tipicos/`, `experimentos/ejercicios-del-po/` y `experimentos/trampas/`; igualdad exacta en código y línea; el PO revisa la lista al cerrar R3.
3. `corpus/experimentos/trampas/`: ≥ 3 positivas y ≥ 2 casi-trampas por familia con el oráculo, incluidas `for (…); println(i)` e `if (c); … else` (no compilan: veredicto y línea), el ciclo nombre/edad con `Ana⏎20⏎Luis⏎30⏎` (la segunda vuelta truena con `InputMismatchException`), la «basura», `while (op != "salir")`, un grupo que termina en `if` y cae, `100 / 4` y `20 Juan⏎` (E2–E8, `panel-1-java.md`).
4. Robustez: `revisar` corre sobre cada mutante que javac acepta en `corpus/mutantes/veredictos.jsonl` sin lanzar ni variar entre corridas.

## 7. Peso (REQ-PLAT-003, CR15)

| Pieza | gzip (estim.) | Hito | Dónde |
|---|---|---|---|
| Hoy (`v0.3.x`, medido por el PO) | **314 KB** | — | — |
| Pantalla: personajes SVG, saludo, navegación, ranura, ajustes, CSS de 4 distribuciones, voz nueva | ≈ 7 | R0 | principal |
| Galería: 35 programas + máquina de snacks (≈ 45 KB crudos) + «Qué observar» | ≈ 12 | R0 | diferido, precacheado |
| Reto: piezas, hechos, condiciones en la vista (motor), constructor y familias, textos, tarjetas | ≈ 16 | R1 | principal |
| Libro: 34 temas (≤ 550 palabras ≈ 3.5 KB c/u) + ≈ 150 programas con su salida + componentes | ≈ 60–75 | R2, R4 | diferido por unidad (≤ 80 c/u) |
| Revisor: pasada, textos, franja, marca | ≈ 12 | R3 | principal |
| **Total previsto** | **≈ 420–435 de 500** | | |

`herramientas/presupuesto-tamano.ts` (del hito 3) gana el límite por fragmento del libro en R2; el peso real se mide con `npm run ci` al cerrar cada hito. Si el total previsto pasa de 470 KB, el PO decide qué se recorta (p. ej. 2 en lugar de 3 «Ponte a prueba» por tema).

## 8. Pruebas

| Capa | Qué | Dónde |
|---|---|---|
| Unidad (motor) | `CondicionEnVista` (motivos, `rango`, `variables`), `cicloPadre`, `RamasDeIf`, `EstructuraDeSwitch` con alcanzabilidad; piezas con cortocircuito; hechos (NaN, `-0.0`, `char`, `long`, exacta, solo blancos); `cuerpoVacioAntes`; cada regla de trampa | `src/motor/{ir,interprete,revision}/*.test.ts`, `semantica/*.test.ts` |
| Textos | voz y vocabulario (`voz.test.ts`); familias exhaustivas; longitudes de opciones con los datos más largos del corpus; ≤ 550 palabras por tema; sin «incorrecto» | `src/textos/es-MX/**/*.test.ts` |
| Presentación | hablante, ranura, galería, posición sin total; reto (MaquinaSnacks y corpus de §4.6), silenciado, revisor, libro | `src/presentacion/**/*.test.ts` |
| Propiedad | reto en todo el corpus (CR4), balance y topes (CR5), relación coherente con su operador, traza idéntica con y sin revisor | `pruebas/propiedades/{reto-del-corpus,relacion-del-corpus}.test.ts`, `pruebas/revisor/` |
| Diferencial | `corpus/experimentos/{reto,trampas}/` y `corpus/libro/` contra goldens; sin avisos | `pruebas/diferencial/{reto,trampas,libro}.test.ts` |
| Componentes | Robot (3 personajes), Explicacion (un hablante, nombre al cambiar), Saludo, Navegacion, RanuraDeAcciones, AjustesDeLaClase, Galeria, TarjetasDelReto, InterruptorReto, libro, FranjaDelRevisor | `src/interfaz/**/*.test.tsx` |
| E2E ×3 motores + axe | primera vez, celular 390/320, proyector 1024×768/1280×720 (R0); reto con teclado, proyector y celular (R1); libro sin red (R2); revisor (R3); siempre: exactamente un robot en la zona de explicación | `pruebas/e2e/{pantalla,proyector,reto,libro,revisor}.spec.ts` |
| Rendimiento | C11 con piezas y hechos (CR14); peso por fragmento | `pruebas/rendimiento/`, `npm run presupuesto` |

## 9. Archivos

| Ruta | Acción | Hito |
|---|---|---|
| `src/interfaz/componentes/{Robot,Explicacion,BarraControles,PanelVariables,Consola}.tsx`, `contenedores/Visualizador.tsx`, `estado/reductor.ts`, `estilos/{aplicacion,proyector}.css`, `editor/EditorJava.tsx` | Modificar | R0 |
| `src/interfaz/componentes/{Saludo,Navegacion,RanuraDeAcciones,AjustesDeLaClase,Galeria}.tsx`, `src/interfaz/datos/programas-crudos.ts` | Crear | R0 |
| `src/presentacion/{hablante,ranura,galeria}.ts`, `presentacion/modelo-vista.ts` | Crear / Modificar | R0 |
| `src/textos/es-MX/{pantalla,galeria,voz.test}.ts`, `textos/es-MX/{explicaciones,robot,interfaz,controles,paneles}.ts` | Crear / Modificar | R0 |
| `src/textos/es-MX/libro/{tipos,indice,u6}.ts`, `corpus/libro/u6-*/`, `herramientas/oraculo/generar-goldens.ts`, `pruebas/diferencial/libro.test.ts` | Crear / Modificar | R0 (infraestructura y borradores) |
| `src/motor/ir/{ir,generar-ir,vista-programa}.ts`, `interprete/{expresiones,explicar,sentencias}.ts`, `traza/{paso,explicacion}.ts`, `motor/vista.ts` | Modificar | R1 |
| `src/presentacion/reto.ts`, `presentacion/reto/{afirmaciones,familias,silenciado}.ts`, `src/textos/es-MX/reto.ts`, `src/interfaz/componentes/{TarjetasDelReto,InterruptorReto}.tsx`, `corpus/experimentos/reto/**` | Crear | R1 |
| `src/presentacion/libro.ts`, `src/interfaz/libro/{PantallaLibro,TemaDelLibro,ProgramaDelLibro}.tsx`, `src/interfaz/datos/libro-crudo.ts`, `interfaz/editor/accesos-a-temas.ts`, `herramientas/libro-huella.ts`, `package.json` (`libro:huella`), `textos/es-MX/libro/{u3,u4,u5,u7}.ts`, `corpus/libro/**` | Crear | R2, R4 |
| `src/motor/revision/{trampas,revisar,punto-y-coma,comparacion-de-textos,case-que-sigue,renglon-pendiente,division-entera}.ts`, `motor/problemas.ts`, `sintaxis/*`, `semantica/atribucion.ts` | Crear / Modificar | R3 |
| `src/presentacion/revisor.ts`, `src/textos/es-MX/revisor.ts`, `src/interfaz/componentes/FranjaDelRevisor.tsx`, `interfaz/editor/marcas-de-trampa.ts`, `corpus/experimentos/trampas/**`, `corpus/trampas-esperadas.json` | Crear | R3 |
| `docs/adr/017-pantalla-y-tres-robots.md`, `018-modo-reto.md` (enmienda D4), `019-libro-de-temas.md`, `020-revisor-de-trampas.md` | Crear | R0–R3 |

## 10. Hitos

| Hito | Contenido | Entrada | Salida |
|---|---|---|---|
| R0 Pantalla y personajes | ADR 017; voz; textos; 3 personajes y un hablante; estado; saludo, navegación y ajustes; ranura; pistas y fin; galería; distribuciones y proyector; modelo del libro y U6 parte 1 | Hito 3 publicado; `v0.3.1`; PQ-1 | CR1–CR3, CR13, CR15; verificación con el panel |
| R1 Modo reto | R1.0 prueba en papel; R1.1 catálogo con el PO; ADR 018; hechos; condiciones en la vista; piezas; estructura; afirmaciones; textos; constructor; propiedad y balance; silenciado; estado; tarjetas; columna exclusiva; enlace; E2E; U6 parte 2 | R0 cerrado | CR4–CR7, CR13–CR15 |
| R2 Libro, oleada 1 | Lista de temas con el PO; ADR 019; huella; presentación; pantalla; abrir ejemplos; accesos; enlaces del reto; peso; requisitos y U5; E2E; aprobación de los 21 | R1 cerrado | CR8, CR9, CR13, CR15 |
| R3 Robot revisor | ADR 020; pasada; corpus de trampas; etiquetas; 5 reglas; guarda; hechos E8; porqué y E2; textos; presentación; franja y marca; enlaces y «después»; E2E | R2 cerrado | CR10–CR13, CR15 |
| R4 Libro, oleada 2 | 13 temas y su aprobación | R2 cerrado (puede ir en paralelo a R3: no toca código) | CR8, CR13, CR15 |

## 11. Riesgos técnicos y preguntas abiertas

- **Preguntas del PO:** PQ-1 a PQ-6 de la propuesta. Si cambian: PQ-1 → `Robot.tsx` y `textos/es-MX/robot.ts` (solo figuras y nombres); PQ-2 → `ranura.ts` y una tarea de contenido en R0; PQ-3 → la oleada de un tema; PQ-5 → `TemaDelLibro` muestra la solución; PQ-6 → T1 sin sustitución y el panel siempre visible.
- **Balance (no bloquea el diseño, sí el cierre de R1):** si el corpus no llega al 40–60 %, la forma C está acotada a `TarjetasDelReto` (§4.5).
- **Familias nuevas de `switch`** (`sin-default`, `error-si-no-coincide`, `revisa-los-demas`): propuestas del diseño, no del maestro; se aprueban o se quitan en R1.1.
- **Proyector a 1024×768:** a 24 px solo caben ≈ 41 caracteres en la columna del código; el ajuste de línea de CodeMirror debe conservar el número de línea y los marcadores ▶/▷ en el primer renglón (prueba E2E).
- **Regla 4 entre vueltas:** si la muestra del oráculo destapa un caso dudoso, se declara límite conocido en el ADR 020 antes que arriesgar un falso positivo.
- **`relacion` de `char` frente a `int`** usa la promoción binaria de Java (`'a' < 98`); se prueba con `t09-cadenas-y-caracteres`.
- **Conciliación con `visualizador-java`:** `proposal.md` §13 (5.1, 5.2, 5.4, 5.5, 5.6 y, de paso, 5.7, 5.8, 5.10).
