const express = require('express');
const path = require('path');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// In-memory database
let transactions = [];

// API Routes
app.get('/api/transactions', (req, res) => {
  res.json(transactions);
});

app.post('/api/transactions', (req, res) => {
  const { amount, description, date, type, category } = req.body;
  
  if (!amount || isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }
  
  if (!description || description.trim() === '') {
    return res.status(400).json({ error: 'Description is required' });
  }

  const newTransaction = {
    id: Date.now().toString(),
    amount: parseFloat(amount),
    description: description.trim(),
    date: date || new Date().toISOString(),
    type: type || 'expense',
    category: category || 'other'
  };
  
  transactions.push(newTransaction);
  res.status(201).json(newTransaction);
});

app.delete('/api/transactions/:id', (req, res) => {
  const { id } = req.params;
  transactions = transactions.filter(t => t.id !== id);
  res.json({ success: true });
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
