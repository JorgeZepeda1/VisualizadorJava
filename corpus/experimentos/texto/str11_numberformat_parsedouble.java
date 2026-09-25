public class str11_numberformat_parsedouble {
    public static void main(String[] args) {
        System.out.println("antes");
        double x = Double.parseDouble("abc");
        System.out.println("no debe llegar aqui: " + x);
    }
}
