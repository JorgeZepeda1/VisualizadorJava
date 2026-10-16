// javac (prob.found.req): `printf` devuelve un `PrintStream`, que no se puede guardar en un `int`.
public class PPrintfComoValorDeUnaDeclaracion {
    public static void main(String[] args) {
        int b = System.out.printf("a");
    }
}
