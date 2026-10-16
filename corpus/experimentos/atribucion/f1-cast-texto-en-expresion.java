// El cast inválido dentro de una operación.
public class F1CastTextoEnExpresion {
    public static void main(String[] args) {
        String precio = "9.5";
        double total = 2 * (double) precio;
        System.out.println(total);
    }
}
