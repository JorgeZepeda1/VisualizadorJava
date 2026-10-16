public class Prueba {
    public static void main(String[] args) {
        double suma = 0;
        for (int i = 0; i < 10; i++) {
            suma += 0.1;
        }
        System.out.println(suma + " " + (suma == 1.0) + " " + " " + 1.0 / 3 + " " + 2 / 3 + " " + 2.0 / 3);
        System.out.println(10 / 4 + " " + 10 / 4.0 + " " + 10 % 4 + " " + -10 % 4 + " " + 10.5 % 3 + " " + -7.5 % 2);
        System.out.println((int) 3.99 + " " + (int) -3.99 + " " + (int) 1e10 + " " + (long) 1e19 + " " + (int) (0.0 / 0) + " " + (char) 66 + " " + (int) 'A' + " " + (double) 7);
        System.out.println(1.0 / 0 + " " + -1.0 / 0 + " " + 0.0 / 0 + " " + (0.0 == -0.0) + " " + 100.0 + " " + 1e7 + " " + 1.0E-4 + " " + 0.001 + " " + 123456789.0 + " " + 12345678.9);
        double promedio = (8 + 9 + 7) / 3.0;
        System.out.println("Promedio: " + promedio);
        int x = 7;
        x += 2.9;
        double y = 5;
        y /= 2;
        y *= x;
        System.out.println(x + " " + y);
        long grande = 1099511627776L;
        System.out.println(grande * 1000 + " " + (grande * grande) + " " + 3000000000L * 4);
        char c = 'a';
        c += 2;
        c++;
        System.out.println(c + " " + (c + 1) + " " + (char) (c + 1) + " " + (int) c);
        System.out.println(1 + 2 + "x" + 1 + 2 + 'c' + 1.5 + true + 10L);
        double a = 0.1 + 0.2;
        System.out.println(a + " " + (a > 0.3) + " " + 4.35 * 100 + " " + 1.1 * 1.1 + " " + 3 * 0.1);
    }
}
