# Verificación diferencial

## Purpose

Define qué debe ser cierto sobre el sistema de comparación automática contra el JDK 17 real para que una afirmación de fidelidad sea aceptable: el oráculo, la disciplina de los goldens, y los criterios cuantitativos que un cambio debe superar.

## Requirements

### Requirement: [REQ-DIFF-001] Oráculo único
El JDK 17 de referencia (Temurin 17.0.18, con `-Duser.language=es -Duser.country=MX -Dfile.encoding=UTF-8` y `javac -encoding UTF-8`) MUST ser la única fuente de verdad para la salida esperada de cualquier programa del subconjunto soportado. Una diferencia observada al ejecutar en otra arquitectura (x86_64) MUST tratarse como una medición de diferencia de plataforma; MUST NOT tratarse como el valor correcto.

#### Scenario: diferencia en x86_64 no se trata como verdad
- GIVEN el mismo programa y entrada ejecutados en el oráculo macOS arm64 y en un trabajo de medición x86_64, con una diferencia observada en `Math.pow`
- WHEN se compara contra el resultado esperado
- THEN el valor de macOS arm64 (el oráculo) es el que define si el sistema acierta o falla; la diferencia en x86_64 solo se registra como medición

### Requirement: [REQ-DIFF-002] Los goldens nunca se escriben a mano
Ningún archivo de salida esperada ("golden") MUST escribirse u editarse a mano. Todo golden MUST regenerarse capturando en binario la salida real (`stdout`/`stderr`) del oráculo, preservando el salto de línea final exacto.

#### Scenario: un golden sin el salto de línea final se detecta y se regenera
- GIVEN un golden existente cuyo último byte no coincide con la salida binaria real del oráculo para ese mismo programa y entrada
- WHEN se ejecuta la regeneración
- THEN el golden se reemplaza por la captura binaria real, nunca se corrige a mano

### Requirement: [REQ-DIFF-003] Corpus curricular byte a byte
Para los programas del corpus curricular que terminan, `stdout` y `stderr` producidos por el sistema MUST ser idénticos byte a byte a los del oráculo con las mismas entradas. El único programa del corpus con ciclo infinito intencional MUST, en cambio, cumplir el comportamiento de límite de pasos y aviso definido en `motor-de-ejecucion`.

#### Scenario: el corpus completo coincide byte a byte
- GIVEN los programas del corpus curricular que terminan, con sus entradas
- WHEN se ejecutan en el sistema y se comparan contra el oráculo
- THEN `stdout` y `stderr` coinciden byte a byte en el 100% de ellos, salvo el programa de ciclo infinito intencional, que en cambio cumple el comportamiento de límite de pasos

### Requirement: [REQ-DIFF-004] Conjuntos de propiedades y galería de autoría
La galería de autoría (`Math`, `Random` con y sin semilla, `printf`, `String`, `Character`, `long`) MUST coincidir 100% con el oráculo. Un conjunto de al menos 1,000 programas generados dentro del subconjunto soportado MUST, cada uno, o bien coincidir exactamente con el oráculo o bien producir el aviso específico correcto de `subconjunto-java` — MUST NEVER producir una salida inventada. Además, una muestra por cada construcción fuera de alcance del catálogo de `subconjunto-java` MUST disparar su aviso antes de ejecutar, con cero pasos ejecutados y cero errores de sintaxis engañosos.

#### Scenario: fuzzing dentro del subconjunto sin salidas inventadas
- GIVEN 1,000 programas generados automáticamente dentro del subconjunto soportado
- WHEN se ejecutan contra el sistema y el oráculo
- THEN cada uno coincide exactamente o produce el aviso correcto de fuera de alcance; ninguno produce una salida que no sea ni lo uno ni lo otro

### Requirement: [REQ-DIFF-005] Fidelidad numérica cuantificada
`Double.toString` MUST coincidir con el oráculo en 45,292 de 45,293 valores del conjunto original de salón (el residual documentado en `biblioteca-java` queda como límite conocido, no oculto) y en el 100% de cada conjunto denso adicional generado por el oráculo, por clase (ver `biblioteca-java` REQ-BIB-002): banda de enteros `[2^53, 2^63)` (≥ 1,000 por exponente 53–62, con empates), empates en el borde de redondeo (149,985 decimales cortos en los exponentes con empate posible), las 2,098 potencias de dos y sus vecinos, y subnormales (20,104) — donde una clase no se caracterice al 100%, el aviso en ejecución "No disponible" sustituye a cualquier valor no verificado; ni cuenta como acierto ni pasa como fallo silencioso. `printf`/`String.format` MUST coincidir en el 100% de al menos 30,000 combinaciones de valor y precisión. `Random` MUST coincidir en el 100% de al menos 8 semillas por todos los métodos soportados. `Math.pow` MUST coincidir en el 100% de al menos 26,000 pares verificados. `Character` MUST coincidir en el 100% de los 65,536 valores de `char`.

