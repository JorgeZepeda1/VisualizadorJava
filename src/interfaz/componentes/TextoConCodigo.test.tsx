// RED de la tarea 1.28 (decisión del PO 2026-09-29): los textos del catálogo marcan el código con
// comillas invertidas, y la pantalla NO las muestra crudas — cada tramo de código se pinta como
// `<code>`. Presentacional puro: recibe los tramos ya segmentados por `presentacion`
// (`segmentarCodigoEnLinea`) y no sabe de dónde vienen.
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { TextoConCodigo } from './TextoConCodigo.tsx';

describe('<TextoConCodigo/>', () => {
  it('pinta el tramo de código como <code> y el resto como texto corriente, en orden', () => {
    const { container } = render(
      <p>
        <TextoConCodigo
          segmentos={[
            { tipo: 'texto', texto: 'Tu programa usa un arreglo (' },
            { tipo: 'codigo', texto: 'int[]' },
            { tipo: 'texto', texto: ') en la línea 3.' },
          ]}
        />
      </p>,
    );
    const codigos = container.querySelectorAll('code');
    expect(codigos).toHaveLength(1);
    expect(codigos[0]?.textContent).toBe('int[]');
    expect(container.textContent).toBe('Tu programa usa un arreglo (int[]) en la línea 3.');
  });

  it('triangulación: dos tramos de código distintos, cada uno en su propio <code>', () => {
    const { container } = render(
      <p>
        <TextoConCodigo
          segmentos={[
            { tipo: 'texto', texto: 'el método ' },
            { tipo: 'codigo', texto: 'split' },
            { tipo: 'texto', texto: ' de ' },
            { tipo: 'codigo', texto: 'String' },
          ]}
        />
      </p>,
    );
    const codigos = Array.from(container.querySelectorAll('code')).map((c) => c.textContent);
    expect(codigos).toEqual(['split', 'String']);
    expect(container.textContent).toBe('el método split de String');
  });

  it('un texto sin código no crea ningún <code>', () => {
    const { container } = render(
      <p>
        <TextoConCodigo segmentos={[{ tipo: 'texto', texto: 'Línea 3: Te falta un punto y coma ";" al final de esta línea.' }]} />
      </p>,
    );
    expect(container.querySelectorAll('code')).toHaveLength(0);
    expect(container.textContent).toBe('Línea 3: Te falta un punto y coma ";" al final de esta línea.');
  });

  it('un tramo de texto con una comilla invertida suelta la muestra tal cual (nunca se pierde un carácter)', () => {
    const { container } = render(
      <p>
        <TextoConCodigo segmentos={[{ tipo: 'texto', texto: 'carácter no reconocido: "`"' }]} />
      </p>,
    );
    expect(container.textContent).toBe('carácter no reconocido: "`"');
  });
});
