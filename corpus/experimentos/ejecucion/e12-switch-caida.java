public class MiPrograma {
    public static void main(String[] args) {
        for (int op = 0; op <= 5; op++) {
            System.out.println("op = " + op);
            switch (op) {
                case 1:
                    System.out.println("uno");
                case 2:
                    System.out.println("dos");
                    break;
                case 3:
                case 4:
                    System.out.println("tres o cuatro");
                    break;
                default:
                    System.out.println("otro");
            }
        }
        int sinDefault = 9;
        switch (sinDefault) {
            case 1:
                System.out.println("no");
                break;
            case 2:
                System.out.println("no");
        }
        System.out.println("despues del switch sin default");
        for (int v = 1; v <= 4; v++) {
            switch (v) {
                default:
                    System.out.println("default al principio " + v);
                case 2:
                    System.out.println("cae a 2");
                    break;
                case 3:
                    System.out.println("tres");
            }
        }
        char letra = 'b';
        switch (letra) {
            case 'a':
                System.out.println("a");
                break;
            case 'b':
                System.out.println("b");
            case 'c':
                System.out.println("c");
                break;
            case 99 + 1:
                System.out.println("d");
        }
        String color = "verde";
        switch (color) {
            case "rojo":
                System.out.println("rojo");
                break;
            case "verde":
                System.out.println("verde");
            case "azul":
                System.out.println("azul");
                break;
            default:
                System.out.println("ninguno");
        }
        String unido = "ver" + "de";
        switch (unido) {
            case "verde":
                System.out.println("unido es verde");
                break;
            default:
                System.out.println("unido no es verde");
        }
        String construido = "ver";
        construido += "de";
        switch (construido) {
            case "verde":
                System.out.println("construido es verde");
                break;
            default:
                System.out.println("construido no es verde");
        }
        int dentro = 2;
        switch (dentro) {
            case 2:
                int local = dentro * 10;
                System.out.println("local = " + local);
                break;
            case 3:
                local = 5;
                System.out.println("local = " + local);
        }
        final int DOS = 2;
        switch (2) {
            case DOS:
                System.out.println("constante final");
        }
        switch ('x') {
            default:
                System.out.println("solo default");
        }
        int fin = 0;
        switch (fin) {
        }
        System.out.println("switch vacio");
    }
}
