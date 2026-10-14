const express = require('express');

const app = express();

app.get('/api/users', (req, res) => {
  res.json([]);
});

app.get('/api/users/:id', (req, res) => {
  res.json({});
});

app.post('/api/users', (req, res) => {
  res.status(201).json({});
});

app.delete('/api/users/:id', (req, res) => {
  res.status(204).end();
});

app.get('/api/orders', (req, res) => {
  res.json([]);
});

const apiRouter = express.Router();

apiRouter.get('/api/products/:id', (req, res) => {
  res.json({});
});

app.use('/api', apiRouter);
