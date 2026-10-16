// Control (javac compila): el escape de `;` termina la sentencia.
public class GEscapePuntoYComaValido {
    public static void main(String[] args) {
        int x = 5 \u003b
        System.out.println(x);
    }
}
