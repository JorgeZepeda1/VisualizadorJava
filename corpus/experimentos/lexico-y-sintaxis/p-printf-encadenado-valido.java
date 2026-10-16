// Control: `printf(...)` devuelve el mismo `PrintStream`, así que se puede encadenar; el subconjunto no lo modela: aviso.
public class PPrintfEncadenado {
    public static void main(String[] args) {
        System.out.printf("a%n").println("b");
    }
}
