public class err10b_definite_assignment_dowhile_ok {
    public static void main(String[] args) {
        int x;
        int i = 0;
        do {
            x = i;
            i++;
        } while (i < 5);
        System.out.println(x);
    }
}
