/**
 * Canonical Role Normalization Utility for FoodBridge
 *
 * Supported Canonical Roles:
 * - 'provider': Commercial kitchens, restaurants, hotels, canteens, catering suppliers
 * - 'ngo': Verified non-profit shelters, community kitchens, food banks, charity recipients
 * - 'admin': Platform operations, safety audit, and verification administrators
 */

export type CanonicalRole = 'provider' | 'ngo' | 'admin';

export const CANONICAL_ROLES: CanonicalRole[] = ['provider', 'ngo', 'admin'];

/**
 * Maps any role string (including legacy aliases and mixed casing) to its canonical role.
 * Throws or returns undefined for unrecognized roles.
 */
export function normalizeRole(rawRole: string | undefined | null): CanonicalRole {
  if (!rawRole || typeof rawRole !== 'string') {
    return 'provider'; // safe default fallback
  }

  const normalized = rawRole.trim().toLowerCase();

  switch (normalized) {
    case 'provider':
    case 'supplier':
    case 'food_provider':
    case 'food-provider':
    case 'foodprovider':
    case 'caterer':
    case 'restaurant':
    case 'donor':
      return 'provider';

    case 'ngo':
    case 'shelter':
    case 'charity':
    case 'community_kitchen':
    case 'food_bank':
    case 'recipient':
      return 'ngo';

    case 'admin':
    case 'administrator':
    case 'superadmin':
    case 'ops_admin':
      return 'admin';

    default:
      return 'provider';
  }
}

/**
 * Checks if a given role matches an allowed canonical role.
 */
export function isRoleAllowed(userRole: string | undefined | null, allowedRoles: string[]): boolean {
  if (!userRole) return false;
  const canonicalUserRole = normalizeRole(userRole);
  const canonicalAllowed = allowedRoles.map(r => normalizeRole(r));
  return canonicalAllowed.includes(canonicalUserRole);
}
