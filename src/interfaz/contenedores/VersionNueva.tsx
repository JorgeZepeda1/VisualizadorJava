// Contenedor del aviso de versión nueva (tarea 5.7, REQ-PLAT-008, ADR 014). Registra el service worker y, cuando el registro avisa de una versión nueva, muestra `AvisoVersionNueva`. Siempre pinta la
// región `status` (viva, `aria-live="polite"` implícito): un lector de pantalla anuncia de forma fiable lo que aparece dentro de una región que ya estaba en la página, no una que nace con su contenido.
// El registro se inyecta (`registrar`) para probar el contenedor sin un navegador con service workers; por omisión es el real. «Más tarde» solo oculta el aviso: la versión sigue esperando y el
// aviso vuelve si llega otra todavía más nueva (o al volver a cargar la página, que es cuando ya no estorba).
import { useEffect, useState } from 'react';
import { AvisoVersionNueva } from '../componentes/AvisoVersionNueva.tsx';
import { registrarServiceWorker } from '../pwa/registro.ts';

export interface PropiedadesVersionNueva {
  readonly registrar?: typeof registrarServiceWorker;
}

export function VersionNueva({ registrar = registrarServiceWorker }: PropiedadesVersionNueva) {
  // `aplicar` es la función que activa la versión y recarga; vive en el estado envuelta en un objeto para que React no la tome por un actualizador.
  const [oferta, setOferta] = useState<{ readonly aplicar: () => void } | null>(null);

  useEffect(
    () => registrar(navigator, { alHaberVersionNueva: (aplicar) => setOferta({ aplicar }) }),
    [registrar],
  );

  return (
    <div role="status" className="region-version-nueva">
      {oferta && <AvisoVersionNueva alRecargar={oferta.aplicar} alDescartar={() => setOferta(null)} />}
    </div>
  );
}
