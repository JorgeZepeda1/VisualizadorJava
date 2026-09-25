public class str04_runtime_concat_no_final {
    public static void main(String[] args) {
        String a = "ho";
        String b = "la";
        String c = a + b;
        String d = "hola";
        System.out.println("(no final) a+b == \"hola\": " + (c == d));
        System.out.println("a+b equals hola: " + c.equals(d));
    }
}
