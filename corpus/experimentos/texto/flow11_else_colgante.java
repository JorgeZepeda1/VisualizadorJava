public class flow11_else_colgante {
    public static void main(String[] args) {
        int x = 5;
        int y = 20;
        if (x > 0)
            if (y > 30)
                System.out.println("A: x>0 y y>30");
            else
                System.out.println("B: el else se asocia al if MAS CERCANO (y>30), no al externo");
        System.out.println("fin");
    }
}
