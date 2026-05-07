export type BlochVectorComponents = readonly [number, number, number];

const NORMALIZATION_EPSILON = 1e-12;

export class BlochVector {
  private readonly components: BlochVectorComponents;

  constructor(components: BlochVectorComponents) {
    this.components = components;
  }

  rotate(axis: BlochVectorComponents, angle: number): BlochVector {
    const context = new RotationContext(axis, this, angle);

    return new BlochVector(context.rotatedComponents()).normalized();
  }

  normalized(): BlochVector {
    const magnitude = Math.sqrt(this.dot(this));
    const divisor = magnitude === 0 ? 1 : magnitude;

    return new BlochVector(components(this.components.map((component) => {
      const value = component / divisor;
      return Math.abs(value) < NORMALIZATION_EPSILON ? 0 : value;
    })));
  }

  toArray(): BlochVectorComponents {
    return this.components;
  }

  dot(other: BlochVector): number {
    return this.components.reduce((sum, component, index) => sum + (component * other.components[index]), 0);
  }

  cross(other: BlochVector): BlochVectorComponents {
    return [
      (this.components[1] * other.components[2]) - (this.components[2] * other.components[1]),
      (this.components[2] * other.components[0]) - (this.components[0] * other.components[2]),
      (this.components[0] * other.components[1]) - (this.components[1] * other.components[0])
    ];
  }
}

class RotationContext {
  private readonly axis: BlochVectorComponents;
  private readonly axisCrossVector: BlochVectorComponents;
  private readonly cosAngle: number;
  private readonly dotProduct: number;
  private readonly sinAngle: number;
  private readonly vector: BlochVector;

  constructor(axis: BlochVectorComponents, vector: BlochVector, angle: number) {
    this.axis = axis;
    this.vector = vector;
    this.axisCrossVector = new BlochVector(axis).cross(vector);
    this.cosAngle = Math.cos(angle);
    this.sinAngle = Math.sin(angle);
    this.dotProduct = new BlochVector(axis).dot(vector);
  }

  rotatedComponents(): BlochVectorComponents {
    return components(this.vector.toArray().map((component, index) => (
      (component * this.cosAngle) +
      (this.axisCrossVector[index] * this.sinAngle) +
      (this.axis[index] * this.dotProduct * (1 - this.cosAngle))
    )));
  }
}

function components(values: readonly number[]): BlochVectorComponents {
  return [values[0] ?? 0, values[1] ?? 0, values[2] ?? 0];
}
