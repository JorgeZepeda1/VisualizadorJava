# Exploración 01 — Antecedentes y experiencia de aprendizaje

**Cambio SDD:** `visualizador-java` · **Fase:** explore · **Autor:** sub-agente explorador (antecedentes y UX) · **Fecha:** 2026-09-25

**Pregunta que responde este documento:** ¿cómo resuelven otras herramientas y la investigación en enseñanza de programación la visualización de la ejecución paso a paso para principiantes, y qué debemos copiar, evitar o inventar para un alumno de bachillerato mexicano sin experiencia previa?

**Método:** búsqueda web sobre herramientas primarias (sitios oficiales, documentación) y literatura de investigación en educación en informática (ACM DL, ResearchGate, arXiv, ERIC). Todas las afirmaciones llevan URL. Donde la evidencia es indirecta (resumen de buscador, no lectura completa del PDF) lo marco explícitamente.

---

## 0. Resumen para quien tiene prisa

1. El competidor/modelo más cercano a lo que se va a construir no es Python Tutor: es **JavaWiz** (2025), un depurador educativo en TypeScript con 10 vistas sincronizadas y *time-travel debugging*. Hay que estudiarlo como referencia directa, no solo como antecedente histórico — [javawiz.net](https://javawiz.net/).
2. La investigación es consistente en un punto: **mirar no enseña, predecir sí**. Un estudio controlado encontró que pedir a los alumnos predecir antes de revelar el resultado ("Responding") produjo aprendizaje y compromiso significativamente mayores que solo ver la animación con comentario del instructor ("Viewing") — [Kumar 2015, PMC6302837](https://pmc.ncbi.nlm.nih.gov/articles/PMC6302837/). Esto convierte el "modo predicción" del punto 8 en un **MUST**, no en un extra.
3. La "prueba de escritorio" que ya se enseña en México **es** la vista de traza que pide el punto 3: una tabla con una columna por variable y un renglón por paso. Generarla automáticamente desde la traza del intérprete no es una función nueva — es la representación que el alumno ya reconoce del salón de clases.
4. El **notional machine** (Sorva 2013) es el marco correcto para decidir qué mostrar: el visualizador *es* la máquina nocional que el alumno se va a formar en la cabeza. Si el visualizador muestra algo que Java realmente no hace (o esconde algo que sí hace), el alumno construye un modelo mental incorrecto que después le va a estorbar — [Sorva, ACM TOCE 2013](https://dl.acm.org/doi/10.1145/2483710.2483713).
5. La granularidad correcta **no es una sola**: Thonny (referencia explícita del PO) resuelve esto con pasos "grandes" (por línea) y "chicos" (por subexpresión) — [thonny/plugins/help/debuggers.rst](https://github.com/thonny/thonny/blob/master/thonny/plugins/help/debuggers.rst). Recomiendo el mismo modelo de dos niveles.
6. El catálogo de errores conceptuales de U3–U6 no es una lista arbitraria: coincide con la literatura de "misconceptions" en programación introductoria (Qian & Lehman 2017, revisión sistemática — [ACM TOCE](https://dl.acm.org/doi/pdf/10.1145/3077618)) y con el marco de "roles de variables" de Sajaniemi para contador/acumulador/bandera — [PPIG 2005](https://www.ppig.org/files/2005-PPIG-17th-sajaniemi.pdf).
7. Riesgo técnico real y verificado: el propio creador de Python Tutor documenta que un intérprete de terceros **nunca calza al 100 % con el intérprete oficial** en casos de esquina — justo el riesgo que el ADR de "fidelidad verificada contra JDK 17 real" ya anticipa con pruebas diferenciales. Confirma que esa decisión del PO es la correcta, no una sobre-ingeniería.
8. Riesgo de alcance: construir el paso "detallado" por subexpresión (con cortocircuito de `&&`/`||`) es la parte más cara de construir de todo el motor — es la razón por la que Jeliot 3 y Thonny le dedicaron investigación propia. Debe presupuestarse aparte en `sdd-design`/`sdd-tasks`, no tratarse como "el mismo trabajo, un poco más detallado".

**Riesgos para el orquestador:** ninguno contradice las decisiones ya tomadas por el PO; los dos puntos anteriores son de **esfuerzo/presupuesto**, no de dirección. Ver §12.

**Guardado:** archivo en el repo (esta ruta) + Engram (`sdd/visualizador-java/explore/antecedentes-ux`, proyecto `visualizadorjava`).

---

## 1. Antecedentes: qué hacen otras herramientas

Para cada herramienta: qué resuelve bien, qué le fallaría a un alumno de bachillerato sin experiencia, qué copiar y qué evitar.

### 1.1 Python Tutor / Java Tutor (pythontutor.com)

El estándar de facto de la industria educativa. Selecciona lenguaje (incluye Java), pega código, "Visualize Execution", y avanza paso a paso. Cada paso resalta la línea ejecutada, muestra los **marcos** (frames) de todas las funciones activas en la pila con sus variables locales, los **objetos en el heap** (p. ej. una `LinkedList` con nodos y flechas `next`), y la salida acumulada de consola — [pythontutor.com/java.html](https://pythontutor.com/java.html), [artículo Java Visualizer](https://pythontutor.com/articles/java-visualizer.html).

- **Qué hace bien:** el deslizador de pasos con flechas "línea recién ejecutada → línea siguiente" es el patrón de interacción correcto y ya validado con millones de usuarios; las flechas del heap para referencias son la mejor forma conocida de explicar que una variable objeto "apunta a" y no "contiene"; cero fricción — sin cuenta, sin instalar nada.
- **Qué le falla a un alumno de bachillerato sin experiencia:** el paso es **por línea ejecutada completa**, nunca por subexpresión — no existe el "3 > 5 → false" que pide el PO; el panel de variables es plano (nombre = valor), sin resaltar *qué cambió* respecto al paso anterior ni el valor anterior; no hay explicación en lenguaje natural del paso, el alumno tiene que inferir solo; no hay modo de predicción — es 100 % "Viewing" en la taxonomía de Naps (ver §2.2), el nivel con menor evidencia de aprendizaje.
- **Qué copiar:** el deslizador con contador "paso X de Y", el botón único "Visualizar" sin configuración previa, las flechas de referencia en el heap para cuando el currículo llegue a objetos.
- **Qué evitar:** no confundir "mostrar todo el estado" con "explicar el paso"; Python Tutor asume que el usuario ya sabe leer una pila de llamadas — un alumno de bachillerato en U3 no.
- **Riesgo técnico confirmado, relevante para nuestro motor:** el propio equipo de Python Tutor documenta que reimplementar un intérprete de un lenguaje ya existente para fines de visualización nunca replica el 100% de los casos de esquina del intérprete oficial (hallazgo obtenido de resultados de búsqueda sobre las limitaciones del proyecto, no de lectura completa del artículo) — esto es evidencia externa a favor de la decisión ya tomada por el PO de exigir pruebas diferenciales contra el JDK 17 real.

### 1.2 Thonny (referencia explícita del PO para evaluación de expresiones)

IDE de Python para principiantes con depurador integrado que distingue **pasos grandes** (saltar a la siguiente línea/bloque) de **pasos chicos** (entrar a cada componente de una expresión), y un "modo agradable" (*nicer mode*) que muestra explícitamente comparaciones y evaluaciones intermedias — [thonny/plugins/help/debuggers.rst](https://github.com/thonny/thonny/blob/master/thonny/plugins/help/debuggers.rst), [Real Python sobre Thonny](https://realpython.com/python-thonny/).

- **Qué hace bien:** es la única herramienta mainstream con la distinción explícita de granularidad de dos niveles que el PO pide en el punto 4; el modo de pasos chicos literalmente hace la sustitución progresiva de una expresión, que es el comportamiento exacto que se pide para `x > 5 → 3 > 5 → false`.
- **Qué le falla para bachillerato:** su UI es de IDE de escritorio (menús, atajos poco discoverable), no de app web enfocada; el "modo agradable" es opt-in y no obvio para un principiante; no separa "condición de un if" de "expresión aritmética" visualmente — es el mismo mecanismo genérico para todo.
- **Qué copiar:** el concepto de dos velocidades de paso (normal/detallado) — es la base de la recomendación del §4; no obligar a pasos chicos por defecto (abruma), pero ofrecerlos con un botón claro.
- **Qué evitar:** la curva de descubrimiento — en Thonny hay que saber que existe el modo chico y activarlo; en nuestro producto el cambio de granularidad debe ser un control visible siempre, no una opción escondida en un menú.

### 1.3 Jeliot 3

Sistema de animación de programas diseñado específicamente para Java y para principiantes. Anima automáticamente evaluación de expresiones, control de flujo, llamadas a métodos y paso de parámetros en un "escenario" junto al código; no requiere preparación del profesor — cualquier programa se anima tal cual — [dl.acm.org/10.1145/1007996.1008099](https://dl.acm.org/doi/10.1145/1007996.1008099), [estudio de efectividad con Jeliot 3](https://www.researchgate.net/publication/286993855_Effectiveness_of_Program_Visualization_in_Learning_Java_a_Case_Study_with_Jeliot_3).

- **Qué hace bien:** es la prueba histórica de que animar la *evaluación* de una expresión Java (no solo el resultado) mejora el aprendizaje de novatos — validación directa del enfoque que pide el punto 4 del encargo; interactúa con BlueJ.
- **Qué le falla para bachillerato:** la animación "de escenario" con figuras moviéndose es vistosa pero lenta de ver muchas veces seguidas (cuesta repasar rápido); es una aplicación de escritorio Java, sin URL para compartir ni publicación web; el proyecto está prácticamente inactivo desde hace años — no es una referencia de mantenimiento, solo de diseño pedagógico.
- **Qué copiar:** animar la evaluación de expresión paso a paso automáticamente, sin que el profesor prepare nada — coincide con "alumno pega su programa de NetBeans y ya".
- **Qué evitar:** la dependencia de animación continua como único modo; nuestro alumno necesita poder detenerse en cualquier punto intermedio, no solo ver una animación que corre.

### 1.4 jGRASP (viewers y *Canvas*)

IDE con generación automática de diagramas UML y de control de flujo a partir del código fuente, más un *Canvas* de "viewers" dinámicos (pilas, colas, árboles, arreglos) que se actualizan en vivo mientras se depura — [jgrasp.org/viewers.html](https://www.jgrasp.org/viewers.html), [tutorial del Canvas](https://www.jgrasp.org/tutorials200/jGRASP_12_Canvas.pdf).

- **Qué hace bien:** el diagrama de flujo generado automáticamente del código fuente (no dibujado a mano) es exactamente el "panel de flujo" que conviene para mostrar visualmente si una condición se toma o no; los *viewers* dedicados por tipo de dato (arreglo vs árbol) muestran que vale la pena tener una vista distinta según el tipo de variable.
- **Qué le falla para bachillerato:** el *Canvas* hay que armarlo manualmente arrastrando *viewers* — es una herramienta para el profesor que prepara una demo, no algo que el alumno abre solo; la UI es densa, de herramienta profesional de los 2000.
- **Qué copiar:** diagrama de flujo generado automáticamente y sincronizado con la línea actual.
- **Qué evitar:** exponer la configuración manual de paneles al alumno; en nuestro producto el layout debe ser fijo y automático.

### 1.5 BlueJ (depurador + *Code Pad*)

IDE creado específicamente para enseñar Java a principiantes. Su depurador permite ver la ruta de ejecución y el estado cambiante de variables; su *Code Pad* evalúa fragmentos sueltos de código Java (expresiones o sentencias) de forma interactiva, con historial navegable — [BlueJ Code Pad](https://www.bluej.org/download/files/codepad.pdf), [evaluación pedagógica de BlueJ](https://www.researchgate.net/publication/320655948_Teaching_and_Learning_with_BlueJ_an_Evaluation_of_a_Pedagogical_Tool).

- **Qué hace bien:** el *Code Pad* — poder evaluar "¿cuánto vale `5/2`?" suelto, sin programa completo — es un patrón valioso para que un alumno experimente con precedencia y casting fuera de un programa completo (Unidad 4). BlueJ es, junto con jGRASP, el estándar histórico de "IDE hecho para enseñar", con evidencia publicada de uso en aula real.
- **Qué le falla para bachillerato:** su fuerte es la visualización de **objetos** (diagramas de clases, crear instancias a mano) — currículo orientado a POO — mientras que el currículo U3–U7 de este producto es de **consola estructurada** (sin clases propias todavía); es escritorio, no web.
- **Qué copiar:** la idea del *Code Pad* como "sandbox" de expresiones sueltas podría inspirar una función posterior (fuera de v1) para que el alumno pruebe expresiones aisladas.
- **Qué evitar:** el modelo mental centrado en objetos/instancias — prematuro para U3–U6 de este currículo.

### 1.6 JIVE (Java Interactive Visualization Environment)

Complemento de Eclipse que representa el historial de llamadas como un **diagrama de secuencia UML** extendido, coloreado por hilo de ejecución, con operaciones de plegado y filtrado para manejar ejecuciones grandes — [cse.buffalo.edu/jive](https://cse.buffalo.edu/jive/), [paper original](https://dl.acm.org/doi/pdf/10.1145/1028664.1028762).

- **Qué hace bien:** demuestra que un diagrama de secuencia (quién llamó a quién, cuándo regresó) es la mejor vista para el historial de llamadas a métodos — relevante si el alcance llega a incluir métodos propios del alumno (fuera de U3–U7 según el currículo revisado, que no menciona métodos definidos por el alumno).
- **Qué le falla para bachillerato:** UML de diagramas de secuencia es un lenguaje visual que el alumno de bachillerato no conoce ni necesita en U3–U7; es un plugin de Eclipse, herramienta profesional.
- **Qué copiar:** nada directo para v1 (el alcance no incluye métodos propios ni multihilo); anotar como referencia si en el futuro se agregan métodos definidos por el usuario.
- **Qué evitar:** UML como lenguaje de la interfaz — el alumno no lo conoce.

### 1.7 UUhistle / *Visual Program Simulation* (Sorva & Sirkiä)

Sistema donde el **alumno mismo** hace de computadora: en vez de solo ver la animación, arrastra y manipula los elementos de la visualización para mostrar qué pasa después — la validación es automática y da retroalimentación sobre errores conceptuales específicos — [UUhistle, ACM DL](https://dl.acm.org/doi/10.1145/1930464.1930471), [guía contextual en UUhistle](https://www.researchgate.net/publication/259998795_Context-Sensitive_Guidance_in_the_UUhistle_Program_Visualization_System).

- **Qué hace bien:** es la implementación más seria del nivel más alto de compromiso de la taxonomía de Naps (§2.2) — "constructing", no solo "responding"; sus estudios muestran que el patrón de manipulación de los alumnos revela sus concepciones erróneas específicas, información que un profesor puede usar.
- **Qué le falla para bachillerato:** requiere que el alumno arrastre y suelte elementos correctamente incluso cuando su duda es conceptual, no de manejo de la herramienta — fricción extra para un principiante absoluto; construir el reconocimiento de manipulación libre es mucho más caro de implementar que un botón de predicción binaria.
- **Qué copiar:** la idea de recolectar en qué paso el alumno predijo mal, como señal para el profesor (posible función de reportes fuera de v1).
- **Qué evitar:** la simulación de manipulación libre como mecanismo de v1 — el costo de implementación no se justifica frente al "modo predicción" ligero (ver §8) que ya captura la mayor parte del beneficio de aprendizaje documentado.

### 1.8 PLTutor (Nelson et al.)

Herramienta con pedagogía "*comprehension-first*": explica y evalúa la traducción causa-efecto de "token de código → instrucción → cambio de estado de máquina" en cada paso, con explicaciones en los pasos importantes y navegación adelante/atrás a nivel de línea y a niveles más altos — [tesis de Greg L. Nelson](https://digital.lib.washington.edu/server/api/core/bitstreams/2e6d58fb-53c0-4370-8c06-75fdd2216a39/content), [Comprehension First, ICER 2017](https://dl.acm.org/doi/10.1145/3105726.3106178).

- **Qué hace bien:** es la evidencia empírica más citable de que las **explicaciones en pasos clave** funcionan — en un estudio pequeño, la ganancia de aprendizaje con PLTutor fue notablemente mayor que con una plataforma de práctica sin trazas explicadas (comparación numérica reportada por la fuente: ganancia de PLTutor de 3.89 vs. 2.42 sobre 27 preguntas del instrumento SCS1, frente a Codecademy). Esto respalda directamente el punto 7 del encargo (plantillas de explicación).
- **Qué le falla para bachillerato:** el estudio es sobre JavaScript, no Java, y con una muestra pequeña — no generalizar el número exacto, solo la dirección del efecto; la interfaz mezcla mucho texto de lección con la traza, y este producto ya tiene contenido pedagógico separado en `AprendiendoJava`.
- **Qué copiar:** explicar el "por qué" del paso, no solo el "qué" — es la justificación de que cada plantilla del §7 debe explicar causa, no solo describir el evento.
- **Qué evitar:** mezclar lección teórica dentro del visualizador — el visualizador explica *esta ejecución*, no la teoría general (eso ya vive en `AprendiendoJava`).

### 1.9 JavaWiz (2025) — el antecedente más cercano al producto que se va a construir

Depurador educativo visual y gráfico para Java con **diez vistas sincronizadas**: vista de memoria (pila, estáticos, heap), vista tabular de historia de ejecución enfocada en valores primitivos, **diagrama de flujo dinámico que resalta la sentencia activa**, vistas especializadas para arreglos (tabla interactiva con animación de índices), listas/árboles, *streams* de Java (diagramas de burbuja), diagrama de secuencia de llamadas, e historial navegable y buscable — con **depuración con retroceso en el tiempo** (*time-travel debugging*), incluida la posibilidad de ir hacia atrás — [javawiz.net](https://javawiz.net/).

- **Qué hace bien:** es la validación más fuerte encontrada de que el enfoque completo que pide el PO (múltiples vistas sincronizadas, flujo resaltado, retroceder pasos) es viable en 2025 y ya tiene demanda educativa. Su vista de flujo dinámico con la sentencia activa resaltada es prácticamente el panel "marcadores de línea actual/siguiente" del punto 5. El retroceso de pasos (time travel) confirma que "atrás" en los controles del punto 5 no es un lujo, es un patrón ya esperado por el estado del arte 2025.
- **Qué le falla para bachillerato:** diez vistas simultáneas es carga cognitiva alta para un principiante absoluto (ver §2.3, carga cognitiva) — JavaWiz está diseñado para un curso universitario de estructuras de datos (arreglos, listas, árboles, *streams*), no para U3–U6 de un bachillerato que apenas ve `if`/`while`; no hay evidencia encontrada de que tenga explicación en lenguaje natural del paso ni modo de predicción.
- **Qué copiar:** el diagrama de flujo dinámico sincronizado; el *time-travel debugging*; la separación entre una vista de "historia tabular de valores primitivos" (que es, en esencia, una prueba de escritorio automática — ver §3) y una vista de "memoria" (pila/heap) para cuando aparezcan objetos.
- **Qué evitar:** activar las diez vistas a la vez por defecto — para U3–U6 la mayoría (streams, árboles, secuencia de llamadas) está fuera de alcance y no debe ni existir en la interfaz v1; hay que usar 3–4 vistas relevantes al currículo, no imitar la densidad de una herramienta para un curso más avanzado.

### 1.10 Otras herramientas relevantes 2020–2026 (mención breve)

- **The Visual Debugger Tool / "Visual Debugger: Past, Present, and Future"** (2024) — trabajo reciente que sistematiza qué debe tener un depurador visual educativo moderno; confirma que el campo sigue activo y que 2024–2025 es el momento de más publicaciones sobre esto en años — [arxiv.org/pdf/2404.12932](https://arxiv.org/pdf/2404.12932), [arxiv.org/pdf/2403.03683](https://arxiv.org/pdf/2403.03683).
- **"Eye": Program Visualizer for CS2** — visualizador reciente orientado a estructuras de datos (curso CS2, no CS1); confirma la tendencia de vistas múltiples coordinadas pero para currículo más avanzado que el de este producto — [arxiv.org/pdf/2101.12089](https://arxiv.org/pdf/2101.12089).
- **Mapeo sistemático de investigación 2023 sobre programación con animación** (Yusuf et al.) — panorama general de qué se ha estudiado 2010s–2020s en "program animation"; útil como bibliografía de respaldo, no aporta una herramienta nueva — [Wiley, cae.22659](https://onlinelibrary.wiley.com/doi/abs/10.1002/cae.22659).
- **Runestone Academy / CSAwesome** — libros de texto interactivos en línea (no depuradores) con secciones específicas sobre *casting* y tipos que confirman cómo se explica pedagógicamente el truncamiento en Java a nivel bachillerato/AP CS — usado como fuente para el catálogo de errores (§6), no como antecedente de visualización.

### 1.11 Tabla resumen — qué se copia de cada uno

| Herramienta | Qué copiar para v1 |
|---|---|
| Python Tutor / Java Tutor | Deslizador de pasos "X de Y"; cero fricción (pegar y visualizar); flechas de referencia (para cuando haya objetos) |
| Thonny | Dos niveles de granularidad (normal/detallado) con control visible |
| Jeliot 3 | Animación automática de evaluación de expresión sin preparación del profesor |
| jGRASP | Diagrama de flujo generado automáticamente y sincronizado |
| BlueJ | Idea de "sandbox" de expresiones sueltas (post-v1) |
| JIVE | (referencia solo si se agregan métodos propios, fuera de v1) |
| UUhistle | Capturar en qué paso el alumno predijo mal (señal para el profesor, post-v1) |
| PLTutor | Explicar el porqué en pasos clave, no solo narrar el evento |
| JavaWiz | Flujo dinámico sincronizado + retroceder pasos (time-travel); pero con 3–4 vistas, no diez |

---

## 2. Evidencia pedagógica

### 2.1 El *notional machine* (Sorva, 2013)

Una "máquina nocional" es la computadora abstracta que un modelo de enseñanza le hace creer al alumno que existe — el conjunto de reglas de ejecución que el alumno interioriza para predecir qué hace un programa. Sorva argumenta que el profesor (y, por extensión, cualquier herramienta) debe tratar la máquina nocional como un **objetivo de aprendizaje explícito**, no como un efecto secundario — [Sorva 2013, ACM TOCE](https://dl.acm.org/doi/10.1145/2483710.2483713).

**Aplicación directa a este producto:** cada panel del visualizador *es* una pieza de la máquina nocional que el alumno va a memorizar. Esto tiene una consecuencia estricta: **todo lo que el visualizador muestre debe ser verdad sobre cómo Java realmente ejecuta**, no una simplificación cómoda. Es la razón de fondo (más allá de "requisito del PO") por la que la fidelidad contra el JDK 17 real (ya decidida, ADR de motor) no es negociable: si el visualizador miente sobre `%` con negativos o sobre el orden de evaluación, el alumno construye una máquina nocional incorrecta que después le va a fallar en NetBeans, con el profesor sin poder explicar por qué "la página decía otra cosa".

### 2.2 Taxonomía de compromiso (Naps et al., 2002) y su refinamiento

La taxonomía original define seis niveles de compromiso con una visualización, de menor a mayor: *no viewing* (no ver nada), *viewing* (ver pasivamente), *responding* (responder preguntas sobre lo que se ve), *changing* (cambiar entradas/parámetros), *constructing* (construir la visualización uno mismo) y *presenting* (explicarla a otros) — [Naps et al. 2002, ACM DL](https://dl.acm.org/doi/pdf/10.1145/774833.774846). Un refinamiento posterior (Lauer) matiza que el orden no siempre es estrictamente jerárquico en impacto de aprendizaje, pero confirma que los niveles puramente pasivos (*no viewing*, *viewing*) son sistemáticamente los de menor beneficio medido — [Lauer, "Reevaluating and refining the engagement taxonomy"](https://dl.acm.org/doi/abs/10.1145/1384271.1384397); ver también la extensión de Myller et al. — [cs.joensuu.fi/myller09.pdf](http://cs.joensuu.fi/pages/int/pub/myller09.pdf).

**Evidencia empírica directa sobre "predecir antes de avanzar":** un estudio controlado en aula (Kumar, 2015) comparó "Responding" (predecir antes de que la animación revele el resultado) contra "Viewing" (ver la animación con comentario del instructor) para un tema de complejidad media. Resultado: el grupo "Responding" tuvo compromiso conductual activo significativamente mayor, mejor percepción de aprendizaje, y — cuando los alumnos ya tenían entrenamiento previo en aprendizaje activo — mejor tasa de resolución de problemas medida — [PMC6302837](https://pmc.ncbi.nlm.nih.gov/articles/PMC6302837/). Un meta-estudio anterior sobre 24 estudios experimentales de visualización de algoritmos ya apuntaba en la misma dirección: el compromiso interactivo predice el efecto de aprendizaje mejor que la calidad visual de la animación — [Hundhausen, Douglas & Stasko, "A Meta-Study of Algorithm Visualization Effectiveness"](https://faculty.cc.gatech.edu/~john.stasko/papers/jvlc02.pdf).

**Consecuencia de diseño:** un visualizador que solo se ve avanzar (como Python Tutor puro) está construido en el nivel de *menor* evidencia de aprendizaje de toda la taxonomía. El "modo predicción" (punto 8 del encargo) no es una función opcional de "nice to have docente" — es lo que mueve al producto del nivel 2 (*viewing*) al nivel 3 (*responding*), que es donde empieza la evidencia sólida de beneficio. Ver recomendación de priorización en §8 y §10.

### 2.3 Carga cognitiva y qué NO mostrarle a un principiante

La teoría de carga cognitiva distingue carga **intrínseca** (la dificultad real del contenido — inevitable), **extrínseca** (la que agrega un mal diseño de la interfaz — evitable) y **germana** (el esfuerzo productivo de construir el modelo mental — deseable). El **efecto de atención dividida** (*split-attention effect*) dice específicamente que si la información relacionada está separada en el espacio (p. ej. código en una esquina, explicación en otra, sin conexión visual), la memoria de trabajo del alumno se gasta en *buscar y conectar*, no en *entender* — carga extrínseca pura — [Wikipedia, Split attention effect](https://en.wikipedia.org/wiki/Split_attention_effect); revisión reciente de carga cognitiva aplicada específicamente a educación en programación — [ACM TOCE, "Cognitive Load Theory in Computing Education Research: A Review"](https://dl.acm.org/doi/full/10.1145/3483843).

**Consecuencias de diseño concretas:**

- La línea resaltada en el código y el panel de variables deben estar **en el mismo campo visual**, nunca en pestañas separadas que obliguen a cambiar de vista para conectar "qué línea corrió" con "qué cambió" (atención dividida).
- Por eso JavaWiz con sus diez vistas simultáneas es una carga extrínseca excesiva para un principiante absoluto (§1.9) — cada vista adicional es más "dónde miro" antes de poder pensar "qué significa".
- La carga intrínseca debe crecer con el currículo, no de golpe: en U3 (variables, entrada/salida) el visualizador no debe mostrar el panel de evaluación de condiciones (no existe todavía); en U5 (decisiones) no debe forzar el modo "detallado" de subexpresión por defecto. Esto es el argumento pedagógico, además del de usabilidad, para el modelo de dos niveles del §4.
- Toda animación decorativa que no aporte información (viñetas moviéndose sin significado) es carga extrínseca pura — Jeliot 3 es vistoso pero cuesta repasar rápido (§1.3) precisamente por esto.

---

## 3. Prueba de escritorio como vista alternativa

En México, la "prueba de escritorio" (o "prueba de mesa") es la técnica que ya se enseña para verificar un algoritmo a mano: una tabla con una columna por variable relevante y un renglón por paso, donde se anota el valor de cada variable conforme avanza el algoritmo, hasta comparar el resultado final con el esperado — [PSeIntLab, "¿Qué es una prueba de escritorio?"](https://pseintlab.com/que-es-una-prueba-de-escritorio/), [Aztlek, "Cómo hacer una prueba de escritorio"](https://aztlek.org/2014/08/11/como-hacer-una-prueba-de-escritorio/).

**Hallazgo clave:** esto no es una función nueva que inventar — es la representación que el alumno **ya conoce** de la materia y probablemente ya practicó en papel antes de llegar a Java (currículo U1–U2 en `AprendiendoJava`, que es puro pseudocódigo/diagrama sin Java todavía). Generarla automáticamente desde la traza del intérprete es, en términos de aprendizaje, la forma más directa de decirle al alumno: "esto que ya sabes hacer a mano es exactamente lo que la computadora hace sola".

**Diferencia con el panel de variables (estado actual):**

| | Panel de variables | Prueba de escritorio |
|---|---|---|
| Qué muestra | El valor **actual** de cada variable en el paso seleccionado | El **historial completo**: un renglón por paso, todas las variables |
| Cuándo sirve | Seguir la ejecución en vivo, paso por paso | Repasar/estudiar después, comparar cómo cambió una variable a lo largo de todo el programa |
| Analogía | "¿Qué trae la variable ahora?" | La tabla de cuaderno que ya usan en clase |

**Recomendación de diseño:**

1. Generarla automáticamente al finalizar (o en cualquier punto) de la ejecución: una fila por paso *relevante* (asignaciones y evaluaciones de condición — no cada sentencia irrelevante, para no saturar), una columna por variable que haya existido en algún momento del alcance visible.
2. Cuando una variable todavía no existe en ese paso, celda vacía o "—"; cuando sale de alcance (termina el bloque), se puede sombrear el resto de la columna.
3. Resaltar la celda que cambió en cada renglón (mismo mecanismo visual que el resaltado de "valor anterior → valor nuevo" del panel de variables, ver §5).
4. Debe vivir como una **pestaña alternativa** del mismo panel de estado (Variables | Prueba de escritorio | Consola), no como una pantalla aparte — mismo argumento de atención dividida del §2.3.
5. Utilidad extra para el docente: es exportable/imprimible tal cual como el formato de examen que ya usan — coincide con la actividad "predicción de salida (traza)" que el currículo de `AprendiendoJava` ya define en su catálogo de actividades (F2).

---

## 4. Granularidad del paso: modelo de dos niveles

**Recomendación: dos niveles, no uno solo — "Normal" (por sentencia) y "Detallado" (por subexpresión), con un control siempre visible para cambiar entre ellos.** Justificación: es el mismo modelo de Thonny (§1.2), evita forzar carga cognitiva alta desde el primer uso (§2.3), y permite que el currículo mismo dicte cuándo conviene cada nivel (U3 rara vez necesita subexpresión; U4 en adelante sí).

- **Normal (por sentencia/línea):** un paso = una sentencia ejecutada completa. Una condición se muestra ya evaluada con su sustitución final en un solo paso: `intentos < 10 → 3 < 10 → true`. Es el nivel por defecto y el único necesario para U3, U5 (nivel básico) y la mayoría de U6.
- **Detallado (por subexpresión):** un paso = una sub-evaluación dentro de una expresión, respetando precedencia y asociatividad de Java. Necesario para U4 (precedencia, expresiones mixtas) y para explicar cortocircuito de `&&`/`||` operando por operando. Opt-in mediante un control visible (no un menú escondido — ver crítica a Thonny en §1.2).

### 4.1 Catálogo de tipos de paso y cómo se ve cada uno

| Tipo de paso | Qué resalta | Qué muestra |
|---|---|---|
| Declaración | La línea; la variable aparece en el panel con valor inicial (o "sin inicializar", ver §6) | `int total;` → `total` aparece con valor `— (sin inicializar)` |
| Asignación simple | Línea; celda de la variable en el panel | Valor anterior tachado/atenuado → valor nuevo resaltado |
| Asignación compuesta (`+=`, `-=`, etc.) | Línea; expresión expandida en detallado | `total += precio` → detallado: `total = total + precio` → `total = 100 + 25` → `total = 125` |
| `++` / `--` | Línea; distinción prefijo/postfijo si el currículo lo requiere | `contador++` → `contador: 3 → 4` |
| Evaluación de condición (if/while) | La condición completa; en detallado, cada subexpresión | Cadena de sustitución: `x > 5` → `3 > 5` → `false` |
| Cortocircuito `&&` | El operando izquierdo primero; si es `false`, el derecho se marca "no evaluado" | `edad >= 18 && tieneCredencial` → `false && ...` → resultado `false` sin tocar el segundo operando |
| Cortocircuito `\|\|` | Igual, invertido | `esVIP \|\| saldo > 1000` → si `esVIP` es `true`, el segundo operando se marca "no evaluado" |
| Rama tomada / no tomada (if-else) | Resalta con una marca (✓/✗) la rama que sí corre; la otra se atenúa visualmente, nunca se oculta | "Como es `false`, no entra al bloque del `if`; sigue en `else`" |
| Cadena `else-if` | Cada condición evaluada en orden hasta la primera verdadera | Muestra explícitamente cuáles condiciones se evaluaron y se descartaron antes de la que ganó |
| `switch` — caso que coincide | Resalta el `case` igualado | "El valor de `opcion` (2) coincide con `case 2`" |
| `switch` — caída sin `break` | Resalta que la ejecución sigue al siguiente `case` sin volver a comparar | "No hay `break`, así que también se ejecuta `case 3` sin revisar su condición" |
| `switch` — `default` | Resalta que ningún `case` coincidió | "Ningún caso coincidió con `opcion` (9); se ejecuta `default`" |
| Condición de ciclo (con número de vuelta) | La condición + contador de vueltas visible | `intentos < 10` → `3 < 10 → true` → "entra a la vuelta 4" |
| Fin de ciclo (condición falsa) | La condición + salida | `intentos < 10` → `10 < 10 → false` → "sale del ciclo después de 10 vueltas" |
| `break` | Línea; salto visual fuera del bloque de ciclo/switch | "`break` corta el ciclo/switch aquí; el programa continúa después de la llave que cierra" |
| `continue` | Línea; salto visual a la condición del ciclo | "`continue` salta el resto de esta vuelta y va directo a revisar la condición otra vez" |
| `print` / `println` | Línea; nueva línea en consola resaltada un instante | Texto agregado a consola con un destello breve |
| `printf` | Línea; consola + nota de formato | Se puede mostrar el patrón y el valor sustituido: `"%.2f" con 3.14159 → "3.14"` |
| Lectura con `Scanner` | Línea; consola en estado de espera | Ver §5 (entrada interactiva vs. precargada) |
| Excepción en tiempo de ejecución | Línea que la causó, resaltada en color de error | Explicación en español del tipo de excepción y su causa (ver plantillas §7) |
| Fin del programa | — | Resumen: consola final + estado final de variables (enlaza con prueba de escritorio, §3) |

---

## 5. Diseño de paneles

### 5.1 Elementos por panel

- **Marcadores de línea:** una marca para "línea que se acaba de ejecutar" y otra, distinta, para "línea que sigue" (patrón validado por Python Tutor, §1.1, y por el flujo dinámico de JavaWiz, §1.9). No basta un solo resaltado: el alumno necesita distinguir pasado de futuro inmediato.
- **Variables:** tabla nombre / tipo / valor. Al cambiar, mostrar el valor anterior atenuado junto al nuevo resaltado (no solo reemplazar el número: la investigación en máquina nocional (§2.1) enfatiza que el alumno debe *ver el cambio de estado*, no solo el estado). Variables fuera de alcance en el paso actual se atenúan o desaparecen con una nota ("`n` salió de alcance al cerrar el bloque").
- **Evaluación de condiciones:** panel dedicado (no mezclado con variables) que muestra la cadena de sustitución del §4. Aparece solo cuando el paso actual es una evaluación — el resto del tiempo puede colapsarse para no ocupar espacio permanentemente (carga extrínseca, §2.3).
- **Contador de vueltas:** visible siempre que el paso actual esté dentro de un ciclo; muestra "vuelta N" y, si es anidado, la vuelta de cada ciclo por separado (p. ej. "ciclo externo: vuelta 2 · ciclo interno: vuelta 3").
- **Consola:** salida impresa en un color/estilo y **la entrada que el alumno tecleó en otro color**, replicando la convención visual de NetBeans donde lo escrito por el usuario se distingue de lo impreso por el programa — esto es explícitamente lo que pide el punto 5 del encargo y es coherente con que el alumno ya conoce esa convención de su IDE de clase.
- **Entrada de Scanner — interactiva, precargada, o ambas:** **ambas, no es una disyuntiva.** Por defecto interactiva: el visualizador se detiene en el `Scanner.nextInt()`/`nextLine()` y espera que el alumno teclee, igual que en NetBeans — esto es lo más fiel a la experiencia real y lo que más refuerza la máquina nocional correcta ("el programa se detiene a esperarte"). Además, debe existir la opción de precargar una lista de entradas al programa (útil para: el profesor que arma un ejemplo reproducible para compartir por URL — punto 8 del encargo —, y para la suite de pruebas diferenciales contra el JDK real, que de por sí necesita entradas fijas y deterministas para poder comparar). Una vez que una entrada fue consumida, retroceder pasos (§5.2) no debe volver a pedirla — se reproduce desde el historial, igual que el *time-travel debugging* de JavaWiz (§1.9).
- **Explicación en lenguaje natural:** un renglón (o dos) fijo, siempre en el mismo lugar de la pantalla, que traduce el paso actual a una oración en español — plantillas concretas en §7. Debe estar en el mismo campo visual que el código y las variables, no en una pestaña aparte (atención dividida, §2.3).
- **Controles:** inicio (⏮), atrás (◀), adelante (▶), fin (⏭), reproducir con velocidad ajustable (▶️ + control de velocidad), deslizador de posición (arrastrable, con el patrón "paso X de Y" de Python Tutor), y atajos de teclado (flecha izquierda/derecha para atrás/adelante, Inicio/Fin para saltar a los extremos, espacio para reproducir/pausar).

### 5.2 Boceto ASCII (laptop / proyector)

```
┌───────────────────────────────────────────────────────────────────────────┐
│  Visualizador de Java          Ejemplo: Adivina el número ▾        ⚙  🔊  │
├────────────────────────────────────┬─────────────────────────────────────┤
│ CÓDIGO                              │ [Variables] [Prueba de escritorio]  │
│  1  int intentos = 0;               │ ┌──────────┬──────┬──────────────┐ │
│  2  int secreto = ...Random...;     │ │ nombre   │ tipo │ valor        │ │
│  3  Scanner lector = new Scanner...;│ ├──────────┼──────┼──────────────┤ │
│▶ 4  while (intentos < 10) {         │ │ intentos │ int  │ 3 ᵍ→ 4       │ │
│  5    System.out.print("Numero: "); │ │ secreto  │ int  │ 7            │ │
│▷ 6    int n = lector.nextInt();     │ │ n        │ int  │ (aún no)     │ │
│  7    intentos++;                   │ └──────────┴──────┴──────────────┘ │
│  8    if (n == secreto) {           │  Normal ● ─── ○ Detallado          │
│  9      ...                         │───────────────────────────────────│
│ 10    }                             │ CONDICIÓN                          │
│ 11  }                               │  intentos < 10                     │
│                                      │  3 < 10  →  true                   │
│                                      │  ↳ SÍ entra al ciclo (vuelta 4)    │
│                                      │───────────────────────────────────│
│                                      │ CONSOLA                            │
│                                      │  Numero: 5                         │
│                                      │  No. Intenta otra vez.             │
│                                      │  Numero: ▍(escribe aquí)           │
├──────────────────────────────────────────────────────────────────────────┤
│ 💬 Se evalúa la condición del while: intentos < 10 → 3 < 10 → true.       │
│    Como es true, el programa entra otra vez al ciclo (va en la vuelta 4).│
├──────────────────────────────────────────────────────────────────────────┤
│  ⏮   ◀ Atrás   ▶ Adelante   ⏭     ▶️ Reproducir  ▁▂▃  ═══●══════════    │
└──────────────────────────────────────────────────────────────────────────┘
     ▶ línea recién ejecutada     ▷ línea siguiente     ᵍ valor anterior
```

**Notas para proyector (modo docente, §8):** misma disposición, con fuente y controles escalados (mínimo ~24px de texto de código); el panel de condición y consola pueden apilarse verticalmente en vez de compartir columna si el proyector es 4:3; el toggle Normal/Detallado se puede ocultar en modo proyector si el profesor quiere simplificar la vista para introducir un tema.

---

## 6. Catálogo de errores conceptuales clásicos (U3–U6)

Este catálogo coincide con la revisión sistemática de "misconceptions" en programación introductoria de Qian & Lehman (2017), que agrupa las dificultades de los novatos en conocimiento sintáctico, conceptual y estratégico — [ACM TOCE, Qian & Lehman](https://dl.acm.org/doi/pdf/10.1145/3077618) — y con el marco de "roles de variables" de Sajaniemi para contador/acumulador/bandera — [PPIG 2005](https://www.ppig.org/files/2005-PPIG-17th-sajaniemi.pdf).

| # | Error conceptual | Qué pasa realmente en Java | Cómo lo hace evidente el visualizador |
|---|---|---|---|
| 1 | División entera | `5 / 2` da `2`, no `2.5` (trunca, no redondea) | Paso de asignación muestra el tipo del resultado (`int`) y una nota: "división entre enteros: se descarta la parte decimal" |
| 2 | `%` con negativos | El signo del resultado sigue al del **dividendo**, no al divisor: `-7 % 3 = -1` (Java usa división truncada, no módulo matemático) — [programming.guide](https://programming.guide/java/remainder-modulo-operator-negative-numbers.html) | Panel de evaluación muestra la cuenta completa, no solo el resultado: "`-7 % 3` → residuo con signo de -7 → `-1`" |
| 3 | `=` vs `==` | `=` asigna, `==` compara | Colores/íconos distintos en el resaltado de cada operador dentro del panel de condición/asignación |
| 4 | `==` con `String` vs `.equals()` | `==` compara referencias, no contenido — puede dar `false` con dos strings de igual texto | Cuando el paso es una comparación de `String` con `==`, nota explícita de advertencia (ver plantilla §7) |
| 5 | Variable sin inicializar | Java no compila si se usa una variable local sin inicializar — es un error de compilación, no de ejecución | El visualizador muestra la variable como "— (sin inicializar)" desde la declaración hasta la primera asignación; si el intento de uso ocurre antes, el mensaje debe explicar que Java ni siquiera dejaría ejecutar eso (distinto de otros lenguajes) |
| 6 | Error por uno (*off-by-one*) en `for` | `for (int i = 0; i <= n; i++)` ejecuta una vuelta de más frente a `i < n` | Contador de vueltas visible en cada iteración hace evidente la vuelta extra/faltante al comparar con el resultado esperado |
| 7 | Ciclo infinito | La condición nunca se vuelve falsa (p. ej. falta actualizar la variable de control) | Límite de seguridad de pasos con aviso claro ("este ciclo lleva N vueltas sin cambiar la condición; ¿olvidaste actualizar una variable?"), nunca colgar el navegador |
| 8 | `;` después de `if`/`for`/`while` (sentencia vacía) | `if (x > 5);` crea una sentencia vacía — el bloque `{ }` que sigue se ejecuta siempre, sin condición | El visualizador debe mostrar la sentencia vacía como un paso real ("esto no hace nada; la condición no controla lo que sigue") — el error más difícil de ver sin traza, porque visualmente el código "parece" correcto |
| 9 | Llaves faltantes (solo la primera sentencia entra al if) | Sin `{ }`, solo la sentencia inmediatamente siguiente pertenece al `if` | El marcador de "rama tomada" debe abarcar visualmente solo esa sentencia, dejando claro que las siguientes se ejecutan siempre |
| 10 | `else` colgante (*dangling else*) | Un `else` se asocia siempre con el `if` no cerrado más cercano, pase lo que la indentación sugiera — [Wikipedia, Dangling else](https://en.wikipedia.org/wiki/Dangling_else) | Resaltar con una línea o color qué `if` "pertenece" a ese `else`, especialmente cuando la indentación del alumno engaña |
| 11 | `switch` sin `break` | Cae al siguiente `case` sin volver a comparar — [GeeksforGeeks, fall-through](https://www.geeksforgeeks.org/java/fall-through-condition-in-java/) | Paso explícito "caída sin break" en el catálogo del §4.1 |
| 12 | `nextInt()` seguido de `nextLine()` | `nextInt()` no consume el salto de línea; el `nextLine()` siguiente "lee" ese salto vacío en vez de esperar al usuario — [freeCodeCamp](https://www.freecodecamp.org/news/java-scanner-nextline-call-gets-skipped-solved/) | Mostrar el buffer pendiente del `Scanner` como parte del estado (algo que ningún antecedente revisado expone explícitamente — ver oportunidad de diferenciación en §12) |
| 13 | Aritmética con `char` | `'a' + 1` da `98` (`int`), no `'b'` — el `char` se promueve a `int` en operaciones aritméticas | El panel de evaluación muestra el tipo de cada operando y cómo se promueve, no solo el número final |
| 14 | Truncamiento al hacer *casting* | `(int) 3.9` da `3` (trunca hacia cero), no redondea — distinto de `Math.round` | Nota explícita en el paso de casting: "se descarta la parte decimal, no se redondea" |
| 15 | Cortocircuito | Alumno espera que ambos lados de `&&`/`\|\|` siempre se evalúen | Paso "no evaluado" explícito en el operando derecho cuando el izquierdo ya decidió el resultado (§4.1) |
| 16 | Alcance de variables en bloques | Una variable declarada dentro de `{ }` no existe fuera de ese bloque | Variables atenuadas/removidas del panel al cerrar el bloque que las declaró (§5.1) |
| 17 | Acumulador sin inicializar | `total += precio` antes de `total = 0` arrastra basura o no compila si es local | Igual que el error 5, mostrado en el contexto específico de un acumulador |
| 18 | Contador vs. acumulador vs. bandera | Confundir el rol de una variable (Sajaniemi: *stepper*/contador cambia en secuencia predecible ±1; *gatherer*/acumulador suma valores variables; bandera booleana registra si algo ocurrió) | Oportunidad **COULD** (no v1): etiquetar automáticamente el rol de una variable en el panel según su patrón de uso detectado en la traza — ver priorización §10 |

---

## 7. Plantillas de explicación en español de México

Tuteo, amable, preciso, sin infantilizar — coherente con el tono de retroalimentación "nunca un incorrecto a secas" ya definido para `AprendiendoJava`. `{marcadores}` son variables de la plantilla.

1. **Declaración:** `Se declara la variable {nombre} de tipo {tipo}. Todavía no tiene un valor asignado.`
2. **Declaración con inicialización:** `Se declara {nombre} de tipo {tipo} y se le asigna el valor {valor} de una vez.`
3. **Asignación simple:** `Se calcula {expresion} y el resultado ({valor}) se guarda en {nombre}. Antes tenía {valorAnterior}.`
4. **Asignación compuesta:** `{nombre} += {expresion} equivale a {nombre} = {nombre} + {expresion}. Como {nombre} valía {valorAnterior}, ahora vale {valorNuevo}.`
5. **Incremento (`++`):** `{nombre}++ le suma 1 a {nombre}. Pasó de {valorAnterior} a {valorNuevo}.`
6. **Decremento (`--`):** `{nombre}-- le resta 1 a {nombre}. Pasó de {valorAnterior} a {valorNuevo}.`
7. **Evaluación de condición if (verdadera):** `Se evalúa la condición {expr}: {sustitucion} → {resultado}. Como es {resultado}, el programa SÍ entra al bloque del if.`
8. **Evaluación de condición if (falsa):** `Se evalúa la condición {expr}: {sustitucion} → {resultado}. Como es {resultado}, el programa NO entra al bloque del if.`
9. **Cadena else-if:** `La condición {exprAnterior} fue falsa, así que se revisa la siguiente: {expr} → {resultado}.`
10. **else final:** `Ninguna de las condiciones anteriores fue verdadera, así que se ejecuta el bloque else.`
11. **Cortocircuito `&&` (se detiene):** `En {expr}, el primer lado ({izq}) ya dio false. Como con && basta que un lado sea false para que todo sea false, Java ni siquiera revisa el segundo lado ({der}).`
12. **Cortocircuito `\|\|` (se detiene):** `En {expr}, el primer lado ({izq}) ya dio true. Como con || basta que un lado sea true para que todo sea true, Java ni siquiera revisa el segundo lado ({der}).`
13. **switch — caso que coincide:** `El valor de {expr} es {valor}, que coincide con case {caso}. Se ejecuta desde aquí.`
14. **switch — caída sin break:** `Este case no tiene break, así que la ejecución sigue de largo hacia el siguiente case, sin volver a comparar su condición.`
15. **switch — default:** `El valor {valor} no coincidió con ningún case, así que se ejecuta default.`
16. **Condición de ciclo (continúa):** `Se revisa la condición del {tipoCiclo}: {sustitucion} → true. El programa entra a la vuelta número {numeroVuelta}.`
17. **Condición de ciclo (termina):** `Se revisa la condición del {tipoCiclo}: {sustitucion} → false. El ciclo termina después de {numeroVuelta} vuelta(s).`
18. **break:** `break corta el ciclo (o el switch) inmediatamente. El programa continúa justo después de la llave que lo cierra.`
19. **continue:** `continue salta lo que falta de esta vuelta y regresa directo a revisar la condición del ciclo.`
20. **print/println:** `Se imprime "{texto}" en la consola{saltoLinea}.`
21. **printf:** `Se imprime "{texto}" usando el formato {patron}. El valor {valor} se acomoda como {valorFormateado}.`
22. **Scanner esperando entrada:** `El programa está esperando a que escribas un valor para {nombre} (tipo {tipo}). Escríbelo en la consola y presiona Enter.`
23. **Scanner recibió el valor:** `Escribiste {valorTecleado}. Se guarda en {nombre} como {tipo}.`
24. **Excepción en tiempo de ejecución:** `El programa se detuvo por un error: {tipoExcepcion}. {explicacionEnEspanol}. Esto pasó en la línea {linea}.`
25. **Fin del programa (normal):** `El programa terminó. Así quedaron las variables al final; así se ve la consola completa.`
26. **Fin del programa (por excepción):** `El programa terminó de forma anormal por el error de la línea {linea}. No llegó a ejecutar el resto del código.`

---

## 8. Funciones para el docente

- **Modo proyector (fuente grande):** recomendado **MUST** para v1 — el contexto de uso principal descrito por el PO es "el docente proyecta en el aula"; sin esto, el producto no cumple su escenario de uso primario. Ver boceto §5.2.
- **Compartir el programa por URL:** **MUST** para v1 — es lo que permite al docente preparar un ejemplo en casa y abrirlo en el pizarrón sin reescribir código; también es la vía natural para que el catálogo de errores (§6) se pueda enlazar como ejemplos reproducibles. Requiere que el estado (código + entradas precargadas de Scanner, si las hay) quepa codificado en la URL o en almacenamiento estático versionado con el sitio (coherente con "cero CDNs en tiempo de ejecución" y publicación en GitHub Pages).
- **Galería de ejemplos por unidad:** **MUST** para v1 — sin ejemplos curados alineados a U3–U7, cada profesor tendría que escribir sus propios programas de prueba desde cero; es el punto de entrada más bajo de fricción para un docente que evalúa la herramienta por primera vez.
- **Modo "predice antes de avanzar":** la evidencia del §2.2 es la más fuerte de todo este documento a favor de una función — no es prudente mandarla a "después". Recomiendo dividirla:
  - **MUST v1 — predicción ligera:** antes de revelar el resultado de una evaluación de condición o de una vuelta de ciclo, el botón "Adelante" se reemplaza por dos opciones ("¿Entra al if? Sí / No" o "¿Se repite el ciclo? Sí / No"); el alumno elige, y **entonces** se revela el resultado real con la explicación. Esto es barato de construir (es una variante del control "Adelante" ya necesario) y cubre exactamente el mecanismo que el estudio de Kumar (§2.2) mostró que funciona.
  - **SHOULD v1.1 — predicción de valor:** pedir que el alumno escriba qué va a imprimir `print`/`println` antes de revelarlo, o qué valor va a quedar en una variable tras una asignación. Requiere validar una respuesta de texto libre (más trabajo de UX que un Sí/No) — no bloqueante para v1 pero de alto valor.
  - Justificación de dejar fuera de v1 solo la versión de texto libre: el binario Sí/No ya captura la mayor parte del beneficio documentado (comprometerse con una predicción antes de ver el resultado) al costo de una fracción del esfuerzo de construir validación de texto libre.

---

## 9. Accesibilidad

- **Navegación con teclado:** todos los controles del §5.1 deben ser alcanzables por teclado — flechas para atrás/adelante, Inicio/Fin para saltar a los extremos, barra espaciadora para reproducir/pausar, Tab para moverse entre paneles. Ningún gesto exclusivo de mouse (arrastrar el deslizador debe tener equivalente de teclado).
- **Contraste AA:** todos los textos y marcadores de color (rama tomada/no tomada, valor anterior/nuevo, consola de entrada/salida) deben cumplir contraste mínimo AA — y **no depender solo del color** para distinguir estados (p. ej. rama no tomada: además de atenuar el color, usar un ícono o texto "no se ejecuta"), porque parte del alumnado puede tener daltonismo.
- **`aria-live` para la explicación del paso:** la región de explicación en lenguaje natural (§5.1, §7) debe anunciarse a lectores de pantalla con `aria-live="polite"` cada vez que cambia — "polite" para no interrumpir abruptamente al usuario de lector de pantalla en medio de otra lectura; reservar `"assertive"` únicamente para el aviso de una excepción/error de ejecución, que sí es información crítica e inmediata — [MDN, ARIA Screen Reader Implementors Guide](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/ARIA_Screen_Reader_Implementors_Guide).
- **Movimiento reducido:** respetar `prefers-reduced-motion` — cuando está activo, sustituir animaciones de transición (resaltados que se deslizan, destellos) por cambios instantáneos de estado, sin perder la información (el "destello" de una línea nueva en consola, por ejemplo, se vuelve un cambio de fondo estático breve en vez de una animación).

---

## 10. Priorización — MUST / SHOULD / COULD

**MUST (v1):**

- Marcadores de línea actual/siguiente + panel de variables con resaltado de cambio (valor anterior → nuevo) — núcleo mínimo sin el cual no hay producto (§5.1).
- Panel de evaluación de condiciones con cadena de sustitución (`x > 5 → 3 > 5 → false`) — es el requisito explícito y central del encargo del PO.
- Granularidad de dos niveles, Normal por defecto — sin esto, U4 (precedencia/expresiones mixtas) no se puede enseñar bien con la herramienta (§4).
- Contador de vueltas de ciclo, incluido anidado.
- Consola con distinción visual entrada/salida + Scanner interactivo (detiene la ejecución y espera) — es la experiencia que replica NetBeans, que el currículo asume como referencia.
- Explicación en lenguaje natural en cada paso, con las plantillas del §7.
- Controles completos: inicio/atrás/adelante/fin/reproducir/deslizador + atajos de teclado.
- Modo proyector, compartir por URL, galería de ejemplos por unidad (§8) — el escenario de uso primario del PO es el aula proyectada.
- Modo predicción ligero (Sí/No en condiciones y continuación de ciclo) — evidencia demasiado fuerte para posponer (§2.2, §8).
- Accesibilidad base: teclado completo, contraste AA, `aria-live` en la explicación (§9).
- Cobertura de todo el catálogo de errores conceptuales #1–17 del §6 (el #18, contador/acumulador/bandera, es COULD — ver abajo).

**SHOULD (poco después de v1):**

- Prueba de escritorio como pestaña alternativa generada automáticamente (§3) — de alto valor y bajo riesgo técnico (es una proyección de datos que ya existen en la traza), pero no bloquea el uso básico del visualizador.
- Modo predicción de valor libre (escribir qué va a imprimir) (§8).
- Entrada de Scanner precargada (lista de valores definidos de antemano), además de la interactiva — necesaria pronto para ejemplos reproducibles del docente y para la suite de pruebas diferenciales contra JDK, pero el visualizador puede lanzarse solo-interactivo primero.
- `prefers-reduced-motion` (§9) — importante, pero puede añadirse una vez que exista animación que reducir.

**COULD (v2 o más adelante, sin evidencia suficiente para forzarlo a v1):**

- Etiquetado automático del rol de una variable (contador/acumulador/bandera, error #18 del §6, marco de Sajaniemi) — valioso pero es detección de patrón sobre la traza, no una necesidad para que el resto funcione.
- Captura de en qué paso el alumno predijo mal, como señal agregada para el profesor (inspirado en UUhistle, §1.7) — requiere backend/almacenamiento, y el proyecto es estático por decisión ya tomada.
- *Sandbox* de expresiones sueltas al estilo BlueJ Code Pad (§1.5).
- Vistas de heap/objetos con flechas de referencia al estilo Python Tutor (§1.1) — no aplica mientras el alcance U3–U7 no incluya objetos propios del alumno.

---

## 11. Fuera de alcance de este documento

No entré en detalle de factibilidad técnica del intérprete (parsing, AST, cómo generar la traza) ni en el diseño visual final (paleta, tipografía) — corresponden a `sdd-design` y, si existe, a otro explorador dedicado a arquitectura/motor. Este documento es puramente de experiencia de aprendizaje y antecedentes.

---

## 12. Riesgos y preguntas para fases posteriores (no bloquean, no reabren decisiones del PO)

1. **Riesgo de esfuerzo, no de dirección:** el nivel "Detallado" con cortocircuito de subexpresión (§4) es, por evidencia histórica (Jeliot 3 y Thonny lo trataron como motor de evaluación aparte, §1.2–§1.3), la parte más cara del intérprete/visualizador. `sdd-design`/`sdd-tasks` deben presupuestarlo como un componente propio, no como "una bandera más" sobre el motor de paso por sentencia.
2. **Confirmación externa, no contradicción:** la exigencia ya fijada de pruebas diferenciales contra el JDK 17 real está respaldada por la experiencia documentada del propio equipo de Python Tutor sobre las limitaciones de reimplementar un intérprete de terceros (§1.1) — es evidencia a favor de mantener esa exigencia con el mismo rigor, no un hallazgo que la cuestione.
3. **Oportunidad de diferenciación no pedida explícitamente pero detectada en la investigación:** ningún antecedente revisado (Python Tutor, Jeliot 3, JavaWiz, jGRASP) expone visualmente el estado interno del *buffer* de `Scanner` — que es precisamente la causa del error clásico `nextInt()`/`nextLine()` (#12 del catálogo, §6). Mostrarlo sería una mejora genuina sobre el estado del arte, no solo una réplica. Lo dejo anotado para que `sdd-propose` decida si vale la pena incluirlo explícitamente en el alcance o dejarlo como detalle de implementación de la plantilla #12.
4. **Pregunta abierta para el PO (no la respondo yo, es una decisión de producto):** el modo predicción ligero (§8) cambia el flujo de "Adelante" en cada condición/ciclo — ¿debe ser el comportamiter **por defecto** desde el primer uso, o un modo que el docente activa? La evidencia (§2.2) sugiere que sí ayuda por defecto, pero podría chocar con la expectativa de un docente que solo quiere "darle play" para ilustrar algo rápido en el pizarrón. Sugiero que `sdd-propose` lo formule como pregunta explícita si no hay ya una respuesta.

---

## Fuentes consultadas

**Herramientas:**
- [Python Tutor — Visualize Java Code](https://pythontutor.com/java.html)
- [Python Tutor — artículo sobre el visualizador de Java](https://pythontutor.com/articles/java-visualizer.html)
- [Python Tutor — artículo sobre el visualizador de Python](https://pythontutor.com/articles/python-visualizer.html)
- [Thonny — documentación de depuradores](https://github.com/thonny/thonny/blob/master/thonny/plugins/help/debuggers.rst)
- [Real Python — Thonny: The Beginner-Friendly Python Editor](https://realpython.com/python-thonny/)
- [Jeliot 3 — "Program animation in jeliot 3" (SIGCSE)](https://dl.acm.org/doi/10.1145/1007996.1008099)
- [Jeliot 3 — estudio de efectividad de caso](https://www.researchgate.net/publication/286993855_Effectiveness_of_Program_Visualization_in_Learning_Java_a_Case_Study_with_Jeliot_3)
- [jGRASP — Viewers y Canvas](https://www.jgrasp.org/viewers.html)
- [jGRASP — tutorial del Canvas](https://www.jgrasp.org/tutorials200/jGRASP_12_Canvas.pdf)
- [BlueJ — Code Pad](https://www.bluej.org/download/files/codepad.pdf)
- [BlueJ — evaluación pedagógica](https://www.researchgate.net/publication/320655948_Teaching_and_Learning_with_BlueJ_an_Evaluation_of_a_Pedagogical_Tool)
- [JIVE — sitio del proyecto](https://cse.buffalo.edu/jive/)
- [JIVE — paper original](https://dl.acm.org/doi/pdf/10.1145/1028664.1028762)
- [UUhistle — ACM DL](https://dl.acm.org/doi/10.1145/1930464.1930471)
- [UUhistle — guía contextual](https://www.researchgate.net/publication/259998795_Context-Sensitive_Guidance_in_the_UUhistle_Program_Visualization_System)
- [Review of Generic Program Visualization Systems (Sorva, Karavirta, Malmi 2013)](https://dl.acm.org/doi/10.1145/2490822)
- [PLTutor — tesis de Greg L. Nelson](https://digital.lib.washington.edu/server/api/core/bitstreams/2e6d58fb-53c0-4370-8c06-75fdd2216a39/content)
- [Comprehension First (Nelson et al., ICER 2017)](https://dl.acm.org/doi/10.1145/3105726.3106178)
- [JavaWiz — sitio del proyecto](https://javawiz.net/)
- [The Visual Debugger Tool (2024)](https://arxiv.org/pdf/2404.12932)
- [Visual Debugger: Past, Present, and Future (2024)](https://arxiv.org/pdf/2403.03683)
- ["Eye": Program Visualizer for CS2](https://arxiv.org/pdf/2101.12089)
- [Mapeo sistemático 2023 — Yusuf et al.](https://onlinelibrary.wiley.com/doi/abs/10.1002/cae.22659)

**Evidencia pedagógica:**
- [Sorva 2013 — Notional machines and introductory programming education](https://dl.acm.org/doi/10.1145/2483710.2483713)
- [Naps et al. 2002 — Algorithm Visualization in CS Education: Comparing Levels of Student Engagement](https://dl.acm.org/doi/pdf/10.1145/774833.774846)
- [Lauer — Reevaluating and refining the engagement taxonomy](https://dl.acm.org/doi/abs/10.1145/1384271.1384397)
- [Myller et al. — Extending the Engagement Taxonomy](http://cs.joensuu.fi/pages/int/pub/myller09.pdf)
- [Kumar 2015 — Effect of active learning using program visualization (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC6302837/)
- [Hundhausen, Douglas & Stasko — A Meta-Study of Algorithm Visualization Effectiveness](https://faculty.cc.gatech.edu/~john.stasko/papers/jvlc02.pdf)
- [Split attention effect — Wikipedia](https://en.wikipedia.org/wiki/Split_attention_effect)
- [Cognitive Load Theory in Computing Education Research: A Review](https://dl.acm.org/doi/full/10.1145/3483843)
- [Sajaniemi — Roles of Variables in Experts' Programming Knowledge (PPIG 2005)](https://www.ppig.org/files/2005-PPIG-17th-sajaniemi.pdf)
- [Qian & Lehman 2017 — Students' Misconceptions and Other Difficulties in Introductory Programming](https://dl.acm.org/doi/pdf/10.1145/3077618)
- ["Ten Million Users and Ten Years Later" — Python Tutor design guidelines (Guo)](https://dl.acm.org/doi/fullHtml/10.1145/3472749.3474819) *(hallazgo indirecto vía resultados de búsqueda; el fetch directo del texto completo devolvió 403 — no se citan detalles no confirmados)*

**Prueba de escritorio:**
- [PSeIntLab — ¿Qué es una prueba de escritorio?](https://pseintlab.com/que-es-una-prueba-de-escritorio/)
- [Aztlek — Cómo hacer una prueba de escritorio](https://aztlek.org/2014/08/11/como-hacer-una-prueba-de-escritorio/)

**Catálogo de errores conceptuales:**
- [freeCodeCamp — Scanner nextLine() skipped after nextInt()](https://www.freecodecamp.org/news/java-scanner-nextline-call-gets-skipped-solved/)
- [GeeksforGeeks — Why Scanner skips nextLine()](https://www.geeksforgeeks.org/java/why-is-scanner-skipping-nextline-after-use-of-other-next-functions/)
- [Wikipedia — Dangling else](https://en.wikipedia.org/wiki/Dangling_else)
- [riptutorial — Dangling if/dangling else](https://riptutorial.com/java/example/19166/pitfall---leaving-out-braces--the--dangling-if--and--dangling-else--problems)
- [GeeksforGeeks — Fall Through Condition in Java](https://www.geeksforgeeks.org/java/fall-through-condition-in-java/)
- [Wirekat — Java puzzler sobre missing breaks](https://wirekat.com/do-you-know-this-java-puzzler-about-missing-breaks/)
- [Off-by-one error](http://www.cs.iit.edu/~cs561/cs115/looping/off-by-one.html)
- [Incus Data — Off-by-one errors](https://incusdata.com/blog/off-by-one-errors)
- [CSAwesome — Casting and Ranges of Values](https://runestone.academy/ns/books/published/csawesome/Unit1-Getting-Started/topic-1-6-casting.html)
- [Java, Java, Java — Character Data and Operators](https://runestone.academy/ns/books/published/javajavajava/character-dataand-operators.html)
- [programming.guide — Java remainder/modulo con negativos](https://programming.guide/java/remainder-modulo-operator-negative-numbers.html)

**Accesibilidad:**
- [MDN — ARIA Screen Reader Implementors Guide](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/ARIA_Screen_Reader_Implementors_Guide)

**Documentos internos consultados (solo lectura):**
- `/Users/desarrollo/AprendiendoJava/docs/01-vision.md`
- `/Users/desarrollo/AprendiendoJava/docs/02-curriculum.md`
- `/Users/desarrollo/VisualizadorJava/openspec/changes/visualizador-java/state.yaml`
