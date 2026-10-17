// Contenedor raíz (design.md §6.1). EstadoApp completo (ajustes, galería, diálogos, enlace) llega
// en los lotes 4-5; por ahora monta el aviso de versión nueva (tarea 5.7) y el Visualizador.
import { Visualizador } from './contenedores/Visualizador.tsx';
import { VersionNueva } from './contenedores/VersionNueva.tsx';
import type { registrarServiceWorker } from './pwa/registro.ts';
import { textosInterfaz } from '../textos/es-MX/interfaz.ts';

export interface PropiedadesApp {
  /** Cómo se registra el service worker y se vigilan las versiones nuevas; por omisión el real. Se inyecta en las pruebas (jsdom no tiene service workers). */
  readonly registrarPwa?: typeof registrarServiceWorker;
}

export function App({ registrarPwa }: PropiedadesApp = {}) {
  return (
    <main>
      {/* El aviso va ANTES del título: con Tab es lo primero que alcanza quien lo necesita, y el lector de pantalla lo anuncia sin mover el foco. */}
      <VersionNueva registrar={registrarPwa} />
      <h1>{textosInterfaz.tituloApp()}</h1>
      <Visualizador />
    </main>
  );
}
