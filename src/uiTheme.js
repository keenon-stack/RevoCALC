export const palette = {
  background: "#bedcbe",
  primary: "#003c32",
  accent: "#9ad0b0",
  textMuted: "#bedcbe",
  textInverse: "#ffffff",
  tableHeader: "#002820",
};

export const fonts = {
  body:
    '"ES_Klarheit_Grotesk",-apple-system,BlinkMacSystemFont,"Segoe_UI",system-ui,sans-serif',
};

export const uiClasses = {
  page: `min-h-screen bg-[${palette.background}] p-6 text-[${palette.primary}] font-[${fonts.body}]`,
  card: `space-y-3 rounded-2xl bg-[${palette.primary}] p-4 text-white shadow-md`,
  input:
    `bg-[${palette.primary}] border border-white text-white rounded-xl px-3 py-2 outline-none font-bold focus:ring-2 focus:ring-[${palette.accent}]`,
  labelText: `text-sm font-extralight text-[${palette.textMuted}]`,
  headerTitle: `text-3xl font-bold text-[${palette.primary}]`,
  sectionTitle: `mb-2 text-xl font-semibold text-[${palette.textMuted}]`,
  keyMetricLabel: `text-xs text-[${palette.textMuted}]`,
  keyMetricValue: "text-lg font-bold text-white",
  tabButtonBase:
    "flex-1 rounded-full border border-white px-3 py-2 text-sm font-semibold transition-colors",
  tableHeaderCell:
    `sticky top-0 z-10 bg-[${palette.tableHeader}] px-2 py-1 text-left text-[11px] font-bold text-white`,
};
