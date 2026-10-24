/**
 * FoodBridge WCAG Color Contrast & Accessibility Token Verifier
 * Mathematical verification of WCAG 2.1 AA (4.5:1 for normal text, 3:1 for UI components)
 * and AAA (7:1 for normal text, 4.5:1 for large text).
 */

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return { r, g, b };
}

function getLuminance({ r, g, b }) {
  const [rs, gs, bs] = [r, g, b].map(c => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrastRatio(hex1, hex2) {
  const lum1 = getLuminance(hexToRgb(hex1));
  const lum2 = getLuminance(hexToRgb(hex2));
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

// Canonical Tokens
const TOKENS = {
  cream: '#F7F3E9',
  warmwhite: '#FFFCF7',
  purewhite: '#FFFFFF',
  forest: '#174C35',
  forestDark: '#133E2B',
  darkink: '#19242B',
  sage: '#DCE9D8',
  apricot: '#E4A45D',
  honey: '#F2C66D',
  rose: '#E11D48',
  // FoodBridge Solid Footer Color System
  footerBg: '#103D2B',
  footerHeading: '#FFFFFF',
  footerNavLinks: '#E2EDE5',
  footerParagraph: '#D4E5D9',
  footerMuted: '#C1D5C7',
  footerDivider: '#426C56',
  footerAccent: '#A9E6B8',
};

const PAIRS_TO_TEST = [
  {
    name: 'Navbar "Get Started" & Primary CTA Button (White on Forest Green)',
    fg: TOKENS.purewhite,
    bg: TOKENS.forest,
    required: 4.5,
    expectedRatio: 10.1,
  },
  {
    name: 'Primary Headline & Body Text (Dark Ink on Warm Cream)',
    fg: TOKENS.darkink,
    bg: TOKENS.cream,
    required: 4.5,
    expectedRatio: 14.0,
  },
  {
    name: 'Card Content (Dark Ink on Warm White)',
    fg: TOKENS.darkink,
    bg: TOKENS.warmwhite,
    required: 4.5,
    expectedRatio: 14.8,
  },
  {
    name: 'Verified Impact / Category Badges (Forest Green on Soft Sage)',
    fg: TOKENS.forest,
    bg: TOKENS.sage,
    required: 4.5,
    expectedRatio: 8.1,
  },
  {
    name: 'Apricot CTA Button (Dark Ink on Apricot)',
    fg: TOKENS.darkink,
    bg: TOKENS.apricot,
    required: 4.5,
    expectedRatio: 7.0,
  },
  {
    name: 'Hero Image Overlay: Freshly Cooked Label (White on Dark Ink Overlay)',
    fg: TOKENS.purewhite,
    bg: TOKENS.darkink,
    required: 4.5,
    expectedRatio: 14.8,
  },
  {
    name: 'Hero Image Overlay: 100% Verified Non-Profits (Forest Green on Warm White)',
    fg: TOKENS.forest,
    bg: TOKENS.warmwhite,
    required: 4.5,
    expectedRatio: 10.0,
  },
  {
    name: 'Footer Main Headings (White on Dark Forest Green #103D2B)',
    fg: TOKENS.footerHeading,
    bg: TOKENS.footerBg,
    required: 4.5,
    expectedRatio: 12.35,
  },
  {
    name: 'Footer Navigation Links (#E2EDE5 on Dark Forest Green #103D2B)',
    fg: TOKENS.footerNavLinks,
    bg: TOKENS.footerBg,
    required: 4.5,
    expectedRatio: 10.4,
  },
  {
    name: 'Footer Paragraph Text (#D4E5D9 on Dark Forest Green #103D2B)',
    fg: TOKENS.footerParagraph,
    bg: TOKENS.footerBg,
    required: 4.5,
    expectedRatio: 9.4,
  },
  {
    name: 'Footer Muted Copyright Text (#C1D5C7 on Dark Forest Green #103D2B)',
    fg: TOKENS.footerMuted,
    bg: TOKENS.footerBg,
    required: 4.5,
    expectedRatio: 7.8,
  },
  {
    name: 'Footer Accent Elements (#A9E6B8 on Dark Forest Green #103D2B)',
    fg: TOKENS.footerAccent,
    bg: TOKENS.footerBg,
    required: 4.5,
    expectedRatio: 8.5,
  },
  {
    name: 'Expired Status Badge (White on Crimson Rose)',
    fg: TOKENS.purewhite,
    bg: TOKENS.rose,
    required: 4.5,
    expectedRatio: 4.6,
  },
];


console.log('='.repeat(70));
console.log('FoodBridge WCAG 2.1 Contrast & Accessibility Token Audit');
console.log('='.repeat(70));

let passed = 0;
let failed = 0;

PAIRS_TO_TEST.forEach(({ name, fg, bg, required }) => {
  const ratio = getContrastRatio(fg, bg);
  const ratioStr = ratio.toFixed(2) + ':1';
  const isPass = ratio >= required;
  const isAAA = ratio >= 7.0;

  if (isPass) {
    passed++;
    const level = isAAA ? 'WCAG AAA (Enhanced)' : 'WCAG AA (Standard)';
    console.log(`[PASS] ${name}`);
    console.log(`       Foreground: ${fg} | Background: ${bg} => Ratio: ${ratioStr} (${level})`);
  } else {
    failed++;
    console.error(`[FAIL] ${name}`);
    console.error(`       Foreground: ${fg} | Background: ${bg} => Ratio: ${ratioStr} (Required: ${required}:1)`);
  }
  console.log('-'.repeat(70));
});

console.log(`\nAudit Results: ${passed} Passed, ${failed} Failed.`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('ALL DESIGN SYSTEM TOKENS SATISFY WCAG AA / AAA ACCESSIBILITY REQUIREMENTS!\n');
  process.exit(0);
}
