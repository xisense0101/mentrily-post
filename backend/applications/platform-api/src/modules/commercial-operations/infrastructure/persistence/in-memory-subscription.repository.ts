import { Injectable } from '@nestjs/common';
import { SubscriptionRepository } from '../../domain/repositories/subscription.repository.js';
import { Subscription } from '../../domain/entities/subscription.entity.js';
import { Plan } from '../../domain/entities/plan.entity.js';
import { FreePlan, StarterPlan, ProPlan, EnterprisePlan } from '../../domain/index.js';

@Injectable()
export class InMemorySubscriptionRepository implements SubscriptionRepository {
  private plans = new Map<string, Plan>([
    [FreePlan.id, FreePlan],
    [StarterPlan.id, StarterPlan],
    [ProPlan.id, ProPlan],
    [EnterprisePlan.id, EnterprisePlan],
  ]);

  private subscriptions = new Map<string, Subscription>();

  async getActiveSubscription(workspaceId: string): Promise<Subscription | null> {
    for (const sub of this.subscriptions.values()) {
      if (sub.workspaceId === workspaceId && sub.status === 'ACTIVE' as any) {
        return sub;
      }
    }
    return null;
  }

  async getPlan(planId: string): Promise<Plan | null> {
    return this.plans.get(planId) || null;
  }

  // Helper for tests
  addSubscription(sub: Subscription): void {
    this.subscriptions.set(sub.id, sub);
  }

  clear(): void {
    this.subscriptions.clear();
  }
}
