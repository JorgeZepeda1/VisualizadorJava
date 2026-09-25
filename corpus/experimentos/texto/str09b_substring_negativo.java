public class str09b_substring_negativo {
    public static void main(String[] args) {
        String s = "abc";
        System.out.println("antes");
        String t = s.substring(-1);
        System.out.println("no debe llegar aqui: " + t);
    }
}
