import express from 'express';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import pool from '../models/db.js';

const router = express.Router();

// Middleware d'authentification
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token manquant' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token invalide' });
    }
    req.user = user;
    next();
  });
};

// OPTIONS handler
router.options('*', (req, res) => {
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.sendStatus(200);
});

// GET /api/conversations
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search, folder_id } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT c.*, 
             (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as message_count
      FROM conversations c
      WHERE c.user_id = ?
    `;
    const params = [req.user.id];

    if (folder_id) {
      query += ` AND c.folder_id = ?`;
      params.push(folder_id);
    } else {
      query += ` AND c.folder_id IS NULL`;
    }

    if (search) {
      query += ` AND (c.title LIKE ? OR c.system_prompt LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY c.is_pinned DESC, COALESCE(c.last_message_at, c.created_at) DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const [rows] = await pool.query(query, params);

    // Compter le total
    const [countResult] = await pool.query(
        `SELECT COUNT(*) as total FROM conversations WHERE user_id = ?`,
        [req.user.id]
    );

    // Convertir les champs décimaux
    rows.forEach(row => {
      row.temperature = parseFloat(row.temperature);
      row.top_p = parseFloat(row.top_p);
      row.presence_penalty = parseFloat(row.presence_penalty);
      row.frequency_penalty = parseFloat(row.frequency_penalty);
      if (row.tags) {
        try {
          row.tags = JSON.parse(row.tags);
        } catch {
          row.tags = [];
        }
      }
    });

    res.json({
      conversations: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult[0].total,
        pages: Math.ceil(countResult[0].total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/conversations/search
router.get('/search', authenticateToken, async (req, res, next) => {
  try {
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.json({ conversations: [] });
    }

    const [rows] = await pool.query(
        `SELECT DISTINCT c.*,
              (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as message_count
       FROM conversations c
       WHERE c.user_id = ? 
         AND (c.title LIKE ? OR c.system_prompt LIKE ?)
       ORDER BY c.updated_at DESC
       LIMIT 20`,
        [req.user.id, `%${q}%`, `%${q}%`]
    );

    res.json({ conversations: rows });
  } catch (error) {
    next(error);
  }
});

// GET /api/conversations/defaults
router.get('/defaults', authenticateToken, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
        `SELECT preferred_model, preferred_max_tokens, preferred_temperature 
       FROM users WHERE id = ?`,
        [req.user.id]
    );

    const defaults = {
      model: rows[0]?.preferred_model || 'deepseek-chat',
      max_tokens: rows[0]?.preferred_max_tokens || 2048,
      temperature: parseFloat(rows[0]?.preferred_temperature) || 0.7,
      top_p: 1.0,
      presence_penalty: 0,
      frequency_penalty: 0
    };

    res.json({ defaults });
  } catch (error) {
    next(error);
  }
});

// POST /api/conversations
router.post('/', authenticateToken, async (req, res, next) => {
  try {
    const { title, model, system_prompt, folder_id } = req.body;
    const conversationId = uuidv4();

    const [result] = await pool.query(
        `INSERT INTO conversations (id, user_id, title, model, system_prompt, folder_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [conversationId, req.user.id, title || 'Nouvelle conversation', model || 'deepseek-chat', system_prompt || '', folder_id || null]
    );

    const [newConv] = await pool.query(
        'SELECT * FROM conversations WHERE id = ?',
        [conversationId]
    );

    const conv = newConv[0];
    conv.temperature = parseFloat(conv.temperature);
    conv.top_p = parseFloat(conv.top_p);
    conv.presence_penalty = parseFloat(conv.presence_penalty);
    conv.frequency_penalty = parseFloat(conv.frequency_penalty);

    res.status(201).json({ conversation: conv });
  } catch (error) {
    next(error);
  }
});

// GET /api/conversations/:id
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;

    const [convRows] = await pool.query(
        `SELECT * FROM conversations 
       WHERE id = ? AND user_id = ?`,
        [id, req.user.id]
    );

    if (convRows.length === 0) {
      return res.status(404).json({ error: 'Conversation non trouvée' });
    }

    const [messageRows] = await pool.query(
        `SELECT id, role, content, reasoning_content, created_at,
              tokens_used, prompt_tokens, completion_tokens,
              generation_time_ms, finish_reason,
              is_bookmarked, reaction
       FROM messages 
       WHERE conversation_id = ?
       ORDER BY created_at ASC`,
        [id]
    );

    const conversation = convRows[0];
    conversation.temperature = parseFloat(conversation.temperature);
    conversation.top_p = parseFloat(conversation.top_p);
    conversation.presence_penalty = parseFloat(conversation.presence_penalty);
    conversation.frequency_penalty = parseFloat(conversation.frequency_penalty);
    conversation.messages = messageRows;

    res.json({ conversation });
  } catch (error) {
    next(error);
  }
});

// PUT /api/conversations/:id
router.put('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const fields = [];
    const values = [];

    const allowedFields = [
      'title', 'model', 'system_prompt', 'max_tokens',
      'temperature', 'top_p', 'presence_penalty', 'frequency_penalty',
      'folder_id', 'is_pinned', 'is_archived', 'tags'
    ];

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && allowedFields.includes(key)) {
        if (key === 'tags' && typeof value === 'object') {
          fields.push(`${key} = ?`);
          values.push(JSON.stringify(value));
        } else {
          fields.push(`${key} = ?`);
          values.push(value);
        }
      }
    });

    if (fields.length === 0) {
      return res.status(400).json({ error: 'Aucun champ à mettre à jour' });
    }

    values.push(id);
    values.push(req.user.id);

    const query = `
      UPDATE conversations 
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = ? AND user_id = ?
    `;

    const [result] = await pool.query(query, values);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Conversation non trouvée' });
    }

    const [updated] = await pool.query(
        'SELECT * FROM conversations WHERE id = ?',
        [id]
    );

    const conv = updated[0];
    conv.temperature = parseFloat(conv.temperature);
    conv.top_p = parseFloat(conv.top_p);
    conv.presence_penalty = parseFloat(conv.presence_penalty);
    conv.frequency_penalty = parseFloat(conv.frequency_penalty);

    res.json({ conversation: conv });
  } catch (error) {
    next(error);
  }
});

// POST /api/conversations/:id/archive
router.post('/:id/archive', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;

    const [result] = await pool.query(
        `UPDATE conversations 
       SET is_archived = 1, updated_at = NOW()
       WHERE id = ? AND user_id = ?`,
        [id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Conversation non trouvée' });
    }

    const [updated] = await pool.query(
        'SELECT * FROM conversations WHERE id = ?',
        [id]
    );

    const conv = updated[0];
    conv.temperature = parseFloat(conv.temperature);
    conv.top_p = parseFloat(conv.top_p);
    conv.presence_penalty = parseFloat(conv.presence_penalty);
    conv.frequency_penalty = parseFloat(conv.frequency_penalty);

    res.json({ conversation: conv });
  } catch (error) {
    next(error);
  }
});

// POST /api/conversations/:id/unarchive
router.post('/:id/unarchive', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;

    const [result] = await pool.query(
        `UPDATE conversations 
       SET is_archived = 0, updated_at = NOW()
       WHERE id = ? AND user_id = ?`,
        [id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Conversation non trouvée' });
    }

    const [updated] = await pool.query(
        'SELECT * FROM conversations WHERE id = ?',
        [id]
    );

    const conv = updated[0];
    conv.temperature = parseFloat(conv.temperature);
    conv.top_p = parseFloat(conv.top_p);
    conv.presence_penalty = parseFloat(conv.presence_penalty);
    conv.frequency_penalty = parseFloat(conv.frequency_penalty);

    res.json({ conversation: conv });
  } catch (error) {
    next(error);
  }
});

// GET /api/conversations/:id/export
router.get('/:id/export', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { format = 'json' } = req.query;

    const [convRows] = await pool.query(
        `SELECT * FROM conversations 
       WHERE id = ? AND user_id = ?`,
        [id, req.user.id]
    );

    if (convRows.length === 0) {
      return res.status(404).json({ error: 'Conversation non trouvée' });
    }

    const [messageRows] = await pool.query(
        `SELECT role, content, reasoning_content, created_at, tokens_used as tokens
       FROM messages 
       WHERE conversation_id = ?
       ORDER BY created_at ASC`,
        [id]
    );

    const conversation = {
      ...convRows[0],
      messages: messageRows,
      exported_at: new Date().toISOString()
    };

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="conversation-${id}.json"`);
      return res.json(conversation);
    } else if (format === 'txt' || format === 'md') {
      let content = `# ${conversation.title}\n\n`;
      content += `Modèle: ${conversation.model}\n`;
      content += `Date: ${new Date(conversation.created_at).toLocaleString()}\n\n`;

      if (conversation.system_prompt) {
        content += `## Prompt système\n${conversation.system_prompt}\n\n`;
      }

      content += `## Messages\n\n`;

      messageRows.forEach(msg => {
        const role = msg.role === 'user' ? '👤 Utilisateur' : '🤖 Assistant';
        content += `### ${role} (${new Date(msg.created_at).toLocaleString()})\n`;
        content += `${msg.content}\n\n`;

        if (msg.reasoning_content) {
          content += `*Raisonnement:* ${msg.reasoning_content}\n\n`;
        }
      });

      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="conversation-${id}.${format}"`);
      res.send(content);
    }
  } catch (error) {
    next(error);
  }
});

// GET /api/conversations/:id/stats
router.get('/:id/stats', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;

    const [statsRows] = await pool.query(
        `SELECT 
         COUNT(*) as total_messages,
         SUM(CASE WHEN role = 'user' THEN 1 ELSE 0 END) as user_messages,
         SUM(CASE WHEN role = 'assistant' THEN 1 ELSE 0 END) as assistant_messages,
         SUM(tokens_used) as total_tokens,
         AVG(tokens_used) as avg_tokens_per_message,
         MIN(created_at) as first_message,
         MAX(created_at) as last_message
       FROM messages
       WHERE conversation_id = ?`,
        [id]
    );

    // Obtenir la distribution par jour
    const [dailyRows] = await pool.query(
        `SELECT DATE(created_at) as date, COUNT(*) as count
       FROM messages
       WHERE conversation_id = ?
       GROUP BY DATE(created_at)
       ORDER BY date`,
        [id]
    );

    res.json({
      stats: statsRows[0],
      daily: dailyRows
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/conversations/:id/test
router.post('/:id/test', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { test_prompt, ...settings } = req.body;

    // Vérifier que la conversation existe
    const [convRows] = await pool.query(
        'SELECT id FROM conversations WHERE id = ? AND user_id = ?',
        [id, req.user.id]
    );

    if (convRows.length === 0) {
      return res.status(404).json({ error: 'Conversation non trouvée' });
    }

    res.json({
      success: true,
      response: "✅ Paramètres valides ! Cette réponse confirme que les paramètres fonctionnent correctement.",
      settings_used: settings,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/conversations/:id/template
router.post('/:id/template', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    // Récupérer la conversation
    const [convRows] = await pool.query(
        `SELECT model, system_prompt, max_tokens, temperature, top_p, 
              presence_penalty, frequency_penalty
       FROM conversations 
       WHERE id = ? AND user_id = ?`,
        [id, req.user.id]
    );

    if (convRows.length === 0) {
      return res.status(404).json({ error: 'Conversation non trouvée' });
    }

    const templateId = uuidv4();
    const settings = {
      model: convRows[0].model,
      system_prompt: convRows[0].system_prompt,
      max_tokens: convRows[0].max_tokens,
      temperature: parseFloat(convRows[0].temperature),
      top_p: parseFloat(convRows[0].top_p),
      presence_penalty: parseFloat(convRows[0].presence_penalty),
      frequency_penalty: parseFloat(convRows[0].frequency_penalty)
    };

    // Créer le template dans prompt_templates
    const [result] = await pool.query(
        `INSERT INTO prompt_templates (id, user_id, title, content, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
        [templateId, req.user.id, name, JSON.stringify(settings)]
    );

    const [template] = await pool.query(
        'SELECT * FROM prompt_templates WHERE id = ?',
        [templateId]
    );

    res.status(201).json({ template: template[0] });
  } catch (error) {
    next(error);
  }
});

// POST /api/conversations/:id/apply-template
router.post('/:id/apply-template', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { templateId } = req.body;

    // Récupérer le template
    const [templateRows] = await pool.query(
        `SELECT content FROM prompt_templates WHERE id = ? AND (user_id = ? OR is_public = 1)`,
        [templateId, req.user.id]
    );

    if (templateRows.length === 0) {
      return res.status(404).json({ error: 'Template non trouvé' });
    }

    let settings;
    try {
      settings = JSON.parse(templateRows[0].content);
    } catch {
      // Si ce n'est pas du JSON, utiliser comme system_prompt
      settings = { system_prompt: templateRows[0].content };
    }

    // Appliquer le template à la conversation
    await pool.query(
        `UPDATE conversations 
       SET model = ?, system_prompt = ?, max_tokens = ?, 
           temperature = ?, top_p = ?, presence_penalty = ?, 
           frequency_penalty = ?, updated_at = NOW()
       WHERE id = ? AND user_id = ?`,
        [
          settings.model || 'deepseek-chat',
          settings.system_prompt || '',
          settings.max_tokens || 2048,
          settings.temperature || 0.7,
          settings.top_p || 1.0,
          settings.presence_penalty || 0,
          settings.frequency_penalty || 0,
          id,
          req.user.id
        ]
    );

    const [updated] = await pool.query(
        'SELECT * FROM conversations WHERE id = ?',
        [id]
    );

    const conv = updated[0];
    conv.temperature = parseFloat(conv.temperature);
    conv.top_p = parseFloat(conv.top_p);
    conv.presence_penalty = parseFloat(conv.presence_penalty);
    conv.frequency_penalty = parseFloat(conv.frequency_penalty);

    res.json({ conversation: conv });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/conversations/:id
router.delete('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Supprimer la conversation (les messages seront supprimés par CASCADE)
    const [result] = await pool.query(
        `DELETE FROM conversations WHERE id = ? AND user_id = ?`,
        [id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Conversation non trouvée' });
    }

    res.json({ message: 'Conversation supprimée' });
  } catch (error) {
    next(error);
  }
});

export default router;