#### Scenario: conjunto de 45,293 dobles verificado
- GIVEN el conjunto original de 45,293 valores `double` de salón verificados contra el JDK 17
- WHEN se formatean con el sistema
- THEN coinciden 45,292; el único residual queda documentado como límite conocido (ver `biblioteca-java`)

#### Scenario: conjuntos densos por clase, sin residual oculto
- GIVEN los conjuntos densos generados por el oráculo de empates (149,985), potencias de dos (2,098) y subnormales (20,104)
- WHEN se formatean con el sistema
- THEN cada clase coincide al 100% con el oráculo, o el sistema muestra el aviso "No disponible" en los valores que ninguna regla caracterizó — nunca un dígito no verificado

### Requirement: [REQ-DIFF-006] Veredicto de compilación contra mutantes
Sobre un conjunto de al menos 2,000 mutantes de un solo cambio generados a partir de programas válidos, el veredicto "compila"/"no compila" del sistema MUST coincidir con `javac` 17 en el 100% de los casos, y la línea del primer error MUST coincidir en al menos el 95% de ellos.

#### Scenario: 2,000 mutantes de un solo cambio
- GIVEN 2,000 programas válidos, cada uno con una única mutación introducida (p. ej. quitar un `;`, cambiar `==` por `=`)
- WHEN se analizan con el sistema y con `javac` 17
- THEN el veredicto compila/no compila coincide en el 100% de los casos, y la línea del primer error coincide en al menos el 95%

### Requirement: [REQ-DIFF-007] Cobertura de explicaciones y errores conceptuales
En cada paso de cada traza de la galería (Normal y Detallado), la explicación en español producida por el sistema MUST estar completamente resuelta, sin marcadores de plantilla sin llenar. Cada uno de los errores conceptuales documentados del catálogo pedagógico (división entera, `%` con negativos, `=` vs `==`, `==` con `String`, variable sin inicializar, error por uno, ciclo infinito, `;` fantasma, llaves faltantes, `else` colgante, `switch` sin `break`, buffer de `Scanner`, aritmética con `char`, truncamiento de cast, cortocircuito, alcance de bloques, acumulador sin inicializar) MUST tener al menos un programa de ejemplo cuya traza lo haga visible.

#### Scenario: ningún marcador de plantilla sin resolver
- GIVEN todas las trazas (Normal y Detallado) de los programas de la galería
- WHEN se revisa el texto de explicación de cada paso
- THEN ninguno contiene un marcador de plantilla sin sustituir (p. ej. `{nombre}` literal)

### Requirement: [REQ-DIFF-008] Compuerta de integración continua
La integración continua MUST ejecutar el corpus diferencial, los conjuntos de propiedades y los mutantes en una máquina macOS arm64, generando y comparando ahí mismo contra el oráculo; MUST ejecutar además un trabajo en x86_64 cuyo resultado se use únicamente para medir diferencias de plataforma (p. ej. `Math.pow`), sin bloquear la integración por esas diferencias medidas.

#### Scenario: el job x86_64 mide sin bloquear
- GIVEN una corrida de integración continua donde el trabajo x86_64 mide una diferencia en `Math.pow` frente al oráculo arm64
- WHEN el trabajo arm64 (oráculo) pasa sin diferencias
- THEN la integración continua se reporta en verde; la diferencia x86_64 queda registrada como medición, no como fallo

## Conciliación con design.md §12 (2026-09-25)

- **REQ-DIFF-005** editado: ya no basta el residual único de 45,292/45,293 (C4 reformulado en `proposal.md` §8). Ahora exige 100% por clase en los conjuntos densos del oráculo (banda de enteros, empates, potencias de dos, subnormales), con el aviso en ejecución "No disponible" como salida válida donde una clase no se caracterice al 100%; se agregó un escenario para los tres conjuntos nuevos.
- Ningún requisito se eliminó ni cambió de ID.
