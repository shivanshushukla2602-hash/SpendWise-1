/**
 * app.js - Orchestrator / Captain
 *
 * Wires together every module:
 * state · calculations · domRenderer · formHandler · ui
 *
 * Responsibilities:
 *  - Boot the app
 *  - Drive refreshUI() after every state change
 *  - Manage filter chips, date range, search, export, budget modal
 */

import { getTransactions, addTransaction, deleteTransaction } from './state.js';
import { updateDashboard, renderTransactionList } from './domRenderer.js';
import { initForm } from './formHandler.js';
import {
    initDarkMode,
    initNav,
    initChart,
    updateChart,
    updateAnalyticsCharts,
    showToast
} from './ui.js';
import { calculateIncome, calculateExpense, calculateBalance } from './calculations.js';

// ─── Filter state ────────────────────────────────────────────────────────────
let searchQuery = '';
let activeFilter = 'all';   // 'all' | 'income' | 'expense'
let dateFrom = '';
let dateTo = '';

// ─── Budget state (persisted in localStorage) ───────────────────────────────
let budgets = JSON.parse(localStorage.getItem('budgets')) || {};

const CATEGORIES = [
    'Salary', 'Food', 'Rent', 'Transport',
    'Shopping', 'Entertainment', 'Health', 'Education', 'Other'
];

// ─── Boot ────────────────────────────────────────────────────────────────────
function init() {
    console.log('SpendWise App Initialized! 🚀');

    initDarkMode();
    initNav();
    initChart();

    // Form: add new transaction
    initForm((newTransaction) => {
        addTransaction(newTransaction);
        showToast('Transaction added successfully!', 'success');
        refreshUI();
    });

    // Search
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.toLowerCase().trim();
            renderFilteredList();
        });
    }

    // Filter chips (All / Income / Expense)
    document.querySelectorAll('.filter-chip').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeFilter = btn.getAttribute('data-filter') || 'all';
            renderFilteredList();
        });
    });

    // Date range filters
    const dateFromEl = document.getElementById('date-from');
    const dateToEl   = document.getElementById('date-to');
    const clearDateBtn = document.getElementById('clear-date-btn');

    if (dateFromEl) dateFromEl.addEventListener('change', (e) => { dateFrom = e.target.value; renderFilteredList(); });
    if (dateToEl)   dateToEl.addEventListener('change', (e) => { dateTo = e.target.value; renderFilteredList(); });
    if (clearDateBtn) {
        clearDateBtn.addEventListener('click', () => {
            dateFrom = '';
            dateTo = '';
            if (dateFromEl) dateFromEl.value = '';
            if (dateToEl)   dateToEl.value = '';
            renderFilteredList();
        });
    }

    // Export CSV
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) exportBtn.addEventListener('click', exportCSV);

    // Budget modal
    initBudgetModal();

    // Reset form button
    const resetBtn = document.getElementById('reset-form-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            document.getElementById('text').value = '';
            document.getElementById('amount').value = '';
            document.getElementById('char-count').textContent = '0';
            document.getElementById('error-message').classList.add('hide');
        });
    }

    // Char counter
    const textInput = document.getElementById('text');
    if (textInput) {
        textInput.addEventListener('input', () => {
            const counter = document.getElementById('char-count');
            if (counter) counter.textContent = textInput.value.length;
        });
    }

    // Header date
    const headerDate = document.getElementById('header-date');
    if (headerDate) {
        headerDate.textContent = new Date().toLocaleDateString('en-IN', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
        });
    }

    // Greeting
    const greetingEl = document.getElementById('user-greeting');
    if (greetingEl) {
        const hour = new Date().getHours();
        greetingEl.textContent =
            hour < 12 ? 'Good Morning' :
            hour < 17 ? 'Good Afternoon' : 'Good Evening';
    }

    // First render
    refreshUI();
}

