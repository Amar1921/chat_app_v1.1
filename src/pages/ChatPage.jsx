import React,{ useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, TextField, IconButton, Typography, Paper, Chip,
  Tooltip, LinearProgress
} from '@mui/material';
import {
  Stop, Tune, Psychology, Lightbulb, ArrowUpward
} from '@mui/icons-material';
import { conversationsAPI, chatAPI, statsAPI } from '../utils/api';
import Message from '../components/Message';
import SettingsPanel from '../components/SettingsPanel';
import { useSnackbar } from 'notistack';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '@mui/material/styles';

const SUGGESTIONS = [
  { icon: '🧠', text: 'Explique-moi un concept complexe' },
  { icon: '💻', text: 'Aide-moi à déboguer ce code' },
  { icon: '✍️', text: 'Rédige un email professionnel' },
  { icon: '📊', text: 'Analyse ces données et donne des insights' },
  { icon: '🎨', text: 'Génère des idées créatives pour...' },
  { icon: '🔍', text: 'Recherche et résume les meilleures pratiques de...' },
];

export default function ChatPage({ conversationId, onConversationUpdate }) {
  const [conversation, setConversation]   = useState(null);
  const [messages, setMessages]           = useState([]);
  const [input, setInput]                 = useState('');
  const [streaming, setStreaming]         = useState(false);
  const [loading, setLoading]             = useState(false);
  const [showSettings, setShowSettings]   = useState(false);
  const [prompts, setPrompts]             = useState([]);

  const streamingMsgIdRef  = useRef(null);
  const messagesEndRef     = useRef(null);
  const inputRef           = useRef(null);
  const abortControllerRef = useRef(null);

  const { user, updateUser } = useAuth();
  const { enqueueSnackbar }  = useSnackbar();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // ── Load conversation ────────────────────────────────────────────────────
  useEffect(() => {
    if (!conversationId) {
      setConversation(null);
      setMessages([]);
      return;
    }
    setLoading(true);
    conversationsAPI.get(conversationId)
        .then(res => {
          const conv = res.data.conversation;
          setConversation(conv);
          setMessages(Array.isArray(conv?.messages) ? conv.messages : []);
        })
        .catch(() => enqueueSnackbar('Erreur de chargement', { variant: 'error' }))
        .finally(() => setLoading(false));
  }, [conversationId]);

  useEffect(() => {
    return () => { abortControllerRef.current?.abort(); };
  }, []);

  useEffect(() => {
    statsAPI.getPrompts().then(res => setPrompts(res.data.prompts)).catch(() => {});
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // ── Stop streaming ───────────────────────────────────────────────────────
  const stopStreaming = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    const streamId = streamingMsgIdRef.current;
    streamingMsgIdRef.current = null;
    setStreaming(false);
    setMessages(prev =>
        prev.map(m => m.id === streamId ? { ...m, interrupted: true } : m)
    );
  }, []);

  // ── Send message ─────────────────────────────────────────────────────────
  const sendMessage = useCallback(async () => {
    if (!input.trim() || streaming || !conversationId) return;

    const content = input.trim();
    setInput('');
    setStreaming(true);

    const tempId   = `temp-${Date.now()}`;
    const streamId = `stream-${Date.now()}`;
    streamingMsgIdRef.current = streamId;

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setMessages(prev => [
      ...prev,
      { id: tempId,   role: 'user',      content,  created_at: new Date().toISOString() },
      { id: streamId, role: 'assistant', content: '', created_at: new Date().toISOString() },
    ]);

    try {
      await chatAPI.sendStream(
          conversationId, content, controller.signal,

          (chunk) => {
            setMessages(prev =>
                prev.map(m => m.id === streamId ? { ...m, content: m.content + chunk } : m)
            );
          },

          (reasoning) => {
            setMessages(prev =>
                prev.map(m =>
                    m.id === streamId
                        ? { ...m, reasoning_content: (m.reasoning_content || '') + reasoning }
                        : m
                )
            );
          },

          (done) => {
            abortControllerRef.current = null;
            streamingMsgIdRef.current  = null;
            setStreaming(false);
            setMessages(prev =>
                prev.map(m => {
                  if (m.id === tempId)   return { ...m, id: done.user_message_id };
                  if (m.id === streamId) return {
                    ...m,
                    id:                 done.message_id,
                    tokens_used:        done.tokens?.total || 0,
                    prompt_tokens:      done.tokens?.prompt || 0,
                    completion_tokens:  done.tokens?.completion || 0,
                    generation_time_ms: done.generation_time_ms,
                    finish_reason:      done.finish_reason,
                  };
                  return m;
                })
            );
            if (done.new_title) {
              setConversation(prev => ({ ...prev, title: done.new_title }));
              onConversationUpdate?.(conversationId, { title: done.new_title });
            }
            updateUser({ total_tokens_used: (user?.total_tokens_used || 0) + (done.tokens?.total || 0) });
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
          },

          (error) => {
            if (error === 'AbortError' || String(error).toLowerCase().includes('abort')) return;
            abortControllerRef.current = null;
            streamingMsgIdRef.current  = null;
            setStreaming(false);
            setMessages(prev => prev.filter(m => m.id !== streamId));
            enqueueSnackbar(`Erreur: ${error}`, { variant: 'error' });
          }
      );
    } catch (err) {
      if (err.name === 'AbortError') return;
      abortControllerRef.current = null;
      streamingMsgIdRef.current  = null;
      setStreaming(false);
      setMessages(prev => prev.filter(m => m.id !== streamId));
      enqueueSnackbar('Erreur de connexion', { variant: 'error' });
    }
  }, [input, streaming, conversationId]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  // ── Empty state ──────────────────────────────────────────────────────────
  if (!conversationId) {
    return (
        <Box sx={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          bgcolor: 'background.default',
          background: isDark
              ? 'radial-gradient(ellipse at 50% 50%, rgba(124,58,237,0.08) 0%, transparent 60%)'
              : 'radial-gradient(ellipse at 50% 50%, rgba(124,58,237,0.05) 0%, transparent 60%)',
          p: 4,
        }}>
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Box sx={{
              display: 'inline-flex', width: 80, height: 80, borderRadius: 4,
              background: 'linear-gradient(135deg, #7C3AED 0%, #06B6D4 100%)',
              alignItems: 'center', justifyContent: 'center', mb: 3,
              boxShadow: '0 20px 60px rgba(124,58,237,0.4)',
            }}>
              <Psychology sx={{ fontSize: 44, color: 'white' }} />
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary', mb: 1 }}>
              Comment puis-je vous aider ?
            </Typography>
            <Typography sx={{ color: 'text.secondary' }}>
              Sélectionnez une conversation ou créez-en une nouvelle
            </Typography>
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5, maxWidth: 600 }}>
            {SUGGESTIONS.map((s, i) => (
                <Paper key={i} sx={{
                  p: 2, cursor: 'pointer', borderRadius: 2,
                  '&:hover': { borderColor: 'primary.main', bgcolor: 'rgba(124,58,237,0.05)' },
                  transition: 'all 0.2s',
                }}>
                  <Typography sx={{ mb: 0.5 }}>{s.icon}</Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.82rem' }}>{s.text}</Typography>
                </Paper>
            ))}
          </Box>
        </Box>
    );
  }

  // ── Main chat UI ─────────────────────────────────────────────────────────
  return (
      <Box sx={{
        flex: 1, display: 'flex', flexDirection: 'column',
        height: '100vh', overflow: 'hidden',
        bgcolor: 'background.default',
      }}>

        {/* Header */}
        <Box sx={{
          px: 3, py: 1.5,
          borderBottom: '1px solid', borderColor: 'divider',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          bgcolor: 'background.paper',
          zIndex: 10,
        }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h6" noWrap sx={{ fontWeight: 600, color: 'text.primary', fontSize: '0.95rem' }}>
              {conversation?.title || 'Chargement...'}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Chip
                  label={conversation?.model || 'deepseek-chat'}
                  size="small"
                  sx={{ height: 18, fontSize: '0.65rem', bgcolor: 'rgba(124,58,237,0.15)', color: '#9D5FFF' }}
              />
              <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                {messages.filter(m => m.role === 'user').length} messages
              </Typography>
            </Box>
          </Box>
          <Tooltip title="Paramètres de la conversation">
            <IconButton onClick={() => setShowSettings(true)} sx={{ color: 'text.secondary' }}>
              <Tune />
            </IconButton>
          </Tooltip>
        </Box>

        {loading && (
            <LinearProgress sx={{ bgcolor: 'transparent', '& .MuiLinearProgress-bar': { bgcolor: 'primary.main' } }} />
        )}

        {/* Messages list */}
        <Box sx={{
          flex: 1, overflowY: 'auto', py: 3,
          '&::-webkit-scrollbar': { width: 6 },
          '&::-webkit-scrollbar-thumb': { backgroundColor: 'divider', borderRadius: 3 },
        }}>
          {messages.length === 0 && !loading && (
              <Box sx={{ textAlign: 'center', pt: 8, px: 4 }}>
                <Lightbulb sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                <Typography sx={{ color: 'text.secondary' }}>Démarrez la conversation !</Typography>
                {conversation?.system_prompt && (
                    <Chip
                        label="Prompt système actif"
                        icon={<Psychology sx={{ fontSize: 14 }} />}
                        size="small"
                        sx={{ mt: 2, bgcolor: 'rgba(245,158,11,0.1)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.2)' }}
                    />
                )}
              </Box>
          )}

          {messages.map(msg => (
              <div key={msg.id} className="message-wrapper">
                <Message
                    message={msg}
                    isStreaming={streaming && msg.id === streamingMsgIdRef.current}
                />
              </div>
          ))}

          <div ref={messagesEndRef} />
        </Box>

        {/* Quick prompt templates */}
        {messages.length === 0 && prompts.length > 0 && (
            <Box sx={{ px: 3, pb: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="caption" sx={{ color: 'text.disabled', width: '100%' }}>💡 Templates :</Typography>
              {prompts.slice(0, 3).map(p => (
                  <Chip key={p.id} label={p.title} size="small" clickable
                        onClick={() => {
                          if (conversation) conversationsAPI.update(conversation.id, { system_prompt: p.content });
                          enqueueSnackbar(`Prompt "${p.title}" appliqué`, { variant: 'info' });
                        }}
                        sx={{ bgcolor: 'rgba(124,58,237,0.1)', color: '#9D5FFF', border: '1px solid rgba(124,58,237,0.2)' }}
                  />
              ))}
            </Box>
        )}

        {/* Input bar */}
        <Box sx={{
          p: 2.5,
          borderTop: '1px solid', borderColor: 'divider',
          bgcolor: 'background.paper',
        }}>
          <Paper sx={{
            display: 'flex', alignItems: 'flex-end', gap: 1, p: 1.5, borderRadius: 3,
            border: streaming ? '1px solid rgba(124,58,237,0.5)' : '1px solid',
            borderColor: streaming ? 'rgba(124,58,237,0.5)' : 'divider',
            boxShadow: streaming ? '0 0 20px rgba(124,58,237,0.15)' : 'none',
            transition: 'border 0.3s, box-shadow 0.3s',
            bgcolor: 'background.paper',
          }}>
            <TextField
                inputRef={inputRef}
                multiline maxRows={8} fullWidth
                placeholder={streaming ? 'Génération en cours...' : 'Écrivez votre message... (Entrée pour envoyer)'}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={streaming}
                variant="standard"
                InputProps={{
                  disableUnderline: true,
                  sx: {
                    fontSize: '0.9rem', px: 1,
                    color: 'text.primary',
                    '& ::placeholder': { color: 'text.disabled' },
                  },
                }}
            />
            <Box sx={{ flexShrink: 0 }}>
              {streaming ? (
                  <Tooltip title="Arrêter la génération">
                    <IconButton
                        size="small"
                        onClick={stopStreaming}
                        sx={{
                          bgcolor: 'rgba(239,68,68,0.15)', color: 'error.main', p: 1.2,
                          '&:hover': { bgcolor: 'rgba(239,68,68,0.3)' },
                          transition: 'background 0.2s',
                        }}
                    >
                      <Stop />
                    </IconButton>
                  </Tooltip>
              ) : (
                  <Tooltip title={input.trim() ? 'Envoyer (Entrée)' : 'Écrivez quelque chose'}>
                <span>
                  <IconButton
                      onClick={sendMessage}
                      disabled={!input.trim()}
                      size="small"
                      sx={{
                        background: input.trim() ? 'linear-gradient(135deg, #7C3AED, #5B21B6)' : 'transparent',
                        color: input.trim() ? 'white' : 'text.disabled',
                        p: 1.2,
                        boxShadow: input.trim() ? '0 4px 15px rgba(124,58,237,0.4)' : 'none',
                        transition: 'all 0.2s',
                      }}
                  >
                    <ArrowUpward />
                  </IconButton>
                </span>
                  </Tooltip>
              )}
            </Box>
          </Paper>
          <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', textAlign: 'center', mt: 1 }}>
            DeepSeek peut faire des erreurs. Vérifiez les informations importantes.
          </Typography>
        </Box>

        {conversation && (
            <SettingsPanel
                open={showSettings}
                onClose={() => setShowSettings(false)}
                conversation={conversation}
                onUpdate={(updated) => {
                  setConversation(updated);
                  onConversationUpdate?.(conversationId, updated);
                }}
            />
        )}
      </Box>
  );
}