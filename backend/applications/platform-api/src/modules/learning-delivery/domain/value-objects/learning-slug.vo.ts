export class LearningSlug {
  constructor(private readonly value: string) {
    if (!value) throw new Error('slug cannot be empty');
    const v = value;
    if (v.length < 3 || v.length > 80) throw new Error('slug length must be 3..80');
    if (!/^[a-z0-9-]+$/.test(v))
      throw new Error('slug must contain only lowercase letters, numbers, and hyphens');
    if (v.startsWith('-') || v.endsWith('-'))
      throw new Error('slug cannot start or end with hyphen');
    this.value = v;
  }

  toString(): string {
    return this.value;
  }
}
