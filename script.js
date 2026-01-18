// ---------- HELPERS ----------
// Utility functions for common operations used throughout the app

// Convert a value to a number, return NaN if invalid
function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

// Format a number as British pounds (£) with thousand separators
function formatGBP(amount) {
  return `£${Math.round(amount).toLocaleString()}`;
}

// Remove all status color classes from an element
function clearStatusClasses(el) {
  el.classList.remove("status-ok", "status-warn", "status-bad");
}

// Remove all badge color classes from an element
function clearBadgeClasses(el) {
  el.classList.remove("badge-ok", "badge-warn", "badge-bad");
}

// Return emoji icon, styling class, and accessibility label based on health status level
// Used to display smile/meh/frown icons and colors for visual feedback
function getFaceBadge(level) {
  if (level === "ok") {
    return {
      html: `<i class="fa-regular fa-face-smile" aria-hidden="true"></i><span class="sr-only">Good</span>`,
      className: "badge-face-ok",
      aria: "Good",
    };
  }

  if (level === "warn") {
    return {
      html: `<i class="fa-regular fa-face-meh" aria-hidden="true"></i><span class="sr-only">Neutral</span>`,
      className: "badge-face-warn",
      aria: "Neutral",
    };
  }

  return {
    html: `<i class="fa-regular fa-face-frown" aria-hidden="true"></i><span class="sr-only">Poor</span>`,
    className: "badge-face-bad",
    aria: "Poor",
  };
}

// ---------- THEME TOGGLE ----------
// Handle dark/light mode switching and persistence
const themeToggle = document.getElementById("themeToggle");

// Apply a theme (dark or light) to the page and update the toggle button icon
function applyTheme(theme) {
  document.body.classList.toggle("dark", theme === "dark");
  themeToggle.innerHTML =
    theme === "dark"
      ? '<i class="fa-solid fa-sun"></i>'
      : '<i class="fa-solid fa-moon"></i>';
}

// Load saved theme from browser storage, default to light mode
function initTheme() {
  const saved = localStorage.getItem("theme");
  const theme = saved === "dark" ? "dark" : "light";
  applyTheme(theme);
}

// Toggle between light and dark mode when button is clicked
themeToggle.addEventListener("click", () => {
  const isDark = document.body.classList.contains("dark");
  const next = isDark ? "light" : "dark";
  localStorage.setItem("theme", next);
  applyTheme(next);
});

initTheme();

// ---------- DOM ELEMENTS ----------
// Cache references to all HTML elements we'll interact with for better performance

// Form and button elements
const form = document.getElementById("dataForm");
const updateBtn = document.getElementById("updateBtn");
const errorMsg = document.getElementById("errorMsg");

// Card containers (these get colored borders based on status)
const cashCard = document.getElementById("cashCard");
const burnCard = document.getElementById("burnCard");
const invoiceCard = document.getElementById("invoiceCard");

// Badge elements (show status icons and colors)
const cashBadge = document.getElementById("cashBadge");
const burnBadge = document.getElementById("burnBadge");
const invoiceBadge = document.getElementById("invoiceBadge");

// Main metric displays (runway, burn, overdue)
const runwayValue = document.getElementById("runwayValue");
const burnValue = document.getElementById("burnValue");
const invoiceValue = document.getElementById("invoiceValue");

// Descriptive text under each metric
const cashNote = document.getElementById("cashNote");
const burnNote = document.getElementById("burnNote");
const invoiceNote = document.getElementById("invoiceNote");

// List of actionable insights based on financial data
const insightsList = document.getElementById("insightsList");

// ---------- BUSINESS LOGIC ----------
// Core calculations for financial metrics and status determination

// Calculate how many months of runway (cash burn) the company has
// Formula: Cash / Monthly Burn Rate (expenses - income)
function calculateRunwayMonths(cash, income, expenses) {
  const burn = expenses - income; // positive means losing money each month
  if (burn <= 0) return Infinity; // not burning cash
  return cash / burn;
}

// Determine cash health status based on runway months
// Returns a status object with label (for display) and level (for styling: ok/warn/bad)
function getCashHealthStatus(runwayMonths) {
  if (runwayMonths === Infinity) return { label: "Healthy", level: "ok" }; // No burn
  if (runwayMonths >= 6) return { label: "Healthy", level: "ok" }; // 6+ months = safe
  if (runwayMonths >= 3) return { label: "Watch", level: "warn" }; // 3-6 months = warning
  return { label: "Critical", level: "bad" }; // Less than 3 months = critical
}

// Determine monthly burn/surplus status
// Positive = making money (surplus), Negative = losing money (deficit)
function getBurnStatus(income, expenses) {
  const diff = income - expenses; // Positive = surplus, Negative = deficit
  if (diff >= 0) return { label: "Surplus", level: "ok", amount: diff };
  return { label: "Deficit", level: "bad", amount: diff };
}

// Assess risk level based on overdue invoice amount
// Higher overdue amounts = higher risk to cash flow
function getInvoiceRisk(overdue) {
  if (overdue <= 0) return { label: "Low", level: "ok" }; // No overdue invoices
  if (overdue <= 2000) return { label: "Medium", level: "warn" }; // Under £2000
  return { label: "High", level: "bad" }; // £2000+ overdue
}

