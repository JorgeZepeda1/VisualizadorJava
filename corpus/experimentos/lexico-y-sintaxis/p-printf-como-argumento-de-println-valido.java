// Control: `println(Object)` acepta el `PrintStream` que devuelve `printf`; el subconjunto no lo modela: aviso.
public class PPrintfComoArgumento {
    public static void main(String[] args) {
        System.out.println(System.out.printf("a%n"));
    }
}
