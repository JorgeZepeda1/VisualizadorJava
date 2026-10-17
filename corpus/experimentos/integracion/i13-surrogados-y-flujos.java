public class Prueba {
    public static void main(String[] args) {
        System.out.print((char) 55357);
        System.out.println("x");
        System.out.print((char) 55357);
        System.out.print((char) 56832);
        System.out.println();
        System.out.println("😀".length() + " " + "😀".charAt(0) + "|" + (int) "😀".charAt(1) + " " + "a😀b".indexOf("b") + " " + "😀".toUpperCase().length());
        System.err.println("error visible");
        System.out.println("éñ€" + " " + "ÁÉÍ".toLowerCase() + "ß".toUpperCase());
        System.out.println(Character.isLetter('é') + " " + Character.isUpperCase('Ñ') + " " + Character.toUpperCase('ñ') + " " + Character.isDigit('٣') + " " + Character.isWhitespace(' ') + " " + Character.isLetterOrDigit('_') + " " + (int) Character.toLowerCase('İ'));
        System.out.println(Character.isDigit(97) + " " + Character.toUpperCase(97) + " " + Character.isLetter(233));
        char gc = 'ǅ';
        System.out.println(Character.isUpperCase(gc) + " " + Character.isLowerCase(gc) + " " + Character.toUpperCase(gc) + Character.toLowerCase(gc));
    }
}
