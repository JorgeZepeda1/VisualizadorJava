public class PagarConElSaldo {
    public static void main(String[] args) {
        int saldo = 50;
        while (saldo >= 100) {
            System.out.println("Pago hecho");
            saldo = saldo - 100;
        }
        System.out.println("Saldo final: " + saldo);
    }
}
