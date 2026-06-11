/* ============================================================
   tab-overview.jsx — dashboard
   ============================================================ */
function OverviewTab() {
  const app = useApp();
  const { cur, cur2, inCur, convert, totalIncome, totalExpenses, net, savingsRate, monthData, categories, goals,
          holdings, holdingValue, netWorth, goldPrice, allocations, budgetMethod, catColor, setField } = app;

  const hasData = monthData.income.length > 0 || monthData.expenses.length > 0;

  // expenses grouped by category (converted to display currency)
  const byCat = useMemo(() => {
    const m = {};
    monthData.expenses.forEach((e) => { m[e.cat] = (m[e.cat] || 0) + inCur(e.amount, e.cur); });
    return Object.entries(m).map(([label, value]) => ({ label, value: round2(value), color: catColor(label) }))
      .sort((a, b) => b.value - a.value);
  }, [monthData.expenses, categories, app.rates, cur]);

  // wealth snapshot
  const cash = holdings.filter((h) => h.type !== "gold");
  const gold = holdings.filter((h) => h.type === "gold");
  const cashTotal = round2(cash.reduce((s, h) => s + holdingValue(h), 0));
  const goldTotal = round2(gold.reduce((s, h) => s + holdingValue(h), 0));
  const goldGrams = gold.reduce((s, h) => s + (h.grams || 0), 0);
  const byCurrency = useMemo(() => {
    const m = {};
    cash.forEach((h) => { m[h.cur] = (m[h.cur] || 0) + (h.amount || 0); });
    return Object.entries(m).map(([code, amount]) => ({ code, amount, value: convert(amount, code, cur) }))
      .sort((a, b) => b.value - a.value);
  }, [holdings, cur, app.rates]);

  // allocation donut from income × bucket %
  const allocData = allocations.map((a) => ({ label: a.name, value: round2(totalIncome * a.pct / 100), color: a.color }));
  const allocSum = allocations.reduce((s, a) => s + a.pct, 0);

  const srStatus = savingsRate >= 20 ? "pos" : savingsRate >= 0 ? "gold" : "neg";

  return (
    <div className="fade-in">
      <div className="page-head">
        <div>
          <div className="eyebrow">{monthLabel(app.month)} {monthYear(app.month)} · Overview</div>
          <h1>Good to see you.</h1>
          <p className="lede">A calm summary of where this month stands — income earned, money spent, and what you’re keeping.</p>
        </div>
      </div>

      {/* metric cards — primary currency big, secondary underneath */}
      <div className="grid cols-4" style={{ marginBottom: 18 }}>
        <Stat label="Income" dot="var(--pos)" value={<Dual value={totalIncome} />} meta="monthly equivalent" cls="is-pos" />
        <Stat label="Expenses" dot="var(--neg)" value={<Dual value={totalExpenses} />} meta={`${monthData.expenses.length} entries`} cls="is-neg" />
        <Stat label="Net balance" dot={net >= 0 ? "var(--pos)" : "var(--neg)"} value={<Dual value={net} tone={net >= 0 ? "var(--pos)" : "var(--neg)"} />}
          meta={net >= 0 ? "surplus" : "shortfall"} cls={net >= 0 ? "is-pos" : "is-neg"} />
        <Stat label="Savings rate" dot="var(--gold)" value={pct(savingsRate)} valueCls={srStatus === "neg" ? "neg" : "gold"}
          meta={savingsRate >= 20 ? "healthy" : savingsRate >= 0 ? "building" : "over budget"} cls="is-gold" />
      </div>

      {/* net worth hero — pulls from the Wealth tab */}
      <Card className="networth-hero" style={{ marginBottom: 18 }}>
        <div className="nw-grid">
          <div>
            <div className="card-head" style={{ marginBottom: 6 }}><h3>Net worth</h3><span className="sub">savings + gold, across every currency</span></div>
            <Dual value={netWorth} size="xl" tone="var(--gold-deep)" />
            <div className="flex gap-8 wrap" style={{ marginTop: 14 }}>
              {byCurrency.map((c) => (
                <span key={c.code} className="chip gold mono" title={`≈ ${fmt(c.value, cur)}`}>{fmt(c.amount, c.code)}</span>
              ))}
              {goldGrams > 0 && <span className="chip gold mono" title={`≈ ${fmt(goldTotal, cur)} at $${goldPrice}/g`}>{goldGrams.toLocaleString("en-US")} g gold</span>}
              {!holdings.length && <span className="muted" style={{ fontSize: 13 }}>Nothing recorded yet — add your savings and gold in the Wealth tab.</span>}
            </div>
          </div>
          <div className="right" style={{ alignSelf: "center" }}>
            <Btn variant="ghost" icon="coins" onClick={() => app.go("wealth")}>Manage wealth</Btn>
          </div>
        </div>
      </Card>

      {!hasData && (
        <Card style={{ marginBottom: 18 }}>
          <EmptyState icon="spark" title="Your ledger for this month is blank"
            sub="Add an income source and log a few expenses to watch this dashboard come to life."
            action={<div className="flex gap-12 wrap" style={{ justifyContent: "center" }}>
              <Btn variant="primary" icon="income" onClick={() => app.go("income")}>Add income</Btn>
              <Btn icon="expenses" onClick={() => app.go("expenses")}>Log an expense</Btn>
            </div>} />
        </Card>
      )}

      <div className="grid cols-3">
        {/* allocation donut */}
        <Card>
          <div className="card-head"><h3>Income allocation</h3><span className="sub">where it’s planned to go</span></div>
          {totalIncome > 0 && allocSum > 0 ? (
            <>
              <DonutChart data={allocData} total={fmt(totalIncome, cur, { compact: true })} totalLabel="income" />
              <div style={{ marginTop: 12 }}><Legend items={allocData} cur={cur} /></div>
            </>
          ) : <EmptyState icon="pie" title="No plan yet" sub="Add income and set up allocation buckets to see your split." />}
        </Card>

        {/* top expenses by category */}
        <Card>
          <div className="card-head"><h3>Top spending</h3><span className="sub">by category</span></div>
          {byCat.length ? (
            <div className="stack" style={{ gap: 14, marginTop: 4 }}>
              {byCat.slice(0, 6).map((c) => {
                const share = totalExpenses ? (c.value / totalExpenses) * 100 : 0;
                return (
                  <div key={c.label}>
                    <div className="between" style={{ marginBottom: 6 }}>
                      <Badge name={c.label} color={c.color} />
                      <span className="mono" style={{ fontWeight: 600, fontSize: 14 }}>{fmt(c.value, cur)}</span>
                    </div>
                    <ProgressBar value={share} color={c.color} />
                  </div>
                );
              })}
            </div>
          ) : <EmptyState icon="expenses" title="Nothing logged" sub="Your spending breakdown will appear here." />}
        </Card>

        {/* goals preview */}
        <Card>
          <div className="card-head"><h3>Goals</h3>
            <button className="btn ghost sm" onClick={() => app.go("goals")}>View all</button>
          </div>
          {goals.length ? (
            <div className="stack" style={{ gap: 16, marginTop: 4 }}>
              {goals.slice(0, 3).map((g) => {
                const gcur = g.cur || cur;
                const p = g.target ? clamp((g.saved / g.target) * 100, 0, 100) : 0;
                return (
                  <div key={g.id}>
                    <div className="between" style={{ marginBottom: 6 }}>
                      <span className="goal-name" style={{ fontSize: 15 }}><span className="gdot" style={{ background: g.color }} />{g.name}</span>
                      <span className="mono soft" style={{ fontSize: 13 }}>{pct(p)}</span>
                    </div>
                    <ProgressBar value={p} color={g.color} />
                    <div className="between mono" style={{ fontSize: 12, color: "var(--ink-faint)", marginTop: 5 }}>
                      <span>{fmt(g.saved, gcur)}</span><span>{fmt(g.target, gcur)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <EmptyState icon="target" title="No goals set" sub="Create a savings goal to track your progress."
              action={<Btn variant="primary" size="sm" icon="plus" onClick={() => app.go("goals")}>New goal</Btn>} />}
        </Card>
      </div>

      {/* budget method */}
      <Card style={{ marginTop: 18 }}>
        <div className="card-head"><h3>Budgeting method</h3><span className="sub">how you’d like to think about money</span></div>
        <div className="seg" style={{ marginBottom: 14 }}>
          {Object.entries(BUDGET_METHODS).map(([k, v]) => (
            <button key={k} className={budgetMethod === k ? "on" : ""} onClick={() => setField("budgetMethod", k)}>{v.label}</button>
          ))}
        </div>
        <p className="soft" style={{ fontSize: 14, maxWidth: "62ch" }}>{BUDGET_METHODS[budgetMethod].blurb}</p>
        {budgetMethod === "503020" && (
          <div className="flex gap-12 wrap mt-16">
            {[["Needs", 50, "#6366f1"], ["Wants", 30, "#ec4899"], ["Savings", 20, "#10b981"]].map(([n, p, c]) => (
              <div key={n} className="flex gap-8" style={{ alignItems: "center", background: "var(--inset)", padding: "8px 14px", borderRadius: 10 }}>
                <span className="dot" style={{ width: 9, height: 9, borderRadius: "50%", background: c }} />
                <b>{n}</b><span className="mono soft">{p}%</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function Stat({ label, dot, value, valueCls, meta, cls }) {
  return (
    <div className={`stat accent ${cls || ""} rise`}>
      <div className="label"><span className="dot" style={{ background: dot }} />{label}</div>
      <div className={`value ${valueCls || ""}`}>{value}</div>
      <div className="meta">{meta}</div>
    </div>
  );
}

Object.assign(window, { OverviewTab });
