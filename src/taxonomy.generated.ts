// AUTO-GENERATED FROM data/taxonomy.yaml — DO NOT EDIT BY HAND.
// Run `npm run codegen` to regenerate.

export const CATEGORIES = ['classic', 'original', 'seasonal', 'inbox'] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  'classic': "Classic",
  'original': "Original",
  'seasonal': "Seasonal",
  'inbox': "Inbox",
};

export const METHODS = ['shaken', 'stirred', 'built', 'blended'] as const;
export type Method = (typeof METHODS)[number];

export const METHOD_LABELS: Record<Method, string> = {
  'shaken': "Shaken",
  'stirred': "Stirred",
  'built': "Built",
  'blended': "Blended",
};

export const ICES = ['cubed', 'large-cube', 'crushed', 'none'] as const;
export type Ice = (typeof ICES)[number];

export const ICE_LABELS: Record<Ice, string> = {
  'cubed': "Cubed",
  'large-cube': "Large cube",
  'crushed': "Crushed",
  'none': "None",
};

export const DIFFICULTIES = ['easy', 'medium', 'advanced'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  'easy': "Easy",
  'medium': "Medium",
  'advanced': "Advanced",
};

export const FORMATS = ['single', 'batch', 'punch'] as const;
export type Format = (typeof FORMATS)[number];

export const FORMAT_LABELS: Record<Format, string> = {
  'single': "Single",
  'batch': "Batch",
  'punch': "Punch",
};

export const FAMILIES = ['old-fashioned', 'martini', 'daiquiri', 'sidecar', 'whiskey-highball', 'flip'] as const;
export type Family = (typeof FAMILIES)[number];

export const FAMILY_LABELS: Record<Family, string> = {
  'old-fashioned': "Old Fashioned",
  'martini': "Martini",
  'daiquiri': "Daiquiri",
  'sidecar': "Sidecar",
  'whiskey-highball': "Whiskey Highball",
  'flip': "Flip",
};

export const GLASSES = ['coupe', 'nick-and-nora', 'rocks', 'double-rocks', 'highball', 'collins', 'flute', 'wine', 'margarita', 'martini', 'mug', 'snifter', 'julep-tin'] as const;
export type Glass = (typeof GLASSES)[number];

export const GLASS_LABELS: Record<Glass, string> = {
  'coupe': "Coupe",
  'nick-and-nora': "Nick & Nora",
  'rocks': "Rocks",
  'double-rocks': "Double rocks",
  'highball': "Highball",
  'collins': "Collins",
  'flute': "Champagne flute",
  'wine': "Wine glass",
  'margarita': "Margarita",
  'martini': "Martini",
  'mug': "Mug",
  'snifter': "Snifter",
  'julep-tin': "Julep tin",
};

export const SPIRITS = ['tequila', 'mezcal', 'whiskey', 'bourbon', 'rye', 'scotch', 'gin', 'vodka', 'rum', 'brandy', 'aperitif', 'liqueur', 'wine', 'champagne'] as const;
export type Spirit = (typeof SPIRITS)[number];

export const SPIRIT_LABELS: Record<Spirit, string> = {
  'tequila': "Tequila",
  'mezcal': "Mezcal",
  'whiskey': "Whiskey",
  'bourbon': "Bourbon",
  'rye': "Rye",
  'scotch': "Scotch",
  'gin': "Gin",
  'vodka': "Vodka",
  'rum': "Rum",
  'brandy': "Brandy",
  'aperitif': "Aperitif",
  'liqueur': "Liqueur",
  'wine': "Wine",
  'champagne': "Champagne",
};

export const FLAVORS = ['citrus', 'nutty', 'smoky', 'sour', 'spice', 'herbal', 'floral', 'botanical', 'bright', 'chocolate', 'rich', 'sweet', 'spirit-forward', 'bitter', 'fruity', 'tart', 'bubbly', 'savory', 'refreshing'] as const;
export type Flavor = (typeof FLAVORS)[number];

export const FLAVOR_LABELS: Record<Flavor, string> = {
  'citrus': "Citrus",
  'nutty': "Nutty",
  'smoky': "Smoky",
  'sour': "Sour",
  'spice': "Spice",
  'herbal': "Herbal",
  'floral': "Floral",
  'botanical': "Botanical",
  'bright': "Bright",
  'chocolate': "Chocolate",
  'rich': "Rich",
  'sweet': "Sweet",
  'spirit-forward': "Spirit-forward",
  'bitter': "Bitter",
  'fruity': "Fruity",
  'tart': "Tart",
  'bubbly': "Bubbly",
  'savory': "Savory",
  'refreshing': "Refreshing",
};

export const OCCASIONS = ['weeknight', 'batch-friendly', 'showstopper', 'brunch', 'nightcap', 'summer', 'winter'] as const;
export type Occasion = (typeof OCCASIONS)[number];

export const OCCASION_LABELS: Record<Occasion, string> = {
  'weeknight': "Weeknight",
  'batch-friendly': "Batch-friendly",
  'showstopper': "Showstopper",
  'brunch': "Brunch",
  'nightcap': "Nightcap",
  'summer': "Summer",
  'winter': "Winter",
};
