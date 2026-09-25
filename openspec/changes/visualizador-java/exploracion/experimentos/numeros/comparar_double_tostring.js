// Compara Double.toString(double) de Java 17 (columna 2 del CSV) contra
// "digitos mas cortos de JavaScript (toExponential shortest) + reglas de formato de Java"
// Entrada: archivos CSV con lineas "bitsHexDe64,valorDeJavaToString"
// Uso: node comparar_double_tostring.js archivo1.csv [archivo2.csv ...]

const fs = require('fs');

function bitsHexADouble(hex) {
  const big = BigInt('0x' + hex);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(big);
  return buf.readDoubleBE(0);
}

function bitsHexASignoNegativo(hex) {
  const big = BigInt('0x' + hex);
  // bit 63 es el signo
  return (big >> 63n) === 1n;
}

const RE_EXP = /^(\d)(?:\.(\d+))?e([+-]\d+)$/;

// Reproduce EXACTAMENTE la regla de formato de Double.toString documentada en el
// javadoc de java.lang.Double (10^-3 <= m < 10^7 -> decimal; si no, cientifica),
// usando como insumo de digitos la representacion "shortest round-trip" que da
// el motor de JavaScript via toExponential() sin argumentos.
function formatearComoJava(valorAbsoluto, esNegativo) {
  if (valorAbsoluto === 0) {
    return esNegativo ? '-0.0' : '0.0';
  }
  const expStr = valorAbsoluto.toExponential(); // shortest round-trip, forma "d.dddde±X" o "de±X"
  const m = RE_EXP.exec(expStr);
  if (!m) throw new Error('no se pudo parsear toExponential(): ' + expStr);
  const digits = m[1] + (m[2] || '');
  const exp = parseInt(m[3], 10);
  const decExp = exp + 1; // valor = 0.digits * 10^decExp
  const nDigits = digits.length;

  let resultado;
  if (valorAbsoluto >= 0.001 && valorAbsoluto < 10000000) {
    let intPart, fracPart;
    if (decExp <= 0) {
      intPart = '0';
      fracPart = '0'.repeat(-decExp) + digits;
    } else if (decExp >= nDigits) {
      intPart = digits + '0'.repeat(decExp - nDigits);
      fracPart = '0';
    } else {
      intPart = digits.slice(0, decExp);
      fracPart = digits.slice(decExp);
    }
    resultado = intPart + '.' + fracPart;
  } else {
    const first = digits[0];
    const rest = digits.length > 1 ? digits.slice(1) : '0';
    const sciExp = decExp - 1;
    resultado = first + '.' + rest + 'E' + sciExp;
  }
  return (esNegativo ? '-' : '') + resultado;
}

let totalGlobal = 0;
let coincideGlobal = 0;
const difePorArchivo = {};
const ejemplosDiferencias = [];
const todasLasDiferencias = [];

for (const archivo of process.argv.slice(2)) {
  const lineas = fs.readFileSync(archivo, 'utf8').split('\n').filter(Boolean);
  let total = 0, coincide = 0;
  for (const linea of lineas) {
    const idx = linea.indexOf(',');
    const hex = linea.slice(0, idx);
    const javaStr = linea.slice(idx + 1);
    const v = bitsHexADouble(hex);
    const neg = bitsHexASignoNegativo(hex);
    const abs = Math.abs(v);
    const propio = formatearComoJava(abs, neg);
    total++;
    if (propio === javaStr) {
      coincide++;
    } else {
      const registro = { archivo, hex, javaStr, propio, valor: v };
      todasLasDiferencias.push(registro);
      if (ejemplosDiferencias.length < 60) ejemplosDiferencias.push(registro);
    }
  }
  difePorArchivo[archivo] = { total, coincide, difiere: total - coincide };
  totalGlobal += total;
  coincideGlobal += coincide;
}

console.log('=== RESUMEN POR ARCHIVO ===');
for (const [archivo, r] of Object.entries(difePorArchivo)) {
  const pct = (100 * r.difiere / r.total).toFixed(4);
  console.log(`${archivo}: total=${r.total} coincide=${r.coincide} difiere=${r.difiere} (${pct}%)`);
}
console.log('=== RESUMEN GLOBAL ===');
console.log(`total=${totalGlobal} coincide=${coincideGlobal} difiere=${totalGlobal - coincideGlobal} (${(100*(totalGlobal-coincideGlobal)/totalGlobal).toFixed(4)}%)`);

console.log('\n=== PRIMEROS EJEMPLOS DE DIFERENCIAS (hasta 60) ===');
for (const d of ejemplosDiferencias) {
  console.log(`bits=${d.hex} valor=${d.valor} JAVA="${d.javaStr}" JS+reglas="${d.propio}"`);
}

// guarda TODAS las diferencias a un archivo para inspeccion posterior (no se imprime completo)
const rutaSalida = process.argv[2].replace(/\.csv$/, '') + '.diferencias-completas.csv';
fs.writeFileSync(
  rutaSalida,
  todasLasDiferencias.map(d => `${d.archivo},${d.hex},${d.valor},${d.javaStr},${d.propio}`).join('\n')
);
console.log('\ndiferencias completas guardadas en: ' + rutaSalida + ' (' + todasLasDiferencias.length + ' filas)');
