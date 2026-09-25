public class Test07Math {
    public static void main(String[] args) {
        System.out.println("Math.round(2.5) -> " + Math.round(2.5));
        System.out.println("Math.round(-2.5) -> " + Math.round(-2.5));
        System.out.println("Math.round(2.4) -> " + Math.round(2.4));
        System.out.println("Math.round(-2.4) -> " + Math.round(-2.4));
        System.out.println("Math.round(2.6) -> " + Math.round(2.6));
        System.out.println("Math.round(-2.6) -> " + Math.round(-2.6));
        System.out.println("Math.round(0.5) -> " + Math.round(0.5));
        System.out.println("Math.round(-0.5) -> " + Math.round(-0.5));
        System.out.println("Math.round(0.49999999999999994) -> " + Math.round(0.49999999999999994));
        System.out.println("Math.round(-0.49999999999999994) -> " + Math.round(-0.49999999999999994));
        System.out.println("Math.floor(-3.5) -> " + Math.floor(-3.5));
        System.out.println("Math.ceil(-3.5) -> " + Math.ceil(-3.5));
        System.out.println("Math.floor(3.5) -> " + Math.floor(3.5));
        System.out.println("Math.ceil(3.5) -> " + Math.ceil(3.5));
        System.out.println("Math.floor(-0.0) -> " + Math.floor(-0.0));
        System.out.println("Math.pow(2,3) -> " + Math.pow(2,3));
        System.out.println("Math.pow(2,0.5) -> " + Math.pow(2,0.5));
        System.out.println("Math.pow(-1,0.5) -> " + Math.pow(-1,0.5));
        System.out.println("Math.pow(0,0) -> " + Math.pow(0,0));
        System.out.println("Math.sqrt(-1) -> " + Math.sqrt(-1));
        System.out.println("Math.sqrt(4) -> " + Math.sqrt(4));
        System.out.println("Math.abs(-5) -> " + Math.abs(-5));
        System.out.println("Math.abs(-5.0) -> " + Math.abs(-5.0));
        System.out.println("Math.abs(Integer.MIN_VALUE) -> " + Math.abs(Integer.MIN_VALUE));
        System.out.println("Math.abs(Long.MIN_VALUE) -> " + Math.abs(Long.MIN_VALUE));
        System.out.println("Math.max(5,3) -> " + Math.max(5,3));
        System.out.println("Math.max(5.0,3) -> " + Math.max(5.0,3));
        System.out.println("Math.max(5,3.0) -> " + Math.max(5,3.0));
        System.out.println("Math.min(5,3) -> " + Math.min(5,3));
        System.out.println("Math.max(-0.0,0.0) -> " + Math.max(-0.0,0.0));
        System.out.println("Math.PI -> " + Math.PI);
        System.out.println("Math.E -> " + Math.E);
        double rnd = Math.random();
        System.out.println("Math.random() en [0,1)? -> " + (rnd >= 0.0 && rnd < 1.0));
    }
}
