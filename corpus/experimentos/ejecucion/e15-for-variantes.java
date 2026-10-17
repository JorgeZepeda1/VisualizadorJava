public class MiPrograma {
    public static void main(String[] args) {
        for (int i = 0; i < 3; i++) {
            System.out.print(i + " ");
        }
        System.out.println();
        for (int i = 10; i > 0; i -= 3) {
            System.out.print(i + " ");
        }
        System.out.println();
        int a;
        int b;
        for (a = 0, b = 10; a < b; a += 3, b -= 2) {
            System.out.print("(" + a + "," + b + ") ");
        }
        System.out.println();
        int c = 0;
        for (; c < 3; ) {
            c++;
        }
        System.out.println("c = " + c);
        int d = 0;
        for (;;) {
            d++;
            if (d == 4) {
                break;
            }
        }
        System.out.println("d = " + d);
        for (int e = 0; e < 6; e++) {
            if (e % 2 == 0) {
                continue;
            }
            System.out.print(e + " ");
        }
        System.out.println();
        for (int f = 0; f < 10; f++) {
            if (f == 4) {
                break;
            }
            System.out.print(f + " ");
        }
        System.out.println();
        for (int g = 0; g < 3; g++) {
            int local = g * g;
            System.out.print(local + " ");
        }
        System.out.println();
        for (int h = 0, k = 5; h < k; h++, k--) {
            System.out.print(h + k + " ");
        }
        System.out.println();
        int suma = 0;
        for (int m = 1; m <= 100; m++) {
            suma += m;
        }
        System.out.println("suma 1..100 = " + suma);
        for (char ch = 'a'; ch < 'd'; ch++) {
            System.out.print(ch);
        }
        System.out.println();
        for (long grande = 1; grande < 100000000000L; grande *= 100) {
            System.out.print(grande + " ");
        }
        System.out.println();
        for (int x = 0; x < 3; x++)
            System.out.print("x" + x);
        System.out.println();
        for (int y = 0; y < 3; y++) ;
        System.out.println("tras el for vacio");
        int cuenta = 0;
        for (int p = 0; p < 4; p++) {
            for (int q = 0; q < p; q++) {
                cuenta++;
            }
        }
        System.out.println("cuenta = " + cuenta);
        for (int i = 0; i < 2; i++) {
            System.out.print("i=" + i);
        }
        System.out.println();
        int actualizaciones = 0;
        for (int z = 0; z < 5; z++) {
            if (z == 1) {
                continue;
            }
            actualizaciones += z;
        }
        System.out.println("actualizaciones = " + actualizaciones);
    }
}