// Update card and badge styling based on status level
// Applies appropriate CSS classes for colors and adds emoji icons
function setCardStatus(cardEl, badgeEl, statusLevel) {
  // Remove all old status classes
  clearStatusClasses(cardEl);
  clearBadgeClasses(badgeEl);

  // Add appropriate status classes based on level (ok/warn/bad)
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

  // Add emoji icon (smile/meh/frown) and accessibility label
  const face = getFaceBadge(statusLevel);
  badgeEl.classList.remove(
    "badge-face-ok",
    "badge-face-warn",
    "badge-face-bad"
  );
  badgeEl.classList.add(face.className);
  badgeEl.innerHTML = face.html;
  badgeEl.setAttribute("aria-label", face.aria);
}

// Display insights as a list (max 4 items)
// Clears existing list and adds new insight items
function renderInsights(items) {
  insightsList.innerHTML = ""; // Clear old insights
  items.slice(0, 4).forEach((text) => {
    // Show up to 4 insights
    const li = document.createElement("li");
    li.textContent = text;
    insightsList.appendChild(li);
  });
}

// Check that all form inputs are valid numbers and non-negative
// Returns an error message if invalid, empty string if valid
function validateInputs(data) {
  const values = Object.values(data);
  // Check if any value is not a valid number
  if (values.some((v) => Number.isNaN(v))) {
    return "Please enter numbers in all fields.";
  }
  // Check if any value is negative
  if (values.some((v) => v < 0)) {
    return "Values can't be negative.";
  }
  return ""; // Valid
}

// ---------- UPDATE DASHBOARD ----------
// Main function to recalculate all metrics and refresh the UI
function updateDashboard(data) {
  // Calculate all financial metrics
  const runway = calculateRunwayMonths(data.cash, data.income, data.expenses);
  const cashStatus = getCashHealthStatus(runway);

  const burnStatus = getBurnStatus(data.income, data.expenses);
  const invoiceRisk = getInvoiceRisk(data.overdue);

  // --- UPDATE CASH/RUNWAY CARD ---
  // Display runway in months or "no burn" if income covers expenses
  const runwayText =
    runway === Infinity
      ? "No burn (income covers expenses)"
      : `${runway.toFixed(1)} months`;
  runwayValue.textContent = `Runway: ${runwayText}`;
  cashNote.textContent =
    runway === Infinity
      ? "You’re not burning cash right now."
      : "This estimates how long cash could last at the current burn rate.";
  setCardStatus(cashCard, cashBadge, cashStatus.level);

  // --- UPDATE BURN/SURPLUS CARD ---
  // Display monthly income vs expenses
  burnValue.textContent = `Monthly: ${formatGBP(burnStatus.amount)}`;
  burnNote.textContent =
    burnStatus.label === "Surplus"
      ? "Income covers expenses."
      : "Expenses exceed income.";
  setCardStatus(burnCard, burnBadge, burnStatus.level);

  // --- UPDATE INVOICE/OVERDUE CARD ---
  // Display total overdue invoice amount
  invoiceValue.textContent = `Overdue: ${formatGBP(data.overdue)}`;
  invoiceNote.textContent =
    invoiceRisk.label === "Low"
      ? "No overdue invoices recorded."
      : "Overdue invoices may affect cash flow.";
  setCardStatus(invoiceCard, invoiceBadge, invoiceRisk.level);

  // --- GENERATE INSIGHTS ---
  // Build a list of actionable insights based on the calculated metrics
  const insights = [];

  // Runway insights
  if (runway !== Infinity && runway < 3)
    insights.push(
      "Cash runway is under 3 months, consider reducing costs or improving revenue quickly."
    );
  if (runway !== Infinity && runway >= 3 && runway < 6)
    insights.push(
      "Cash runway is between 3–6 months, monitor closely and plan ahead."
    );
  if (runway === Infinity)
    insights.push(
      "You currently have no monthly cash burn (income covers expenses)."
    );

  // Burn/profitability insights
  if (burnStatus.label === "Deficit")
    insights.push(
      "Expenses are higher than income, review recurring costs and pricing."
    );

  // Invoice insights
  if (invoiceRisk.label === "High")
    insights.push("High invoice risk, prioritise chasing overdue payments.");
  if (invoiceRisk.label === "Medium")
    insights.push("Some invoices are overdue, consider a follow-up reminder.");

  // Default insight if everything is OK
  if (insights.length === 0)
    insights.push(
      "Everything looks stable right now. Keep tracking monthly performance."
    );

  renderInsights(insights);
}

// ---------- FORM SUBMISSION ----------
// Handle form submit: gather inputs, validate, and update dashboard
form.addEventListener("submit", (e) => {
  // Prevent page reload
  e.preventDefault();

  // Gather all form input values and convert to numbers
  const data = {
    cash: toNumber(document.getElementById("cash").value),
    income: toNumber(document.getElementById("income").value),
    expenses: toNumber(document.getElementById("expenses").value),
    overdue: toNumber(document.getElementById("overdue").value),
  };

  // Validate all inputs
  const err = validateInputs(data);
  if (err) {
    // Show error message if validation failed
    errorMsg.textContent = err;
    errorMsg.classList.remove("hidden");
    return;
  }

  // Hide error message if validation passed
  errorMsg.classList.add("hidden");

  // Show loading state on button
  updateBtn.textContent = "Updating…";
  updateBtn.disabled = true;

  // Simulate processing delay for better UX
  setTimeout(() => {
    // Update all dashboard metrics and display
    updateDashboard(data);

    // Reset button to normal state
    updateBtn.textContent = "Update Dashboard";
    updateBtn.disabled = false;
  }, 600); // 600ms delay for visual feedback
});
