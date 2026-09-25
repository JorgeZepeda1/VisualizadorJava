public class PrediccionOrLogico {
    public static void main(String[] args) {
        int edad = 16;
        boolean tienePermiso = true;
        boolean puedeEntrar = (edad >= 18) || tienePermiso;
        System.out.println(puedeEntrar);
    }
}
