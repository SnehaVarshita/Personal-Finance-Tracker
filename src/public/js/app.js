console.log("Script loaded!");

// Debug DOM elements
console.log("Add Transaction Button:", document.getElementById('addTransactionBtn'));
console.log("Transaction Modal:", document.getElementById('transactionModal'));
console.log("Budget Modal:", document.getElementById('budgetModal'));
// DOM Elements
const addTransactionBtn = document.getElementById('addTransactionBtn');
const modal = document.getElementById('transactionModal');
const closeBtn = document.querySelector('.close');
const transactionForm = document.getElementById('transactionForm');
const transactionsList = document.getElementById('transactionsList');
const expensesChartCtx = document.getElementById('expensesChart').getContext('2d');
const categoryChartCtx = document.getElementById('categoryChart').getContext('2d');
const budgetChartCtx = document.getElementById('budgetChart').getContext('2d');
const totalBalanceElement = document.getElementById('totalBalance');
const totalIncomeElement = document.getElementById('totalIncome');
const totalExpensesElement = document.getElementById('totalExpenses');
const budgetForm = document.getElementById('budgetForm');
const budgetModal = document.getElementById('budgetModal');
const closeBudgetBtn = document.querySelector('.close-budget');
const editBudgetBtn = document.getElementById('editBudgetBtn');

// Chart instances
let expensesChart;
let categoryChart;
let budgetChart;

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
  fetchData();
  
  // Event listeners
  addTransactionBtn.addEventListener('click', () => {
    modal.style.display = 'block';
    document.getElementById('date').valueAsDate = new Date();
  });
  
  editBudgetBtn.addEventListener('click', () => {
    budgetModal.style.display = 'block';
    populateBudgetForm();
  });
  
  closeBtn.addEventListener('click', () => {
    modal.style.display = 'none';
  });
  
  closeBudgetBtn.addEventListener('click', () => {
    budgetModal.style.display = 'none';
  });
  
  window.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.style.display = 'none';
    }
    if (e.target === budgetModal) {
      budgetModal.style.display = 'none';
    }
  });
  
  transactionForm.addEventListener('submit', handleFormSubmit);
  budgetForm.addEventListener('submit', handleBudgetSubmit);
});

// Fetch all data
async function fetchData() {
  try {
    const [transactions, budgets] = await Promise.all([
      fetch('/api/transactions').then(res => res.json()),
      fetch('/api/budgets').then(res => res.json())
    ]);
    
    renderTransactions(transactions);
    renderCharts(transactions, budgets);
    updateSummary(transactions);
  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

// Update summary cards
function updateSummary(transactions) {
  const summary = transactions.reduce((acc, transaction) => {
    if (transaction.type === 'income') {
      acc.income += transaction.amount;
    } else {
      acc.expenses += transaction.amount;
      acc.categories[transaction.category] = (acc.categories[transaction.category] || 0) + transaction.amount;
    }
    return acc;
  }, { income: 0, expenses: 0, categories: {} });
  
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
      fetchData();
    }
  } catch (error) {
    console.error('Error adding transaction:', error);
  }
}

// Handle budget form submission
async function handleBudgetSubmit(e) {
  e.preventDefault();
  
  const formData = new FormData(budgetForm);
  const newBudgets = {
    food: parseFloat(formData.get('food')),
    transport: parseFloat(formData.get('transport')),
    housing: parseFloat(formData.get('housing')),
    entertainment: parseFloat(formData.get('entertainment')),
    other: parseFloat(formData.get('other'))
  };
  
  try {
    const response = await fetch('/api/budgets', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newBudgets)
    });
    
    if (response.ok) {
      budgetModal.style.display = 'none';
      fetchData();
    }
  } catch (error) {
    console.error('Error updating budgets:', error);
  }
}

// Populate budget form with current values
async function populateBudgetForm() {
  try {
    const response = await fetch('/api/budgets');
    const budgets = await response.json();
    
    document.getElementById('foodBudget').value = budgets.food;
    document.getElementById('transportBudget').value = budgets.transport;
    document.getElementById('housingBudget').value = budgets.housing;
    document.getElementById('entertainmentBudget').value = budgets.entertainment;
    document.getElementById('otherBudget').value = budgets.other;
  } catch (error) {
    console.error('Error fetching budgets:', error);
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
        fetchData();
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

// Render all charts
function renderCharts(transactions, budgets) {
  renderExpensesChart(transactions);
  renderCategoryChart(transactions);
  renderBudgetChart(transactions, budgets);
}

// Render expenses chart
function renderExpensesChart(transactions) {
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

// Render category pie chart
function renderCategoryChart(transactions) {
  const categoryData = transactions.reduce((acc, transaction) => {
    if (transaction.type === 'expense') {
      acc[transaction.category] = (acc[transaction.category] || 0) + transaction.amount;
    }
    return acc;
  }, {});
  
  const labels = Object.keys(categoryData);
  const data = Object.values(categoryData);
  
  const backgroundColors = [
    'rgba(255, 159, 64, 0.7)',  // food
    'rgba(46, 196, 182, 0.7)', // transport
    'rgba(231, 29, 54, 0.7)',  // housing
    'rgba(102, 46, 155, 0.7)', // entertainment
    'rgba(80, 81, 79, 0.7)'    // other
  ];
  
  if (categoryChart) {
    categoryChart.destroy();
  }
  
  categoryChart = new Chart(categoryChartCtx, {
    type: 'pie',
    data: {
      labels: labels.map(label => label.charAt(0).toUpperCase() + label.slice(1)),
      datasets: [{
        data: data,
        backgroundColor: backgroundColors,
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.raw || 0;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = Math.round((value / total) * 100);
              return `${label}: ₹${value.toFixed(2)} (${percentage}%)`;
            }
          }
        },
        legend: {
          position: 'right',
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

// Render budget vs actual chart
function renderBudgetChart(transactions, budgets) {
  const categorySpending = transactions.reduce((acc, transaction) => {
    if (transaction.type === 'expense') {
      acc[transaction.category] = (acc[transaction.category] || 0) + transaction.amount;
    }
    return acc;
  }, {});
  
  const categories = Object.keys(budgets);
  const budgetData = categories.map(cat => budgets[cat]);
  const actualData = categories.map(cat => categorySpending[cat] || 0);
  
  if (budgetChart) {
    budgetChart.destroy();
  }
  
  budgetChart = new Chart(budgetChartCtx, {
    type: 'bar',
    data: {
      labels: categories.map(label => label.charAt(0).toUpperCase() + label.slice(1)),
      datasets: [
        {
          label: 'Budget',
          data: budgetData,
          backgroundColor: 'rgba(54, 162, 235, 0.7)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1
        },
        {
          label: 'Actual',
          data: actualData,
          backgroundColor: 'rgba(255, 99, 132, 0.7)',
          borderColor: 'rgba(255, 99, 132, 1)',
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
