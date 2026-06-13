/* ============================================================
   lib.jsx — shared constants, helpers, context, UI primitives,
   icon set, crypto, and Chart.js-backed chart components.
   ============================================================ */
const { useState, useEffect, useRef, useMemo, useContext, createContext, useCallback } = React;

/* ---------- Currencies ---------- */
const CURRENCIES = {
  USD: { sym: "$",  name: "US Dollar",        dec: 2 },
  EUR: { sym: "€",  name: "Euro",             dec: 2 },
  GBP: { sym: "£",  name: "British Pound",    dec: 2 },
  JPY: { sym: "¥",  name: "Japanese Yen",     dec: 0 },
  INR: { sym: "₹",  name: "Indian Rupee",     dec: 2 },
  AMD: { sym: "֏",  name: "Armenian Dram",    dec: 0 },
  RUB: { sym: "₽",  name: "Russian Ruble",    dec: 0 },
  TRY: { sym: "₺",  name: "Turkish Lira",     dec: 2 },
  ZAR: { sym: "R",  name: "South African Rand", dec: 2 },
  AUD: { sym: "A$", name: "Australian Dollar", dec: 2 },
  CAD: { sym: "C$", name: "Canadian Dollar",  dec: 2 },
};

/* Exchange rates expressed as units of each currency per 1 USD.
   Editable by the user in Settings — these are sensible starting points.
   All stored amounts keep their original currency; conversion happens
   only at display time, so updating a rate re-prices everything. */
const DEFAULT_RATES = {
  USD: 1, EUR: 0.92, GBP: 0.79, JPY: 158, INR: 84,
  AMD: 388, RUB: 90, TRY: 34, ZAR: 18.5, AUD: 1.52, CAD: 1.37,
};
function convert(amount, from, to, rates = DEFAULT_RATES) {
  if (!amount || from === to) return amount || 0;
  const rf = rates[from] || DEFAULT_RATES[from] || 1;
  const rt = rates[to] || DEFAULT_RATES[to] || 1;
  return (amount / rf) * rt;
}

/* ---------- Gold ---------- */
/* Purity factors per karat; price is stored manually in USD per gram of 24k. */
const KARATS = { 24: 1, 22: 0.9167, 21: 0.875, 18: 0.75, 14: 0.5833 };
const DEFAULT_GOLD_PRICE = 107; // USD per gram, 24k — edit in Settings
function goldValueUSD(grams, karat, pricePerGram) {
  return (grams || 0) * (KARATS[karat] ?? 1) * (pricePerGram || 0);
}

const FREQS = {
  monthly:  { label: "Monthly",   factor: 1 },
  biweekly: { label: "Bi-weekly", factor: 26 / 12 },
  weekly:   { label: "Weekly",    factor: 52 / 12 },
  annual:   { label: "Annual",    factor: 1 / 12 },
  oneoff:   { label: "One-off",   factor: 1 },
};

const BUDGET_METHODS = {
  custom:   { label: "Custom",     blurb: "Set any percentages you like. Your buckets, your rules — total can be whatever fits your plan." },
  "503020": { label: "50 / 30 / 20", blurb: "A classic split: 50% to Needs, 30% to Wants, 20% to Savings & debt. A calm starting point." },
  zerobased:{ label: "Zero-based", blurb: "Give every unit a job. Allocate income until the total reaches exactly 100% — nothing left unassigned." },
  envelope: { label: "Envelope",   blurb: "Treat each bucket as a sealed envelope. When an envelope is empty, that kind of spending stops." },
};

/* A vivid, modern palette for categories & buckets — reads well on dark and light */
const SWATCHES = [
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#f43f5e", // rose
  "#f59e0b", // amber
  "#10b981", // emerald
  "#14b8a6", // teal
  "#0ea5e9", // sky
  "#84cc16", // lime
  "#f97316", // orange
];

