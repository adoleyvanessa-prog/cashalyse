// ---------- Helpers ----------
function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

function formatGBP(amount) {
  return `£${Math.round(amount).toLocaleString()}`;
}

function clearStatusClasses(el) {
  el.classList.remove("status-ok", "status-warn", "status-bad");
}

function clearBadgeClasses(el) {
  el.classList.remove("badge-ok", "badge-warn", "badge-bad");
}

// ---------- Theme Toggle ----------
const themeToggle = document.getElementById("themeToggle");

function applyTheme(theme) {
  document.body.classList.toggle("dark", theme === "dark");
  themeToggle.textContent = theme === "dark" ? "☀️ Light" : "🌙 Dark";
}

function initTheme() {
  const saved = localStorage.getItem("theme");
  const theme = saved === "dark" ? "dark" : "light";
  applyTheme(theme);
}

themeToggle.addEventListener("click", () => {
  const isDark = document.body.classList.contains("dark");
  const next = isDark ? "light" : "dark";
  localStorage.setItem("theme", next);
  applyTheme(next);
});

initTheme();

// ---------- Elements ----------
const form = document.getElementById("dataForm");
const updateBtn = document.getElementById("updateBtn");
const errorMsg = document.getElementById("errorMsg");

const cashCard = document.getElementById("cashCard");
const burnCard = document.getElementById("burnCard");
const invoiceCard = document.getElementById("invoiceCard");

const cashBadge = document.getElementById("cashBadge");
const burnBadge = document.getElementById("burnBadge");
const invoiceBadge = document.getElementById("invoiceBadge");

const runwayValue = document.getElementById("runwayValue");
const burnValue = document.getElementById("burnValue");
const invoiceValue = document.getElementById("invoiceValue");

const cashNote = document.getElementById("cashNote");
const burnNote = document.getElementById("burnNote");
const invoiceNote = document.getElementById("invoiceNote");

const insightsList = document.getElementById("insightsList");

// ---------- Business Logic ----------
function calculateRunwayMonths(cash, income, expenses) {
  const burn = expenses - income; // positive means losing money each month
  if (burn <= 0) return Infinity; // not burning cash
  return cash / burn;
}

function getCashHealthStatus(runwayMonths) {
  if (runwayMonths === Infinity) return { label: "Healthy", level: "ok" };
  if (runwayMonths >= 6) return { label: "Healthy", level: "ok" };
  if (runwayMonths >= 3) return { label: "Watch", level: "warn" };
  return { label: "Critical", level: "bad" };
}

function getBurnStatus(income, expenses) {
  const diff = income - expenses; // positive = surplus
  if (diff >= 0) return { label: "Surplus", level: "ok", amount: diff };
  return { label: "Deficit", level: "bad", amount: diff };
}

function getInvoiceRisk(overdue) {
  if (overdue <= 0) return { label: "Low", level: "ok" };
  if (overdue <= 2000) return { label: "Medium", level: "warn" };
  return { label: "High", level: "bad" };
}

function setCardStatus(cardEl, badgeEl, statusLevel, badgeText) {
  clearStatusClasses(cardEl);
  clearBadgeClasses(badgeEl);

  if (statusLevel === "ok") {
    cardEl.classList.add("status-ok");
    badgeEl.classList.add("badge-ok");
  } else if (statusLevel === "warn") {
    cardEl.classList.add("status-warn");
    badgeEl.classList.add("badge-warn");
  } else {
    cardEl.classList.add("status-bad");
    badgeEl.classList.add("badge-bad");
  }

  badgeEl.textContent = badgeText;
}

function renderInsights(items) {
  insightsList.innerHTML = "";
  items.slice(0, 4).forEach((text) => {
    const li = document.createElement("li");
    li.textContent = text;
    insightsList.appendChild(li);
  });
}

function validateInputs(data) {
  const values = Object.values(data);
  if (values.some((v) => Number.isNaN(v))) {
    return "Please enter numbers in all fields.";
  }
  if (values.some((v) => v < 0)) {
    return "Values can’t be negative.";
  }
  return "";
}

// ---------- Update Dashboard ----------
function updateDashboard(data) {
  const runway = calculateRunwayMonths(data.cash, data.income, data.expenses);
  const cashStatus = getCashHealthStatus(runway);

  const burnStatus = getBurnStatus(data.income, data.expenses);
  const invoiceRisk = getInvoiceRisk(data.overdue);

  // Cash Card
  const runwayText = runway === Infinity ? "No burn (income covers expenses)" : `${runway.toFixed(1)} months`;
  runwayValue.textContent = `Runway: ${runwayText}`;
  cashNote.textContent =
    runway === Infinity
      ? "You’re not burning cash right now."
      : "This estimates how long cash could last at the current burn rate.";
  setCardStatus(cashCard, cashBadge, cashStatus.level, cashStatus.label);

  // Burn Card
  burnValue.textContent = `Monthly: ${formatGBP(burnStatus.amount)}`;
  burnNote.textContent =
    burnStatus.label === "Surplus"
      ? "Income covers expenses."
      : "Expenses exceed income.";
  setCardStatus(burnCard, burnBadge, burnStatus.level, burnStatus.label);

  // Invoice Card
  invoiceValue.textContent = `Overdue: ${formatGBP(data.overdue)}`;
  invoiceNote.textContent =
    invoiceRisk.label === "Low"
      ? "No overdue invoices recorded."
      : "Overdue invoices may affect cash flow.";
  setCardStatus(invoiceCard, invoiceBadge, invoiceRisk.level, `${invoiceRisk.label} Risk`);

  // Insights
  const insights = [];

  if (runway !== Infinity && runway < 3) insights.push("Cash runway is under 3 months — consider reducing costs or improving revenue quickly.");
  if (runway !== Infinity && runway >= 3 && runway < 6) insights.push("Cash runway is between 3–6 months — monitor closely and plan ahead.");
  if (runway === Infinity) insights.push("You currently have no monthly cash burn (income covers expenses).");

  if (burnStatus.label === "Deficit") insights.push("Expenses are higher than income — review recurring costs and pricing.");
  if (invoiceRisk.label === "High") insights.push("High invoice risk — prioritise chasing overdue payments.");
  if (invoiceRisk.label === "Medium") insights.push("Some invoices are overdue — consider a follow-up reminder.");

  if (insights.length === 0) insights.push("Everything looks stable right now. Keep tracking monthly performance.");

  renderInsights(insights);
}

// ---------- Form Submit ----------
form.addEventListener("submit", (e) => {
  e.preventDefault();

  const data = {
    cash: toNumber(document.getElementById("cash").value),
    income: toNumber(document.getElementById("income").value),
    expenses: toNumber(document.getElementById("expenses").value),
    overdue: toNumber(document.getElementById("overdue").value),
  };

  const err = validateInputs(data);
  if (err) {
    errorMsg.textContent = err;
    errorMsg.classList.remove("hidden");
    return;
  }

  errorMsg.classList.add("hidden");
  updateDashboard(data);
});

  // Validate
  const err = validateInputs(data);
  if (err) {
    errorMsg.textContent = err;
    errorMsg.classList.remove("hidden");
    return;
  }
  errorMsg.classList.add("hidden");

  // Loading state
  loading.classList.remove("hidden");
  updateBtn.disabled = true;
  updateBtn.textContent = "Updating...";

  // Simulate processing
  setTimeout(() => {
    updateDashboard(data);

    loading.classList.add("hidden");
    updateBtn.disabled = false;
    updateBtn.textContent = "Update Dashboard";
  }, 900);