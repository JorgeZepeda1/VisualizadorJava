public class MiPrograma {
    public static void main(String[] args) {
        String saludo = "¡Hola, señor García! ¿Cómo está? Cuesta 5€";
        System.out.println(saludo);
        char e = 'é';
        char n = 'ñ';
        char euro = '€';
        System.out.println(e);
        System.out.println(n);
        System.out.println(euro);
        System.out.println((int) e + " " + (int) n + " " + (int) euro);
        System.out.println("" + e + n + euro);
        System.out.println(e + n);
        System.out.println('a' + e);
        String japones = "日本語";
        System.out.println(japones);
        String emoji = "ok 😀";
        System.out.println(emoji);
        char siguiente = (char) (e + 1);
        System.out.println(siguiente);
        char griega = 'λ';
        System.out.println(griega + " " + (int) griega);
        for (char c = 'á'; c <= 'ä'; c++) {
            System.out.print(c);
        }
        System.out.println();
        String ñandú = "ñandú";
        System.out.println(ñandú);
        int año = 2024;
        System.out.println("año = " + año);
        System.out.println("tab\tfin");
    }
}
