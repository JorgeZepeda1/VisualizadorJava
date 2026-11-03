// RED de la tarea R0.11 (REQ-AULA-001, ADR 017): el contenedor de «Ejemplos» pide el texto crudo de los programas con un `import()` DIFERIDO la primera vez que se abre, arma la galería y se la da a la lista.
// Aquí el cargador se inyecta (la carga real, con Vite, la prueba `Visualizador.test.tsx` con las puertas del saludo); se comprueba que muestra «Cargando…» y luego la lista, y que avisa si falla.
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Ejemplos } from './Ejemplos.tsx';

const ARCHIVOS = { 'u3-hola-mundo.java': 'class Hola {}', 'u3-bienvenida.java': 'class Bienvenida {}' };

describe('<Ejemplos/> — carga diferida de la galería', () => {
  it('mientras carga dice «Cargando los ejemplos…» y, cuando llega el texto, muestra la lista armada', async () => {
    let entregar: (archivos: typeof ARCHIVOS) => void = () => undefined;
    const cargar = vi.fn(() => new Promise<typeof ARCHIVOS>((resolver) => (entregar = resolver)));
    render(<Ejemplos alAbrir={() => undefined} cargar={cargar} />);
    expect(screen.getByRole('status').textContent).toBe('Cargando los ejemplos…');

    entregar(ARCHIVOS);

    expect(await screen.findByRole('heading', { level: 4, name: '«Hola, mundo»' })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 4, name: 'Bienvenida al curso' })).toBeTruthy();
    expect(screen.queryByRole('status')).toBeNull();
    expect(cargar).toHaveBeenCalledTimes(1);
  });

  it('si el fragmento no se pudo cargar, avisa con una alerta y no deja la pantalla vacía', async () => {
    render(<Ejemplos alAbrir={() => undefined} cargar={() => Promise.reject(new Error('sin red'))} />);
    expect((await screen.findByRole('alert')).textContent).toContain('No se pudieron cargar los ejemplos');
  });

  it('si se desmonta antes de que llegue el texto no pasa nada (nada se pinta en un componente que ya no está)', async () => {
    let entregar: (archivos: typeof ARCHIVOS) => void = () => undefined;
    const { unmount } = render(<Ejemplos alAbrir={() => undefined} cargar={() => new Promise((resolver) => (entregar = resolver))} />);
    unmount();
    expect(() => entregar(ARCHIVOS)).not.toThrow();
  });

  // `import()` real de Vite: con toda la suite corriendo a la vez tarda más de 1 s (la espera por omisión de `findBy*`), y bajo cobertura aún más (S1 del informe de verificación de R0).
  it('por omisión pide el fragmento real de Vite (`datos/programas-crudos`) y trae las 36 entradas de la galería', async () => {
    render(<Ejemplos alAbrir={() => undefined} />);
    expect(await screen.findByRole('heading', { level: 4, name: 'Máquina de snacks' }, { timeout: 15_000 })).toBeTruthy();
    expect(screen.getAllByRole('heading', { level: 4 })).toHaveLength(36);
  }, 20_000);
});
