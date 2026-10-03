// Control (javac compila): el primer digito de un hexadecimal escrito como escape Unicode (`0x` + `1` + `F`).
public class GEscapePegadoAlPrimerDigitoDeUnHexadecimalValido {
    public static void main(String[] args) {
        int x = 0x\u0031F;
        System.out.println(x);
    }
}
