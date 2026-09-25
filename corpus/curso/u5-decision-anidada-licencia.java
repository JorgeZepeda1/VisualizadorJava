public class DecisionAnidadaLicencia {
    public static void main(String[] args) {
        int edad = 20;
        boolean tieneLicencia = true;

        if (edad >= 18) {
            if (tieneLicencia) {
                System.out.println("Puede conducir.");
            } else {
                System.out.println("Es mayor de edad, pero necesita tramitar la licencia.");
            }
        } else {
            System.out.println("Todavía no tiene edad para tramitar la licencia.");
        }
    }
}
