// Tarea 1.32 (F1 y F4): `compilar()` responde lo mismo que javac 17.0.18 en CADA celda de las tablas de verdad de
// `tablas-de-atribucion.ts` — los 64 pares (origen, destino) de un cast y las 39 celdas selector × etiqueta de un `switch`, más los
// tres selectores que javac rechaza él mismo — y, cuando javac rechaza, en la MISMA línea. Sin JDK: las tablas son datos; su
// verificación contra javac es `herramientas/oraculo/atribucion-tablas.test.ts` (`npm run test:oraculo`). Es la prueba de PUNTA A PUNTA
// (las cinco pasadas) de lo que `atribucion.test.ts` prueba pasada por pasada.
import { describe, expect, it } from 'vitest';
import { compilar } from '../../src/motor/index.ts';
import {
  CASTS_QUE_JAVAC_ACEPTA,
  CELDAS_DE_SWITCH,
  ETIQUETAS_QUE_JAVAC_ACEPTA,
  LINEA_DE_LA_ETIQUETA,
  LINEA_DEL_CAST,
  PARES_DE_CAST,
  SELECTORES_DE_SWITCH,
  SELECTORES_INVALIDOS_DE_SWITCH,
  programaDeCast,
  programaDeSwitch,
} from './tablas-de-atribucion.ts';

describe('tablas de atribución — la tabla de casts: 64 pares, javac acepta 20', () => {
  it('la tabla tiene los 64 pares y 20 aceptados (guarda contra una tabla mal armada)', () => {
    expect(PARES_DE_CAST).toHaveLength(64);
    expect(PARES_DE_CAST.filter(([o, d]) => CASTS_QUE_JAVAC_ACEPTA.has(`${o}>${d}`))).toHaveLength(20);
  });

  it.each(PARES_DE_CAST)('(%s) → (%s)', (origen, destino) => {
    const resultado = compilar(programaDeCast(origen, destino));
    if (resultado.ok) throw new Error('se esperaba un problema (falta la IR del lote 2 o un rechazo), no ok: true');
    if (CASTS_QUE_JAVAC_ACEPTA.has(`${origen}>${destino}`)) {
      // javac lo acepta: todas las pasadas también; solo falta ejecutarlo.
      expect(resultado.problema).toMatchObject({ categoria: 'no-disponible', codigo: 'ejecucion-no-disponible' });
    } else {
      expect(resultado.problema).toMatchObject({
        categoria: 'error-compilacion',
        codigo: 'cast-invalido',
        linea: LINEA_DEL_CAST,
        datos: { origen, destino },
      });
    }
  });
});

describe('tablas de atribución — la tabla del `switch`: 39 celdas selector × etiqueta, javac acepta 16', () => {
  it('la tabla tiene las 39 celdas y 16 aceptadas (guarda contra una tabla mal armada)', () => {
    expect(CELDAS_DE_SWITCH).toHaveLength(39);
    expect(CELDAS_DE_SWITCH.filter(([s, e]) => ETIQUETAS_QUE_JAVAC_ACEPTA.has(`${s}>${e}`))).toHaveLength(16);
  });

  it.each(CELDAS_DE_SWITCH)('selector %s, «case %s» (etiqueta %s)', (selector, etiqueta, tipoDeLaEtiqueta) => {
    const resultado = compilar(programaDeSwitch(selector, SELECTORES_DE_SWITCH[selector], etiqueta));
    if (resultado.ok) throw new Error('se esperaba un problema (falta la IR del lote 2 o un rechazo), no ok: true');
    if (ETIQUETAS_QUE_JAVAC_ACEPTA.has(`${selector}>${etiqueta}`)) {
      expect(resultado.problema).toMatchObject({ categoria: 'no-disponible', codigo: 'ejecucion-no-disponible' });
    } else {
      expect(resultado.problema).toMatchObject({
        categoria: 'error-compilacion',
        codigo: 'etiqueta-de-case-de-otro-tipo',
        linea: LINEA_DE_LA_ETIQUETA,
        datos: { etiqueta: tipoDeLaEtiqueta, selector },
      });
    }
  });

  it.each(SELECTORES_INVALIDOS_DE_SWITCH)('un selector %s lo rechaza javac él mismo (y nosotros): «case 1:» no da un segundo error', (tipo, valor) => {
    const resultado = compilar(programaDeSwitch(tipo, valor, '1'));
    if (resultado.ok) throw new Error('se esperaba un problema, no ok: true');
    expect(resultado.problema).toMatchObject({ categoria: 'error-compilacion', codigo: 'selector-de-switch-invalido', datos: { tipo } });
  });
});
