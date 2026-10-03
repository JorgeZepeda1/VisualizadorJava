// Control (javac compila): la variable del `for` mejorado puede ser `final`.
public class HForMejoradoFinalValido {
    public static void main(String[] args) {
        String[] nombres = { "a", "b" };
        for (final String n : nombres) {
            System.out.println(n);
        }
    }
}
