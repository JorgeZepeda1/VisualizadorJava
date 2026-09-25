public class str08_charat_fuera_rango {
    public static void main(String[] args) {
        String s = "abc";
        System.out.println("antes");
        char c = s.charAt(5);
        System.out.println("no debe llegar aqui: " + c);
    }
}
