// Control (javac compila): la `p` del exponente escrita como escape Unicode; javac traduce antes de leer y es el flotante hexadecimal `0x1.8p1`.
public class GEscapePegadoAlExponenteDeUnFlotanteHexadecimalValido {
    public static void main(String[] args) {
        double d = 0x1.8\u00701;
        System.out.println(d);
    }
}
