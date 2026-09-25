public class str12_npe_util {
    static class Persona {
        String nombre;
    }
    public static void main(String[] args) {
        Persona p = null;
        System.out.println("antes");
        System.out.println(p.nombre.length());
    }
}