const DEFAULT_CATEGORIES = [
  { name: "Housing",       color: "#6366f1" },
  { name: "Groceries",     color: "#84cc16" },
  { name: "Dining",        color: "#f59e0b" },
  { name: "Transport",     color: "#0ea5e9" },
  { name: "Utilities",     color: "#14b8a6" },
  { name: "Health",        color: "#f43f5e" },
  { name: "Entertainment", color: "#8b5cf6" },
  { name: "Shopping",      color: "#ec4899" },
  { name: "Savings",       color: "#10b981" },
  { name: "Other",         color: "#94a3b8" },
];

/* ---------- helpers ---------- */
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

function monthKeyOf(date) { return `${date.getFullYear()}-${date.getMonth() + 1}`; }
function parseMonthKey(k) { const [y, m] = k.split("-").map(Number); return new Date(y, m - 1, 1); }
function monthLabel(k) { return parseMonthKey(k).toLocaleDateString("en-US", { month: "long" }); }
function monthYear(k) { return parseMonthKey(k).getFullYear(); }
function shiftMonth(k, delta) { const d = parseMonthKey(k); d.setMonth(d.getMonth() + delta); return monthKeyOf(d); }

function fmt(n, curCode, opts = {}) {
  const c = CURRENCIES[curCode] || CURRENCIES.USD;
  const dec = opts.dec != null ? opts.dec : c.dec;
  const val = dec === 0 ? Math.round(n || 0) : round2(n || 0);
  const abs = Math.abs(val).toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
  const sign = val < 0 ? "−" : "";
  if (opts.compact) {
    const a = Math.abs(val);
    if (a >= 1e6) {
      const m = Math.round((a / 1e6) * 10) / 10;            // millions, 1 decimal
      return `${sign}${c.sym}${m.toLocaleString("en-US", { maximumFractionDigits: 1 })}M`;
    }
    if (a >= 1e5) {
      return `${sign}${c.sym}${Math.round(a / 1e3).toLocaleString("en-US")}k`;  // 100k+
    }
  }
  return `${sign}${c.sym}${abs}`;
}
const pct = (n) => `${Math.round(n)}%`;

/* ============================================================
   CRYPTO — passphrase-encrypted state & backups (Web Crypto)
   AES-256-GCM, key derived with PBKDF2-SHA256 (250k iterations)
   ============================================================ */
const te = new TextEncoder(); const td = new TextDecoder();
const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function deriveKey(pass, salt) {
  const base = await crypto.subtle.importKey("raw", te.encode(pass), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 250000, hash: "SHA-256" },
    base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}
async function encryptJSON(obj, pass) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(pass, salt);
  const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, te.encode(JSON.stringify(obj)));
  return { enc: true, v: 2, kdf: "PBKDF2-SHA256-250k", salt: b64(salt), iv: b64(iv), data: b64(data) };
}
async function decryptJSON(payload, pass) {
  const key = await deriveKey(pass, unb64(payload.salt));
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(payload.iv) }, key, unb64(payload.data));
  return JSON.parse(td.decode(plain));
}
function downloadFile(name, text, type = "application/json") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function pickFile(accept, cb) {
  const inp = document.createElement("input");
  inp.type = "file"; inp.accept = accept;
  inp.onchange = () => {
    const f = inp.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => cb(r.result);
    r.readAsText(f);
  };
  inp.click();
}

/* ---------- App context ---------- */
const AppCtx = createContext(null);
const useApp = () => useContext(AppCtx);

/* ============================================================
   ICONS — simple, clean line icons (1.7 stroke)
   ============================================================ */