// ─── Master refresh ───────────────────────────────────────────────────────────
function refreshUI() {
    const transactions = getTransactions();

    // Dashboard cards
    updateDashboard(transactions);

    // Doughnut chart
    const income  = parseFloat(calculateIncome(transactions));
    const expense = parseFloat(calculateExpense(transactions));
    updateChart(income, expense);

    // Analytics charts
    updateAnalyticsCharts(transactions);

    // KPI cards
    updateKPIs(transactions, income, expense);

    // Transaction count badge
    const badge = document.getElementById('transaction-count-badge');
    if (badge) badge.textContent = transactions.length;

    // Donut centre label
    const balance  = parseFloat(calculateBalance(transactions));
    const centerEl = document.getElementById('donut-center-val');
    if (centerEl) {
        centerEl.textContent = income > 0
            ? `${Math.round((balance / income) * 100)}%`
            : '-';
    }

    // Budget bars
    renderBudgetBars(transactions);

    // Transaction list
    renderFilteredList();
}

// ─── KPI cards ────────────────────────────────────────────────────────────────
function updateKPIs(transactions, income, expense) {
    // Savings rate
    const savingsRateEl = document.getElementById('kpi-savings-rate');
    if (savingsRateEl) {
        const rate = income > 0 ? Math.max(0, Math.round(((income - expense) / income) * 100)) : 0;
        savingsRateEl.textContent = `${rate}%`;
    }

    // Transaction count
    const txCountEl = document.getElementById('kpi-tx-count');
    if (txCountEl) txCountEl.textContent = transactions.length;

    // Average daily spend
    const avgEl = document.getElementById('kpi-avg-spend');
    if (avgEl) {
        if (transactions.length === 0) {
            avgEl.textContent = '₹0';
        } else {
            const dates = transactions
                .filter(t => t.amount < 0)
                .map(t => t.date);
            const uniqueDays = new Set(dates).size || 1;
            const avg = expense / uniqueDays;
            avgEl.textContent = `₹${avg.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
        }
    }

    // Top category
    const topCatEl = document.getElementById('kpi-top-category');
    if (topCatEl) {
        const catTotals = {};
        transactions.filter(t => t.amount < 0).forEach(t => {
            const cat = t.category || 'Other';
            catTotals[cat] = (catTotals[cat] || 0) + Math.abs(t.amount);
        });
        const top = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0];
        topCatEl.textContent = top ? top[0] : '-';
    }
}

// ─── Filtered transaction list ────────────────────────────────────────────────
function renderFilteredList() {
    const transactions = getTransactions();

    const filtered = transactions.filter(t => {
        // Text / category search
        const textMatch     = t.text.toLowerCase().includes(searchQuery);
        const categoryMatch = (t.category || '').toLowerCase().includes(searchQuery);
        if (!textMatch && !categoryMatch) return false;

        // Type filter
        if (activeFilter === 'income'  && t.amount < 0) return false;
        if (activeFilter === 'expense' && t.amount > 0) return false;

        // Date range (parse stored date string back to comparable value)
        if (dateFrom || dateTo) {
            const txDate = t.isoDate
                ? new Date(t.isoDate)
                : new Date(t.date);           // best-effort
            if (dateFrom && txDate < new Date(dateFrom)) return false;
            if (dateTo   && txDate > new Date(dateTo + 'T23:59:59')) return false;
        }

        return true;
    });

    // Sort newest first
    const sorted = [...filtered].reverse();

    renderTransactionList(sorted, (idToDelete) => {
        deleteTransaction(idToDelete);
        showToast('Transaction deleted!', 'info');
        refreshUI();
    });
}

// ─── Export CSV ───────────────────────────────────────────────────────────────
function exportCSV() {
    const transactions = getTransactions();
    if (transactions.length === 0) {
        showToast('No transactions to export.', 'error');
        return;
    }

    const headers = ['ID', 'Description', 'Amount', 'Type', 'Category', 'Date'];
    const rows = transactions.map(t => [
        t.id,
        `"${t.text.replace(/"/g, '""')}"`,
        t.amount,
        t.type,
        t.category || 'Other',
        t.date || ''
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `spendwise-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSV exported successfully!', 'success');
}

// ─── Budget modal ─────────────────────────────────────────────────────────────
function initBudgetModal() {
    const setBudgetBtn  = document.getElementById('set-budget-btn');
    const budgetModal   = document.getElementById('budget-modal');
    const cancelBudget  = document.getElementById('cancel-budget-btn');
    const saveBudget    = document.getElementById('save-budget-btn');
    const formGrid      = document.getElementById('budget-form-grid');

    if (!setBudgetBtn || !budgetModal) return;

    setBudgetBtn.addEventListener('click', () => {
        // Populate form inputs for each category
        if (formGrid) {
            formGrid.innerHTML = CATEGORIES.map(cat => `
                <div class="budget-form-row">
                    <label for="budget-${cat}">${cat}</label>
                    <div class="input-wrapper">
                        <span class="input-prefix">₹</span>
                        <input
                            type="number"
                            id="budget-${cat}"
                            min="0"
                            step="1"
                            placeholder="No limit"
                            value="${budgets[cat] !== undefined ? budgets[cat] : ''}"
                        >
                    </div>
                </div>
            `).join('');
        }
        budgetModal.classList.remove('hide');
        budgetModal.classList.add('modal-active');
    });

    const closeModal = () => {
        budgetModal.classList.add('hide');
        budgetModal.classList.remove('modal-active');
    };

    if (cancelBudget) cancelBudget.addEventListener('click', closeModal);

    if (saveBudget) {
        saveBudget.addEventListener('click', () => {
            CATEGORIES.forEach(cat => {
                const input = document.getElementById(`budget-${cat}`);
                if (input && input.value.trim() !== '') {
                    budgets[cat] = parseFloat(input.value);
                } else {
                    delete budgets[cat];
                }
            });
            localStorage.setItem('budgets', JSON.stringify(budgets));
            closeModal();
            showToast('Budgets saved!', 'success');
            renderBudgetBars(getTransactions());
        });
    }
}

// ─── Budget progress bars ─────────────────────────────────────────────────────
function renderBudgetBars(transactions) {
    const container = document.getElementById('budget-bars-container');
    if (!container) return;

    const hasBudgets = Object.keys(budgets).length > 0;
    if (!hasBudgets) {
        container.innerHTML = `
            <div class="empty-analytics">
                <i class="bi bi-pie-chart"></i>
                <p>Set budget limits to track your spending</p>
            </div>
        `;
        return;
    }

    // Calculate category spend
    const catSpend = {};
    transactions.filter(t => t.amount < 0).forEach(t => {
        const cat = t.category || 'Other';
        catSpend[cat] = (catSpend[cat] || 0) + Math.abs(t.amount);
    });

    container.innerHTML = Object.entries(budgets).map(([cat, limit]) => {
        const spent = catSpend[cat] || 0;
        const pct   = Math.min(Math.round((spent / limit) * 100), 100);
        const over  = spent > limit;
        const barClass = over ? 'budget-bar-fill over' : pct >= 75 ? 'budget-bar-fill warn' : 'budget-bar-fill ok';

        return `
            <div class="budget-bar-row">
                <div class="budget-bar-header">
                    <span class="budget-cat-name">${cat}</span>
                    <span class="budget-amounts ${over ? 'text-danger' : ''}">
                        ₹${spent.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        <span class="budget-limit">/ ₹${limit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                    </span>
                </div>
                <div class="budget-bar-track">
                    <div class="${barClass}" style="width:${pct}%"></div>
                </div>
                <span class="budget-pct">${over ? '⚠ Over budget!' : `${pct}% used`}</span>
            </div>
        `;
    }).join('');
}

// Start
init();
