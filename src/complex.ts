export class Complex {
  readonly imaginary: number;
  readonly real: number;

  constructor(real: number, imaginary = 0) {
    this.real = real;
    this.imaginary = imaginary;
  }

  add(other: Complex): Complex {
    return new Complex(this.real + other.real, this.imaginary + other.imaginary);
  }

  subtract(other: Complex): Complex {
    return new Complex(this.real - other.real, this.imaginary - other.imaginary);
  }

  multiply(other: Complex | number): Complex {
    if (typeof other === 'number') {
      return new Complex(this.real * other, this.imaginary * other);
    }

    return new Complex(
      (this.real * other.real) - (this.imaginary * other.imaginary),
      (this.real * other.imaginary) + (this.imaginary * other.real)
    );
  }

  conjugate(): Complex {
    return new Complex(this.real, -this.imaginary);
  }

  absSquared(): number {
    return (this.real * this.real) + (this.imaginary * this.imaginary);
  }
}

export function complex(value: number | Complex): Complex {
  return value instanceof Complex ? value : new Complex(value);
}
