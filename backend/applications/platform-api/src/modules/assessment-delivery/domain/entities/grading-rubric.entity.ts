/**
 * GradingRubric Entity
 * Represents a rubric for manual grading of questions
 */

export interface GradingRubricCriterion {
  id: string;
  label: string;
  description?: string;
  maxPoints: number;
}

export interface GradingRubricProps {
  id: string;
  assessmentId: string;
  title: string;
  criteria: GradingRubricCriterion[];
  createdAt: Date;
  updatedAt: Date;
}

export class GradingRubric {
  readonly id: string;
  readonly assessmentId: string;
  title: string;
  criteria: GradingRubricCriterion[];
  readonly createdAt: Date;
  updatedAt: Date;

  private constructor(props: GradingRubricProps) {
    this.id = props.id;
    this.assessmentId = props.assessmentId;
    this.title = props.title;
    this.criteria = props.criteria;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  /**
   * Create a new GradingRubric
   */
  static create(props: Omit<GradingRubricProps, 'createdAt' | 'updatedAt'>): GradingRubric {
    GradingRubric.validateProps(props);

    const now = new Date();
    return new GradingRubric({
      ...props,
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Restore a rubric from persistence
   */
  static restore(props: GradingRubricProps): GradingRubric {
    GradingRubric.validateProps(props);
    return new GradingRubric(props);
  }

  /**
   * Validate rubric properties
   */
  private static validateProps(props: Omit<GradingRubricProps, 'createdAt' | 'updatedAt'>): void {
    if (!props.id || typeof props.id !== 'string') {
      throw new Error('Rubric id is required');
    }

    if (!props.assessmentId || typeof props.assessmentId !== 'string') {
      throw new Error('Rubric assessmentId is required');
    }

    if (!props.title || typeof props.title !== 'string') {
      throw new Error('Rubric title is required');
    }

    if (!Array.isArray(props.criteria)) {
      throw new Error('Criteria must be an array');
    }

    // Validate each criterion
    props.criteria.forEach((criterion) => {
      GradingRubric.validateCriterion(criterion);
    });

    // Validate criterion IDs are unique
    const criterionIds = props.criteria.map((c) => c.id);
    const uniqueIds = new Set(criterionIds);
    if (uniqueIds.size !== criterionIds.length) {
      throw new Error('Criterion IDs must be unique within a rubric');
    }
  }

  /**
   * Validate a single criterion
   */
  private static validateCriterion(criterion: GradingRubricCriterion): void {
    if (!criterion.id || typeof criterion.id !== 'string') {
      throw new Error('Criterion id is required');
    }

    if (!criterion.label || typeof criterion.label !== 'string') {
      throw new Error('Criterion label is required');
    }

    if (criterion.description !== undefined && typeof criterion.description !== 'string') {
      throw new Error('Criterion description must be a string');
    }

    if (!Number.isFinite(criterion.maxPoints) || criterion.maxPoints < 0) {
      throw new Error('Criterion maxPoints must be >= 0');
    }
  }

  /**
   * Update title
   */
  updateTitle(newTitle: string): void {
    if (!newTitle || typeof newTitle !== 'string') {
      throw new Error('Title must be a non-empty string');
    }
    this.title = newTitle;
    this.updatedAt = new Date();
  }

  /**
   * Add a criterion
   */
  addCriterion(criterion: GradingRubricCriterion): void {
    GradingRubric.validateCriterion(criterion);

    if (this.criteria.some((c) => c.id === criterion.id)) {
      throw new Error('Criterion with this id already exists');
    }

    this.criteria.push(criterion);
    this.updatedAt = new Date();
  }

  /**
   * Update a criterion
   */
  updateCriterion(criterionId: string, updates: Partial<Omit<GradingRubricCriterion, 'id'>>): void {
    const criterion = this.criteria.find((c) => c.id === criterionId);
    if (!criterion) {
      throw new Error('Criterion not found');
    }

    const updated: GradingRubricCriterion = {
      id: criterion.id,
      label: updates.label ?? criterion.label,
      maxPoints: updates.maxPoints ?? criterion.maxPoints,
    };

    if (updates.description !== undefined) {
      updated.description = updates.description;
    } else if (criterion.description !== undefined) {
      updated.description = criterion.description;
    }

    GradingRubric.validateCriterion(updated);

    criterion.label = updated.label;
    criterion.maxPoints = updated.maxPoints;
    if (updated.description !== undefined) {
      criterion.description = updated.description;
    } else if (criterion.description !== undefined) {
      delete criterion.description;
    }

    this.updatedAt = new Date();
  }

  /**
   * Remove a criterion
   */
  removeCriterion(criterionId: string): void {
    const index = this.criteria.findIndex((c) => c.id === criterionId);
    if (index === -1) {
      throw new Error('Criterion not found');
    }

    this.criteria.splice(index, 1);
    this.updatedAt = new Date();
  }

  /**
   * Get total max points
   */
  getTotalMaxPoints(): number {
    return this.criteria.reduce((sum, c) => sum + c.maxPoints, 0);
  }

  /**
   * Get criterion count
   */
  getCriterionCount(): number {
    return this.criteria.length;
  }

  /**
   * Convert to plain object
   */
  toObject(): GradingRubricProps {
    return {
      id: this.id,
      assessmentId: this.assessmentId,
      title: this.title,
      criteria: this.criteria.map((c) => ({ ...c })),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
