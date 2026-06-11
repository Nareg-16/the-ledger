/* ============================================================
   app.jsx — root: state, persistence (plain or encrypted),
   v1→v2 migration, derived values, routing, app lock
   ============================================================ */
const STORAGE_KEY = "ledger.v2";
const LEGACY_KEY = "ledger.v1";

function freshState() {
  // dark-first: only start light if the OS explicitly prefers it
  const prefersLight = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches;
  return {
    version: 2,
    currency: "AMD",            // primary display currency
    currency2: "USD",           // secondary display currency (dual totals)
    theme: prefersLight ? "light" : "dark",
    budgetMethod: "503020",
    rates: { ...DEFAULT_RATES },
    goldPrice: DEFAULT_GOLD_PRICE,   // USD per gram, 24k
    categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })),
    goals: [],
    holdings: [],               // savings & assets: cash per currency + gold
    allocations: [
      { id: uid(), name: "Needs", pct: 50, color: "#6366f1" },
      { id: uid(), name: "Wants", pct: 30, color: "#ec4899" },
      { id: uid(), name: "Savings", pct: 20, color: "#10b981" },
    ],
    months: {},
  };
}

/* v1 stored every amount pre-converted into the main currency.
   v2 keeps each entry in its own currency — so we tag all legacy
   amounts with the old main currency and they stay correct. */
function migrateV1(s) {
  const cur = s.currency || "USD";
  const tag = (e) => ({ ...e, cur: e.cur || cur });
  const months = {};
  Object.entries(s.months || {}).forEach(([k, m]) => {
    months[k] = { income: (m.income || []).map(tag), expenses: (m.expenses || []).map(tag) };
  });
  return {
    ...freshState(),
    ...s,
    version: 2,
    currency: cur,
    currency2: s.currency2 || (cur === "AMD" ? "USD" : "AMD"),
    rates: s.rates || { ...DEFAULT_RATES },
    goldPrice: s.goldPrice || DEFAULT_GOLD_PRICE,
    holdings: s.holdings || [],
    goals: (s.goals || []).map(tag),
    months,
  };
}

/* Returns {mode:"plain", state} | {mode:"locked", payload} */
function loadBoot() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (p.enc) return { mode: "locked", payload: p };
      return { mode: "plain", state: migrateV1(p) };
    }
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) return { mode: "plain", state: migrateV1(JSON.parse(legacy)) };
  } catch (e) { /* corrupt save — start fresh rather than crash */ }
  return { mode: "plain", state: freshState() };
}

const NAV = [
  { id: "overview", label: "Overview", icon: "overview" },
  { id: "income", label: "Income", icon: "income" },
  { id: "expenses", label: "Expenses", icon: "expenses" },
  { id: "wealth", label: "Wealth", icon: "coins" },
  { id: "goals", label: "Goals", icon: "goals" },
  { id: "analytics", label: "Analytics", icon: "analytics" },
  { id: "settings", label: "Settings", icon: "settings" },
];

function LockScreen({ payload, onUnlock }) {
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const tryUnlock = async (e) => {
    e.preventDefault();
    if (!pass) return;
    setBusy(true); setErr("");
    try {
      const state = await decryptJSON(payload, pass);
      onUnlock(migrateV1(state), pass);
    } catch (_) {
      setErr("That passphrase didn't work. Try again.");
      setBusy(false);
    }
  };
  return (
    <div className="lock-screen">
      <div className="lock-card rise">
        <div className="brand-mark" style={{ width: 52, height: 52, margin: "0 auto 14px" }}><Icon name="lock" size={26} /></div>
        <h2 className="serif" style={{ fontSize: 26 }}>Your ledger is locked</h2>
        <p className="soft" style={{ margin: "8px 0 18px", fontSize: 14 }}>Everything is encrypted on this device. Enter your passphrase to open it.</p>
        <form onSubmit={tryUnlock} className="stack gap-12">
          <input className="input" type="password" autoFocus placeholder="Passphrase"
            value={pass} onChange={(e) => setPass(e.target.value)} />
          {err && <p style={{ color: "var(--neg)", fontSize: 13 }}>{err}</p>}
          <Btn variant="primary" icon="unlock" type="submit" disabled={busy || !pass} className="block">
            {busy ? "Unlocking…" : "Unlock"}
          </Btn>
        </form>
      </div>
    </div>
  );
}

