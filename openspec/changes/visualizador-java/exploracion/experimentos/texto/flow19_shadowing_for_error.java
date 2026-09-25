public class flow19_shadowing_for_error {
    public static void main(String[] args) {
        int i = 100;
        for (int i = 0; i < 3; i++) {
            System.out.println(i);
        }
    }
}
