public class MiPrograma {
    public static void main(String[] args) {
        long total = 10000000000L;
        long grupos = 0;
        System.out.println("inicio");
        System.err.println("aviso por stderr");
        System.out.print("sin salto antes de la excepcion");
        long promedio = total % grupos;
        System.out.println(promedio);
    }
}
