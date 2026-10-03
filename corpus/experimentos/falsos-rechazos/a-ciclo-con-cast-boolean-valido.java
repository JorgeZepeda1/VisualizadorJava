// Control (javac compila): `while ((boolean) true)` es un ciclo infinito constante; la `x` asignada antes del `break` queda definida.
public class ACicloConCastBooleanValido {
    public static void main(String[] args) {
        int x;
        while ((boolean) true) {
            x = 1;
            break;
        }
        System.out.println(x);
    }
}
