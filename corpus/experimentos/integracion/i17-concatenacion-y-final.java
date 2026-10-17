public class Prueba {
    public static void main(String[] args) {
        final int LIMITE = 3;
        final double TASA = 0.16;
        final String PREFIJO = "Total: ";
        final char SEP = '-';
        System.out.println(PREFIJO + LIMITE * 2 + SEP + TASA + SEP + (LIMITE + TASA));
        String s = "a" + 1.5;
        String t = "a1.5";
        System.out.println((s == t) + " " + s.equals(t) + " " + (PREFIJO + "x" == "Total: x") + " " + ("a" + 1.5 == "a1.5") + " " + ("v" + LIMITE == "v3") + " " + ("" + SEP == "-"));
        String u = "";
        u += 1;
        u += 2.0;
        u += 'c';
        u += true;
        u += 10L;
        System.out.println(u);
        int i = 5;
        String w = "i=" + i++ + i-- + --i + ++i;
        System.out.println(w + " " + i);
    }
}
