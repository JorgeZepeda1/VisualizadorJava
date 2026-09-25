public class err06_variable_no_inicializada_if_sin_else {
    public static void main(String[] args) {
        int x;
        boolean cond = true;
        if (cond) {
            x = 1;
        }
        System.out.println(x);
    }
}
