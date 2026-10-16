public class Aviso {
    public static void main(String[] args) {
        String opcion = "d1.5";
        switch (opcion) {
            case "d" + 1.5:
                System.out.println("uno punto cinco");
                break;
            default:
                System.out.println("otro");
                break;
        }
    }
}
