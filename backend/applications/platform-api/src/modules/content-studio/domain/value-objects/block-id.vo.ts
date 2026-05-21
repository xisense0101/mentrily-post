export class BlockId {
  private readonly value: string;

  constructor(value: string) {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new Error('block id cannot be empty');
    }
    if (/\s/.test(value)) {
      throw new Error('block id cannot contain spaces');
    }
    this.value = value;
  }

  toString(): string {
    return this.value;
  }
}