/* Shown when synced cloud data is encrypted and this device doesn't
   have the passphrase in memory (e.g. first login on a new phone). */
function CloudUnlockModal({ payload, onUnlock, onSkip }) {
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (!pass) return;
    setBusy(true); setErr("");
    try {
      const s = await decryptJSON(payload, pass);
      onUnlock(s, pass);
    } catch (_) {
      setErr("That's not the passphrase this backup was encrypted with.");
      setBusy(false);
    }
  };
  return (
    <Modal title="Unlock your cloud data" onClose={onSkip}>
      <p className="soft" style={{ fontSize: 13.5 }}>
        Your synced ledger is encrypted with your app-lock passphrase. Enter it to load your data onto this device — it will also turn the app lock on here.
      </p>
      <form onSubmit={submit} className="stack gap-12">
        <input className="input" type="password" autoFocus placeholder="Passphrase" value={pass} onChange={(e) => setPass(e.target.value)} />
        {err && <p style={{ color: "var(--neg)", fontSize: 13 }}>{err}</p>}
        <div className="flex gap-12" style={{ justifyContent: "flex-end" }}>
          <Btn variant="ghost" type="button" onClick={onSkip}>Not now</Btn>
          <Btn variant="primary" icon="unlock" type="submit" disabled={busy || !pass}>{busy ? "Unlocking…" : "Unlock"}</Btn>
        </div>
      </form>
    </Modal>
  );
}

