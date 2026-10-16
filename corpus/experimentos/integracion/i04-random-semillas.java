import java.util.Random;

public class Prueba {
    public static void main(String[] args) {
        Random r = new Random(42);
        System.out.println(r.nextInt() + " " + r.nextInt(100) + " " + r.nextInt(7) + " " + r.nextDouble() + " " + r.nextBoolean());
        Random q = new Random(12345L);
        for (int i = 0; i < 5; i++) {
            System.out.print((q.nextInt(100) + 1) + " ");
        }
        System.out.println();
        Random cero = new Random(0);
        Random minimo = new Random(Long.MIN_VALUE);
        System.out.println(cero.nextInt() + " " + minimo.nextInt() + " " + new Random(-1).nextInt(10));
        Random dado = new Random(2024);
        int suma = 0;
        for (int i = 0; i < 100; i++) {
            suma += dado.nextInt(6) + 1;
        }
        System.out.println("Suma de 100 dados: " + suma);
        System.out.println(new Random(7).nextInt(1073741825) + " " + new Random(7).nextInt(16) + " " + new Random(99).nextDouble());
    }
}
