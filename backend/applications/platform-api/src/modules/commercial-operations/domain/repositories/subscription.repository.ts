import { Subscription } from '../entities/subscription.entity.js';
import { Plan } from '../entities/plan.entity.js';

export abstract class SubscriptionRepository {
  abstract getActiveSubscription(workspaceId: string): Promise<Subscription | null>;
  abstract getPlan(planId: string): Promise<Plan | null>;
}
