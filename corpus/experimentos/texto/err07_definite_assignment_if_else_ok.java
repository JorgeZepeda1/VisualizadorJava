public class err07_definite_assignment_if_else_ok {
    public static void main(String[] args) {
        int x;
        boolean cond = true;
        if (cond) {
            x = 1;
        } else {
            x = 2;
        }
        System.out.println(x);
    }
}
