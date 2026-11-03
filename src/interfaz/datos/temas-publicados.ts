// El único punto que responde si hay al menos un tema del libro publicado (PQ-2, REQ-PANT-001, REQ-PANT-002, ADR 017). La puerta «Leer un tema» del saludo y la sección «Libro» de la navegación aparecen solo
// cuando su destino tiene contenido: ninguna lleva a un callejón. Hoy ningún tema está publicado —el libro llega con el hito R2—, así que responde que no.
//
// CÓMO SE CONECTA EN R2: cambiar el cuerpo de esta función para que mire el índice del libro (`textos/es-MX/libro/indice.ts`) y devuelva `true` si algún tema tiene `estado: 'aprobado'` con su huella
// vigente (los borradores no cuentan, REQ-LIBRO-007). Nadie más decide esto: `Visualizador.tsx` la consulta y pasa el resultado a la presentación (`ranura.ts`, `modelo-vista.ts`) y a `Navegacion`.
export function hayTemasPublicados(): boolean {
  return false;
}
