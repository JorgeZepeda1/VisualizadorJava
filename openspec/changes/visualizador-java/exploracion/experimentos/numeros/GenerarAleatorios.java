import java.io.*;
import java.util.*;

public class GenerarAleatorios {
    public static void main(String[] args) throws Exception {
        Random rnd = new Random(42L);
        try (PrintWriter pw = new PrintWriter(new FileWriter(args[0]))) {
            int porExponente = 10;
            for (int exp = 0; exp <= 2046; exp++) { // exp=0 subnormales, exp=2046 el mas alto finito; 2047 es Inf/NaN
                for (int k = 0; k < porExponente; k++) {
                    long signo = rnd.nextBoolean() ? 1L : 0L;
                    long mantisa = rnd.nextLong() & 0xFFFFFFFFFFFFFL; // 52 bits
                    long bits = (signo << 63) | ((long) exp << 52) | mantisa;
                    double v = Double.longBitsToDouble(bits);
                    if (Double.isNaN(v) || Double.isInfinite(v)) continue; // no deberia pasar
                    pw.println(Long.toHexString(bits) + "," + Double.toString(v));
                }
            }
            // ademas: valores uniformemente aleatorios de proposito general (bits totalmente aleatorios pero filtrando NaN/Inf)
            for (int i = 0; i < 5000; i++) {
                long bits = rnd.nextLong();
                double v = Double.longBitsToDouble(bits);
                if (Double.isNaN(v) || Double.isInfinite(v)) continue;
                pw.println(Long.toHexString(bits) + "," + Double.toString(v));
            }
        }
    }
}
