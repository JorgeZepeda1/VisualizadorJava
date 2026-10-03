// Control (javac compila): `instanceof` con el nombre completo del tipo.
public class BInstanceofConTipoCalificadoValido {
    public static void main(String[] args) {
        Object o = "texto";
        if (o instanceof java.lang.String) {
            System.out.println("es texto");
        }
    }
}
