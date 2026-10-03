// Control (javac compila): un cast a un tipo escrito con su paquete.
public class PCastConNombreCalificadoValido {
    public static void main(String[] args) {
        Object o = "a";
        String s = (java.lang.String) o;
        System.out.println(s);
    }
}