function App() {
  const [boot, setBoot] = useState(loadBoot);
  const [state, setStateRaw] = useState(boot.mode === "plain" ? boot.state : null);
  const passRef = useRef(null);          // in-memory passphrase while app lock is on
  const [month, setMonth] = useState(() => monthKeyOf(new Date()));
  const [tab, setTab] = useState("overview");

  const setState = setStateRaw;

  // ---- cloud sync (Supabase, optional) ----
  const [user, setUser] = useState(null);
  const [syncInfo, setSyncInfo] = useState({ status: window.syncEnabled ? "idle" : "off", at: null, msg: "" });
  const [cloudLocked, setCloudLocked] = useState(null);   // encrypted cloud payload awaiting passphrase
  const userRef = useRef(null);
  const skipPushRef = useRef(false);                      // suppress the push caused by adopting cloud data
  const firstChangeRef = useRef(true);                    // initial state-set isn't a user edit
  const lastChangeRef = useRef(parseInt(localStorage.getItem("ledger.updatedAt") || "0", 10) || 0);
  useEffect(() => { userRef.current = user; }, [user]);

  const adoptCloud = (s) => { skipPushRef.current = true; setStateRaw(migrateV1(s)); };

  const pushNow = async () => {
    if (!window.syncEnabled || !userRef.current || !state) return;
    setSyncInfo((i) => ({ ...i, status: "syncing", msg: "" }));
    try {
      const payload = passRef.current ? await encryptJSON(state, passRef.current) : state;
      await cloudPush(payload, new Date(lastChangeRef.current || Date.now()).toISOString());
      setSyncInfo({ status: "synced", at: Date.now(), msg: "" });
    } catch (e) {
      setSyncInfo({ status: "error", at: null, msg: e.message || "Sync failed" });
    }
  };

  // watch auth state
  useEffect(() => {
    if (!window.syncEnabled) return;
    let active = true;
    syncGetSession().then((s) => active && setUser(s ? s.user : null));
    const off = syncOnAuth((s) => setUser(s ? s.user : null));
    return () => { active = false; off(); };
  }, []);

  // on login (and once state is unlocked): pull, newer side wins
  const stateLoaded = !!state;
  useEffect(() => {
    if (!window.syncEnabled || !user || !stateLoaded) return;
    let cancelled = false;
    (async () => {
      setSyncInfo((i) => ({ ...i, status: "syncing", msg: "" }));
      try {
        const row = await cloudPull();
        if (cancelled) return;
        const cloudNewer = row && new Date(row.updated_at).getTime() > lastChangeRef.current;
        if (cloudNewer) {
          if (row.data && row.data.enc) {
            if (passRef.current) {
              try { adoptCloud(await decryptJSON(row.data, passRef.current)); }
              catch (_) { setCloudLocked(row.data); }
            } else setCloudLocked(row.data);
          } else adoptCloud(row.data);
          setSyncInfo({ status: "synced", at: Date.now(), msg: "" });
        } else {
          await pushNow();      // no cloud row yet, or local is newer
        }
      } catch (e) {
        if (!cancelled) setSyncInfo({ status: "error", at: null, msg: e.message || "Couldn't reach the cloud" });
      }
    })();
    return () => { cancelled = true; };
  }, [user, stateLoaded]);

  // stamp every local edit + debounce a push when signed in
  useEffect(() => {
    if (!state) return;
    if (firstChangeRef.current) { firstChangeRef.current = false; return; }
    lastChangeRef.current = Date.now();
    try { localStorage.setItem("ledger.updatedAt", String(lastChangeRef.current)); } catch (e) {}
    if (!window.syncEnabled || !userRef.current) return;
    if (skipPushRef.current) { skipPushRef.current = false; return; }
    const t = setTimeout(pushNow, 1500);
    return () => clearTimeout(t);
  }, [state]);

  // persist — encrypted when a lock passphrase is set, plain otherwise
  useEffect(() => {
    if (!state) return;
    let cancelled = false;
    const save = async () => {
      try {
        if (passRef.current) {
          const payload = await encryptJSON(state, passRef.current);
          if (!cancelled) localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        } else {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        }
      } catch (e) { /* storage full / crypto error — keep app usable */ }
    };
    const t = setTimeout(save, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [state]);

  // theme on <html>
  useEffect(() => {
    if (state) document.documentElement.setAttribute("data-theme", state.theme);
  }, [state && state.theme]);

  if (boot.mode === "locked" && !state) {
    return <LockScreen payload={boot.payload}
      onUnlock={(s, pass) => { passRef.current = pass; setStateRaw(s); setBoot({ mode: "plain", state: s }); }} />;
  }

  const cur = state.currency;
  const cur2 = state.currency2;
  const rates = state.rates || DEFAULT_RATES;
  const convertCur = (amount, from, to) => convert(amount, from, to, rates);
  const inCur = (amount, fromCur) => convertCur(amount || 0, fromCur || cur, cur);

  const monthData = state.months[month] || { income: [], expenses: [] };

  // ---- derived (all in primary display currency; entries keep native currency) ----
  const totalIncome = round2(monthData.income.reduce((s, e) => s + inCur(e.amount, e.cur) * FREQS[e.freq].factor, 0));
  const totalExpenses = round2(monthData.expenses.reduce((s, e) => s + inCur(e.amount, e.cur), 0));
  const net = round2(totalIncome - totalExpenses);
  const savingsRate = totalIncome > 0 ? Math.round((net / totalIncome) * 100) : 0;

  // holdings → net worth
  const goldPrice = state.goldPrice || DEFAULT_GOLD_PRICE;
  const holdingValue = (h) => h.type === "gold"
    ? convertCur(goldValueUSD(h.grams, h.karat, goldPrice), "USD", cur)
    : inCur(h.amount, h.cur);
  const netWorth = round2((state.holdings || []).reduce((s, h) => s + holdingValue(h), 0));

  // ---- mutation helpers ----
  const patchMonth = (fn) => {
    setState((s) => {
      const curM = s.months[month] || { income: [], expenses: [] };
      return { ...s, months: { ...s.months, [month]: fn(curM) } };
    });
  };

  const setField = (k, v) => setState((s) => ({ ...s, [k]: v }));
  const setCurrency = (c) => setField("currency", c);
  const setCurrency2 = (c) => setField("currency2", c);
  const toggleTheme = () => setField("theme", state.theme === "dark" ? "light" : "dark");

  const addIncome = (e) => patchMonth((m) => ({ ...m, income: [...m.income, { id: uid(), month, ...e }] }));
  const editIncome = (id, patch) => patchMonth((m) => ({ ...m, income: m.income.map((x) => x.id === id ? { ...x, ...patch } : x) }));
  const deleteIncome = (id) => patchMonth((m) => ({ ...m, income: m.income.filter((x) => x.id !== id) }));
  const addExpense = (e) => patchMonth((m) => ({ ...m, expenses: [...m.expenses, { id: uid(), month, ...e }] }));
  const editExpense = (id, patch) => patchMonth((m) => ({ ...m, expenses: m.expenses.map((x) => x.id === id ? { ...x, ...patch } : x) }));
  const deleteExpense = (id) => patchMonth((m) => ({ ...m, expenses: m.expenses.filter((x) => x.id !== id) }));

  const addHolding = (h) => setState((s) => ({ ...s, holdings: [...(s.holdings || []), { id: uid(), ...h }] }));
  const editHolding = (id, patch) => setState((s) => ({ ...s, holdings: s.holdings.map((h) => h.id === id ? { ...h, ...patch } : h) }));
  const deleteHolding = (id) => setState((s) => ({ ...s, holdings: s.holdings.filter((h) => h.id !== id) }));

  const setAllocations = (a) => setField("allocations", a);
  const applyFiftyThirtyTwenty = () => {
    setState((s) => ({
      ...s, budgetMethod: "503020",
      allocations: [
        { id: uid(), name: "Needs", pct: 50, color: "#6366f1" },
        { id: uid(), name: "Wants", pct: 30, color: "#ec4899" },
        { id: uid(), name: "Savings", pct: 20, color: "#10b981" },
      ],
    }));
  };

  const addGoal = (g) => setState((s) => ({ ...s, goals: [...s.goals, { id: uid(), ...g }] }));
  const updateGoal = (id, patch) => setState((s) => ({ ...s, goals: s.goals.map((g) => g.id === id ? { ...g, ...patch } : g) }));
  const deleteGoal = (id) => setState((s) => ({ ...s, goals: s.goals.filter((g) => g.id !== id) }));
  const contributeGoal = (id, amt) => setState((s) => ({ ...s, goals: s.goals.map((g) => g.id === id ? { ...g, saved: round2(g.saved + amt) } : g) }));

  const addCategory = (c) => setState((s) => ({ ...s, categories: [...s.categories, c] }));
  const deleteCategory = (name) => setState((s) => ({ ...s, categories: s.categories.filter((c) => c.name !== name) }));
  const catColor = (name) => (state.categories.find((c) => c.name === name) || {}).color || "#94a3b8";

  const clearMonth = () => setState((s) => { const m = { ...s.months }; delete m[month]; return { ...s, months: m }; });

  // ---- rates & gold ----
  const setRate = (code, val) => setState((s) => ({ ...s, rates: { ...(s.rates || DEFAULT_RATES), [code]: val } }));
  const resetRates = () => setField("rates", { ...DEFAULT_RATES });
  const setGoldPrice = (v) => setField("goldPrice", v);

  // ---- data: export / import / encrypted backup / app lock ----
  const stamp = () => new Date().toISOString().slice(0, 10);
  const exportJSON = () => downloadFile(`ledger-export-${stamp()}.json`, JSON.stringify(state, null, 2));
  const importJSON = (onDone) => pickFile(".json,application/json", (text) => {
    try {
      const parsed = JSON.parse(text);
      if (parsed.enc) { onDone && onDone("That file is an encrypted backup — use “Restore encrypted backup” instead."); return; }
      setState(migrateV1(parsed));
      onDone && onDone(null);
    } catch (e) { onDone && onDone("Couldn't read that file — it doesn't look like a Ledger export."); }
  });
  const exportEncrypted = async (pass) => {
    const payload = await encryptJSON(state, pass);
    downloadFile(`ledger-backup-${stamp()}.ledger.json`, JSON.stringify(payload, null, 2));
  };
  const importEncrypted = (pass, onDone) => pickFile(".json,application/json", async (text) => {
    try {
      const payload = JSON.parse(text);
      if (!payload.enc) { onDone && onDone("That file isn't encrypted — use plain “Import JSON” instead."); return; }
      const s = await decryptJSON(payload, pass);
      setState(migrateV1(s));
      onDone && onDone(null);
    } catch (e) { onDone && onDone("Wrong passphrase or damaged file."); }
  });
  const lockEnabled = !!passRef.current;
  const enableLock = (pass) => { passRef.current = pass; setState((s) => ({ ...s })); };   // trigger encrypted re-save
  const disableLock = () => { passRef.current = null; setState((s) => ({ ...s })); };

  // ---- account actions (no-ops when sync isn't configured) ----
  const signInEmail = (email) => syncSignInEmail(email);
  const signOutCloud = async () => { await syncSignOut(); setSyncInfo({ status: "idle", at: null, msg: "" }); };

  const ctx = {
    state, setState, month, setMonth, tab, go: setTab,
    cur, cur2, theme: state.theme,
    rates, convert: convertCur, inCur, setRate, resetRates,
    goldPrice, setGoldPrice,
    monthData, categories: state.categories, goals: state.goals,
    holdings: state.holdings || [], holdingValue, netWorth,
    addHolding, editHolding, deleteHolding,
    allocations: state.allocations, budgetMethod: state.budgetMethod,
    totalIncome, totalExpenses, net, savingsRate,
    setField, setCurrency, setCurrency2, toggleTheme,
    addIncome, editIncome, deleteIncome, addExpense, editExpense, deleteExpense,
    setAllocations, applyFiftyThirtyTwenty,
    addGoal, updateGoal, deleteGoal, contributeGoal,
    addCategory, deleteCategory, catColor, clearMonth,
    exportJSON, importJSON, exportEncrypted, importEncrypted,
    lockEnabled, enableLock, disableLock,
    user, syncInfo, syncEnabled: !!window.syncEnabled, syncNow: pushNow, signInEmail, signOutCloud,
  };

  const TABS = { overview: OverviewTab, income: IncomeTab, expenses: ExpensesTab, wealth: WealthTab, goals: GoalsTab, analytics: AnalyticsTab, settings: SettingsTab };
  const Active = TABS[tab];

  return (
    <AppCtx.Provider value={ctx}>
      <div className="app">
        <header className="topbar">
          <div className="brand">
            <div className="brand-mark"><span className="serif">₤</span></div>
            <div>
              <div className="brand-name">The <b>Ledger</b></div>
              <div className="brand-sub">personal finance, kept by hand</div>
            </div>
          </div>
          <div className="topbar-spacer" />
          <div className="monthnav">
            <button onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month"><Icon name="chevL" size={18} /></button>
            <div className="mlabel">{monthLabel(month)}<small>{monthYear(month)}</small></div>
            <button onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Next month"><Icon name="chevR" size={18} /></button>
          </div>
          {lockEnabled && <span className="lock-chip" title="App lock is on — data is encrypted at rest"><Icon name="lock" size={14} /></span>}
          <button className="icon-btn" onClick={toggleTheme} aria-label="Toggle theme">
            <Icon name={state.theme === "dark" ? "sun" : "moon"} size={18} />
          </button>
        </header>

        <div className="shell">
          <nav className="sidenav">
            {NAV.map((n) => (
              <button key={n.id} className={`nav-item ${tab === n.id ? "active" : ""}`} onClick={() => setTab(n.id)}>
                <Icon name={n.icon} size={20} />{n.label}
              </button>
            ))}
            <div className="nav-foot">
              <p>Saved privately in this browser.<br />{Object.keys(state.months).length} month{Object.keys(state.months).length === 1 ? "" : "s"} on record.</p>
            </div>
          </nav>

          <main className="content"><Active /></main>
        </div>

        <nav className="tabbar">
          {NAV.map((n) => (
            <button key={n.id} className={tab === n.id ? "active" : ""} onClick={() => setTab(n.id)}>
              <Icon name={n.icon} size={21} />{n.label}
            </button>
          ))}
        </nav>

        {cloudLocked && (
          <CloudUnlockModal payload={cloudLocked}
            onSkip={() => setCloudLocked(null)}
            onUnlock={(s, pass) => {
              passRef.current = pass;          // device adopts the same app lock
              adoptCloud(s);
              setCloudLocked(null);
              setSyncInfo({ status: "synced", at: Date.now(), msg: "" });
            }} />
        )}
      </div>
    </AppCtx.Provider>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
