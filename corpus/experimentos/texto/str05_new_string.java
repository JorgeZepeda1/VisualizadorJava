public class str05_new_string {
    public static void main(String[] args) {
        String a = new String("hola");
        String b = "hola";
        System.out.println("new String(\"hola\") == \"hola\": " + (a == b));
        System.out.println("new String(...).equals: " + a.equals(b));
        System.out.println("new String(...).intern() == literal: " + (a.intern() == b));
    }
}
