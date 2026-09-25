public class err08_definite_assignment_while_true_break_ok {
    public static void main(String[] args) {
        int x;
        while (true) {
            x = 1;
            break;
        }
        System.out.println(x);
    }
}
