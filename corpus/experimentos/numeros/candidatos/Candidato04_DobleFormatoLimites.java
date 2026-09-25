public class Candidato04_DobleFormatoLimites {
    public static void main(String[] args) {
        System.out.println(0.001);
        System.out.println(0.0009999);
        System.out.println(9999999.0);
        System.out.println(10000000.0);
        System.out.println(-0.0);
        System.out.println(0.1 + 0.2);
        // zona de riesgo real del algoritmo pre-JDK19 (JDK-4511638): FloatingDecimal
        // a veces imprime UN DIGITO DE MAS respecto de la representacion mas corta
        // que produce V8/Node para el MISMO double.
        System.out.println(-21347700531594670.0);
        System.out.println(115380479879289950.0);
    }
}
