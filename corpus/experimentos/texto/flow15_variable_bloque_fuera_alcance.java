public class flow15_variable_bloque_fuera_alcance {
    public static void main(String[] args) {
        {
            int y = 2;
        }
        System.out.println(y);
    }
}
