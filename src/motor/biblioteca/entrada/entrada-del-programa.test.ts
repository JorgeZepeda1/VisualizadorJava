// RED de la tarea 2.12 (hito 1, parte C): la entrada estándar del programa es UNA, la que maneja el intérprete y lee `Scanner`. Antes vivía en `interprete/puerto-biblioteca.ts` y `ScannerJava`
// llevaba su propio búfer; ahora `ScannerJava` lee de esta clase y la biblioteca es su dueña (el intérprete solo agrega renglones y marca el EOF).
import { describe, expect, it } from 'vitest';
import { EntradaDelPrograma } from './entrada-del-programa.ts';

describe('EntradaDelPrograma', () => {
  it('empieza vacía, abierta y con el cursor en 0; agregar() acumula los renglones', () => {
    const entrada = new EntradaDelPrograma();
    expect(entrada).toMatchObject({ texto: '', cursor: 0, cerrada: false });
    entrada.agregar('5\n');
    entrada.agregar('hola\n');
    expect(entrada.texto).toBe('5\nhola\n');
  });

  it('cerrar() marca el fin de la entrada (EOF) y no borra lo ya tecleado', () => {
    const entrada = new EntradaDelPrograma();
    entrada.agregar('7\n');
    entrada.cerrar();
    expect(entrada.cerrada).toBe(true);
    expect(entrada.texto).toBe('7\n');
  });
});
