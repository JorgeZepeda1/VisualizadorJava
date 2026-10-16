interface Figura {
    double area();
}

class Rectangulo implements Figura {
    private final double base;
    private final double altura;

    Rectangulo(double base, double altura) {
        this.base = base;
        this.altura = altura;
    }

    public double area() {
        return base * altura;
    }
}

class Cuadrado extends Rectangulo {
    Cuadrado(double lado) {
        super(lado, lado);
    }
}

public class Formas extends Object {
    public static void main(String[] args) {
        Figura f1 = new Rectangulo(3, 4);
        Figura f2 = new Cuadrado(5);
        System.out.println("Área del rectángulo: " + f1.area());
        System.out.println("Área del cuadrado: " + f2.area());
    }
}
