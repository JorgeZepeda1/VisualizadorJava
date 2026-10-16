// Control (javac compila): el patron puede llevar `final`.
public class BInstanceofConPatronFinalValido {
    public static void main(String[] args) {
        Object o = "texto";
        if (o instanceof final String s) {
            System.out.println(s.length());
        }
    }
}
