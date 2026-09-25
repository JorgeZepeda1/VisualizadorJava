// Contenedor raíz (design.md §6.1). EstadoApp completo (ajustes, galería, diálogos, enlace) llega
// en los lotes 4-5; esta rebanada vertical solo monta el Visualizador.
import { Visualizador } from './contenedores/Visualizador.tsx';

export function App() {
  return (
    <main>
      <h1>Visualizador de Java paso a paso</h1>
      <Visualizador />
    </main>
  );
}
