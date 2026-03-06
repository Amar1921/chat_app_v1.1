import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { query, queryOne } from '../models/db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

const DEEPSEEK_API_URL = process.env.DEEPSEEK_API_URL;

// Auto-generate conversation title from first message
async function generateTitle(content, model, apiKey) {
  try {
    const response = await axios.post(
        `${DEEPSEEK_API_URL}/chat/completions`,
        {
          model: model || 'deepseek-chat',
          messages: [
            { role: 'user', content: `Génère un titre court (max 6 mots) pour une conversation qui commence par: "${content.substring(0, 200)}". Réponds UNIQUEMENT avec le titre, sans guillemets.` }
          ],
          max_tokens: 30,
          temperature: 0.3,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
    );
    return response.data.choices[0]?.message?.content?.trim() || 'Nouvelle conversation';
  } catch {
    return 'Nouvelle conversation';
  }
}

// POST /api/chat/:conversationId - send message (streaming)
router.post('/:conversationId', authenticate, async (req, res) => {
  const { conversationId } = req.params;
  const { content, stream = true } = req.body;

  if (!content?.trim()) {
    return res.status(400).json({ error: 'Message vide' });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Clé API DeepSeek non configurée' });
  }

  try {
    // Get conversation
    const conversation = await queryOne(
        'SELECT * FROM conversations WHERE id = ? AND user_id = ?',
        [conversationId, req.user.id]
    );

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation non trouvée' });
    }

    // Get message history
    const history = await query(
        'SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
        [conversationId]
    );

    // Save user message
    const userMsgId = uuidv4();
    await query(
        `INSERT INTO messages (id, conversation_id, user_id, role, content, model, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [userMsgId, conversationId, req.user.id, 'user', content, conversation.model]
    );

    // Build messages array
    const messages = [];
    if (conversation.system_prompt) {
      messages.push({ role: 'system', content: conversation.system_prompt });
    }
    history.forEach(m => messages.push({ role: m.role, content: m.content }));
    messages.push({ role: 'user', content });

    // Auto-title generation for first message
    const isFirstMessage = history.length === 0;

    const startTime = Date.now();

    if (stream) {
      // Configuration correcte des headers SSE
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Désactive le buffering Nginx
      });

      // Fonction utilitaire pour envoyer des événements SSE correctement formatés
      const sendEvent = (data) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      };

      const deepseekResponse = await axios.post(
          `${DEEPSEEK_API_URL}/chat/completions`,
          {
            model: conversation.model || 'deepseek-chat',
            messages,
            max_tokens: conversation.max_tokens || 2048,
            temperature: parseFloat(conversation.temperature) || 0.7,
            top_p: parseFloat(conversation.top_p) || 1.0,
            presence_penalty: parseFloat(conversation.presence_penalty) || 0,
            frequency_penalty: parseFloat(conversation.frequency_penalty) || 0,
            stream: true,
          },
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            responseType: 'stream',
            timeout: 60000,
          }
      );

      let fullContent = '';
      let reasoningContent = '';
      let finishReason = null;
      let promptTokens = 0;
      let completionTokens = 0;

      deepseekResponse.data.on('data', (chunk) => {
        const lines = chunk.toString().split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta;

              if (delta?.content) {
                fullContent += delta.content;
                sendEvent({ type: 'content', content: delta.content });
              }

              if (delta?.reasoning_content) {
                reasoningContent += delta.reasoning_content;
                sendEvent({ type: 'reasoning', content: delta.reasoning_content });
              }

              if (parsed.choices?.[0]?.finish_reason) {
                finishReason = parsed.choices[0].finish_reason;
              }

              if (parsed.usage) {
                promptTokens = parsed.usage.prompt_tokens || 0;
                completionTokens = parsed.usage.completion_tokens || 0;
              }
            } catch (e) {
              console.error('Erreur parsing JSON:', e);
            }
          }
        }
      });

      deepseekResponse.data.on('end', async () => {
        const generationTime = Date.now() - startTime;
        const totalTokens = promptTokens + completionTokens;

        // Save assistant message
        const asstMsgId = uuidv4();
        await query(
            `INSERT INTO messages (
            id, conversation_id, user_id, role, content, reasoning_content, 
            model, tokens_used, prompt_tokens, completion_tokens, finish_reason, 
            generation_time_ms, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
              asstMsgId, conversationId, req.user.id, 'assistant',
              fullContent, reasoningContent || null, conversation.model,
              totalTokens, promptTokens, completionTokens, finishReason, generationTime
            ]
        );

        // Update conversation stats
        await query(
            `UPDATE conversations SET 
            total_messages = total_messages + 2, 
            total_tokens = total_tokens + ?,
            last_message_at = NOW(),
            updated_at = NOW()
           WHERE id = ?`,
            [totalTokens, conversationId]
        );

        // Update user stats
        await query(
            `UPDATE users SET 
            total_messages_sent = total_messages_sent + 2, 
            total_tokens_used = total_tokens_used + ? 
           WHERE id = ?`,
            [totalTokens, req.user.id]
        );

        // Auto-generate title for first message
        let newTitle = null;
        if (isFirstMessage && conversation.title === 'Nouvelle conversation') {
          newTitle = await generateTitle(content, conversation.model, apiKey);
          await query(
              'UPDATE conversations SET title = ? WHERE id = ?',
              [newTitle, conversationId]
          );
        }

        // Envoyer l'événement de fin
        sendEvent({
          type: 'done',
          message_id: asstMsgId,
          user_message_id: userMsgId,
          tokens: {
            prompt: promptTokens,
            completion: completionTokens,
            total: totalTokens
          },
          generation_time_ms: generationTime,
          new_title: newTitle,
          finish_reason: finishReason
        });

        res.end();
      });

      deepseekResponse.data.on('error', (err) => {
        console.error('Erreur stream DeepSeek:', err);
        sendEvent({ type: 'error', error: err.message });
        res.end();
      });

      // Gestion de la fermeture de connexion par le client
      req.on('close', () => {
        deepseekResponse.data.destroy();
      });

    } else {
      // Non-streaming
      const response = await axios.post(
          `${DEEPSEEK_API_URL}/chat/completions`,
          {
            model: conversation.model || 'deepseek-chat',
            messages,
            max_tokens: conversation.max_tokens || 2048,
            temperature: parseFloat(conversation.temperature) || 0.7,
            stream: false,
          },
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            timeout: 60000
          }
      );

      const choice = response.data.choices[0];
      const usage = response.data.usage;
      const totalTokens = usage?.total_tokens || 0;
      const generationTime = Date.now() - startTime;

      const asstMsgId = uuidv4();
      await query(
          `INSERT INTO messages (
          id, conversation_id, user_id, role, content, model, 
          tokens_used, prompt_tokens, completion_tokens, finish_reason, 
          generation_time_ms, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            asstMsgId, conversationId, req.user.id, 'assistant',
            choice.message.content, conversation.model, totalTokens,
            usage?.prompt_tokens, usage?.completion_tokens,
            choice.finish_reason, generationTime
          ]
      );

      res.json({
        message: {
          id: asstMsgId,
          role: 'assistant',
          content: choice.message.content
        },
        usage,
      });
    }
  } catch (err) {
    console.error('Chat error:', err.response?.data || err.message);
    if (stream) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: err.response?.data?.error?.message || err.message })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ error: err.response?.data?.error?.message || 'Erreur DeepSeek API' });
    }
  }
});

// PUT /api/chat/messages/:id/bookmark
router.put('/messages/:id/bookmark', authenticate, async (req, res) => {
  try {
    const msg = await queryOne(
        'SELECT * FROM messages WHERE id = ? AND user_id = ?',
        [req.params.id, req.user.id]
    );

    if (!msg) {
      return res.status(404).json({ error: 'Message non trouvé' });
    }

    const newBookmarkState = !msg.is_bookmarked;
    await query(
        'UPDATE messages SET is_bookmarked = ?, updated_at = NOW() WHERE id = ?',
        [newBookmarkState ? 1 : 0, req.params.id]
    );

    res.json({ is_bookmarked: newBookmarkState });
  } catch (err) {
    console.error('Bookmark error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/chat/messages/:id/reaction
router.put('/messages/:id/reaction', authenticate, async (req, res) => {
  try {
    const { reaction } = req.body;

    await query(
        'UPDATE messages SET reaction = ?, updated_at = NOW() WHERE id = ? AND user_id = ?',
        [reaction || null, req.params.id, req.user.id]
    );

    res.json({ reaction });
  } catch (err) {
    console.error('Reaction error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/chat/bookmarks - get all bookmarked messages
router.get('/bookmarks/all', authenticate, async (req, res) => {
  try {
    const bookmarks = await query(
        `SELECT m.*, c.title as conversation_title 
       FROM messages m 
       JOIN conversations c ON m.conversation_id = c.id
       WHERE m.user_id = ? AND m.is_bookmarked = 1 
       ORDER BY m.created_at DESC`,
        [req.user.id]
    );

    res.json({ bookmarks });
  } catch (err) {
    console.error('Bookmarks fetch error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/chat/messages/:id - supprimer un message
router.delete('/messages/:id', authenticate, async (req, res) => {
  try {
    const msg = await queryOne(
        'SELECT * FROM messages WHERE id = ? AND user_id = ?',
        [req.params.id, req.user.id]
    );

    if (!msg) {
      return res.status(404).json({ error: 'Message non trouvé' });
    }

    // Supprimer le message
    await query(
        'DELETE FROM messages WHERE id = ? AND user_id = ?',
        [req.params.id, req.user.id]
    );

    // Mettre à jour les stats de la conversation
    await query(
        `UPDATE conversations 
       SET total_messages = total_messages - 1 
       WHERE id = ?`,
        [msg.conversation_id]
    );

    res.json({ message: 'Message supprimé' });
  } catch (err) {
    console.error('Delete message error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/chat/search - rechercher dans les messages
router.get('/search', authenticate, async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.json({ messages: [] });
    }

    const messages = await query(
        `SELECT m.*, c.title as conversation_title 
       FROM messages m 
       JOIN conversations c ON m.conversation_id = c.id
       WHERE m.user_id = ? AND m.content LIKE ?
       ORDER BY m.created_at DESC
       LIMIT 50`,
        [req.user.id, `%${q}%`]
    );

    res.json({ messages });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/chat/:conversationId/history - historique paginé
router.get('/:conversationId/history', authenticate, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    // Vérifier que la conversation appartient à l'utilisateur
    const conversation = await queryOne(
        'SELECT id FROM conversations WHERE id = ? AND user_id = ?',
        [conversationId, req.user.id]
    );

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation non trouvée' });
    }

    const [messages] = await Promise.all([
      query(
          `SELECT * FROM messages 
         WHERE conversation_id = ? 
         ORDER BY created_at ASC 
         LIMIT ? OFFSET ?`,
          [conversationId, parseInt(limit), parseInt(offset)]
      ),
      queryOne(
          'SELECT COUNT(*) as total FROM messages WHERE conversation_id = ?',
          [conversationId]
      )
    ]);

    res.json({
      messages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: messages.total || 0
      }
    });
  } catch (err) {
    console.error('History error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;