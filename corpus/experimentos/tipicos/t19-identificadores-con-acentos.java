public class Edades {
    public static void main(String[] args) {
        int añoActual = 2025;
        int añoDeNacimiento = 2008;
        int edadMínima = 15;
        int edad = añoActual - añoDeNacimiento;

        System.out.println("Nació en " + añoDeNacimiento + " y tiene " + edad + " años");
        if (edad >= edadMínima) {
            System.out.println("Cumple la edad mínima");
        } else {
            System.out.println("No cumple la edad mínima");
        }
        String niño = "Ñandú";
        System.out.println(niño + "\tcon tabulador\ny salto de línea, comillas \"dobles\" y barra \\");
    }
}
