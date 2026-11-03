// El texto crudo de los programas de la galería «Ejemplos» (tarea R0.11, REQ-AULA-001, ADR 017): los ÚNICOS `import.meta.glob(…?raw)` del proyecto para `corpus/curso/` y para los ejercicios del PO. Es un
// fragmento DIFERIDO: `contenedores/Ejemplos.tsx` lo pide con un `import()` dinámico la primera vez que el alumno abre «Ejemplos», así no pesa en la carga inicial (≈ 45 KB crudos); el service worker lo
// precachea con el resto del build y la galería funciona sin red (ADR 014). La presentación (`presentacion/galeria.ts`) y los textos nunca ven Vite: reciben este texto ya leído.
const curso = import.meta.glob<string>('../../../corpus/curso/*.{java,entrada.txt}', { query: '?raw', import: 'default', eager: true });
const delPo = import.meta.glob<string>('../../../corpus/experimentos/ejercicios-del-po/*.{java,entrada.txt}', { query: '?raw', import: 'default', eager: true });

/** El texto de cada archivo por su NOMBRE (sin carpeta): `u3-hola-mundo.java`, `maquina-snacks-a1-2-50.entrada.txt`… Las dos carpetas no comparten nombres. */
export const archivosCrudos: Readonly<Record<string, string>> = Object.fromEntries(
  [...Object.entries(curso), ...Object.entries(delPo)].map(([ruta, texto]) => [ruta.slice(ruta.lastIndexOf('/') + 1), texto]),
);
