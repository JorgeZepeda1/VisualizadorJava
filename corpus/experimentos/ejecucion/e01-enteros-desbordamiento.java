public class MiPrograma {
    public static void main(String[] args) {
        int max = Integer.MAX_VALUE;
        int min = Integer.MIN_VALUE;
        System.out.println("MAX + 1 = " + (max + 1));
        System.out.println("MIN - 1 = " + (min - 1));
        System.out.println("MAX * 2 = " + (max * 2));
        System.out.println("MIN * -1 = " + (min * -1));
        System.out.println("-MIN = " + (-min));
        System.out.println("MIN / -1 = " + (min / -1));
        System.out.println("MIN % -1 = " + (min % -1));
        int a = 46341;
        System.out.println("46341 * 46341 = " + (a * a));
        int b = 65536;
        System.out.println("65536 * 65536 = " + (b * b));
        System.out.println("123456789 * 987654321 = " + (123456789 * 987654321));
        int suma = 0;
        for (int i = 0; i < 5; i++) {
            suma += 1000000000;
            System.out.println("suma vuelta " + i + " = " + suma);
        }
        int abs = Integer.MIN_VALUE;
        if (abs < 0 && -abs < 0) {
            System.out.println("el valor absoluto de MIN sigue siendo negativo");
        }
        int potencia = 1;
        for (int k = 1; k <= 35; k++) {
            potencia *= 3;
        }
        System.out.println("3 a la 35 en int = " + potencia);
    }
}
