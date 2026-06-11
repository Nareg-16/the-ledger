/* ============================================================
   tab-analytics.jsx — charts, insight, metric cards
   ============================================================ */
function AnalyticsTab() {
  const app = useApp();
  const { cur, inCur, monthData, totalIncome, totalExpenses, net, savingsRate, goals, allocations, catColor, month } = app;

  const byCat = useMemo(() => {
    const m = {};
    monthData.expenses.forEach((e) => { m[e.cat] = (m[e.cat] || 0) + inCur(e.amount, e.cur); });
    return Object.entries(m).map(([label, value]) => ({ label, value: round2(value), color: catColor(label) })).sort((a, b) => b.value - a.value);
  }, [monthData.expenses, app.rates, cur]);

  const largest = monthData.expenses.reduce((mx, e) => inCur(e.amount, e.cur) > (mx ? inCur(mx.amount, mx.cur) : 0) ? e : mx, null);
  const daysInMonth = new Date(monthYear(month), parseMonthKey(month).getMonth() + 1, 0).getDate();
  const avgDaily = totalExpenses / daysInMonth;
  const activeGoals = goals.filter((g) => g.saved < g.target).length;
  const budgetUsed = totalIncome > 0 ? clamp((totalExpenses / totalIncome) * 100, 0, 999) : 0;

  const ivE = [
    { label: "Income", value: round2(totalIncome), color: "var(--pos)" },
    { label: "Expenses", value: round2(totalExpenses), color: "var(--neg)" },
    { label: "Net", value: round2(Math.max(net, 0)), color: getComputedStyle(document.body).getPropertyValue("--gold").trim() },
  ];
  // resolve css vars to hex for chart fills
  const css = (v) => getComputedStyle(document.body).getPropertyValue(v).trim();
  const ivEResolved = [
    { label: "Income", value: round2(totalIncome), color: css("--pos") },
    { label: "Expenses", value: round2(totalExpenses), color: css("--neg") },
    { label: "Net", value: round2(net), color: css("--gold") },
  ];

  const good = savingsRate >= 20;
  const ok = savingsRate >= 0 && savingsRate < 20;

  const insightText = savingsRate >= 30
    ? "Outstanding. You’re keeping more than a third of your income — that kind of margin builds real freedom. Consider routing the surplus toward a goal."
    : savingsRate >= 20
    ? "Healthy. You’re comfortably above the 20% mark that most planners suggest. Steady as she goes."
    : savingsRate >= 0
    ? "You’re in the black, but the cushion is thin. Look at your top spending category — a small trim there could lift this rate meaningfully."
    : "You’re spending more than you earn this month. Nothing to panic about, but worth reviewing your largest expenses before they compound.";

  const hasData = monthData.expenses.length > 0 || totalIncome > 0;

  return (
    <div className="fade-in">
      <div className="page-head">
        <div>
          <div className="eyebrow">{monthLabel(month)} {monthYear(month)} · Analytics</div>
          <h1>The fuller picture.</h1>
          <p className="lede">How the month breaks down, and what the numbers quietly suggest.</p>
        </div>
      </div>

      {!hasData ? (
        <Card><EmptyState icon="analytics" title="Not enough data yet" sub="Add income and log expenses, and your charts and insights will appear here." /></Card>
      ) : (
        <>
          <div className="grid cols-4" style={{ marginBottom: 18 }}>
            <MiniStat label="Largest expense" icon="arrowUp" value={largest ? fmt(inCur(largest.amount, largest.cur), cur) : "—"} meta={largest ? largest.name : "nothing logged"} />
            <MiniStat label="Avg daily spend" icon="calendar" value={fmt(avgDaily, cur)} meta={`over ${daysInMonth} days`} />
            <MiniStat label="Active goals" icon="target" value={String(activeGoals)} meta={`${goals.length} total`} />
            <MiniStat label="Budget used" icon="flame" value={pct(budgetUsed)} meta="of income spent" accent={budgetUsed > 100 ? "neg" : budgetUsed > 80 ? "gold" : "pos"} />
          </div>

          <div className="grid cols-2">
            <Card>
              <div className="card-head"><h3>Spending by category</h3><span className="sub">{fmt(totalExpenses, cur)} total</span></div>
              {byCat.length ? (
                <div className="donut-legend">
                  <DonutChart data={byCat} total={fmt(totalExpenses, cur, { compact: true })} totalLabel="spent" />
                  <Legend items={byCat} cur={cur} />
                </div>
              ) : <EmptyState icon="expenses" title="No expenses" sub="Log spending to see the split." />}
            </Card>

            <Card>
              <div className="card-head"><h3>Income vs. expenses</h3><span className="sub">this month</span></div>
              <BarChart groups={ivEResolved} />
              <div className="grid cols-3" style={{ marginTop: 14, gap: 10 }}>
                {ivEResolved.map((g) => (
                  <div key={g.label} className="center" style={{ background: "var(--inset)", borderRadius: 12, padding: "10px 8px" }}>
                    <div className="muted" style={{ fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>{g.label}</div>
                    <div className="mono" style={{ fontWeight: 600, fontSize: 15, marginTop: 3, color: g.label === "Net" ? (net >= 0 ? "var(--pos)" : "var(--neg)") : g.color }}>{fmt(g.value, cur)}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className={`insight ${good ? "good" : ok ? "" : "warn"}`} style={{ marginTop: 18, display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
            <div className="center" style={{ minWidth: 120 }}>
              <div className="big-pct" style={{ color: good ? "var(--pos)" : ok ? "var(--gold-deep)" : "var(--neg)" }}>{pct(savingsRate)}</div>
              <div className="muted" style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700, marginTop: 4 }}>savings rate</div>
            </div>
            <div style={{ flex: 1, minWidth: 240 }}>
              <h4>{good ? "You’re keeping a healthy share." : ok ? "A thin but positive margin." : "Spending outpaced income."}</h4>
              <p>{insightText}</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MiniStat({ label, icon, value, meta, accent }) {
  return (
    <div className="stat rise">
      <div className="corner"><Icon name={icon} size={22} /></div>
      <div className="label">{label}</div>
      <div className="value" style={{ fontSize: 26, color: accent === "neg" ? "var(--neg)" : accent === "pos" ? "var(--pos)" : accent === "gold" ? "var(--gold-deep)" : "var(--ink)" }}>{value}</div>
      <div className="meta">{meta}</div>
    </div>
  );
}

Object.assign(window, { AnalyticsTab });
