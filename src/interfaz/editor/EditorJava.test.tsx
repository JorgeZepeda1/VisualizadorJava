// RED de la tarea 0.14 (rebanada vertical — interfaz mínima, ADR 013 §6.3). Cubre lo que jsdom SÍ
// puede probar de verdad para CodeMirror 6: contenido controlado por props y el Compartment de
// solo lectura. La interacción real de teclado/pegado se prueba en pruebas/e2e/ (tarea 0.15) —
// ADR 013 ya anota que "los componentes con CodeMirror se prueban sobre todo en E2E porque jsdom
// no hace layout".
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { EditorJava } from './EditorJava.tsx';

describe('<EditorJava/>', () => {
  it('muestra el valor inicial como contenido del editor', () => {
    const { container } = render(<EditorJava valor="System.out.println(1);" onCambio={() => {}} />);
    expect(container.textContent).toContain('System.out.println(1);');
  });

  it('cuando el valor externo cambia (prop controlada), el contenido mostrado se actualiza', () => {
    const { container, rerender } = render(<EditorJava valor="uno" onCambio={() => {}} />);
    expect(container.textContent).toContain('uno');

    rerender(<EditorJava valor="dos, distinto" onCambio={() => {}} />);

    expect(container.textContent).toContain('dos, distinto');
    expect(container.textContent).not.toContain('uno');
  });

  it('soloLectura desactiva la edición del contenido real de CodeMirror (Compartment, ADR 013)', () => {
    const { container, rerender } = render(
      <EditorJava valor="x" soloLectura={false} onCambio={() => {}} />,
    );
    const contenido = () => container.querySelector('.cm-content');
    expect(contenido()?.getAttribute('contenteditable')).toBe('true');

    rerender(<EditorJava valor="x" soloLectura onCambio={() => {}} />);

    expect(contenido()?.getAttribute('contenteditable')).toBe('false');
  });
});
