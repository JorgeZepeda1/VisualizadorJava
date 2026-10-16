public class Prueba {
    public static void main(String[] args) {
        for (int i = 1; i <= 5; i++) {
            String linea = "";
            for (int j = 0; j < 5 - i; j++) linea += " ";
            for (int j = 0; j < 2 * i - 1; j++) linea += "*";
            System.out.println(linea);
        }
        for (int i = 1; i <= 3; i++) {
            for (int j = 1; j <= 3; j++) {
                System.out.printf("%3d", i * j);
            }
            System.out.println();
        }
        int n = 10;
        long fact = 1;
        for (int i = 2; i <= 25; i++) {
            fact *= i;
            if (i % 5 == 0) System.out.println(i + "! = " + fact);
        }
        double interes = 1000;
        for (int anio = 1; anio <= 5; anio++) {
            interes = interes * 1.05;
            System.out.printf("Año %d: %.2f%n", anio, interes);
        }
        int a = 0, b = 1;
        while (b < 100) {
            System.out.print(b + " ");
            int t = a + b;
            a = b;
            b = t;
        }
        System.out.println();
    }
}
