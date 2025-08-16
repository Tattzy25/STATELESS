import { UserSubscription } from './schemas';
import { SUBSCRIPTION_CONFIGS } from './tiers';
import { CREDIT_PACKAGES, CreditPackageKey } from './credit-packages';

export class UsageTracker {
  // Check if user has credits remaining
  static hasCreditsRemaining(user: UserSubscription, requiredCredits: number = 1): boolean {
    return user.creditsRemaining >= requiredCredits;
  }

  // Check if user has completions remaining
  static hasCompletionsRemaining(user: UserSubscription): boolean {
    const config = SUBSCRIPTION_CONFIGS[user.tier];
    return config.monthlyCompletions === -1 || user.completionsUsed < config.monthlyCompletions;
  }

  // Check if user can create more projects
  static canCreateProject(user: UserSubscription): boolean {
    const config = SUBSCRIPTION_CONFIGS[user.tier];
    return config.projectLimit === -1 || user.projectsCreated < config.projectLimit;
  }

  // Check if user can access dual AI
  static canUseDualAI(user: UserSubscription): boolean {
    return user.hasDualAI || user.tier === 'pro' || user.tier === 'pro_byok';
  }

  // Use credits
  static useCredits(user: UserSubscription, amount: number): boolean {
    if (user.creditsRemaining >= amount) {
      user.creditsRemaining -= amount;
      user.lastActivity = new Date();
      return true;
    }
    return false;
  }

  // Use completion
  static useCompletion(user: UserSubscription): boolean {
    const config = SUBSCRIPTION_CONFIGS[user.tier];
    
    if (config.monthlyCompletions === 0) return false;
    if (user.completionsUsed < config.monthlyCompletions) {
      user.completionsUsed += 1;
      user.lastActivity = new Date();
      return true;
    }
    return false;
  }

  // Create project
  static createProject(user: UserSubscription, projectName?: string): boolean {
    if (!this.canCreateProject(user)) return false;
    
    user.projectsCreated += 1;
    user.lastActivity = new Date();
    return true;
  }

  // Get project usage info
  static getProjectUsage(user: UserSubscription): { used: number; limit: number; canCreate: boolean } {
    const config = SUBSCRIPTION_CONFIGS[user.tier];
    return {
      used: user.projectsCreated,
      limit: config.projectLimit,
      canCreate: this.canCreateProject(user)
    };
  }

  // Get usage summary
  static getUsageSummary(user: UserSubscription) {
    const config = SUBSCRIPTION_CONFIGS[user.tier];
    return {
      tier: user.tier,
      credits: {
        remaining: user.creditsRemaining,
        monthly: config.monthlyCredits
      },
      completions: {
        used: user.completionsUsed,
        limit: config.monthlyCompletions
      },
      projects: {
        created: user.projectsCreated,
        limit: config.projectLimit
      },
      features: {
        hasDualAI: this.canUseDualAI(user),
        requiresOwnKeys: config.requiresOwnKeys
      }
    };
  }

  // Reset monthly usage (called monthly)
  static resetMonthlyUsage(user: UserSubscription): void {
    const config = SUBSCRIPTION_CONFIGS[user.tier];
    
    user.completionsUsed = 0;
    user.creditsRemaining += config.monthlyCredits;
    user.lastActivity = new Date();
  }

  // Purchase credit package
  static purchaseCreditPackage(user: UserSubscription, packageKey: CreditPackageKey): boolean {
    const package_ = CREDIT_PACKAGES[packageKey];
    
    // Add credits
    user.creditsRemaining += package_.credits;
    
    // Unlock dual AI for any purchase
    if (!user.hasDualAI) {
      user.hasDualAI = true;
    }
    
    user.lastActivity = new Date();
    return true;
  }
}