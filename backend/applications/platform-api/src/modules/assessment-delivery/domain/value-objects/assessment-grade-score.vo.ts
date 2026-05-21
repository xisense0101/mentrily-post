export class AssessmentGradeScore {
  readonly value: number;

  private constructor(value: number) {
    this.value = value;
  }

  static create(value: number, maxScore?: AssessmentGradeScore): AssessmentGradeScore {
    if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
      throw new Error('AssessmentGradeScore must be a finite number');
    }
    if (value < 0) {
      throw new Error('AssessmentGradeScore cannot be negative');
    }
    if (maxScore !== undefined && value > maxScore.value) {
      throw new Error('AssessmentGradeScore cannot exceed maxScore');
    }
    return new AssessmentGradeScore(value);
  }
}
