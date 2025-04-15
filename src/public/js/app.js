// DOM Elements
const addTransactionBtn = document.getElementById('addTransactionBtn');
const modal = document.getElementById('transactionModal');
const closeBtn = document.querySelector('.close');
const transactionForm = document.getElementById('transactionForm');
const transactionsList = document.getElementById('transactionsList');
const expensesChartCtx = document.getElementById('expensesChart').getContext('2d');
const totalBalanceElement = document.getElementById('totalBalance');
const totalIncomeElement = document.getElementById('totalIncome');
const totalExpensesElement = document.getElementById('totalExpenses');

// Chart instance
let expensesChart;

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
  fetchTransactions();
  
  // Event listeners
  addTransactionBtn.addEventListener('click', () => {
    modal.style.display = 'block';
    document.getElementById('date').valueAsDate = new Date();
  });
  
  closeBtn.addEventListener('click', () => {
    modal.style.display = 'none';
  });
  
  window.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  });
  
  transactionForm.addEventListener('submit', handleFormSubmit);
});

// Fetch transactions from server
async function fetchTransactions() {
  try {
    const response = await fetch('/api/transactions');
    const transactions = await response.json();
    renderTransactions(transactions);
    renderChart(transactions);
    updateSummary(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
  }
}

// Update summary cards
function updateSummary(transactions) {
  const summary = transactions.reduce((acc, transaction) => {
    if (transaction.type === 'income') {
      acc.income += transaction.amount;
    } else {
      acc.expenses += transaction.amount;
    }
    return acc;
  }, { income: 0, expenses: 0 });
  
  const balance = summary.income - summary.expenses;
  
  totalBalanceElement.textContent = `₹${balance.toFixed(2)}`;
  totalIncomeElement.textContent = `₹${summary.income.toFixed(2)}`;
  totalExpensesElement.textContent = `₹${summary.expenses.toFixed(2)}`;
}

// Handle form submission
async function handleFormSubmit(e) {
  e.preventDefault();
  
  // Reset errors
  document.getElementById('amountError').textContent = '';
  document.getElementById('descriptionError').textContent = '';
  
  // Get form values
  const amount = parseFloat(document.getElementById('amount').value);
  const description = document.getElementById('description').value.trim();
  const date = document.getElementById('date').value;
  const type = document.querySelector('input[name="transactionType"]:checked').value;
  const category = document.getElementById('category').value;
  
  // Basic validation
  let isValid = true;
  
  if (isNaN(amount) || amount <= 0) {
    document.getElementById('amountError').textContent = 'Please enter a valid positive amount in ₹';
    isValid = false;
  }
  
  if (description === '') {
    document.getElementById('descriptionError').textContent = 'Please enter a description';
    isValid = false;
  }
  
  if (!isValid) return;
  
  // Create transaction object
  const transaction = {
    amount,
    description,
    date,
    type,
    category
  };
  
  try {
    const response = await fetch('/api/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(transaction)
    });
    
    if (response.ok) {
      modal.style.display = 'none';
      transactionForm.reset();
      fetchTransactions();
    }
  } catch (error) {
    console.error('Error adding transaction:', error);
  }
}

// Render transactions list
function renderTransactions(transactions) {
  transactionsList.innerHTML = '';
  
  if (transactions.length === 0) {
    transactionsList.innerHTML = '<p class="empty-state">No transactions yet. Add your first transaction!</p>';
    return;
  }
  
  // Sort by date (newest first)
  const sortedTransactions = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
  
  // Show only last 5 transactions
  const recentTransactions = sortedTransactions.slice(0, 5);
  
  recentTransactions.forEach(transaction => {
    const transactionEl = document.createElement('div');
    transactionEl.className = 'transaction-item';
    
    const date = new Date(transaction.date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
    
    const iconClass = getIconClass(transaction.category);
    const amountClass = transaction.type === 'income' ? 'income' : 'expense';
    const amountPrefix = transaction.type === 'income' ? '+' : '-';
    
    transactionEl.innerHTML = `
      <div class="transaction-details">
        <div class="transaction-icon ${transaction.category}">
          <i class="fas ${iconClass}"></i>
        </div>
        <div class="transaction-info">
          <h4>${transaction.description}</h4>
          <p>${date} • ${transaction.category.charAt(0).toUpperCase() + transaction.category.slice(1)}</p>
        </div>
      </div>
      <div>
        <span class="transaction-amount ${amountClass}">${amountPrefix}₹${transaction.amount.toFixed(2)}</span>
        <button class="delete-btn" data-id="${transaction.id}">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `;
    
    transactionsList.appendChild(transactionEl);
  });
  
  // Add event listeners to delete buttons
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      try {
        await fetch(`/api/transactions/${id}`, {
          method: 'DELETE'
        });
        fetchTransactions();
      } catch (error) {
        console.error('Error deleting transaction:', error);
      }
    });
  });
}

// Get icon class based on category
function getIconClass(category) {
  const icons = {
    food: 'fa-utensils',
    transport: 'fa-car',
    housing: 'fa-home',
    entertainment: 'fa-film',
    other: 'fa-wallet'
  };
  return icons[category] || 'fa-wallet';
}

// Render chart
function renderChart(transactions) {
  // Group by month
  const monthlyData = transactions.reduce((acc, transaction) => {
    const date = new Date(transaction.date);
    const monthYear = date.toLocaleString('default', { month: 'short', year: 'numeric' });
    
    if (!acc[monthYear]) {
      acc[monthYear] = { income: 0, expenses: 0 };
    }
    
    if (transaction.type === 'income') {
      acc[monthYear].income += transaction.amount;
    } else {
      acc[monthYear].expenses += transaction.amount;
    }
    
    return acc;
  }, {});
  
  const labels = Object.keys(monthlyData);
  const incomeData = Object.values(monthlyData).map(item => item.income);
  const expensesData = Object.values(monthlyData).map(item => item.expenses);
  
  // Destroy previous chart if it exists
  if (expensesChart) {
    expensesChart.destroy();
  }
  
  expensesChart = new Chart(expensesChartCtx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Income (₹)',
          data: incomeData,
          backgroundColor: 'rgba(76, 201, 240, 0.7)',
          borderColor: 'rgba(76, 201, 240, 1)',
          borderWidth: 1
        },
        {
          label: 'Expenses (₹)',
          data: expensesData,
          backgroundColor: 'rgba(247, 37, 133, 0.7)',
          borderColor: 'rgba(247, 37, 133, 1)',
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return '₹' + value;
            }
          }
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              label += '₹' + context.raw;
              return label;
            }
          }
        },
        legend: {
          position: 'top',
          labels: {
            usePointStyle: true,
            padding: 20
          }
        }
      },
      animation: {
        duration: 1000,
        easing: 'easeOutQuart'
      }
    }
  });
}
