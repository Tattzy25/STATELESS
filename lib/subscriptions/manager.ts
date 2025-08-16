import { UserSubscription, SubscriptionTier } from './schemas';
import { SUBSCRIPTION_CONFIGS } from './tiers';
import { UsageTracker } from './usage';
import { CreditPackageKey } from './credit-packages';

export class SubscriptionManager {
  private users: Map<string, UserSubscription> = new Map();

  // Get or create user subscription
  getUserSubscription(userId: string): UserSubscription {
    if (!this.users.has(userId)) {
      const newUser: UserSubscription = {
        userId,
        tier: SubscriptionTier.FREE,
        creditsRemaining: SUBSCRIPTION_CONFIGS[SubscriptionTier.FREE].monthlyCredits,
        completionsUsed: 0,
        projectsCreated: 0,
        hasDualAI: false,
        lastActivity: new Date()
      };
      this.users.set(userId, newUser);
    }
    return this.users.get(userId)!;
  }

  // Update user subscription in storage
  private updateUser(user: UserSubscription): void {
    this.users.set(user.userId, user);
  }

  // Check if user can access dual AI
  canUseDualAI(userId: string): boolean {
    const user = this.getUserSubscription(userId);
    return UsageTracker.canUseDualAI(user);
  }

  // Check if user can create more projects
  canCreateProject(userId: string): boolean {
    const user = this.getUserSubscription(userId);
    return UsageTracker.canCreateProject(user);
  }

  // Check if user has credits remaining
  hasCreditsRemaining(userId: string, requiredCredits: number = 1): boolean {
    const user = this.getUserSubscription(userId);
    return UsageTracker.hasCreditsRemaining(user, requiredCredits);
  }

  // Check if user has completions remaining
  hasCompletionsRemaining(userId: string): boolean {
    const user = this.getUserSubscription(userId);
    return UsageTracker.hasCompletionsRemaining(user);
  }

  // Get project usage info
  getProjectUsage(userId: string): { used: number; limit: number; canCreate: boolean } {
    const user = this.getUserSubscription(userId);
    return UsageTracker.getProjectUsage(user);
  }

  // Use credits
  useCredits(userId: string, amount: number): boolean {
    const user = this.getUserSubscription(userId);
    const success = UsageTracker.useCredits(user, amount);
    if (success) {
      this.updateUser(user);
    }
    return success;
  }

  // Use completion
  useCompletion(userId: string): boolean {
    const user = this.getUserSubscription(userId);
    const success = UsageTracker.useCompletion(user);
    if (success) {
      this.updateUser(user);
    }
    return success;
  }

  // Create project
  createProject(userId: string, projectName?: string): boolean {
    const user = this.getUserSubscription(userId);
    const success = UsageTracker.createProject(user, projectName);
    if (success) {
      this.updateUser(user);
    }
    return success;
  }

  // Purchase credit package
  purchaseCreditPackage(userId: string, packageKey: CreditPackageKey): boolean {
    const user = this.getUserSubscription(userId);
    const success = UsageTracker.purchaseCreditPackage(user, packageKey);
    if (success) {
      this.updateUser(user);
    }
    return success;
  }

  // Upgrade subscription
  upgradeSubscription(
    userId: string, 
    newTier: SubscriptionTier, 
    apiKeys?: { v0ApiKey?: string; claudeApiKey?: string }
  ): boolean {
    const user = this.getUserSubscription(userId);
    const config = SUBSCRIPTION_CONFIGS[newTier];
    
    // Validate BYOK requirements
    if (newTier === SubscriptionTier.PRO_BYOK) {
      if (!apiKeys?.v0ApiKey || !apiKeys?.claudeApiKey) {
        throw new Error('Pro BYOK requires both V0 and Claude API keys');
      }
    }
    
    user.tier = newTier;
    user.creditsRemaining += config.monthlyCredits;
    user.hasDualAI = config.hasDualAI;
    user.subscriptionStart = new Date();
    user.subscriptionEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    user.lastActivity = new Date();
    
    if (apiKeys) {
      user.apiKeys = apiKeys;
    }
    
    this.updateUser(user);
    return true;
  }

  // Get user's API keys (for BYOK users)
  getUserApiKeys(userId: string): { v0ApiKey?: string; claudeApiKey?: string } | null {
    const user = this.getUserSubscription(userId);
    return user.apiKeys || null;
  }

  // Get usage summary
  getUsageSummary(userId: string) {
    const user = this.getUserSubscription(userId);
    return UsageTracker.getUsageSummary(user);
  }

  // Reset monthly usage (called monthly)
  resetMonthlyUsage(userId: string): void {
    const user = this.getUserSubscription(userId);
    UsageTracker.resetMonthlyUsage(user);
    this.updateUser(user);
  }

  // Get all users (for admin purposes)
  getAllUsers(): UserSubscription[] {
    return Array.from(this.users.values());
  }

  // Delete user (for cleanup)
  deleteUser(userId: string): boolean {
    return this.users.delete(userId);
  }
}

// Global subscription manager instance
export const subscriptionManager = new SubscriptionManager();