public class Saludo {
    public static void main(String[] args) {
        String s = "d1.5";
        switch (s) {
            case "d" + 1.5:
                System.out.println("uno");
                break;
            default:
                break;
        }
    }
}
