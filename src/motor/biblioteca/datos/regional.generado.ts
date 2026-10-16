// Archivo generado por `npm run oraculo:datos` a partir de herramientas/oraculo/java/GenerarRegional (inline en generar-datos.ts) contra el JDK 17 de
// referencia (Temurin 17.0.18+8, ADR 010) — no editar a mano. Cualquier cambio real viene de
// regenerar contra el JDK, nunca de tocar este archivo directamente.

export interface SimbolosRegionales {
  readonly decimal: string;
  readonly miles: string;
  readonly menos: string;
  readonly nan: string;
  readonly infinito: string;
}

export const SIMBOLOS_REGIONALES: Readonly<Record<'es-MX' | 'es-ES', SimbolosRegionales>> = {
  'es-MX': { decimal: '.', miles: ',', menos: '-', nan: 'NaN', infinito: '∞' },
  'es-ES': { decimal: ',', miles: '.', menos: '-', nan: 'NaN', infinito: '∞' },
};
