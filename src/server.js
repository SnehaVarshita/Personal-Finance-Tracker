const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const app = express();
const PORT = process.env.PORT || 3000;

// Enhanced Middleware
app.use(helmet()); // Security headers
app.use(compression()); // Compress responses
app.use(cors({
  origin: '*', // Allow all origins (adjust for production)
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type']
}));

// Static files with cache control
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1d',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

app.use(express.json({ limit: '10kb' }));

// Mobile optimization middleware
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect(`https://${req.headers.host}${req.url}`);
  }
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});

// In-memory database
let transactions = [];

// API Routes
app.get('/api/transactions', (req, res) => {
  res.json({
    status: 'success',
    data: transactions,
    timestamp: new Date().toISOString()
  });
});

app.post('/api/transactions', (req, res) => {
  const { amount, description, date, type, category } = req.body;

  // ✅ Fixed parenthesis here
  if (!amount || isNaN(amount)) {
    return res.status(400).json({ 
      status: 'fail',
      message: 'Amount must be a valid number'
    });
  }

  if (amount <= 0) {
    return res.status(400).json({
      status: 'fail',
      message: 'Amount must be positive'
    });
  }

  if (!description?.trim()) {
    return res.status(400).json({
      status: 'fail',
      message: 'Description is required'
    });
  }

  const newTransaction = {
    id: Date.now().toString(),
    amount: parseFloat(amount.toFixed(2)),
    description: description.trim(),
    date: date || new Date().toISOString(),
    type: type === 'income' ? 'income' : 'expense',
    category: ['food', 'transport', 'housing', 'entertainment', 'other'].includes(category)
      ? category
      : 'other'
  };

  transactions.push(newTransaction);

  res.status(201).json({
    status: 'success',
    data: newTransaction
  });
});

app.delete('/api/transactions/:id', (req, res) => {
  const initialLength = transactions.length;
  transactions = transactions.filter(t => t.id !== req.params.id);

  if (transactions.length === initialLength) {
    return res.status(404).json({
      status: 'fail',
      message: 'Transaction not found'
    });
  }

  res.json({
    status: 'success',
    data: null
  });
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'), {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: 'Something went wrong!'
  });
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌍 Access via: http://localhost:${PORT}`);
});
