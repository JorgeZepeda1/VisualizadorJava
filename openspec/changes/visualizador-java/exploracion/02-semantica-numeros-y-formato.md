# 02 — Semántica numérica y de formato de Java 17

Exploración del cambio SDD `visualizador-java`, fase `explore`. Todo lo afirmado aquí fue
**ejecutado contra el JDK 17 real** (Temurin 17.0.18, `/Library/Java/JavaVirtualMachines/temurin-17.jdk`),
no recordado de memoria. Cuando hay una comparación contra JavaScript, se ejecutó con Node 20.20.2
(`node` global) salvo que se indique lo contrario. El locale por omisión del JDK en esta máquina ya es
`es_MX` (`user.language=es`, `user.country=MX`, `file.encoding=UTF-8`).

Todos los programas, salidas capturadas (`*.salida.txt`), generadores y scripts de comparación viven en
`exploracion/experimentos/numeros/` (rutas completas abajo). No se creó ni modificó nada fuera de
`exploracion/02-*` y `exploracion/experimentos/numeros/`. No se hicieron commits.

## Cómo leer este documento

Cada punto del encargo tiene: (a) una tabla resumen **comportamiento verificado → trampa de JS → técnica
recomendada en TypeScript → programa candidato**, y (b) evidencia de respaldo (salida real, cita de fuente
del JDK cuando aplica). Los dos experimentos grandes (double y Random) tienen su propia sección detallada
porque son los que fijan la arquitectura del intérprete.

---

## 1. `int`: overflow, división, incremento, shifts

| Caso | Comportamiento verificado en JDK 17 | Trampa de JS | Técnica en TS |
|---|---|---|---|
| `Integer.MAX_VALUE + 1` | `-2147483648` (da la vuelta, sin excepción) | `2147483647 + 1 = 2147483648` (JS usa double, no hay overflow de 32 bits) | Toda operación aritmética entre `int` debe pasar por `\`\|0\`` o `Math.imul`/wrap manual a 32 bits tras cada `+ - *` |
| `Integer.MIN_VALUE / -1` | `-2147483648` — **NO lanza excepción**, se desborda en silencio | N/A (JS no tiene este caso) | Caso especial explícito: si dividendo=MIN_VALUE y divisor=-1, resultado=MIN_VALUE, sin throw |
| `5 / 0` (int) | `ArithmeticException: / by zero` | `5/0 === Infinity` (no lanza) | El intérprete debe lanzar una excepción de tiempo de ejecución del programa simulado (no del intérprete) cuando ambos operandos son enteros |
| `5 % 0` | `ArithmeticException: / by zero` (mismo mensaje que la división) | `5%0 === NaN` | Mismo caso que arriba |
| `-7 / 2`, `7 / -2` | `-3`, `-3` — trunca hacia cero | `Math.trunc(-7/2) === -3` coincide | Usar `Math.trunc(a/b)` para `/` entera, **nunca** `Math.floor` |
| `-7 % 3`, `7 % -3` | `-1`, `1` — el signo del resultado sigue al **dividendo** | `-7 % 3 === -1` en JS también (mismo comportamiento, JS usa el mismo convenio que Java para `%`) | `%` de JS coincide con Java para operandos enteros; no requiere corrección |
| `x=5; x=x++;` | `x` queda en `5` (la asignación sobrescribe con el valor leído ANTES del incremento) | Mismo resultado si se modela explícitamente la secuencia read-then-write | El intérprete debe evaluar `x++` como "leer valor viejo, programar el efecto secundario, el valor de la expresión es el viejo" y aplicar el efecto secundario antes de que la asignación externa lo pise |
| `y=5; y=y++ + ++y;` | `y` queda en `12` (evaluación estrictamente izquierda→derecha, cada efecto secundario se aplica en cuanto se evalúa su sub-expresión) | Se necesita el mismo orden de evaluación izq→der con aplicación inmediata de side effects | Verificar que el evaluador de expresiones AST visite operandos en orden y aplique mutaciones de forma inmediata, no diferida |
| `int cx=5; cx+=1.7;` | `cx=6` — la asignación compuesta hace un **cast implícito** `(int)(cx + 1.7)` | — | `a += b` sobre `int` con `b` double se traduce a `a = (int)(a + b)`, no a error de tipos (a diferencia de `int a = a + 1.7` suelto que sí sería error de compilación) |
| `1 << 35`, `1 << -1`, `1 << 32` | `8`, `MIN_VALUE`, `1` — el shift amount se enmascara a **5 bits** (`amt & 31`) para `int` | `1 << 35 === 32` en JS (JS también enmascara pero a `amt & 31`... da `1<<3=8` igual; **JS SÍ enmascara para `<<`/`>>`/`>>>`**, así que en este caso coincide) | Aun así, ⚠️ ver fila siguiente: la trampa real está en `>>>` y en 64 bits, no en el enmascarado de 5 bits en sí |
| `1L << 65` (long) | `2` — se enmascara a **6 bits** (`amt & 63`) para `long`, no 5 | JS no tiene enteros de 64 bits nativos con shift de 64 bits (usa `BigInt` con semántica distinta, sin enmascarado automático) | Los shifts de `long` necesitan su propia máscara de 6 bits al implementarlos con `BigInt` |
| `-8 >>> 32` | `-8` (shift de 0 efectivo, `32 & 31 = 0`) | Idéntico en JS: `-8 >>> 32 === -8` (incluso JS enmascara) | Sin corrección necesaria para `int` |
| `Math.abs(Integer.MIN_VALUE)` | Queda **negativo**: `-2147483648` (overflow, no hay `+MIN_VALUE` representable) | — | Documentar como caso especial de `Math.abs` |

**Programa candidato:** `candidatos/Candidato01_IntOverflowYShifts.java`, `candidatos/Candidato02_DivisionYModulo.java`, `candidatos/Candidato03_IncrementoDecremento.java`.

