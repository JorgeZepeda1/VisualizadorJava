public class Prueba {
    public static void main(String[] args) {
        String s = "  Hola, Mundo Java!  ";
        String t = s.trim();
        System.out.println("[" + t + "] " + t.length() + " " + s.length() + " " + t.isEmpty() + " " + "".isEmpty());
        System.out.println(t.charAt(0) + " " + t.charAt(t.length() - 1) + " " + (t.charAt(1) + 1) + " " + (char) (t.charAt(1) + 1));
        System.out.println(t.substring(6) + "|" + t.substring(0, 4) + "|" + t.substring(5, 5) + "|");
        System.out.println(t.indexOf('o') + " " + t.indexOf("Mundo") + " " + t.indexOf("zzz") + " " + t.indexOf("a", 10) + " " + t.indexOf(97));
        System.out.println(t.toUpperCase() + " " + t.toLowerCase() + " " + "ÁÉÍÓÚ ñ".toLowerCase() + " " + "straße".toUpperCase());
        System.out.println(t.replace('o', '0') + " " + t.replace("Java", "TypeScript") + " " + t.replace("zz", "yy"));
        System.out.println(t.contains("Mundo") + " " + t.contains("mundo") + " " + t.startsWith("Hola") + " " + t.endsWith("!") + " " + t.endsWith("?"));
        System.out.println("a".compareTo("b") + " " + "b".compareTo("a") + " " + "abc".compareTo("abd") + " " + "abc".compareTo("ab") + " " + "Hola".compareTo("hola"));
        System.out.println("Hola".equals("hola") + " " + "Hola".equalsIgnoreCase("hOLA") + " " + "Hola".equals("Hola"));
        System.out.println(String.valueOf(5) + String.valueOf(2.5) + String.valueOf('c') + String.valueOf(true) + String.valueOf(10L));
        String x = "ho";
        String y = "la";
        String z = x + y;
        System.out.println((z == "hola") + " " + (z.equals("hola")) + " " + ("ho" + "la" == "hola") + " " + (new String("hola") == "hola") + " " + (z.substring(0) == z));
        final String K = "ho";
        System.out.println((K + "la" == "hola") + " " + (t.trim() == t) + " " + (t.toUpperCase().toUpperCase() == t.toUpperCase()));
        String r = "";
        for (int i = 0; i < t.length(); i++) {
            char c = t.charAt(i);
            if (Character.isLetter(c)) r += Character.toUpperCase(c);
            else if (Character.isDigit(c)) r += "#";
            else r += c;
        }
        System.out.println(r);
    }
}
