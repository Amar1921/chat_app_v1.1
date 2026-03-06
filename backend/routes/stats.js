import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne } from '../models/db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// GET /api/stats/dashboard
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    // Totaux généraux
    const [totalConvs] = await query(
        'SELECT COUNT(*) as count FROM conversations WHERE user_id = ? AND is_archived = 0',
        [userId]
    );

    const [totalMsgs] = await query(
        'SELECT COUNT(*) as count FROM messages WHERE user_id = ? AND role = "user"',
        [userId]
    );

    const [totalTokens] = await query(
        'SELECT SUM(tokens_used) as total FROM messages WHERE user_id = ?',
        [userId]
    );

    // Messages par jour (7 derniers jours)
    const msgPerDay = await query(
        `SELECT DATE(created_at) as date, COUNT(*) as count 
       FROM messages 
       WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) AND role = 'user'
       GROUP BY DATE(created_at) 
       ORDER BY date ASC`,
        [userId]
    );

    // Tokens par jour (7 derniers jours)
    const tokensPerDay = await query(
        `SELECT DATE(created_at) as date, SUM(tokens_used) as total
       FROM messages 
       WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
       GROUP BY DATE(created_at) 
       ORDER BY date ASC`,
        [userId]
    );

    // Utilisation des modèles
    const modelUsage = await query(
        `SELECT model, COUNT(*) as count 
       FROM conversations 
       WHERE user_id = ? 
       GROUP BY model`,
        [userId]
    );

    // Temps de réponse moyen
    const [avgTime] = await query(
        `SELECT AVG(generation_time_ms) as avg_ms 
       FROM messages 
       WHERE user_id = ? AND role = 'assistant' AND generation_time_ms IS NOT NULL`,
        [userId]
    );

    // Activité récente
    const recentActivity = await query(
        `SELECT c.title, m.created_at, m.role, LEFT(m.content, 100) as preview
       FROM messages m 
       JOIN conversations c ON m.conversation_id = c.id
       WHERE m.user_id = ? 
       ORDER BY m.created_at DESC 
       LIMIT 5`,
        [userId]
    );

    // Top conversations
    const topConversations = await query(
        `SELECT c.id, c.title, COUNT(m.id) as message_count, SUM(m.tokens_used) as total_tokens
       FROM conversations c
       LEFT JOIN messages m ON c.id = m.conversation_id
       WHERE c.user_id = ? AND c.is_archived = 0
       GROUP BY c.id
       ORDER BY message_count DESC
       LIMIT 5`,
        [userId]
    );

    res.json({
      totals: {
        conversations: totalConvs?.count || 0,
        messages: totalMsgs?.count || 0,
        tokens: totalTokens?.total || 0,
      },
      charts: {
        msgPerDay: msgPerDay || [],
        tokensPerDay: tokensPerDay || []
      },
      modelUsage: modelUsage || [],
      avgResponseTime: Math.round(avgTime?.avg_ms || 0),
      recentActivity: recentActivity || [],
      topConversations: topConversations || []
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/stats/usage - statistiques d'utilisation
router.get('/usage', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = 'week' } = req.query;

    let interval;
    switch(period) {
      case 'day':
        interval = 'INTERVAL 1 DAY';
        break;
      case 'week':
        interval = 'INTERVAL 7 DAY';
        break;
      case 'month':
        interval = 'INTERVAL 30 DAY';
        break;
      default:
        interval = 'INTERVAL 7 DAY';
    }

    const usage = await query(
        `SELECT 
         DATE(created_at) as date,
         COUNT(*) as message_count,
         SUM(CASE WHEN role = 'user' THEN 1 ELSE 0 END) as user_messages,
         SUM(CASE WHEN role = 'assistant' THEN 1 ELSE 0 END) as assistant_messages,
         SUM(tokens_used) as total_tokens
       FROM messages
       WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), ${interval})
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
        [userId]
    );

    res.json({ usage });
  } catch (err) {
    console.error('Usage error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/stats/top-conversations
router.get('/top-conversations', authenticate, async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const conversations = await query(
        `SELECT 
         c.id, c.title, c.model,
         COUNT(m.id) as message_count,
         SUM(m.tokens_used) as total_tokens,
         MAX(m.created_at) as last_message_at
       FROM conversations c
       LEFT JOIN messages m ON c.id = m.conversation_id
       WHERE c.user_id = ? AND c.is_archived = 0
       GROUP BY c.id
       ORDER BY message_count DESC
       LIMIT ?`,
        [req.user.id, parseInt(limit)]
    );

    res.json({ conversations });
  } catch (err) {
    console.error('Top conversations error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/stats/models - statistiques par modèle
router.get('/models', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const modelStats = await query(
        `SELECT 
         c.model,
         COUNT(DISTINCT c.id) as conversation_count,
         COUNT(m.id) as message_count,
         SUM(m.tokens_used) as total_tokens,
         AVG(m.generation_time_ms) as avg_generation_time
       FROM conversations c
       LEFT JOIN messages m ON c.id = m.conversation_id
       WHERE c.user_id = ? AND m.role = 'assistant'
       GROUP BY c.model`,
        [userId]
    );

    res.json({ modelStats });
  } catch (err) {
    console.error('Model stats error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/stats/daily-activity - activité quotidienne
router.get('/daily-activity', authenticate, async (req, res) => {
  try {
    const { days = 30 } = req.query;

    const activity = await query(
        `SELECT 
         DATE(created_at) as date,
         HOUR(created_at) as hour,
         COUNT(*) as message_count
       FROM messages
       WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY DATE(created_at), HOUR(created_at)
       ORDER BY date ASC, hour ASC`,
        [req.user.id, parseInt(days)]
    );

    res.json({ activity });
  } catch (err) {
    console.error('Daily activity error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/stats/tokens - statistiques tokens
router.get('/tokens', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const tokenStats = await query(
        `SELECT 
         DATE(created_at) as date,
         SUM(prompt_tokens) as total_prompt_tokens,
         SUM(completion_tokens) as total_completion_tokens,
         SUM(tokens_used) as total_tokens
       FROM messages
       WHERE user_id = ? AND role = 'assistant'
       GROUP BY DATE(created_at)
       ORDER BY date DESC
       LIMIT 30`,
        [userId]
    );

    res.json({ tokenStats });
  } catch (err) {
    console.error('Token stats error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/stats/prompts - get prompt templates
router.get('/prompts', authenticate, async (req, res) => {
  try {
    const prompts = await query(
        `SELECT * FROM prompt_templates 
       WHERE user_id = ? OR is_public = 1 
       ORDER BY usage_count DESC`,
        [req.user.id]
    );

    res.json({ prompts });
  } catch (err) {
    console.error('Prompts fetch error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/stats/prompts - create prompt template
router.post('/prompts', authenticate, async (req, res) => {
  try {
    const { title, description, content, category, is_public, tags } = req.body;
    const id = uuidv4();

    await query(
        `INSERT INTO prompt_templates 
       (id, user_id, title, description, content, category, is_public, tags, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          id,
          req.user.id,
          title,
          description,
          content,
          category,
          is_public ? 1 : 0,
          tags ? JSON.stringify(tags) : null
        ]
    );

    const prompt = await queryOne(
        'SELECT * FROM prompt_templates WHERE id = ?',
        [id]
    );

    res.status(201).json({ prompt });
  } catch (err) {
    console.error('Create prompt error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/stats/prompts/:id - update prompt template
router.put('/prompts/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, content, category, is_public, tags } = req.body;

    // Vérifier que le prompt appartient à l'utilisateur
    const existing = await queryOne(
        'SELECT id FROM prompt_templates WHERE id = ? AND user_id = ?',
        [id, req.user.id]
    );

    if (!existing) {
      return res.status(404).json({ error: 'Template non trouvé' });
    }

    await query(
        `UPDATE prompt_templates 
       SET title = ?, description = ?, content = ?, category = ?, 
           is_public = ?, tags = ?, updated_at = NOW()
       WHERE id = ?`,
        [
          title,
          description,
          content,
          category,
          is_public ? 1 : 0,
          tags ? JSON.stringify(tags) : null,
          id
        ]
    );

    const prompt = await queryOne(
        'SELECT * FROM prompt_templates WHERE id = ?',
        [id]
    );

    res.json({ prompt });
  } catch (err) {
    console.error('Update prompt error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/stats/prompts/:id - delete prompt template
router.delete('/prompts/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
        'DELETE FROM prompt_templates WHERE id = ? AND user_id = ?',
        [id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Template non trouvé' });
    }

    res.json({ message: 'Template supprimé' });
  } catch (err) {
    console.error('Delete prompt error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/stats/folders
router.get('/folders', authenticate, async (req, res) => {
  try {
    const folders = await query(
        `SELECT f.*, 
         (SELECT COUNT(*) FROM conversations c WHERE c.folder_id = f.id) as conversation_count
       FROM folders f 
       WHERE f.user_id = ? 
       ORDER BY f.position ASC`,
        [req.user.id]
    );

    res.json({ folders });
  } catch (err) {
    console.error('Folders fetch error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/stats/folders
router.post('/folders', authenticate, async (req, res) => {
  try {
    const { name, color, icon } = req.body;
    const id = uuidv4();

    await query(
        'INSERT INTO folders (id, user_id, name, color, icon, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
        [id, req.user.id, name, color || '#6366f1', icon || 'folder']
    );

    const folder = await queryOne(
        'SELECT * FROM folders WHERE id = ?',
        [id]
    );

    res.status(201).json({ folder });
  } catch (err) {
    console.error('Create folder error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/stats/folders/:id
router.put('/folders/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, color, icon, position } = req.body;

    const updates = [];
    const values = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (color !== undefined) {
      updates.push('color = ?');
      values.push(color);
    }
    if (icon !== undefined) {
      updates.push('icon = ?');
      values.push(icon);
    }
    if (position !== undefined) {
      updates.push('position = ?');
      values.push(position);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Aucune modification' });
    }

    values.push(id);
    values.push(req.user.id);

    await query(
        `UPDATE folders SET ${updates.join(', ')}, updated_at = NOW() 
       WHERE id = ? AND user_id = ?`,
        values
    );

    const folder = await queryOne(
        'SELECT * FROM folders WHERE id = ?',
        [id]
    );

    res.json({ folder });
  } catch (err) {
    console.error('Update folder error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/stats/folders/:id
router.delete('/folders/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Mettre à jour les conversations qui étaient dans ce dossier
    await query(
        'UPDATE conversations SET folder_id = NULL WHERE folder_id = ? AND user_id = ?',
        [id, req.user.id]
    );

    // Supprimer le dossier
    const result = await query(
        'DELETE FROM folders WHERE id = ? AND user_id = ?',
        [id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Dossier non trouvé' });
    }

    res.json({ message: 'Dossier supprimé' });
  } catch (err) {
    console.error('Delete folder error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;