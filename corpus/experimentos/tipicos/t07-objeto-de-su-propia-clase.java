public class Contador {
    private int cuenta;
    private final int limite;

    public Contador(int limite) {
        this.cuenta = 0;
        this.limite = limite;
    }

    public void incrementar() {
        if (cuenta < limite) {
            cuenta++;
        }
    }

    public int getCuenta() {
        return cuenta;
    }

    public static void main(String[] args) {
        Contador c = new Contador(3);
        for (int i = 0; i < 5; i++) {
            c.incrementar();
            System.out.println("Vuelta " + (i + 1) + ": cuenta = " + c.getCuenta());
        }
    }
}