function Icon({ name, size = 20, stroke = 1.7, fill = "none", style }) {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill, stroke: "currentColor", strokeWidth: stroke, strokeLinecap: "round", strokeLinejoin: "round", style };
  const paths = {
    overview: <><rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="5" rx="2"/><rect x="13" y="11" width="8" height="10" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/></>,
    income:   <><path d="M12 3v18"/><path d="M17 8.5C17 6.6 14.8 5.5 12 5.5S7 6.6 7 8.5s2 2.6 5 3.2 5 1.3 5 3.3-2.2 3-5 3-5-1.1-5-3"/></>,
    expenses: <><path d="M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z"/><path d="M3 9h18"/><path d="M7 14h4"/></>,
    goals:    <><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.4"/><path d="M12 1v3M12 20v3M1 12h3M20 12h3"/></>,
    analytics:<><path d="M4 19V5"/><path d="M4 19h16"/><path d="M8 16v-5M12 16V8M16 16v-7M20 16v-3"/></>,
    settings: <><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3"/><path d="M1.5 14h5M9.5 8h5M17.5 16h5"/></>,
    plus:     <><path d="M12 5v14M5 12h14"/></>,
    trash:    <><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6"/><path d="M10 11v6M14 11v6"/></>,
    chevL:    <path d="m15 18-6-6 6-6"/>,
    chevR:    <path d="m9 18 6-6-6-6"/>,
    chevD:    <path d="m6 9 6 6 6-6"/>,
    sun:      <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></>,
    moon:     <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/>,
    search:   <><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></>,
    download: <><path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/></>,
    upload:   <><path d="M12 15V3M7 8l5-5 5 5"/><path d="M5 21h14"/></>,
    close:    <path d="M18 6 6 18M6 6l12 12"/>,
    info:     <><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></>,
    edit:     <><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></>,
    target:   <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4"/></>,
    arrowUp:  <path d="M12 19V5M6 11l6-6 6 6"/>,
    arrowDn:  <path d="M12 5v14M6 13l6 6 6-6"/>,
    wallet:   <><path d="M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v0H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9"/><path d="M16 13h.01"/></>,
    flame:    <path d="M12 2s4 3.5 4 8a4 4 0 0 1-8 0c0-1 .5-2 .5-2S6 11 6 14a6 6 0 0 0 12 0c0-5-6-12-6-12Z"/>,
    calendar: <><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/></>,
    check:    <path d="M20 6 9 17l-5-5"/>,
    spark:    <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"/>,
    pie:      <><path d="M12 3a9 9 0 1 0 9 9h-9V3Z"/><path d="M14 3.2A9 9 0 0 1 20.8 10H14V3.2Z"/></>,
    gold:     <><path d="M5 13h6l1.5 5h-9L5 13Z"/><path d="M13 13h6l1.5 5h-9L13 13Z"/><path d="M9 6h6l1.5 5h-9L9 6Z"/></>,
    lock:     <><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></>,
    unlock:   <><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.9-.9"/></>,
    share:    <><circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="6" r="2.6"/><circle cx="18" cy="18" r="2.6"/><path d="m8.4 10.8 7.2-3.6M8.4 13.2l7.2 3.6"/></>,
    coins:    <><ellipse cx="12" cy="5.5" rx="7.5" ry="3"/><path d="M4.5 5.5v6.5c0 1.66 3.36 3 7.5 3s7.5-1.34 7.5-3V5.5"/><path d="M4.5 12v6.5c0 1.66 3.36 3 7.5 3s7.5-1.34 7.5-3V12"/></>,
    more:     <><circle cx="5" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="19" cy="12" r="1.5" fill="currentColor"/></>,
    repeat:   <><path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></>,
    trend:    <><path d="M3 17l6-6 4 4 7-7"/><path d="M17 8h4v4"/></>,
  };
  return <svg {...p}>{paths[name] || null}</svg>;
}

/* ============================================================
   UI PRIMITIVES
   ============================================================ */
function Card({ children, className = "", ...rest }) {
  return <div className={`card ${className}`} {...rest}>{children}</div>;
}

function Btn({ children, variant, size, icon, className = "", ...rest }) {
  return (
    <button className={`btn ${variant || ""} ${size || ""} ${className}`} {...rest}>
      {icon && <Icon name={icon} size={size === "sm" ? 16 : 18} />}{children}
    </button>
  );
}

