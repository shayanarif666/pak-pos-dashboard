/*
 * The look every table in the dashboard shares (DataTable and the hand-built ones): a white card
 * with a soft shadow, a label row on top, a tinted header and calm, roomy rows.
 */
export const table = {
  card: "overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_18px_40px_-24px_rgba(15,23,42,0.18)]",
  header: "flex flex-wrap items-center justify-between gap-3 px-5 py-4",
  title: "text-base font-semibold tracking-tight text-slate-950",
  count: "rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-brand-700",
  scroll: "overflow-x-auto",
  table: "w-full text-left text-sm",
  thead: "border-b border-slate-200/80 bg-slate-50/80",
  th: "whitespace-nowrap px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500",
  tr: "border-b border-slate-100 transition-colors last:border-0 hover:bg-brand-50/40",
  td: "px-5 py-3.5 align-middle text-slate-700",
  footer: "flex flex-wrap items-center justify-between gap-4 border-t border-slate-200/80 bg-slate-50/50 px-5 py-3 text-sm text-slate-600",
  empty: "px-5 py-14 text-center",
}

/** "right" / "center" column alignment classes. */
export const alignClass = (align) => (align === "right" ? "text-right tabular-nums" : align === "center" ? "text-center" : "")
