export class BlockTreePath {
  private readonly value: number[];

  constructor(path: number[]) {
    if (!Array.isArray(path) || path.length === 0) {
      throw new Error('block path cannot be empty');
    }
    if (!path.every((segment) => Number.isInteger(segment) && segment >= 0)) {
      throw new Error('block path segments must be non-negative integers');
    }
    this.value = [...path];
  }

  segments(): number[] {
    return [...this.value];
  }

  toString(): string {
    return this.value.join('.');
  }
}
