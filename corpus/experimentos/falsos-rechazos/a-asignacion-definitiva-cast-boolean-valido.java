// Control (javac compila): `(boolean) true` es una constante, asi que `x` queda asignada despues del `if` (JLS 16).
public class AAsignacionDefinitivaCastBooleanValido {
    public static void main(String[] args) {
        int x;
        if ((boolean) true) {
            x = 1;
        }
        System.out.println(x);
    }
}
