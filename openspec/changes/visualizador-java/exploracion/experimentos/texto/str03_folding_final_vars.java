public class str03_folding_final_vars {
    public static void main(String[] args) {
        final String a = "ho";
        final String b = "la";
        String c = a + b;
        String d = "hola";
        System.out.println("final a+b == \"hola\": " + (c == d));
    }
}
