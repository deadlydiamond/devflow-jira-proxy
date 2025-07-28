const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// GET all team members
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT 
        tm.*,
        s.id as squad_id,
        s.name as squad_name,
        s.color as squad_color
      FROM team_members tm
      LEFT JOIN squad_assignments sa ON tm.id = sa.member_id AND sa.is_active = TRUE
      LEFT JOIN squads s ON sa.squad_id = s.id AND s.is_active = TRUE
      WHERE tm.is_active = TRUE
      ORDER BY tm.name
    `);
    
    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching team members:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch team members',
      error: error.message
    });
  }
});

// GET single team member by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.execute(`
      SELECT 
        tm.*,
        s.id as squad_id,
        s.name as squad_name,
        s.color as squad_color
      FROM team_members tm
      LEFT JOIN squad_assignments sa ON tm.id = sa.member_id AND sa.is_active = TRUE
      LEFT JOIN squads s ON sa.squad_id = s.id AND s.is_active = TRUE
      WHERE tm.id = ? AND tm.is_active = TRUE
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Team member not found'
      });
    }

    res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    console.error('Error fetching team member:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch team member',
      error: error.message
    });
  }
});

// POST create new team member
router.post('/', async (req, res) => {
  try {
    const { name, email, role, avatar_url } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Team member name is required'
      });
    }

    const [result] = await pool.execute(`
      INSERT INTO team_members (name, email, role, avatar_url)
      VALUES (?, ?, ?, ?)
    `, [name, email, role, avatar_url]);

    const [newMember] = await pool.execute(`
      SELECT * FROM team_members WHERE id = ?
    `, [result.insertId]);

    res.status(201).json({
      success: true,
      message: 'Team member created successfully',
      data: newMember[0]
    });
  } catch (error) {
    console.error('Error creating team member:', error);
    
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        success: false,
        message: 'A team member with this email already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create team member',
      error: error.message
    });
  }
});

// PUT update team member
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, avatar_url, is_active } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Team member name is required'
      });
    }

    const [result] = await pool.execute(`
      UPDATE team_members 
      SET name = ?, email = ?, role = ?, avatar_url = ?, is_active = ?
      WHERE id = ?
    `, [name, email, role, avatar_url, is_active !== undefined ? is_active : true, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Team member not found'
      });
    }

    const [updatedMember] = await pool.execute(`
      SELECT * FROM team_members WHERE id = ?
    `, [id]);

    res.json({
      success: true,
      message: 'Team member updated successfully',
      data: updatedMember[0]
    });
  } catch (error) {
    console.error('Error updating team member:', error);
    
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        success: false,
        message: 'A team member with this email already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update team member',
      error: error.message
    });
  }
});

// DELETE team member (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.execute(`
      UPDATE team_members SET is_active = FALSE WHERE id = ?
    `, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Team member not found'
      });
    }

    res.json({
      success: true,
      message: 'Team member deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting team member:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete team member',
      error: error.message
    });
  }
});

// POST assign member to squad
router.post('/:id/assign', async (req, res) => {
  try {
    const { id } = req.params;
    const { squad_id } = req.body;

    if (!squad_id) {
      return res.status(400).json({
        success: false,
        message: 'Squad ID is required'
      });
    }

    // Check if member and squad exist
    const [memberCheck] = await pool.execute(`
      SELECT id FROM team_members WHERE id = ? AND is_active = TRUE
    `, [id]);

    const [squadCheck] = await pool.execute(`
      SELECT id FROM squads WHERE id = ? AND is_active = TRUE
    `, [squad_id]);

    if (memberCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Team member not found'
      });
    }

    if (squadCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Squad not found'
      });
    }

    // Remove any existing assignment for this member
    await pool.execute(`
      UPDATE squad_assignments SET is_active = FALSE WHERE member_id = ?
    `, [id]);

    // Create new assignment
    await pool.execute(`
      INSERT INTO squad_assignments (squad_id, member_id)
      VALUES (?, ?)
    `, [squad_id, id]);

    res.json({
      success: true,
      message: 'Member assigned to squad successfully'
    });
  } catch (error) {
    console.error('Error assigning member to squad:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign member to squad',
      error: error.message
    });
  }
});

// DELETE remove member from squad
router.delete('/:id/assign', async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.execute(`
      UPDATE squad_assignments SET is_active = FALSE WHERE member_id = ?
    `, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'No squad assignment found for this member'
      });
    }

    res.json({
      success: true,
      message: 'Member removed from squad successfully'
    });
  } catch (error) {
    console.error('Error removing member from squad:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove member from squad',
      error: error.message
    });
  }
});

module.exports = router; 