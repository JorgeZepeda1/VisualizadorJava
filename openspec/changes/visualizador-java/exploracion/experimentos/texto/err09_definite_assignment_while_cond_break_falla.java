public class err09_definite_assignment_while_cond_break_falla {
    public static void main(String[] args) {
        int x;
        boolean cond = false;
        while (cond) {
            x = 1;
            break;
        }
        System.out.println(x);
    }
}
