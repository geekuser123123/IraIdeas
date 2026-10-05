/** Situation-based groups used on the homepage, service filters and learning topics. */
export const CATEGORY_SLUGS = ['retirement-roth', 'trusts-wealth-transfer', 'ownership-transactions', 'plan-transaction-concerns'] as const;
export type CategorySlug = (typeof CATEGORY_SLUGS)[number];

export const CATEGORIES: Record<CategorySlug, { label: string; description: string }> = {
  'retirement-roth': {
    label: 'Retirement & Roth Planning',
    description: 'Explore questions involving retirement accounts, Roth planning, and the decisions surrounding significant financial moves.',
  },
  'trusts-wealth-transfer': {
    label: 'Trusts & Wealth Transfer',
    description: 'Examine how trusts, ownership, and the transfer of assets fit into the broader picture.',
  },
  'ownership-transactions': {
    label: 'Ownership & Complex Transactions',
    description: 'Get a closer look at the structures and relationships involved in a proposed transaction.',
  },
  'plan-transaction-concerns': {
    label: 'Plan & Transaction Concerns',
    description: 'Bring forward a concern about an existing arrangement, a proposed move, or an issue that needs professional review.',
  },
};
