// ============================================================
// BarberQ — Design tokens
// Single source of truth for all colors, spacing, and typography.
// ============================================================

export const Colors = {
  // Core palette
  primary:    '#0F172A',   // Dark navy — headings, CTAs
  accent:     '#6366F1',   // Indigo — active states, highlights
  success:    '#10B981',   // Emerald — available slots, confirmed
  warning:    '#F59E0B',   // Amber — pending, warnings
  danger:     '#EF4444',   // Red — cancelled, errors, blocked
  // Backgrounds
  background: '#F8FAFC',   // Slate 50 — app background
  surface:    '#FFFFFF',   // Pure white — cards
  surfaceMuted: '#F1F5F9', // Slate 100 — inputs, muted sections
  // Text
  textPrimary: '#0F172A',  // Slate 900 — headings
  textSecondary: '#475569',// Slate 600 — body text
  textMuted:  '#94A3B8',   // Slate 400 — labels, placeholders
  // Borders
  border:     '#E2E8F0',   // Slate 200 — dividers, card borders
  borderFocus: '#6366F1',  // Accent — focused inputs
  // Slot states
  slotAvailable: '#10B981',
  slotBooked:    '#E2E8F0',
  slotBlocked:   '#EF4444',
  // Status pills
  statusConfirmed:  '#DCFCE7', // Green 100
  statusConfirmedText: '#166534', // Green 900
  statusCancelled:  '#FEE2E2', // Red 100
  statusCancelledText: '#991B1B',
  statusCompleted:  '#EDE9FE', // Purple 100
  statusCompletedText: '#5B21B6',
  statusNoShow:     '#FEF3C7', // Amber 100
  statusNoShowText: '#92400E',
} as const;

export const Spacing = {
  xs:   4,
  sm:   8,
  md:   16,
  lg:   24,
  xl:   32,
  xxl:  48,
} as const;

export const Radius = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   24,
  full: 9999,
} as const;

export const Typography = {
  // Font sizes
  xs:   11,
  sm:   13,
  base: 15,
  md:   17,
  lg:   20,
  xl:   24,
  xxl:  28,
  xxxl: 34,
  // Font weights (React Native uses string weights)
  regular:    '400' as const,
  medium:     '500' as const,
  semibold:   '600' as const,
  bold:       '700' as const,
  extrabold:  '800' as const,
} as const;

export const Shadow = {
  sm: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
} as const;
