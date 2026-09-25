public class flow18_shadowing_bloque_anidado_error {
    public static void main(String[] args) {
        int x = 5;
        if (x > 0) {
            int x = 10;
            System.out.println(x);
        }
    }
}
