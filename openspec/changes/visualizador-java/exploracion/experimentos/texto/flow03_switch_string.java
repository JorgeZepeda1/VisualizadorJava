public class flow03_switch_string {
    public static void main(String[] args) {
        String color = "rojo";
        switch (color) {
            case "rojo":
                System.out.println("Alto");
                break;
            case "verde":
                System.out.println("Siga");
                break;
            default:
                System.out.println("Precaucion");
        }
    }
}