function Field({ label, children }) {
  return <div className="field">{label && <label>{label}</label>}{children}</div>;
}

function MoneyInput({ value, onChange, placeholder = "0.00", autoFocus }) {
  const { cur } = useApp();
  return (
    <div className="input-prefix">
      <span className="sym">{CURRENCIES[cur].sym}</span>
      <input className="input mono" type="number" min="0" step="any" inputMode="decimal"
        value={value} placeholder={placeholder} autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

/* Multi-currency money input: amount + an attached entry-currency picker.
   The amount is STORED in the currency you pick — nothing is converted away.
   The live note simply previews what it's worth in your main currency today. */
function MoneyInputMulti({ value, onChange, entryCur, onEntryCur, placeholder = "0.00", autoFocus }) {
  const { cur, convert } = useApp();
  const ec = entryCur || cur;
  const num = parseFloat(value);
  const showConv = ec !== cur && num > 0;
  return (
    <div>
      <div className="money-multi">
        <div className="input-prefix">
          <span className="sym">{CURRENCIES[ec].sym}</span>
          <input className="input mono" type="number" min="0" step="any" inputMode="decimal"
            value={value} placeholder={placeholder} autoFocus={autoFocus}
            onChange={(e) => onChange(e.target.value)} />
        </div>
        <div className="select-wrap money-cur">
          <select className="select" value={ec} onChange={(e) => onEntryCur(e.target.value)} aria-label="Entry currency">
            {Object.keys(CURRENCIES).map((k) => <option key={k} value={k}>{CURRENCIES[k].sym} {k}</option>)}
          </select>
        </div>
      </div>
      {showConv && (
        <div className="conv-note mono">≈ {fmt(convert(num, ec, cur), cur)} <span>kept in {ec}, shown at today's rate</span></div>
      )}
    </div>
  );
}

/* Dual amount: primary currency big, secondary small underneath.
   `value` is expressed in the primary display currency. */
function Dual({ value, size = "md", tone, className = "" }) {
  const { cur, cur2, convert } = useApp();
  const showSecond = cur2 && cur2 !== cur;
  return (
    <div className={`dual ${size} ${className}`}>
      <span className="d1 mono" style={tone ? { color: tone } : undefined}>{fmt(value, cur)}</span>
      {showSecond && <span className="d2 mono">≈ {fmt(convert(value, cur, cur2), cur2)}</span>}
    </div>
  );
}

/* Small inline original-currency note for table rows */
function NativeAmt({ amount, cur: entryCur }) {
  const { cur, convert } = useApp();
  if (!entryCur || entryCur === cur) return <span className="mono">{fmt(amount, cur)}</span>;
  return (
    <span className="native-amt">
      <span className="mono">{fmt(amount, entryCur)}</span>
      <span className="mono sub-conv">≈ {fmt(convert(amount, entryCur, cur), cur)}</span>
    </span>
  );
}

function SelectBox({ value, onChange, children }) {
  return (
    <div className="select-wrap">
      <select className="select" value={value} onChange={(e) => onChange(e.target.value)}>{children}</select>
    </div>
  );
}

function CurrencySelect({ value, onChange, label }) {
  return (
    <div className="select-wrap">
      <select className="select" value={value} onChange={(e) => onChange(e.target.value)} aria-label={label || "Currency"}>
        {Object.entries(CURRENCIES).map(([k, v]) => <option key={k} value={k}>{v.sym} {k} — {v.name}</option>)}
      </select>
    </div>
  );
}

function Badge({ name, color }) {
  return <span className="cat-badge" style={{ background: color + "1f", color: color }}>
    <span className="dot" style={{ background: color }} />{name}
  </span>;
}

function ProgressBar({ value, color, tall }) {
  return <div className={`bar ${tall ? "tall" : ""}`}><span style={{ width: clamp(value, 0, 100) + "%", background: color || "var(--gold)" }} /></div>;
}

function Tip({ children }) {
  return <div className="tip"><span className="ic"><Icon name="info" size={18} /></span><p>{children}</p></div>;
}

function EmptyState({ icon, title, sub, action }) {
  return (
    <div className="empty">
      <div className="ill"><Icon name={icon} size={30} /></div>
      <h4>{title}</h4><p>{sub}</p>{action}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  useEffect(() => {
    const h = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div className="modal-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true">
        <div className="modal-head"><h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="close" size={18} /></button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

function SwatchPicker({ value, onChange }) {
  return (
    <div className="swatch-grid">
      {SWATCHES.map((c) => (
        <button key={c} type="button" className={`swatch-pick ${value === c ? "sel" : ""}`}
          style={{ background: c }} onClick={() => onChange(c)} aria-label={c} />
      ))}
    </div>
  );
}

/* ============================================================
   CHARTS (Chart.js 4.x) — return canvas only; legends are
   built as custom HTML by callers.
   ============================================================ */
function useThemeTick() {
  // re-render charts when theme changes
  const [, force] = useState(0);
  useEffect(() => {
    const obs = new MutationObserver(() => force((n) => n + 1));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);
}

function DonutChart({ data, thickness = 62, total, totalLabel }) {
  const ref = useRef(null);
  const chart = useRef(null);
  useThemeTick();
  const hollow = getComputedStyle(document.body).getPropertyValue("--surface").trim() || "#fff";
  useEffect(() => {
    if (!ref.current) return;
    if (chart.current) chart.current.destroy();
    chart.current = new Chart(ref.current, {
      type: "doughnut",
      data: {
        labels: data.map((d) => d.label),
        datasets: [{
          data: data.map((d) => d.value),
          backgroundColor: data.map((d) => d.color),
          borderColor: hollow, borderWidth: 3, hoverOffset: 6, borderRadius: 4,
        }],
      },
      options: {
        cutout: `${thickness}%`, responsive: true, maintainAspectRatio: true,
        animation: { animateRotate: true, duration: 900, easing: "easeOutQuart" },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: getComputedStyle(document.body).getPropertyValue("--ink").trim(),
            titleColor: hollow, bodyColor: hollow, padding: 10, cornerRadius: 8, displayColors: true,
            callbacks: {
              label: (ctx) => {
                const sum = ctx.dataset.data.reduce((a, b) => a + b, 0) || 1;
                return ` ${ctx.label}: ${Math.round((ctx.raw / sum) * 100)}%`;
              },
            },
          },
        },
      },
    });
    return () => chart.current && chart.current.destroy();
  }, [JSON.stringify(data), thickness, hollow]);
  return (
    <div className="donut-box">
      <canvas ref={ref} />
      {total != null && (
        <div className="donut-center">
          <div className="big">{total}</div>
          {totalLabel && <div className="cap">{totalLabel}</div>}
        </div>
      )}
    </div>
  );
}

function BarChart({ groups }) {
  // groups: [{label, value, color}]
  const ref = useRef(null);
  const chart = useRef(null);
  useThemeTick();
  useEffect(() => {
    if (!ref.current) return;
    if (chart.current) chart.current.destroy();
    const ink = getComputedStyle(document.body).getPropertyValue("--ink").trim();
    const line = getComputedStyle(document.body).getPropertyValue("--line").trim();
    const faint = getComputedStyle(document.body).getPropertyValue("--ink-faint").trim();
    chart.current = new Chart(ref.current, {
      type: "bar",
      data: {
        labels: groups.map((g) => g.label),
        datasets: [{
          data: groups.map((g) => g.value),
          backgroundColor: groups.map((g) => g.color),
          borderRadius: 8, borderSkipped: false, maxBarThickness: 84,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 800, easing: "easeOutQuart" },
        plugins: {
          legend: { display: false },
          tooltip: { backgroundColor: ink, padding: 10, cornerRadius: 8, displayColors: false },
        },
        scales: {
          x: { grid: { display: false }, border: { color: line }, ticks: { color: faint, font: { family: "Inter", size: 12, weight: 600 } } },
          y: { grid: { color: line }, border: { display: false }, ticks: { color: faint, font: { family: "JetBrains Mono", size: 11 }, maxTicksLimit: 5 } },
        },
      },
    });
    return () => chart.current && chart.current.destroy();
  }, [JSON.stringify(groups)]);
  return <div style={{ height: 240, position: "relative" }}><canvas ref={ref} /></div>;
}

function LineChart({ points, cur }) {
  // points: [{label, value}] — value in display currency
  const ref = useRef(null);
  const chart = useRef(null);
  useThemeTick();
  useEffect(() => {
    if (!ref.current) return;
    if (chart.current) chart.current.destroy();
    const css = (v) => getComputedStyle(document.body).getPropertyValue(v).trim();
    const ink = css("--ink"), line = css("--line"), faint = css("--ink-faint"), accent = css("--gold");
    const ctx = ref.current.getContext("2d");
    const grad = ctx.createLinearGradient(0, 0, 0, 220);
    grad.addColorStop(0, accent + "44");
    grad.addColorStop(1, accent + "00");
    chart.current = new Chart(ref.current, {
      type: "line",
      data: {
        labels: points.map((p) => p.label),
        datasets: [{
          data: points.map((p) => p.value),
          borderColor: accent, borderWidth: 2.5,
          backgroundColor: grad, fill: true,
          pointBackgroundColor: accent, pointBorderColor: css("--surface"), pointBorderWidth: 2,
          pointRadius: points.length > 18 ? 0 : 4, pointHoverRadius: 6,
          tension: 0.32,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 700, easing: "easeOutQuart" },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: ink, padding: 10, cornerRadius: 8, displayColors: false,
            callbacks: { label: (c) => fmt(c.raw, cur) },
          },
        },
        scales: {
          x: { grid: { display: false }, border: { color: line }, ticks: { color: faint, font: { family: "Inter", size: 11, weight: 600 }, maxRotation: 0, autoSkipPadding: 12 } },
          y: { grid: { color: line }, border: { display: false }, ticks: { color: faint, font: { family: "JetBrains Mono", size: 10 }, maxTicksLimit: 5, callback: (v) => fmt(v, cur, { compact: true }) } },
        },
      },
    });
    return () => chart.current && chart.current.destroy();
  }, [JSON.stringify(points), cur]);
  return <div style={{ height: 220, position: "relative" }}><canvas ref={ref} /></div>;
}

/* Custom HTML legend rows */
function Legend({ items, cur }) {
  const sum = items.reduce((a, b) => a + b.value, 0) || 1;
  return (
    <div className="legend">
      {items.map((it, i) => (
        <div className="legend-item" key={i}>
          <span className="swatch" style={{ background: it.color }} />
          <span className="lname">{it.label}</span>
          <span className="lval">{fmt(it.value, cur)}</span>
          <span className="lpct">{Math.round((it.value / sum) * 100)}%</span>
        </div>
      ))}
    </div>
  );
}

/* ---------- export to window for other babel scripts ---------- */
Object.assign(window, {
  useState, useEffect, useRef, useMemo, useContext, useCallback,
  CURRENCIES, FREQS, BUDGET_METHODS, SWATCHES, DEFAULT_CATEGORIES, DEFAULT_RATES, convert,
  KARATS, DEFAULT_GOLD_PRICE, goldValueUSD,
  encryptJSON, decryptJSON, downloadFile, pickFile,
  uid, clamp, round2, fmt, pct, monthKeyOf, parseMonthKey, monthLabel, monthYear, shiftMonth,
  AppCtx, useApp, Icon, Card, Btn, Field, MoneyInput, MoneyInputMulti, Dual, NativeAmt,
  SelectBox, CurrencySelect, Badge, ProgressBar,
  Tip, EmptyState, Modal, SwatchPicker, DonutChart, BarChart, LineChart, Legend,
});