Salida real (`Test01Int.salida.txt`, extracto):
```
MAX+1=-2147483648
MIN/-1=-2147483648
5/0 excepcion clase=java.lang.ArithmeticException mensaje=/ by zero
x=x++ -> x=5
y=y++ + ++y -> y=12
int cx=5; cx+=1.7 -> 6
1<<35=8
1<<-1=-2147483648
1L<<65=2 (mascara de 6 bits)
```

**Nota sobre `<<`/`>>`/`>>>` en JS:** JS SÍ enmascara el shift amount a 5 bits para operandos de 32 bits (`ToUint32` del operando + `amt & 31`), así que el enmascarado de 5 bits en sí **no es una trampa** — la trampa real es que todos los demás operadores (`+ - * /`) NO se comportan como enteros de 32 bits en JS, y que `long` necesita máscara de 6 bits que JS no ofrece de forma nativa.

---

## 2. `long`, `float`, `byte`, `short` (fuera de currículo pero se cuelan)

| Caso | Comportamiento verificado | Notas |
|---|---|---|
| `long big = 5000000000;` (sin `L`) | **Error de compilación**: `integer number too large` | El literal se evalúa como `int` antes de la asignación; sin sufijo `L` un literal >`Integer.MAX_VALUE` no compila aunque el destino sea `long` |
| `int r = Math.round(2.5);` | **Error de compilación**: `incompatible types: possible lossy conversion from long to int` | `Math.round(double)` devuelve `long`; sólo `Math.round(float)` devuelve `int` |
| `float f = 3.5;` (sin `f`) | **Error de compilación**: `incompatible types: possible lossy conversion from double to float` | Todo literal decimal sin sufijo es `double` |
| `byte b3 = b1 + b2;` (`byte`+`byte` sin cast) | **Error de compilación**: `incompatible types: possible lossy conversion from int to byte` | `byte`/`short` se promueven a `int` en cualquier operación aritmética, el resultado es `int` |
| `byte 127++` | `-128` (overflow silencioso, igual que `int` pero en 8 bits) | |
| `short 32767++` | `-32768` | |
| `16777216f + 1f` (2²⁴) | `1.6777216E7`, y `(16777216f+1f) == 16777216f` → `true` | Pérdida de precisión de `float` en el entero 2²⁴+1 (el mantissa de 23 bits ya no alcanza) |
| `0.1f + 0.2f` | `0.3` (imprime limpio — pero `(double)(0.1f+0.2f)` = `0.30000001192092896`, revela el error real) | `float` tiene su **propio** `Double.toString`-like (`FloatingDecimal` para 32 bits) con el mismo riesgo potencial de dígito de más; no se auditó exhaustivamente por estar fuera de currículo |

**Recomendación para el visualizador (`long`/`float`/`byte`/`short`):**
- **`long`**: soportarlo completo es barato porque JS tiene `BigInt` nativo — el costo es que TODA la aritmética entera debe decidir en tiempo de "tipeo" si usa `number` (int) o `BigInt` (long), y las conversiones int↔long cruzan esa frontera. Vale la pena si algún ejercicio del currículo declara `long` aunque no esté en el temario oficial (aparece en soluciones de alumnos que copian de internet).
- **`float`**: soportarlo bien exige un algoritmo de "shortest round-trip para 32 bits" aparte del de `double` (JS no tiene tipo float nativo; `Math.fround(x)` da el valor float32 más cercano pero **no** da el string corto de Java). Recomendación: **NO implementar formato float fiel**; en su lugar, cuando el intérprete detecte `float`, mostrar un aviso claro ("float no está soportado con la fidelidad de Java 17; se interpreta como double") en vez de imprimir un número que se ve distinto al NetBeans real del alumno. Costo de implementarlo bien: alto (puerto completo de `FloatingDecimal` para 32 bits) para un tipo que no está en el currículo U3–U7.
- **`byte`/`short`**: son baratos (mismo mecanismo de overflow que `int` pero con máscaras de 8/16 bits) y aparecen ocasionalmente; recomendable soportarlos con overflow correcto ya que la lógica es un caso más chico de la de `int`.

**Programa candidato:** `Test02OtrosTipos.java` + los 4 snippets de error en `errores_compilacion/` (`E1_long_sin_L.java`, `E2_round_double_a_int.java`, `E3_float_desde_double_literal.java`, `E4_byte_suma_sin_cast.java`) — estos últimos son candidatos a **casos de "aviso claro de error de compilación"**, no de ejecución.

---

## 3 + EXPERIMENTO CLAVE. `double`: formato de `Double.toString` en JDK 17

### Regla exacta (verbatim del javadoc de `java.lang.Double`, JDK 17, `java.base/java/lang/Double.java`)

> Si la magnitud *m* es ≥ 10⁻³ y < 10⁷ → notación decimal simple. Si no → notación científica
> `d.dddE±n`. En ambos casos: **al menos un dígito** después del punto, y "tantos dígitos como sean
> necesarios, pero sólo tantos, para distinguir el valor de los valores `double` adyacentes" (= la
> representación decimal más corta que redondea exactamente de vuelta al mismo bit pattern).

