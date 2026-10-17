public class MiPrograma {
    public static void main(String[] args) {
        int a = 1;
        int b = 2;
        System.out.println("a=" + a + b);
        System.out.println("a=" + (a + b));
        System.out.println(a + b + "=a+b");
        System.out.println(a + "" + b);
        System.out.println("" + a + b);
        System.out.println(a + b + "x" + a + b);
        char c = 'x';
        boolean t = true;
        long l = 5000000000L;
        System.out.println("c=" + c + " t=" + t + " l=" + l);
        System.out.println(c + 1 + "|");
        System.out.println("|" + c + 1);
        System.out.println('a' + 'b' + "|" + 'a' + 'b');
        System.out.println(t + "" + !t);
        System.out.println(1 + 2 + 3 + "6" + 4 + 5);
        String s = "";
        for (int i = 0; i < 5; i++) {
            s += i;
        }
        System.out.println(s);
        s += 'z';
        s += true;
        s += 10L;
        s += a + b;
        System.out.println(s);
        String vacia = "";
        String repetida = vacia + vacia;
        System.out.println("[" + repetida + "]");
        String acentos = "canción, niño, corazón, pingüino, €uro";
        System.out.println(acentos + "!");
        System.out.println("tab\tcomillas\"barra\\fin");
        System.out.println("linea1\nlinea2");
        String uno = "uno";
        String dos = uno + " " + "dos";
        System.out.println(dos);
        System.out.println(-a + "|" + -l + "|" + (-c));
        System.out.print("sin salto");
        System.out.print(' ');
        System.out.print(42);
        System.out.print(true);
        System.out.println();
    }
}
