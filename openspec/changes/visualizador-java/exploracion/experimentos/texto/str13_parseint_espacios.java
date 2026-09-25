public class str13_parseint_espacios {
    public static void main(String[] args) {
        System.out.println("antes");
        int x = Integer.parseInt(" 5 ");
        System.out.println("no debe llegar: " + x);
    }
}
