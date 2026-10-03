// Control (javac compila): `instanceof` con patron de tipo (Java 16): fuera del subconjunto, aviso honesto.
public class BInstanceofConPatronValido {
    public static void main(String[] args) {
        Object o = "texto";
        if (o instanceof String s) {
            System.out.println(s.length());
        }
    }
}
