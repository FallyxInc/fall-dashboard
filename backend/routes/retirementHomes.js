const express = require('express');
const router = express.Router();
const db = require('../db');

// 获取所有退休院
router.get('/', (req, res) => {
  const { home_id, year, month, page = 1, limit = 10 } = req.query;

  if (!home_id || !year || !month) {
    return res.status(400).send({ error: 'home_id, year, and month are required' });
  }

  const offset = (page - 1) * limit;

  const query = `
      SELECT fe.*, rh.name AS home_name
      FROM fall_events fe
      JOIN retirement_homes rh ON fe.home_id = rh.id
      WHERE fe.home_id = ? AND YEAR(fe.date) = ? AND MONTH(fe.date) = ?
      ORDER BY fe.date ASC, fe.time ASC
      LIMIT ? OFFSET ?;
    `;

  db.query(query, [home_id, year, month, parseInt(limit), parseInt(offset)], (err, results) => {
    if (err) {
      console.error('Error fetching fall events:', err);
      res.status(500).send({ error: 'Failed to fetch fall events' });
    } else {
      res.status(200).json(results);
    }
  });
});

// 获取特定退休院
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const query = 'SELECT * FROM retirement_homes WHERE id = ?';
  db.query(query, [id], (err, results) => {
    if (err) {
      res.status(500).send({ error: 'Failed to fetch data' });
    } else if (results.length === 0) {
      res.status(404).send({ error: 'Retirement home not found' });
    } else {
      res.status(200).json(results[0]);
    }
  });
});

// 添加新退休院
router.post('/', (req, res) => {
  const { name } = req.body;
  console.log('name');
  console.log(name);
  const query = 'INSERT INTO retirement_homes (name) VALUES (?)';
  db.query(query, [name], (err, results) => {
    if (err) {
      res.status(500).send({ error: 'Failed to add data' });
    } else {
      res.status(201).send({ message: 'Retirement home added', id: results.insertId });
    }
  });
});

// 更新退休院信息
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  const query = 'UPDATE retirement_homes SET name = ? WHERE id = ?';
  db.query(query, [name, id], (err, results) => {
    if (err) {
      res.status(500).send({ error: 'Failed to update data' });
    } else if (results.affectedRows === 0) {
      res.status(404).send({ error: 'Retirement home not found' });
    } else {
      res.status(200).send({ message: 'Retirement home updated' });
    }
  });
});

// 删除退休院
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const query = 'DELETE FROM retirement_homes WHERE id = ?';
  db.query(query, [id], (err, results) => {
    if (err) {
      res.status(500).send({ error: 'Failed to delete data' });
    } else if (results.affectedRows === 0) {
      res.status(404).send({ error: 'Retirement home not found' });
    } else {
      res.status(200).send({ message: 'Retirement home deleted' });
    }
  });
});

module.exports = router;
