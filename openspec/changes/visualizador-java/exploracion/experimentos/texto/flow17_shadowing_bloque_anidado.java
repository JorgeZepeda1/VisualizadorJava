public class flow17_shadowing_bloque_anidado {
    public static void main(String[] args) {
        int x = 5;
        if (x > 0) {
            int x2 = 10;
            System.out.println(x2);
        }
        for (int i = 0; i < 2; i++) {
            int y = 1;
        }
        System.out.println(x);
    }
}
