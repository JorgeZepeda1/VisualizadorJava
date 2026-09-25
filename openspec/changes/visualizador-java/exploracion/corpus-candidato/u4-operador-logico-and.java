public class OperadorLogicoAnd {
    public static void main(String[] args) {
        int edad = 20;
        boolean tieneIdentificacion = true;

        boolean puedeEntrar = (edad >= 18) && tieneIdentificacion;

        System.out.println("puedeEntrar: " + puedeEntrar);
    }
}
