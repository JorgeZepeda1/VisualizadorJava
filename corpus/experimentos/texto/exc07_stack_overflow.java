public class exc07_stack_overflow {
    static int recursionInfinita(int n) {
        return recursionInfinita(n + 1);
    }
    public static void main(String[] args) {
        System.out.println("antes");
        System.out.println(recursionInfinita(0));
    }
}
