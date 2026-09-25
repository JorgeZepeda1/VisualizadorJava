public class str10_numberformat_parseint {
    public static void main(String[] args) {
        System.out.println("antes");
        int x = Integer.parseInt("abc");
        System.out.println("no debe llegar aqui: " + x);
    }
}
