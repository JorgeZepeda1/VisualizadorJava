// Control (javac compila): el escape de la comilla doble cierra la cadena; el visualizador no traduce escapes y lo dice con un aviso.
public class GEscapeComillaValido {
    public static void main(String[] args) {
        String s = "a\u0022;
        int x = 1;
        System.out.println(s + x);
    }
}
