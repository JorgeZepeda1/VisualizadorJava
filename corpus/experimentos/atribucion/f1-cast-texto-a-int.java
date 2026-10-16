// Un texto no se convierte en número con un cast (javac: incompatible types).
public class F1CastTextoAInt {
    public static void main(String[] args) {
        String texto = "123";
        int numero = (int) texto;
        System.out.println(numero);
    }
}
