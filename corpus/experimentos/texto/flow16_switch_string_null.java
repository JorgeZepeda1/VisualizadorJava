public class flow16_switch_string_null {
    public static void main(String[] args) {
        String s = null;
        System.out.println("antes");
        switch (s) {
            case "a":
                System.out.println("a");
                break;
            default:
                System.out.println("default");
        }
    }
}
