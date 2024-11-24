const express = require('express');
const router = express.Router();
const db = require('../db');

// 获取所有事件
router.get('/', (req, res) => {
  const query = `
    SELECT fe.*, rh.name AS home_name
    FROM fall_events fe
    JOIN retirement_homes rh ON fe.home_id = rh.id
    ORDER BY fe.date DESC, fe.time DESC;
  `;
  db.query(query, (err, results) => {
    if (err) {
      res.status(500).send({ error: 'Failed to fetch fall events' });
    } else {
      res.status(200).json(results);
    }
  });
});

// 获取特定事件
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const query = `
    SELECT fe.*, rh.name AS home_name
    FROM fall_events fe
    JOIN retirement_homes rh ON fe.home_id = rh.id
    WHERE fe.id = ?
  `;
  db.query(query, [id], (err, results) => {
    if (err) {
      res.status(500).send({ error: 'Failed to fetch fall event' });
    } else if (results.length === 0) {
      res.status(404).send({ error: 'Fall event not found' });
    } else {
      res.status(200).json(results[0]);
    }
  });
});

// 添加新事件
router.post('/', (req, res) => {
  const {
    home_id,
    date,
    time,
    day_of_week,
    cause,
    hir,
    home_unit,
    hospital,
    incident_report,
    injury,
    interventions,
    is_intervention_updated,
    location,
    patient_name,
    physician_ref,
    poa_contacted,
    post_fall_notes,
    post_fall_notes_color,
    pt_ref,
  } = req.body;

  const query = `
    INSERT INTO fall_events (
      home_id, date, time, day_of_week, cause, hir, home_unit, hospital, 
      incident_report, injury, interventions, is_intervention_updated, 
      location, patient_name, physician_ref, poa_contacted, 
      post_fall_notes, post_fall_notes_color, pt_ref
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    query,
    [
      home_id,
      date,
      time,
      day_of_week,
      cause,
      hir,
      home_unit,
      hospital,
      incident_report,
      injury,
      interventions,
      is_intervention_updated,
      location,
      patient_name,
      physician_ref,
      poa_contacted,
      post_fall_notes,
      post_fall_notes_color,
      pt_ref,
    ],
    (err, results) => {
      if (err) {
        res.status(500).send({ error: 'Failed to add fall event' });
      } else {
        res.status(201).send({ message: 'Fall event added', id: results.insertId });
      }
    }
  );
});

// 更新事件
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const fields = Object.keys(updates)
    .map((field) => `${field} = ?`)
    .join(', ');
  const values = Object.values(updates);

  values.push(id);

  const query = `UPDATE fall_events SET ${fields} WHERE id = ?`;

  db.query(query, values, (err, results) => {
    if (err) {
      res.status(500).send({ error: 'Failed to update fall event' });
    } else if (results.affectedRows === 0) {
      res.status(404).send({ error: 'Fall event not found' });
    } else {
      res.status(200).send({ message: 'Fall event updated successfully' });
    }
  });
});

// 删除事件
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const query = 'DELETE FROM fall_events WHERE id = ?';
  db.query(query, [id], (err, results) => {
    if (err) {
      res.status(500).send({ error: 'Failed to delete fall event' });
    } else if (results.affectedRows === 0) {
      res.status(404).send({ error: 'Fall event not found' });
    } else {
      res.status(200).send({ message: 'Fall event deleted' });
    }
  });
});

module.exports = router;
