public class str15_parseint_null {
    public static void main(String[] args) {
        System.out.println("antes");
        String s = null;
        int x = Integer.parseInt(s);
        System.out.println("no debe llegar: " + x);
    }
}
