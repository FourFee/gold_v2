export const fmt  = (n: number) =>
  n.toLocaleString('th-TH', { maximumFractionDigits: 0 });

export const fmtD = (n: number) =>
  n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
