// RED de la tarea 4.7 (REQ-VIS-009): la franja del búfer del Scanner — lo que todavía no se leyó del texto que llegó, con los espacios (␣) y los saltos de línea (⏎) a la vista, para
// explicar el error clásico de `nextInt()` seguido de `nextLine()`. Sale de lo que el motor registró en cada paso: `entrada.agregado` (el renglón que entró al búfer) y `entrada.cursor`
// (hasta dónde se leyó).
import { describe, expect, it } from 'vitest';
import { paso } from './ayudas-de-prueba.ts';
import { derivarBufer, hacerVisible } from './bufer.ts';

describe('hacerVisible: espacios y saltos de línea', () => {
  it('el espacio se escribe ␣ y el salto de línea ⏎', () => {
    expect(hacerVisible(' 30\n')).toBe('␣30⏎');
  });

  it('el tabulador y el retorno de carro también tienen símbolo', () => {
    expect(hacerVisible('\t\r')).toBe('⇥␍');
  });

  it('el texto corriente queda igual', () => {
    expect(hacerVisible('Juan')).toBe('Juan');
  });
});

describe('derivarBufer: lo que queda pendiente de leer', () => {
  it('tras nextInt() sobre «20\\n», queda pendiente el salto de línea (⏎)', () => {
    const pasos = [paso({ clase: 'declaracion', entrada: { cursor: 2, agregado: '20\n' } })];
    expect(derivarBufer(pasos)).toEqual({ visible: '⏎' });
  });

  it('triangulación: tras un next() sobre «a1\\n» también queda el ⏎', () => {
    expect(derivarBufer([paso({ clase: 'declaracion', entrada: { cursor: 2, agregado: 'a1\n' } })])).toEqual({ visible: '⏎' });
  });

  it('muestra los espacios pendientes antes del texto', () => {
    expect(derivarBufer([paso({ clase: 'declaracion', entrada: { cursor: 0, agregado: ' 30\n' } })])).toEqual({ visible: '␣30⏎' });
  });

  it('acumula los renglones que fueron llegando y usa el último cursor', () => {
    const pasos = [
      paso({ clase: 'declaracion', entrada: { cursor: 2, agregado: '20\n' } }),
      paso({ clase: 'declaracion', entrada: { cursor: 3, agregado: 'Juan\n' } }),
    ];
    // El texto es «20\nJuan\n»; el cursor está en 3 (después del salto de línea): queda «Juan⏎».
    expect(derivarBufer(pasos)).toEqual({ visible: 'Juan⏎' });
  });

  it('un paso sin entrada no cambia el búfer, pero si queda algo pendiente la franja sigue a la vista', () => {
    const pasos = [paso({ clase: 'declaracion', entrada: { cursor: 2, agregado: '20\n' } }), paso({ clase: 'impresion' })];
    expect(derivarBufer(pasos)).toEqual({ visible: '⏎' });
  });

  it('cuando el paso tocó el Scanner y no queda nada pendiente, la franja dice que no queda nada (visible vacío)', () => {
    const pasos = [paso({ clase: 'declaracion', entrada: { cursor: 3, agregado: '20\n' } })];
    expect(derivarBufer(pasos)).toEqual({ visible: '' });
  });

  it('si no queda nada pendiente y el paso ya no tocó el Scanner, no hay franja', () => {
    const pasos = [paso({ clase: 'declaracion', entrada: { cursor: 3, agregado: '20\n' } }), paso({ clase: 'impresion' })];
    expect(derivarBufer(pasos)).toBeNull();
  });

  it('un programa que nunca leyó entrada no tiene franja', () => {
    expect(derivarBufer([paso({ clase: 'impresion' })])).toBeNull();
    expect(derivarBufer([])).toBeNull();
  });
});
