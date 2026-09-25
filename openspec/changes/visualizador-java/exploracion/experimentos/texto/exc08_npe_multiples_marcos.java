public class exc08_npe_multiples_marcos {
    static String paso3(String s) {
        return s.trim();
    }
    static String paso2(String s) {
        return paso3(s);
    }
    static String paso1(String s) {
        return paso2(s);
    }
    public static void main(String[] args) {
        String valor = null;
        System.out.println("antes");
        System.out.println(paso1(valor));
    }
}
