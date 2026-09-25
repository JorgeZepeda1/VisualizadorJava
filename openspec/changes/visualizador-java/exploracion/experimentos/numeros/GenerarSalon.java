import java.io.*;
import java.util.*;

public class GenerarSalon {
    public static void main(String[] args) throws Exception {
        LinkedHashSet<Double> valores = new LinkedHashSet<>();

        // sumas/restas/productos/divisiones con enteros pequenos
        for (int a = 1; a <= 60; a++) {
            for (int b = 1; b <= 60; b++) {
                valores.add(a + b * 0.1);
                valores.add(a - b * 0.1);
                valores.add(a * (b * 0.1));
                if (b != 0) valores.add(a / (double) b);
                valores.add((double)(a) / 3.0);
                valores.add((double)(a) / 7.0);
                valores.add((double)(a) / 9.0);
            }
        }

        // precios de 1-2 decimales: centavos 0..99, pesos 1..200
        for (int pesos = 1; pesos <= 150; pesos++) {
            for (int centavos : new int[]{0, 5, 10, 15, 20, 25, 33, 50, 75, 90, 99}) {
                double precio = pesos + centavos / 100.0;
                valores.add(precio);
                valores.add(precio * 2);
                valores.add(precio * 3);
                valores.add(precio * 1.16); // IVA MX 16%
            }
        }

        // promedios de listas pequenas (division por conteos 2..30)
        Random rnd = new Random(2026_09_25L);
        for (int n = 2; n <= 30; n++) {
            for (int rep = 0; rep < 20; rep++) {
                double suma = 0;
                for (int i = 0; i < n; i++) suma += rnd.nextInt(1000) / 100.0;
                valores.add(suma / n);
            }
        }

        // porcentajes: parte/total*100
        for (int total = 1; total <= 100; total++) {
            for (int parte = 0; parte <= total; parte += Math.max(1, total / 10)) {
                valores.add(parte * 100.0 / total);
            }
        }

        // casos clasicos de la vida real / tutoriales
        double[] clasicos = {0.1 + 0.2, 0.1, 0.2, 0.3, 1.1, 2.2, 3.3, 4.4, 5.5,
            1.0 / 3.0, 2.0 / 3.0, 10.0 / 3.0, 100.0 / 3.0, 1.0 / 7.0, 22.0 / 7.0,
            9.99, 19.99, 99.99, 0.99 * 3, 19.99 * 1.16, 0.7 * 3, 2.3 - 2.0, 4.35 * 100,
            1.00 - 0.90, 1.0 - 0.9, 100.0 - 99.9, 29.99 + 15.50 };
        for (double v : clasicos) valores.add(v);

        System.err.println("total valores salon (con signo original) = " + valores.size());

        // agrega tambien la version negativa de cada uno para cubrir signo
        LinkedHashSet<Double> conNegativos = new LinkedHashSet<>(valores);
        for (double v : valores) conNegativos.add(-v);

        System.err.println("total valores salon (con negativos) = " + conNegativos.size());

        try (PrintWriter pw = new PrintWriter(new FileWriter(args[0]))) {
            for (double v : conNegativos) {
                if (Double.isNaN(v) || Double.isInfinite(v)) continue;
                long bits = Double.doubleToLongBits(v);
                pw.println(Long.toHexString(bits) + "," + Double.toString(v));
            }
        }
    }
}
