// Dos default en el mismo switch.
public class F4SwitchDefaultRepetido {
    public static void main(String[] args) {
        int n = 1;
        switch (n) {
            default:
                System.out.println("a");
                break;
            default:
                System.out.println("b");
        }
    }
}
