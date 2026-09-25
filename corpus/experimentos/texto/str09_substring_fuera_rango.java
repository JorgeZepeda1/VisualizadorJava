public class str09_substring_fuera_rango {
    public static void main(String[] args) {
        String s = "abc";
        System.out.println("antes");
        String t = s.substring(1, 10);
        System.out.println("no debe llegar aqui: " + t);
    }
}
