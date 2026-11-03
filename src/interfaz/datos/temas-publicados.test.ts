// RED de la tarea R0.8 (PQ-2, REQ-PANT-001, REQ-PANT-002, ADR 017): el ÚNICO punto que responde si hay al menos un tema del libro publicado. De él dependen la puerta «Leer un tema» del saludo y la sección
// «Libro» de la navegación: cada una aparece solo cuando su destino tiene contenido, para que ninguna lleve a un callejón. Hoy ningún tema está publicado (el libro llega con R2), así que responde que no; el
// hito R2 lo conecta con el índice del libro (temas aprobados) y esta prueba pasará a probar esa conexión.
import { describe, expect, it } from 'vitest';
import { hayTemasPublicados } from './temas-publicados.ts';

describe('hayTemasPublicados (PQ-2)', () => {
  it('hoy no hay ningún tema publicado: ni «Leer un tema» ni «Libro» deben aparecer', () => {
    expect(hayTemasPublicados()).toBe(false);
  });
});
