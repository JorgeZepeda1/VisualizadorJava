// Contenedor raíz (design.md §6.1). El estado de la pantalla (secciones, saludo, ajustes de la clase, programa abierto) vive en el `Visualizador`, que también pinta el encabezado con el título, la
// navegación y «Ajustes de la clase» (hito R0, ADR 017); aquí solo se monta el aviso de versión nueva (tarea 5.7) y el Visualizador.
import { Visualizador } from './contenedores/Visualizador.tsx';
import { VersionNueva } from './contenedores/VersionNueva.tsx';
import type { registrarServiceWorker } from './pwa/registro.ts';

export interface PropiedadesApp {
  /** Cómo se registra el service worker y se vigilan las versiones nuevas; por omisión el real. Se inyecta en las pruebas (jsdom no tiene service workers). */
  readonly registrarPwa?: typeof registrarServiceWorker;
}

export function App({ registrarPwa }: PropiedadesApp = {}) {
  return (
    <main>
      {/* El aviso va ANTES del título: el lector de pantalla lo anuncia sin mover el foco. Con teclado se alcanza con Mayús+Tab, porque el saludo deja el foco en su primera puerta (ADR 017, W4). */}
      <VersionNueva registrar={registrarPwa} />
      <Visualizador />
    </main>
  );
}
