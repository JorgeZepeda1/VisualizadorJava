// javac (operator.cant.be.applied.1): un `PrintStream` no se suma.
public class PPrintfComoOperando {
    public static void main(String[] args) {
        int b = System.out.printf("%d", 5) + 1;
    }
}
