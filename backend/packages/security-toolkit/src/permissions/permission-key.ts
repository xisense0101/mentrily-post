export class PermissionKey {
  private readonly value: string;

  constructor(value: string) {
    if (!PermissionKey.isValid(value)) {
      throw new Error(`Invalid permission key: ${value}`);
    }
    this.value = value;
  }

  static isValid(key: string): boolean {
    const keyRegex = /^[a-z0-9]+(\.[a-z0-9]+)+$/;
    return keyRegex.test(key) && key.length > 3 && key.length <= 100;
  }

  toString(): string {
    return this.value;
  }

  equals(other: PermissionKey): boolean {
    return this.value === other.toString();
  }
}
