public class out05_printf_basico {
    public static void main(String[] args) {
        int edad = 17;
        double precio = 45.5;
        String nombre = "Ana";
        System.out.printf("Nombre: %s, edad: %d, precio: %.2f%n", nombre, edad, precio);
        System.out.printf("Entero con ancho: [%5d]%n", 42);
        System.out.printf("Flotante 2 decimales: %.2f%n", 3.14159);
        System.out.printf("Porcentaje literal: 100%%%n");
    }
}
