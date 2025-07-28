const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// GET all squads
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT 
        s.*,
        COUNT(sa.member_id) as member_count
      FROM squads s
      LEFT JOIN squad_assignments sa ON s.id = sa.squad_id AND sa.is_active = TRUE
      WHERE s.is_active = TRUE
      GROUP BY s.id
      ORDER BY s.created_at DESC
    `);
    
    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching squads:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch squads',
      error: error.message
    });
  }
});

// GET single squad by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.execute(`
      SELECT 
        s.*,
        COUNT(sa.member_id) as member_count
      FROM squads s
      LEFT JOIN squad_assignments sa ON s.id = sa.squad_id AND sa.is_active = TRUE
      WHERE s.id = ? AND s.is_active = TRUE
      GROUP BY s.id
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Squad not found'
      });
    }

    res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    console.error('Error fetching squad:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch squad',
      error: error.message
    });
  }
});

// POST create new squad
router.post('/', async (req, res) => {
  try {
    const { name, description, color } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Squad name is required'
      });
    }

    const [result] = await pool.execute(`
      INSERT INTO squads (name, description, color)
      VALUES (?, ?, ?)
    `, [name, description, color || '#3B82F6']);

    const [newSquad] = await pool.execute(`
      SELECT * FROM squads WHERE id = ?
    `, [result.insertId]);

    res.status(201).json({
      success: true,
      message: 'Squad created successfully',
      data: newSquad[0]
    });
  } catch (error) {
    console.error('Error creating squad:', error);
    
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        success: false,
        message: 'A squad with this name already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create squad',
      error: error.message
    });
  }
});

// PUT update squad
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, color, is_active } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Squad name is required'
      });
    }

    const [result] = await pool.execute(`
      UPDATE squads 
      SET name = ?, description = ?, color = ?, is_active = ?
      WHERE id = ?
    `, [name, description, color, is_active !== undefined ? is_active : true, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Squad not found'
      });
    }

    const [updatedSquad] = await pool.execute(`
      SELECT * FROM squads WHERE id = ?
    `, [id]);

    res.json({
      success: true,
      message: 'Squad updated successfully',
      data: updatedSquad[0]
    });
  } catch (error) {
    console.error('Error updating squad:', error);
    
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        success: false,
        message: 'A squad with this name already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update squad',
      error: error.message
    });
  }
});

// DELETE squad (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.execute(`
      UPDATE squads SET is_active = FALSE WHERE id = ?
    `, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Squad not found'
      });
    }

    res.json({
      success: true,
      message: 'Squad deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting squad:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete squad',
      error: error.message
    });
  }
});

// GET squad members
router.get('/:id/members', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [rows] = await pool.execute(`
      SELECT 
        tm.*,
        sa.assigned_at
      FROM team_members tm
      INNER JOIN squad_assignments sa ON tm.id = sa.member_id
      WHERE sa.squad_id = ? AND sa.is_active = TRUE AND tm.is_active = TRUE
      ORDER BY tm.name
    `, [id]);

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching squad members:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch squad members',
      error: error.message
    });
  }
});

module.exports = router; 