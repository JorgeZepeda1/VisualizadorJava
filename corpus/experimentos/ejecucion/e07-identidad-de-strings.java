public class MiPrograma {
    public static void main(String[] args) {
        String a = "hola";
        String b = "hola";
        System.out.println(a == b);
        System.out.println("ho" + "la" == "hola");
        String mitad = "ho";
        String c = mitad + "la";
        System.out.println(c == "hola");
        System.out.println(c == a);
        final String FIJA = "ho";
        String d = FIJA + "la";
        System.out.println(d == "hola");
        String e = "ho" + "la";
        System.out.println(e == a);
        String f = c;
        System.out.println(f == c);
        System.out.println(f != a);
        String vacio = "";
        String otroVacio = "" + "";
        System.out.println(vacio == otroVacio);
        String numero = "n=" + 1;
        System.out.println(numero == "n=1");
        System.out.println("n=" + 1 == "n=1");
        final int UNO = 1;
        System.out.println("n=" + UNO == "n=1");
        int sinFinal = 1;
        System.out.println("n=" + sinFinal == "n=1");
        String g = "x";
        g += "y";
        System.out.println(g == "xy");
        final String P = "p";
        final String Q = P + "q";
        System.out.println(Q == "pq");
        final char LETRA = 'k';
        System.out.println("k" + LETRA == "kk");
        final boolean VERDAD = true;
        System.out.println("v" + VERDAD == "vtrue");
        final long GRANDE = 5L;
        System.out.println("g" + GRANDE == "g5");
    }
}
