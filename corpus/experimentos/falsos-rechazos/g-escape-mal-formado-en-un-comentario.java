// javac: `illegal unicode escape` en la linea 5 — en un comentario tambien se traducen los escapes: una barra invertida con la letra u y menos de cuatro digitos hexadecimales es un error.
public class GEscapeMalFormadoEnUnComentario {
    public static void main(String[] args) {
        int x = 5;
        /* mal: \u00 */
        System.out.println(x);
    }
}
