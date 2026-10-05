public class Saludo {
    public static void main(String[] args) {
        double d = 1.5;
        String s = "a1.5";
        switch (s) {
            case "a" + d:
                break;
            default:
                break;
        }
    }
}
