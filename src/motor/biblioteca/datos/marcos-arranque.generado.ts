// Archivo generado por `npm run oraculo:datos` a partir de los probes "sin main"/"main no static" (inline en generar-datos.ts) contra el JDK 17 de
// referencia (Temurin 17.0.18+8, ADR 010) — no editar a mano. Cualquier cambio real viene de
// regenerar contra el JDK, nunca de tocar este archivo directamente.

export interface MensajeArranque {
  readonly mensaje: string;
  readonly codigoSalida: number;
}

// "sinMain": el mensaje trae "\\n" LITERAL (dos caracteres, NO un salto real) — bug
// verificado de la localización es-MX del lanzador de Temurin 17.0.18 (exploracion/03 §4.3).
// "mainNoStatic": SÍ trae saltos de línea reales (bien formado).
export const MARCOS_ARRANQUE: { readonly sinMain: MensajeArranque; readonly mainNoStatic: MensajeArranque } = {
  sinMain: { mensaje: "Error: no se ha encontrado el método principal en la clase SinMain, defina el método principal del siguiente modo:\\n   public static void main(String[] args)\\nde lo contrario, se deberá ampliar una clase de aplicación JavaFX javafx.application.Application\n", codigoSalida: 1 },
  mainNoStatic: { mensaje: "Error: el método principal no es static en la clase MainNoStatic, defina el método principal del siguiente modo:\n   public static void main(String[] args)\n", codigoSalida: 1 },
};
