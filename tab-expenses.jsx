/* ============================================================
   tab-expenses.jsx — log, filter, search, sortable table
   ============================================================ */
function ExpensesTab() {
  const app = useApp();
  const { cur, inCur, monthData, categories, totalExpenses, addExpense, editExpense, deleteExpense, catColor, month } = app;

  const today = `${monthYear(month)}-${String(parseMonthKey(month).getMonth() + 1).padStart(2, "0")}-01`;
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [cat, setCat] = useState(categories[0]?.name || "Other");
  const [date, setDate] = useState(today);
  const [note, setNote] = useState("");
  const [entryCur, setEntryCur] = useState(cur);

  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState({ key: "date", dir: "desc" });

  const submit = (e) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!desc.trim() || !(amt > 0)) return;
    addExpense({ name: desc.trim(), amount: round2(amt), cur: entryCur, cat, date, note: note.trim() });
    setDesc(""); setAmount(""); setNote("");
  };

  const rows = useMemo(() => {
    let r = monthData.expenses.slice();
    if (filter !== "all") r = r.filter((e) => e.cat === filter);
    if (q.trim()) { const s = q.toLowerCase(); r = r.filter((e) => e.name.toLowerCase().includes(s) || (e.note || "").toLowerCase().includes(s)); }
    const { key, dir } = sort;
    r.sort((a, b) => {
      let av = a[key], bv = b[key];
      if (key === "amount") { av = inCur(a.amount, a.cur); bv = inCur(b.amount, b.cur); }
      else { av = (av || "").toString().toLowerCase(); bv = (bv || "").toString().toLowerCase(); }
      if (av < bv) return dir === "asc" ? -1 : 1;
      if (av > bv) return dir === "asc" ? 1 : -1;
      return 0;
    });
    return r;
  }, [monthData.expenses, filter, q, sort]);

  const filteredTotal = rows.reduce((s, e) => s + inCur(e.amount, e.cur), 0);
  const toggleSort = (key) => setSort((s) => s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "amount" || key === "date" ? "desc" : "asc" });
  const arrow = (key) => sort.key === key ? <span className="arrow">{sort.dir === "asc" ? "↑" : "↓"}</span> : <span className="arrow">↕</span>;

  return (
    <div className="fade-in">
      <div className="page-head">
        <div>
          <div className="eyebrow">{monthLabel(month)} {monthYear(month)} · Expenses</div>
          <h1>What goes out.</h1>
          <p className="lede">Every coffee, bill, and splurge. Tag each one so your breakdowns stay honest.</p>
        </div>
        <div className="right">
          <div className="muted" style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Spent this month</div>
          <Dual value={totalExpenses} size="lg" tone="var(--neg)" className="right" />
        </div>
      </div>

      <Card style={{ marginBottom: 18 }}>
        <form onSubmit={submit} className="form-row" style={{ gridTemplateColumns: "1.4fr 0.9fr 1fr 1fr auto" }}>
          <Field label="Description"><input className="input" placeholder="e.g. Grocery run" value={desc} onChange={(e) => setDesc(e.target.value)} /></Field>
          <Field label="Amount"><MoneyInputMulti value={amount} onChange={setAmount} entryCur={entryCur} onEntryCur={setEntryCur} /></Field>
          <Field label="Category">
            <SelectBox value={cat} onChange={setCat}>{categories.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}</SelectBox>
          </Field>
          <Field label="Date"><input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="&nbsp;"><Btn variant="primary" icon="plus" type="submit">Add</Btn></Field>
        </form>
        <div style={{ marginTop: 12 }}>
          <Field label="Note (optional)"><input className="input" placeholder="Add a quick memo…" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        </div>
      </Card>

      <Card className="flush">
        <div className="between wrap" style={{ padding: "16px 20px", gap: 12, borderBottom: "1px solid var(--line)" }}>
          <div className="flex gap-12 wrap" style={{ alignItems: "center", flex: 1 }}>
            <div className="searchbox" style={{ minWidth: 200, flex: 1, maxWidth: 320 }}>
              <Icon name="search" size={17} />
              <input className="input" placeholder="Search descriptions & notes…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <div className="select-wrap">
              <select className="select" value={filter} onChange={(e) => setFilter(e.target.value)}>
                <option value="all">All categories</option>
                {categories.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="right">
            <span className="muted" style={{ fontSize: 12.5 }}>{rows.length} shown · </span>
            <span className="mono" style={{ fontWeight: 600 }}>{fmt(filteredTotal, cur)}</span>
          </div>
        </div>

        {rows.length ? (
          <table className="tbl">
            <thead><tr>
              <th className={`sortable ${sort.key === "name" ? "active" : ""}`} onClick={() => toggleSort("name")}>Description {arrow("name")}</th>
              <th className={`sortable ${sort.key === "cat" ? "active" : ""}`} onClick={() => toggleSort("cat")}>Category {arrow("cat")}</th>
              <th className={`sortable ${sort.key === "date" ? "active" : ""}`} onClick={() => toggleSort("date")}>Date {arrow("date")}</th>
              <th className={`sortable right ${sort.key === "amount" ? "active" : ""}`} onClick={() => toggleSort("amount")}>Amount {arrow("amount")}</th>
              <th></th>
            </tr></thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{e.name}</div>
                    {e.note && <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>{e.note}</div>}
                  </td>
                  <td><CatCell cat={e.cat} categories={categories} catColor={catColor} onChange={(c) => editExpense(e.id, { cat: c })} /></td>
                  <td className="soft" style={{ whiteSpace: "nowrap" }}>{new Date(e.date + "T00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</td>
                  <td className="amt"><NativeAmt amount={e.amount} cur={e.cur} /></td>
                  <td><div className="row-actions"><button className="mini-btn" onClick={() => deleteExpense(e.id)} aria-label="Delete"><Icon name="trash" size={16} /></button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : monthData.expenses.length ? (
          <EmptyState icon="search" title="No matches" sub="Try a different search or category filter." />
        ) : (
          <EmptyState icon="expenses" title="No expenses logged" sub="Use the form above to record your first expense of the month." />
        )}
      </Card>
    </div>
  );
}

/* Inline category editor: shows a badge; click to swap to a dropdown and re-tag the expense. */
function CatCell({ cat, categories, catColor, onChange }) {
  const [open, setOpen] = useState(false);
  const color = catColor(cat);
  if (open) {
    return (
      <span className="cat-edit" style={{ ["--cc"]: color }}>
        <span className="dot" style={{ background: color }} />
        <select className="cat-select" autoFocus value={cat}
          onChange={(e) => { onChange(e.target.value); setOpen(false); }}
          onBlur={() => setOpen(false)}>
          {categories.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
        </select>
        <Icon name="chevD" size={13} />
      </span>
    );
  }
  return (
    <button className="cat-badge cat-badge-btn" style={{ background: color + "1f", color }}
      onClick={() => setOpen(true)} title="Change category">
      <span className="dot" style={{ background: color }} />{cat}
      <Icon name="chevD" size={12} style={{ marginLeft: 2, opacity: 0.65 }} />
    </button>
  );
}

Object.assign(window, { ExpensesTab });
