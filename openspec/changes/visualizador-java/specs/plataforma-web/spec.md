# Plataforma web

## Purpose

Define las garantías de plataforma que no dependen de ningún programa Java particular: red, privacidad, rendimiento, accesibilidad, navegadores soportados, idioma de interfaz y despliegue.

## Requirements

### Requirement: [REQ-PLAT-001] Sin red tras la primera carga
Después de la primera visita, el sistema MUST funcionar sin ninguna conexión de red: cargar, ejecutar cualquier programa de la galería y abrir enlaces con el navegador en modo sin conexión. MUST NOT emitir ninguna petición a un origen distinto del propio sitio, en ningún momento.

#### Scenario: uso completo sin conexión
- GIVEN el sitio ya visitado una vez y el navegador puesto en modo sin conexión
- WHEN se recarga la página, se abre un programa de la galería y se ejecuta su traza completa
- THEN todo funciona sin generar ninguna petición de red

### Requirement: [REQ-PLAT-002] Sin datos que salen del navegador
El sistema MUST NOT enviar telemetría, MUST NOT usar cookies, y MUST NOT tener backend ni cuentas de usuario. El único dato que sale del navegador es el enlace que la propia persona decide compartir.

#### Scenario: nada se envía salvo el enlace que la persona comparte
- GIVEN una sesión normal de uso, incluida la ejecución de varios programas
- WHEN se inspecciona el tráfico de red del navegador
- THEN no hay cookies, telemetría, ni peticiones a un backend; el único dato saliente posible es el enlace que la persona decide copiar o compartir

### Requirement: [REQ-PLAT-003] Presupuesto de carga inicial
La primera visita MUST descargar 500 KB o menos comprimidos, y MUST volverse interactiva desde caché en 2 segundos o menos.

#### Scenario: primera visita dentro del presupuesto
- GIVEN una primera visita al sitio publicado, sin caché previa
- WHEN se mide la descarga y el tiempo hasta interactivo desde caché en una recarga
- THEN la descarga comprimida no supera 500 KB y la recarga es interactiva en 2 segundos o menos

### Requirement: [REQ-PLAT-004] Rendimiento durante la ejecución paso a paso
Medido en Chromium con CPU limitada a ×4 (perfil de referencia "laptop escolar"): el sistema MUST responder a una entrada de teclado en 100 ms o menos (percentil 95) incluso con un ciclo desbocado en curso; MUST mostrar el aviso de límite de pasos en 2 segundos o menos; MUST ejecutar 100,000 pasos en modo Normal en 1 segundo o menos; MUST actualizar toda la interfaz al cambiar de paso en 100 ms o menos (percentil 95); MUST saltar a cualquier paso de una traza de 100,000 pasos en 200 ms o menos.

#### Scenario: ciclo desbocado no bloquea la interfaz
- GIVEN 5 programas distintos con ciclos desbocados, corriendo en Chromium con CPU ×4
- WHEN cada uno alcanza el límite de pasos
- THEN el aviso de seguridad aparece en 2 segundos o menos y el teclado responde en 100 ms o menos (p95) durante todo el proceso

### Requirement: [REQ-PLAT-005] Accesibilidad AA
El sistema MUST permitir completar con teclado, sin mouse, todo flujo obligatorio del producto; MUST cumplir contraste AA en todo texto y marcador; MUST NOT transmitir ningún estado usando solo el color; la región de explicación por paso MUST anunciarse a lectores de pantalla con `aria-live="polite"`, reservando `"assertive"` únicamente para avisos de excepción o error; MUST respetar `prefers-reduced-motion` sustituyendo animaciones por cambios instantáneos de estado sin perder información; MUST seguir siendo usable con un zoom de 200%. El sistema MUST NOT tener violaciones graves o críticas de accesibilidad automatizada en las pantallas principales ni en el modo proyector.

#### Scenario: flujo MUST completable solo con teclado
- GIVEN un programa cargado desde la galería
- WHEN una persona navega el editor, avanza/retrocede la traza y lee la explicación usando solo el teclado
- THEN completa el flujo sin necesitar el mouse y sin violaciones graves o críticas reportadas por una auditoría automatizada de accesibilidad

### Requirement: [REQ-PLAT-006] Navegadores soportados
El sistema MUST funcionar en las dos últimas versiones estables de Chromium (Chrome/Edge), Firefox y WebKit (Safari). La fidelidad del motor frente al JDK 17 MUST verificarse en los tres; los flujos completos de extremo a extremo MUST verificarse en Chromium y Firefox.

#### Scenario: fidelidad del motor en los tres motores de navegador
- GIVEN la suite de fidelidad del motor
- WHEN se ejecuta en Chromium, Firefox y WebKit (últimas dos versiones estables de cada uno)
- THEN los tres pasan con el mismo resultado

### Requirement: [REQ-PLAT-007] Idioma de interfaz
Todo texto de la interfaz que el sistema agrega (no lo que Java mismo imprime) MUST estar en español de México, tomado de un catálogo de textos controlado — MUST NOT haber texto de interfaz fuera de ese catálogo. Lo que un programa Java imprime MUST mostrarse tal cual, sin traducir.

#### Scenario: texto de interfaz solo del catálogo es-MX
- GIVEN una revisión de lint sobre todos los textos de la interfaz
- WHEN se ejecuta
- THEN cero textos provienen de fuera del catálogo es-MX controlado; lo que un programa Java imprime se conserva tal cual, sin traducir

### Requirement: [REQ-PLAT-008] Despliegue y reversión de versión
El sistema MUST publicarse como sitio estático versionado; al cargar, MUST buscar una versión nueva y ofrecer recargar si existe una disponible. Revertir una publicación MUST consistir en volver a desplegar la etiqueta de versión anterior, sin requerir ninguna migración de datos (no hay backend ni almacenamiento remoto).

#### Scenario: revertir una publicación
- GIVEN una versión publicada que un docente reporta con un resultado distinto al JDK real
- WHEN el equipo revierte
- THEN se vuelve a desplegar la etiqueta anterior, el service worker ofrece recargar a los clientes, y no se requiere ninguna migración de datos
