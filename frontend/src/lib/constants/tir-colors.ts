/**
 * Time in Range (TIR) color constants
 *
 * These colors are used consistently across all reports and visualizations
 * for representing different glucose ranges:
 * - Severe Low: <54 mg/dL (<3.0 mmol/L)
 * - Low: 54-69 mg/dL (3.0-3.8 mmol/L)
 * - Target: 70-180 mg/dL (3.9-10.0 mmol/L)
 * - High: 181-250 mg/dL (10.1-13.9 mmol/L)
 * - Severe High: >250 mg/dL (>13.9 mmol/L)
 */

// CSS Custom Properties (for components that can use CSS variables)
export const TIR_COLORS_CSS = {
  severeLow: "var(--severe-low-bg)",
  low: "var(--low-bg)",
  target: "var(--target-bg)",
  high: "var(--high-bg)",
  severeHigh: "var(--severe-high-bg)",
} as const;

// Tailwind CSS Classes (for server-side rendering and utility classes)
export const TIR_COLORS_TAILWIND = {
  severeLow: "bg-red-700",
  low: "bg-red-500",
  target: "bg-green-500",
  high: "bg-yellow-400",
  severeHigh: "bg-yellow-600",
} as const;

// RGB Values (for direct color usage in charts and visualizations)
export const TIR_COLORS_RGB = {
  severeLow: "rgb(185, 28, 28)", // red-700
  low: "rgb(239, 68, 68)",       // red-500
  target: "rgb(34, 197, 94)",    // green-500
  high: "rgb(251, 191, 36)",     // yellow-400
  severeHigh: "rgb(217, 119, 6)", // yellow-600
} as const;

// Hex Values (alternative format for charts)
export const TIR_COLORS_HEX = {
  severeLow: "#B91C1C", // red-700
  low: "#EF4444",       // red-500
  target: "#22C55E",    // green-500
  high: "#FBBF24",      // yellow-400
  severeHigh: "#D97706", // yellow-600
} as const;

/**
 * Default export uses CSS custom properties for maximum flexibility
 * Components can fallback to other formats as needed
 */
export const TIR_COLORS = TIR_COLORS_CSS;

// Type definitions for TypeScript support
export type TIRColorScheme = typeof TIR_COLORS;
export type TIRRange = keyof TIRColorScheme;

export default TIR_COLORS;