Confirmado en código: `Double.toString(d)` llama a `FloatingDecimal.toJavaFormatString(d)`
(`jdk/internal/math/FloatingDecimal.java`). **JDK 17 usa el algoritmo viejo** (pre-JDK 19): no existe
`jdk/internal/math/DoubleToDecimal.java` (el algoritmo Schubfach que reemplazó a `FloatingDecimal` para
`toString`) en el `src.zip` de este JDK — sólo están `FloatingDecimal.java`, `FDBigInteger.java`,
`FormattedFloatingDecimal.java`. Esto importa porque el bug **JDK-4511638** ("`Double.toString` a veces no
produce el string más corto") sigue vigente en JDK 17 y se cuantificó abajo.

### Metodología del experimento

1. **Conjunto "de salón"** (`GenerarSalon.java` → `generado/salon.csv`): sumas/restas/productos/divisiones
   con enteros pequeños (1–60), precios de 1–2 decimales con IVA MX 16%, promedios de listas de 2–30
   números, porcentajes, y clásicos de tutorial (`0.1+0.2`, `1.0/3.0`, `22.0/7.0`, etc.), con su versión
   negativa. **19,828 valores** (el encargo pedía ≥2,000).
2. **Conjunto aleatorio estratificado por exponente binario** (`GenerarAleatorios.java` →
   `generado/aleatorios.csv`): para cada uno de los 2,047 exponentes IEEE-754 posibles (0=subnormales..2046=el
   más grande finito; 2047 está reservado a Inf/NaN) se generaron 10 doubles con signo y mantisa aleatorios
   (semilla fija `42L` para reproducibilidad), más 5,000 valores con patrón de bits totalmente aleatorio.
   **25,465 valores** (el encargo pedía ≥20,000), cubriendo *todos* los rangos de exponente, no sólo los
   "típicos".
3. Java imprime, por cada valor: los bits crudos (`Double.doubleToLongBits`, en hex) y
   `Double.toString(valor)`.
4. `comparar_double_tostring.js` reconstruye el double exacto desde los bits (Buffer/DataView, sin pasar
   por parseo decimal), obtiene el string más corto de V8 vía `valorAbsoluto.toExponential()` (que la spec
   ECMA-262 garantiza como la representación *shortest round-trip*), y lo **reformatea aplicando la regla
   de Java verbatim de arriba** (mismo umbral 10⁻³/10⁷, mismo relleno de al menos un decimal). El signo se
   toma del bit 63 crudo, no de comparaciones JS (`-0 < 0` es `false` en JS, así que comparar por valor
   pierde el signo de `-0.0`).
5. Compara carácter por carácter contra el `Double.toString` real de Java.

### Resultado cuantificado

| Conjunto | Total | Coincide | Difiere | % |
|---|---|---|---|---|
| De salón (pedagógico) | 19,828 | 19,828 | **0** | 0.0000% |
| Aleatorio (todos los exponentes) | 25,465 | 25,379 | **86** | 0.3377% |
| **Global** | **45,293** | **45,207** | **86** | **0.1899%** |

**Cero diferencias en todo el rango de valores que un alumno de bachillerato produciría en la práctica**
(precios, promedios, porcentajes). Las 86 diferencias se concentran de forma extrema por orden de magnitud
decimal:

| Orden de magnitud | Muestras en ese orden | Diferencias | Tasa |
|---|---|---|---|
| 10⁻¹⁹ .. 10⁻¹⁵ (~200 muestras) | ~200 | 0 | 0% |
| 10¹⁵ | 38 | 0 | 0% |
| **10¹⁶** | 36 | **12** | **33%** |
| **10¹⁷** | 43 | **38** | **88%** |
| **10¹⁸** | 43 | **35** | **81%** |
| 10¹⁹ | 41 | 0 | 0% |
| 10²⁵ | 44 | 1 (caso distinto, ver abajo) | 2% |

De las 86 diferencias, **85 son del mismo patrón**: JDK 17 imprime **un dígito decimal de más** al final
respecto del string más corto que V8 calcula para el mismo bit pattern. Ejemplo real:

```
bits=c352f5e7b6bd416c  valor=-21347700531594670
  JAVA     = -2.1347700531594672E16   (17 dígitos significativos)
  V8+regla = -2.134770053159467E16    (16 dígitos — más corto, y también redondea exacto al mismo double)
```

La 1 diferencia restante (magnitud ~10²⁵) tiene la **misma cantidad** de dígitos en ambos lados pero el
último dígito cambia (`...091195` vs `...091196`): a esa magnitud el hueco entre doubles representables es
tan grande que hay más de una representación igualmente corta que redondea exacto — los dos motores
resuelven el empate distinto, no es el mismo bug.

**Por qué justo 10¹⁶–10¹⁸:** `2^53 ≈ 9.007×10¹⁵` es el punto donde un `double` deja de poder representar
cada entero consecutivo. Los valores en esa banda necesitan **los 17 dígitos significativos completos**
(el máximo que un double puede necesitar) para ser reconstruidos sin ambigüedad, y es exactamente ahí donde
el algoritmo viejo de `FloatingDecimal` (basado en un bucle de "adivina y corrige" con `FDBigInteger`) falla
con más frecuencia en converger al string mínimo. Fuera de esa banda angosta, el algoritmo viejo y el
algoritmo moderno (V8/Ryu-like) coinciden virtualmente siempre.

### Conclusión y recomendación de arquitectura

**No hace falta portar el algoritmo completo de JDK 17 (`FloatingDecimal`/`FDBigInteger`) para v1.** Con
"dígitos más cortos de V8 + reglas de formato de Java" se obtiene fidelidad exacta en el 99.81% de los
casos, y **100% en todo el rango pedagógico realista** (precios, promedios, operaciones con enteros
pequeños). El único hueco real y medido es la banda 10¹⁶–10¹⁸ (enteros grandes representados como
`double`, algo que aparece si un alumno hace crecer un acumulador `double` sin darse cuenta, o multiplica
números grandes). Dos opciones, con su costo:

1. **(Recomendada para v1)** Documentar el hueco como limitación conocida y, si el valor a formatear cae en
   la zona de riesgo (magnitud ≥ 10¹⁵ aprox. y valor entero-valuado), usarlo como oportunidad pedagógica:
   mostrar una nota tipo *"a partir de aquí Java y esta herramienta pueden diferir en el último dígito por
   cómo Java 17 convierte números muy grandes a texto"* en vez de fingir precisión que no se verificó.
2. **(Si se quiere cerrar el hueco)** Implementar el algoritmo desde la **especificación libre** (el propio
   javadoc citado arriba: "el decimal más corto que redondea exacto, con empate resuelto a bit-menos-
   significativo-par") usando un algoritmo moderno de dominio abierto (ej. Ryu de Ulf Adams, o ré-derivar
   Schubfach desde su paper) — **NUNCA copiando `FDBigInteger`/`FloatingDecimal` de OpenJDK**, que es
   GPLv2+Classpath Exception: la licencia permite *usar* el JDK, pero copiar ese código fuente a un
   proyecto Vite/React con otra licencia sería una violación real, no un tecnicismo. Costo: alto (días),
   beneficio: cerrar un 0.19% de discrepancia que además cae fuera del currículo U3–U7.

**Programa candidato:** `candidatos/Candidato04_DobleFormatoLimites.java` (incluye los dos ejemplos reales
del hueco, con sus valores literales, para que quede en el corpus diferencial como caso conocido).

**Datos completos:** `generado/salon.csv` (19,828 filas), `generado/aleatorios.csv` (25,465 filas),
`generado/diferencias-double-tostring.csv` (86 filas con bits/valor/string Java/string propio),
script `comparar_double_tostring.js`.

### Casos base (sin el experimento masivo), verificados uno por uno

`Test03DobleBasico.salida.txt`:
```
0.001 -> 0.001                 10000000.0 -> 1.0E7
0.0009999 -> 9.999E-4          1e21 -> 1.0E21
9999999.0 -> 9999999.0         -0.0 -> -0.0
0.0 == -0.0 -> true             Double.compare(0.0,-0.0) -> 1   (¡compare SÍ distingue el signo de cero!)
Double.NaN == Double.NaN -> false
1.0/0 -> Infinity    0.0/0 -> NaN    -0.0/0.0 -> NaN
0.1+0.2 -> 0.30000000000000004   0.1+0.2==0.3 -> false
Double.MIN_VALUE -> 4.9E-324   (el double positivo MÁS PEQUEÑO, no el más negativo — nombre engañoso)
```
Técnica en TS: usar directamente `Number.prototype.toString()`/`toExponential()` de V8 más la función de
reformateo que ya se implementó y validó en `comparar_double_tostring.js` (es reutilizable tal cual como
base del `Double.toString` del intérprete). `NaN`, `Infinity`, `-0.0` deben tratarse como casos especiales
antes de entrar al pipeline de dígitos (igual que hace el propio `Double.toString`, ver el `if` inicial del
javadoc). Ojo: `Double.compare(0.0,-0.0)==1` pero `0.0==-0.0` es `true` — si el visualizador alguna vez
ordena o compara doubles "como objeto" (ej. dentro de un `TreeSet` simulado) debe replicar `compare`, no `==`.

---

## 4. Concatenación y conversión a texto

| Expresión | Resultado verificado | Regla |
|---|---|---|
| `"" + 1.0` | `"1.0"` | Cualquier concatenación con `String` dispara `String.valueOf` |
| `"Suma: " + a + b` (a=2,b=3) | `"Suma: 23"` | Evaluación izq→der: en cuanto aparece un `String` el resto son concatenaciones, no sumas |
| `a + b + " suma"` | `"5 suma"` | `a+b` se evalúa como suma numérica ANTES de tocar el `String` |
| `'A' + 1` (sin ningún `String` cerca) | `66` (int) | `+` entre `char` e `int` es aritmética, **no** concatenación, si ningún operando es `String` |
| `"" + 'A' + 1` | `"A1"` | El `""` inicial fuerza modo string desde el primer `+` |
| `'A' + 1 + ""` | `"66"` | El cast a string llega tarde: ya se sumó `'A'+1=66` como número, y ESE 66 es lo que se concatena |
| `"x=" + true` | `"x=true"` | `boolean` también pasa por `String.valueOf` |
| `String s=null; "v: "+s` | `"v: null"` | `null` se imprime literal como `"null"`, no lanza NPE |
| `1+2+"3"` vs `"1"+2+3` | `"33"` vs `"123"` | Mismo patrón: el punto donde aparece el primer `String` en la cadena de `+` decide todo lo anterior |

**Trampa de JS:** en JS, `'A' + 1` **siempre** concatena (`"A1"`) porque JS no tiene un tipo `char` real —
todo lo que "parece char" ya es string de un carácter. El intérprete **no puede** modelar `char` de Java
como string de JS de un carácter para esta regla; debe tener un tipo `JavaChar` interno con valor numérico
(code point) que sólo se convierte a texto cuando el operador `+` decide (en tiempo de evaluación, mirando
el tipo del OTRO operando) que la operación es concatenación y no aritmética.

**Técnica en TS:** el evaluador de `+` debe: (1) mirar los tipos estáticos/dinámicos de ambos operandos
según las reglas de promoción de Java (no de JS), (2) si CUALQUIERA es `String` → concatenar con
`aJavaString(operando)` de cada lado, (3) si no, sumar numéricamente con las reglas de promoción numérica
de Java (`char`→`int`, etc.). Esto es un evaluador de `+` distinto al de JS, no reutilizable.

**Programa candidato:** `candidatos/Candidato10_ConcatenacionMixta.java`.

---

## 5. Casting

| Expresión | Resultado verificado | Regla / trampa |
|---|---|---|
| `(int) 3.99`, `(int) -3.99` | `3`, `-3` | Trunca hacia cero, no hace floor |
| `(int) 1e10` | `2147483647` (= `Integer.MAX_VALUE`) | **Satura**, no da la vuelta como el overflow aritmético de `int` |
| `(int) Double.NaN` | `0` | Caso especial explícito en el JLS |
| `(int) Double.POSITIVE_INFINITY` / `NEGATIVE_INFINITY` | `MAX_VALUE` / `MIN_VALUE` | Satura en el extremo correspondiente |
| `(long) 1e30` | `9223372036854775807` (`Long.MAX_VALUE`) | Satura igual que arriba pero a 64 bits |
| **`(int) (long) 1e30`** | **`-1`** ⚠️ | **La trampa más importante de esta sección.** `double→long` satura a `Long.MAX_VALUE` (`0x7FFF...FFFF`), pero luego `long→int` **NO satura**: sólo se queda con los 32 bits bajos, que para `Long.MAX_VALUE` son todos 1 → `-1`. Encadenar dos casts "seguros" da un resultado que no es ni el mínimo ni el máximo de `int`. |
| `(double) 5 / 2` | `2.5` | El cast sólo aplica al `5`; la división ya es de `double` |
| `(double) (5 / 2)` | `2.0` | La división entera ocurre primero (`5/2=2`), y RECIÉN el resultado se castea |
| `double d = 5 / 2;` | `2.0` | Sin cast explícito, misma regla: la asignación no cambia el tipo de la expresión del lado derecho |
| `(byte) 200` | `-56` | Overflow de 8 bits, igual que el patrón de `int`/`long` pero con máscara de 8 bits |
| `(float)1.0/3.0` vs `(float)(1.0/3.0)` | `0.3333333333333333` (double completo) vs `0.33333334` (float corto) | Precedencia: el cast se pega SÓLO al literal, no a toda la expresión — trampa clásica de examen |

**Trampa de JS:** JS no tiene casting con estas reglas en absoluto — `|0` trunca pero **da la vuelta**
(overflow), no satura (`(1e30 | 0) === 0` en JS, nada que ver con `Integer.MAX_VALUE`). Para portar
`(int)`/`(long)` desde `double`, el intérprete necesita una función de **saturación explícita** (clamp a
`[MIN_VALUE, MAX_VALUE]` antes de truncar, con `NaN→0`), y una función **distinta** de wraparound de bits
para las conversiones `long→int`/`int→short`/`int→byte` (que si son puramente enteras SÍ dan la vuelta, no
saturan). Son dos funciones diferentes y no deben confundirse — el caso `(int)(long)1e30` existe
precisamente porque usan reglas distintas.

**Técnica en TS:**
```ts
function dobleAEntero(v: number, bits: 32 | 64): bigint | number {
  if (Number.isNaN(v)) return 0;
  // saturar ANTES de truncar
  const max = bits === 32 ? 2147483647 : 9223372036854775807n;
  const min = bits === 32 ? -2147483648 : -9223372036854775808n;
  ...
}
function enteroAEnteroMasAngosto(v: bigint | number, bitsDestino: number): number {
  // esto SÍ da la vuelta (wraparound), tomando los bits bajos — usar BigInt.asIntN
}
```

**Programa candidato:** `candidatos/Candidato05_CastingEncadenado.java` (incluye explícitamente el caso
`(int)(long)1e30 = -1`).

---

## 6. `char`

| Caso | Resultado verificado | Regla |
|---|---|---|
| `'A' + 1` | `66` (int) | Ver sección 4: sin `String` cerca, es aritmética |
| `(char) ('A' + 1)` | `'B'` | El cast de vuelta a `char` es obligatorio para "sumar letras" |
| `char c='A'; c++;` | `c` queda en `'B'` | El operador `++` sobre `char` SÍ preserva el tipo `char` (a diferencia de `+`) |
| `char c = 65;` | `'A'` | Sólo funciona porque `65` es una **constante** que cabe en el rango de `char` (0..65535); no compila con una variable `int` sin cast |
| `'a'+'b'+""` vs `""+'a'+'b'` | `"195"` vs `"ab"` | Mismo patrón de la sección 4: importa DÓNDE aparece el primer string |
| `(char) -1` | `65535` como entero | **`char` es SIN SIGNO de 16 bits** (a diferencia de `byte`/`short`, que sí tienen signo) — el único tipo numérico sin signo de Java |
| `Character.isDigit('5')`, `isLetter`, `toUpperCase`, `isWhitespace` | Todos se comportan como se espera (verificado) | Métodos típicos de bachillerato, mapeables 1:1 a una tabla ASCII/Unicode básica propia |
| `'0' + 5` | `53` (int, NO `'5'`) | Trampa didáctica común: sumar un dígito-carácter con un número no da el dígito siguiente, da el code point + 5 |

**Trampa de JS:** JS no tiene `char`; todo es `string`. El intérprete necesita un tipo `JavaChar` interno
(entero de 16 bits sin signo, 0–65535) que: (a) al sumarse con otro numérico se **promueve a int** (con
signo, 32 bits) automáticamente, (b) al incrementarse con `++`/`--` o sumarse con `+=` se mantiene como
`char` (aplicando wraparound de 16 bits sin signo), (c) sólo se renderiza como texto de 1 carácter cuando
el operador `+` decide que hay concatenación.

**Técnica en TS:** representar `char` con un `number` etiquetado (branded type) y una función
`charMasEntero(c, n) => number` (resultado `int`, sin marca `char`) separada de
`incrementarChar(c) => JavaChar` (con wraparound de 16 bits sin signo vía `& 0xFFFF`).

**Programa candidato:** `candidatos/Candidato06_CharAritmetica.java`.

---

## 7. `Math`

| Caso | Resultado verificado | Nota |
|---|---|---|
| `Math.round(2.5)` | `3` | |
| `Math.round(-2.5)` | **`-2`**, no `-3` | `round(x) = floor(x + 0.5)`, y `floor(-2.5+0.5) = floor(-2.0) = -2`. El redondeo **no es simétrico** alrededor de 0 para mitades negativas. |
| `Math.round(-0.5)` | **`0`**, no `-1` | Mismo mecanismo: `floor(-0.5+0.5) = floor(0.0) = 0` |
| `Math.round(0.49999999999999994)` | **`0`** (verificado en JDK 17) | ⚠️ Ojo con fuentes viejas de internet: este valor es famoso por un bug histórico (`JDK-8010430`) donde `x+0.5` redondeaba a `1.0` por error de precisión de double y el método devolvía `1`. **Ese bug ya está arreglado en JDK 17** — si el visualizador replica el bug viejo (asumido de memoria/StackOverflow antiguo) daría un resultado que NO coincide con el JDK real actual. |
| `Math.floor(-3.5)`, `Math.ceil(-3.5)` | `-4.0`, `-3.0` | Ambos devuelven `double`, no `int` |
| `Math.pow(2,3)` | `8.0` (double, no `8`) | Cambia lo que imprime `println` — un alumno que espere `8` se sorprende con `8.0` |
| `Math.sqrt(-1)` | `NaN` (no lanza excepción) | |
| `Math.abs(Integer.MIN_VALUE)` | `-2147483648` (sigue negativo) | Mismo overflow que la sección 1 |
| `Math.max(5, 3.0)` | `5.0` (double, por sobrecarga) | La sobrecarga elegida depende de los tipos de AMBOS argumentos: mezclar `int` y `double` selecciona `max(double,double)`, y el tipo de retorno cambia lo que se imprime |
| `Math.max(-0.0, 0.0)` | `0.0` | Consistente con que `-0.0 < 0.0` para fines de comparación de magnitud en algunos métodos de `Math`, aunque `==` los trate igual |

**Trampa de JS:** `Math.round` de JS usa la MISMA fórmula (`floor(x+0.5)`), así que **coincide** con Java en
la mayoría de los casos, incluyendo el redondeo asimétrico de mitades negativas — se verificó que
`Math.round(-0.5)` en Node también da `0` (no `-1`) y `Math.round(-2.5)` da `-2`. La trampa real no es el
algoritmo sino el **tipo de retorno**: en JS todo es `number`, así que `Math.pow(2,3)` da `8` (sin `.0`) y
`Math.round` siempre da algo que se imprime igual sea "entero" o no — el intérprete debe forzar el
re-etiquetado de tipo (`long` para `round`, `double` para `pow`/`sqrt`/`floor`/`ceil`, y el tipo por
sobrecarga para `abs`/`max`/`min`) para que el `println` posterior formatee correctamente.

**Técnica en TS:** tabla de sobrecarga de `Math.max`/`Math.min`/`Math.abs` que decide el tipo Java de
retorno según los tipos de los argumentos (no según el valor), independiente de que internamente todo se
calcule con `number` de JS.

**Programa candidato:** `candidatos/Candidato07_MathRedondeoYAbs.java`.

---

## 8. `printf` / `String.format` — EXPERIMENTO CLAVE del algoritmo de `%f`

### Hallazgo central: `%f`/`%.Nf` NO usa el valor binario exacto del `double`

Se sospechaba (y así lo afirman muchos tutoriales) que `String.format("%.2f", x)` redondea sobre el valor
binario **exacto** de `x` (es decir, como `new BigDecimal(x).setScale(2, RoundingMode.HALF_UP)`). Se verificó
leyendo el código fuente real (`java.util.Formatter`, método `print(double, Locale)`, JDK 17) y **luego
confirmándolo empíricamente**: la ruta de código es

```
Formatter.print(double) → FormattedFloatingDecimal.valueOf(value, prec, Form.DECIMAL_FLOAT) → applyPrecision(...)
```

es decir, la **misma maquinaria de dígitos más cortos** que usa `Double.toString` (no `new BigDecimal(double)`,
que es una clase totalmente distinta reservada al *argumento* `BigDecimal`, un camino de código separado en
`Formatter`). `applyPrecision` redondea **HALF_UP mirando un único dígito** de ese string corto (si
`digits[prec] >= '5'` sube, si no trunca) — y si se piden más dígitos de los que el string corto tiene,
**rellena con ceros** en vez de calcular más dígitos reales.

Prueba decisiva (valor `2.675`, `Test08bFormatterAlgoritmo.salida.txt`):

```
v=2.675 | Double.toString=2.675 | BigDecimal EXACTO=2.67499999999999982236... | %.2f=2.68
```

El valor binario EXACTO de `2.675` es `2.6749999999999998...` (menor que 2.675) — si `%.2f` usara el valor
exacto con HALF_UP, el resultado sería `2.67`. Pero Java da `2.68`, que es lo que da redondear el STRING
CORTO `"2.675"` (que sí tiene un `5` exacto en la posición de corte). Se repitió con 10 valores clásicos de
"trampa de punto flotante" (`1.005`, `8.005`, `35.855`, `1.615`, `5.015`, etc.) y **los 10 confirman el
mismo mecanismo**, sin una sola excepción.

Segunda confirmación, aún más clara — pedir más decimales de los que hay:

```
0.1 con 20 decimales      -> 0.10000000000000000000   (puros ceros)
BigDecimal exacto de 0.1  -> 0.1000000000000000055511151231257827021181583404541015625
```

Si Java revelara el valor binario exacto, `%.20f` de `0.1` mostraría `...00000000005551...`. En cambio
muestra puros ceros: la prueba final de que `%f` nunca mira más allá de los dígitos que
`Double.toString`/`FloatingDecimal` ya calculó.

**Consecuencia de arquitectura para el intérprete:** el motor de `%f`/`%e`/`%g` debe construirse **sobre el
mismo generador de "dígitos más cortos"** que ya se implementó y validó para la sección 3 (dígitos de V8 vía
`toExponential()`), aplicando después: (1) redondeo HALF_UP en la posición pedida si hay menos dígitos
pedidos que dígitos cortos disponibles, (2) relleno de ceros si se piden más. **No** implementar esto con
`toFixed()` de JS (que redondea sobre representaciones de precisión distinta y no coincide con Java en casos
como `2.675` — de hecho `(2.675).toFixed(2)` en JS da `"2.67"`, el resultado CONTRARIO al de Java, porque
`toFixed` sí intenta acercarse más al valor exacto) ni con `BigDecimal`-style exactitud.

### Resto de la tabla de `printf`

| Especificador | Resultado verificado | Nota |
|---|---|---|
| `%d` con `int`/`long` | `42` | |
| `%f` (sin precisión) | 6 decimales por omisión | `3.140000`, `1.000000` |
| `%.0f` de `0.5`,`1.5`,`2.5` | `1`, `2`, `3` | HALF_UP sobre dígito corto, siempre sube en empate exacto (no HALF_EVEN) |
| `%.0f` de `-0.5`,`-1.5` | `-1`, `-2` | HALF_UP también en negativos (se aleja de cero en empate, no trunca hacia cero) |
| `%c` con `int` | Convierte el int a su code point como carácter (`66`→`B`) | |
| `%b` con `null` | `false` | `%b` con cualquier no-`Boolean`-no-`null` → `true` (no lanza) |
| `%5d`, `%-10s`, `%05d` | Ancho y alineación funcionan como se espera | `%05d` con negativo → `-0042` (el signo cuenta como parte del ancho, el cero de relleno va después del signo) |
| `%,d`, `%,.2f` | Agrupa de a 3 con el separador de miles del locale | Ver locale abajo |
| `%e` | `1.234568e+04` | Minúscula/mayúscula según `%e`/`%E`; también pasa por `FormattedFloatingDecimal` (mismo mecanismo de `%f`) |
| `%x`, `%X`, `%#x` | `ff`, `FF`, `0xff` | |
| `%%` | `%` literal | |
| `%d` con argumento `double` | `IllegalFormatConversionException: d != java.lang.Double` | Mensaje exacto capturado |
| `%y` (conversión inexistente) | `UnknownFormatConversionException: Conversion = 'y'` | |
| `%d %d` con 1 solo argumento | `MissingFormatArgumentException: Format specifier '%d'` | |

### Locale: es-MX ≡ en-US, es-ES es la rara

Verificado con `-Duser.language=es -Duser.country=MX` (idéntico byte a byte al locale por omisión de esta
máquina), `es-ES`, y `en-US`:

```
es-MX / en-US:  1,234,567.89   (coma miles, punto decimal)
es-ES:          1.234.567,89   (punto miles, coma decimal — INVERTIDO)
```

**El locale por omisión de la JVM y `en-US` dieron salidas IDÉNTICAS** (`diff` sin diferencias) en los 40+
casos probados. Conclusión: para México, el visualizador puede usar las mismas reglas de agrupación que
`en-US` sin caso especial — **la única bandera real es si el programa pide explícitamente un locale europeo**
(`Locale.forLanguageTag("es-ES")`), algo que no aparece en el currículo U3–U7 pero sí podría aparecer si un
alumno copia un ejemplo de internet.

**Programa candidato:** `candidatos/Candidato08_PrintfRedondeo.java`.

---

## 9. `java.util.Random` — algoritmo LCG verificado y portado

### Algoritmo (confirmado leyendo `java.base/java/util/Random.java` del JDK 17 real, no de memoria)

```
multiplier = 0x5DEECE66D,  addend = 0xB,  mask = 2^48 - 1
seed(inicial) = (semilla ^ multiplier) & mask
next(bits):  seed = (seed * multiplier + addend) & mask
             return (int)(seed >>> (48 - bits))          // resultado siempre cabe en 'bits' bits
nextInt()          = next(32)
nextInt(bound):
    r = next(31); m = bound - 1
    if (bound & m) == 0:  r = (int)((bound * (long) r) >> 31)     // bound es potencia de 2
    else:
        u = r; r = u % bound
        while ((u - r + m) < 0 [OVERFLOW DE int DE 32 BITS]):      // bucle de rechazo
            u = next(31); r = u % bound
nextDouble() = (((long) next(26) << 27) + next(27)) / 2^53
nextBoolean() = next(1) != 0
nextLong()    = ((long) next(32) << 32) + next(32)                 // el 2do next(32) se SUMA con signo
nextFloat()   = next(24) / 2^24
```

Confirmado además: `Math.random()` internamente crea un `java.util.Random` (sin semilla, vía
`RandomNumberGeneratorHolder`, semilla derivada de `System.nanoTime()`), **el mismo algoritmo** de arriba —
no hay un generador distinto para `Math.random()`.

**Detalle no obvio verificado con datos reales:** la semilla se enmascara a sus **48 bits bajos** al
construir el generador. Esto produce colisiones reales y verificadas: `new Random(0)` y
`new Random(Long.MIN_VALUE)` dan la **secuencia idéntica** (porque `Long.MIN_VALUE` tiene ceros en sus 48
bits bajos, igual que `0`), y `new Random(-1)` coincide exactamente con `new Random(Long.MAX_VALUE)` (mismo
argumento: sus 48 bits bajos son idénticos, sólo difieren en el bit 63, fuera de la máscara). Verificado
para las 8 semillas probadas (`0, 1, 42, 12345, -7, Long.MAX_VALUE, Long.MIN_VALUE, -1`).

### Puerto a TypeScript/Node y validación

Se implementó `random_java_port.js` con `BigInt` para el estado de 48 bits y aritmética de 32 bits con
signo replicada explícitamente (`|0` / `BigInt.asIntN(32, …)`) en los puntos donde Java hace overflow de
`int` — en particular dentro del bucle de rechazo de `nextInt(bound)`, que depende de que
`u - r + m` se desborde como `int` de 32 bits para decidir si reintentar.

**Resultado de la comparación** (`Test09Random.salida.txt` de Java vs `Test09Random.node.salida.txt` del
puerto, mismas 8 semillas, mismos métodos, mismas cantidades de valores por método): **coincidencia exacta
en `next`/`nextInt()`/`nextInt(bound)` con `bound` potencia de 2/`nextInt(bound)` sin potencia de 2 con
reintentos reales observados/`nextDouble()`/`nextBoolean()`/`nextLong()`**. La única diferencia de texto fue
en `nextFloat()` (Java imprime `0.73096776`, Node `0.7309677600860596`) y se confirmó que es **el mismo
valor exacto** (`Math.fround(0.7309677600860596) === 0.7309677600860596` → `true`): la diferencia es sólo
que JS no tiene tipo float32 nativo y por eso `console.log` muestra el double completo en vez del string
corto de 32 bits — no es un error del algoritmo.

**Bug real encontrado y corregido durante el desarrollo del puerto** (vale la pena documentarlo porque
cualquiera que reimplemente esto lo va a pisar igual): en `nextLong()`, el segundo `next(32)` debe sumarse
como **`long` con signo (sign-extended)**, no enmascarado a 32 bits sin signo. La primera versión del puerto
hacía `(lo & 0xFFFFFFFFn)` (zero-extend), lo cual da resultados **distintos** a Java cada vez que el segundo
`next(32)` es negativo (~50% de las veces). Se detectó exactamente porque este experimento compara contra
el JDK real y no contra una "reimplementación que se ve razonable".

### Patrones de currículo

`(int)(Math.random() * 100) + 1` y `new Random().nextInt(100) + 1` verificados con
`candidatos/Candidato09_RandomSemillaFija.java` (semilla fija `12345L`): secuencia reproducible
`52, 81, 42, 29, 56`.

### Recomendación: trazas reproducibles cuando el programa NO fija semilla

En un JVM real, `new Random()` y `Math.random()` sin semilla son **genuinamente no deterministas** (semilla
de `System.nanoTime()`), así que no hay "el resultado correcto de Java" contra el cual comparar — cualquier
corrida real del alumno en NetBeans da números distintos. Para que el visualizador sea útil (poder repetir
una traza, comparar con un compañero, que el docente reproduzca lo que ve el alumno) se recomienda:

1. Cuando el programa del alumno usa `new Random(semilla)` con semilla explícita (literal o variable) →
   usar el puerto verificado tal cual, resultado 100% fiel a Java.
2. Cuando usa `new Random()` sin argumentos o `Math.random()` → el intérprete debe **fijar una semilla
   interna propia** (constante, o configurable desde la UI, ej. un botón "🎲 nueva semilla" que el alumno
   puede presionar para variar) y **decirlo explícitamente en la interfaz**: *"Este programa no fija una
   semilla; Java real daría números distintos en cada ejecución. Aquí se usa la semilla `42` para que la
   traza sea repetible."* Esto es honesto (no finge ser el JDK real en un caso donde el JDK real ni siquiera
   es reproducible consigo mismo) y pedagógicamente correcto (el punto de aprendizaje — "sin semilla no hay
   forma de predecir el resultado" — se preserva en el aviso).

**Programa candidato:** `candidatos/Candidato09_RandomSemillaFija.java`; algoritmo de referencia
`random_java_port.js` (reutilizable directo como base de la implementación real del intérprete, ya
validado).

---

## Lista consolidada de programas candidatos al corpus diferencial

Todos en `exploracion/experimentos/numeros/candidatos/`, compilados y ejecutados contra JDK 17 real, con su
`.salida.txt` junto a cada uno (para usarse como *golden output* directo en la spec ejecutable):

1. `Candidato01_IntOverflowYShifts.java` — overflow de suma/resta, `MIN_VALUE/-1`, shifts con máscara de 5 bits y negativos.
2. `Candidato02_DivisionYModulo.java` — truncamiento hacia cero, signo de `%`, división entera vs `double`.
3. `Candidato03_IncrementoDecremento.java` — `x=x++`, `y=y++ + ++y`, asignación compuesta con cast implícito.
4. `Candidato04_DobleFormatoLimites.java` — umbrales 10⁻³/10⁷, incluye 2 valores reales del hueco JDK-4511638.
5. `Candidato05_CastingEncadenado.java` — saturación vs wraparound, el caso `(int)(long)1e30 = -1`.
6. `Candidato06_CharAritmetica.java` — `char` sin signo, promoción a `int`, `++` preserva tipo.
7. `Candidato07_MathRedondeoYAbs.java` — `round` asimétrico, el caso histórico `0.49999999999999994` YA ARREGLADO en JDK 17.
8. `Candidato08_PrintfRedondeo.java` — `2.675→2.68` (la prueba del algoritmo de dígitos cortos), `%.20f` con ceros, agrupación de miles.
9. `Candidato09_RandomSemillaFija.java` — secuencia reproducible del "juego de adivinar".
10. `Candidato10_ConcatenacionMixta.java` — dónde empieza la concatenación en una cadena de `+`.

Más los 9 archivos `Test0N*.java` (más extensos/exploratorios, útiles como batería de regresión adicional,
no sólo como corpus mínimo) y los 4 snippets de `errores_compilacion/` (casos de "aviso claro", no de
ejecución).

## Experimentos de gran escala (datos crudos, no forman parte del corpus pero respaldan las conclusiones)

- `GenerarSalon.java` / `generado/salon.csv` — 19,828 doubles "de salón" con sus bits y `Double.toString` real.
- `GenerarAleatorios.java` / `generado/aleatorios.csv` — 25,465 doubles estratificados por los 2,047 exponentes IEEE-754 posibles.
- `comparar_double_tostring.js` — comparador (reutilizable como base del `Double.toString` del intérprete).
- `generado/diferencias-double-tostring.csv` — las 86 discrepancias reales encontradas, con bits/valor/ambos strings.
- `random_java_port.js` — puerto completo y validado de `java.util.Random` a BigInt/TS.
- `Test09Random.salida.txt` / `Test09Random.node.salida.txt` — las corridas comparadas.

## Riesgos a reportar al orquestador / PO

1. **`float` sin soporte fiel** (recomendación: avisar en vez de fingir precisión) — no reabre el alcance
   v1 (float no está en el currículo U3–U7) pero conviene que quede explícito en la spec para que el error
   que se muestre al alumno sea claro y no un número silenciosamente incorrecto.
2. **Hueco de 0.19% en `Double.toString`** en la banda de magnitud 10¹⁶–10¹⁸ (enteros grandes como double) —
   cero impacto en el uso pedagógico normal, pero es una discrepancia real y medida frente a "fidelidad
   idéntica a Java 17" si algún ejercicio de la suite de 70 frases (o del corpus de este cambio) cae ahí sin
   querer. Recomendación: el corpus diferencial general (no sólo el de este documento) debería evitar
   valores de prueba en esa banda salvo que sea a propósito para documentar el límite conocido.
3. Licencia: si en el futuro se decide cerrar el hueco anterior implementando el algoritmo completo,
   **no copiar código de OpenJDK** (`FloatingDecimal`/`FDBigInteger`, GPLv2+CE) — implementar desde la
   especificación (el javadoc citado) o portar un algoritmo de otra licencia (ej. Ryu, Apache 2.0).

---

## Guardado en Engram

`mem_save(project: "visualizadorjava", topic_key: "sdd/visualizador-java/explore/semantica-numeros", type: "discovery")` con el resumen denso de esta exploración.
