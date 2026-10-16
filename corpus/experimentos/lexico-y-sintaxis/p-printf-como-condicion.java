// javac (prob.found.req): un `PrintStream` no es una condición.
public class PPrintfComoCondicion {
    public static void main(String[] args) {
        if (System.out.printf("x")) {
        }
    }
}
