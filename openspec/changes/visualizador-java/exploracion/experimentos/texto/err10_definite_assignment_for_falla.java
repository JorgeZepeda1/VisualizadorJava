public class err10_definite_assignment_for_falla {
    public static void main(String[] args) {
        int x;
        for (int i = 0; i < 5; i++) {
            x = i;
        }
        System.out.println(x);
    }
}
