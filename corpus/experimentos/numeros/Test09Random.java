import java.util.Random;

public class Test09Random {
    public static void main(String[] args) {
        long[] semillas = {0L, 1L, 42L, 12345L, -7L, Long.MAX_VALUE, Long.MIN_VALUE, -1L};
        for (long semilla : semillas) {
            Random r = new Random(semilla);
            StringBuilder sb = new StringBuilder();
            sb.append("semilla=").append(semilla).append("\n");
            sb.append("  nextInt(): ");
            for (int i = 0; i < 6; i++) sb.append(r.nextInt()).append(" ");
            sb.append("\n");
            Random r2 = new Random(semilla);
            sb.append("  nextInt(100): ");
            for (int i = 0; i < 6; i++) sb.append(r2.nextInt(100)).append(" ");
            sb.append("\n");
            Random r2b = new Random(semilla);
            sb.append("  nextInt(64) [potencia de 2]: ");
            for (int i = 0; i < 6; i++) sb.append(r2b.nextInt(64)).append(" ");
            sb.append("\n");
            Random r3 = new Random(semilla);
            sb.append("  nextDouble(): ");
            for (int i = 0; i < 5; i++) sb.append(r3.nextDouble()).append(" ");
            sb.append("\n");
            Random r4 = new Random(semilla);
            sb.append("  nextBoolean(): ");
            for (int i = 0; i < 8; i++) sb.append(r4.nextBoolean()).append(" ");
            sb.append("\n");
            Random r5 = new Random(semilla);
            sb.append("  nextLong(): ");
            for (int i = 0; i < 4; i++) sb.append(r5.nextLong()).append(" ");
            sb.append("\n");
            Random r6 = new Random(semilla);
            sb.append("  nextFloat(): ");
            for (int i = 0; i < 4; i++) sb.append(r6.nextFloat()).append(" ");
            sb.append("\n");
            System.out.print(sb);
        }
        System.out.println("=== patron clasico juego de adivinar con Random(semilla) ===");
        Random rj = new Random(12345L);
        for (int i = 0; i < 5; i++) System.out.println("  nextInt(100)+1 = " + (rj.nextInt(100) + 1));
        System.out.println("=== nextInt(bound) NO potencia de 2, semilla que fuerza varias iteraciones (buscar rechazo) ===");
        Random rr = new Random(1L);
        for (int i = 0; i < 10; i++) System.out.println("  nextInt(7) = " + rr.nextInt(7));
    }
}
