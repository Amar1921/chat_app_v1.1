import React,{ useState } from 'react';
import { Box, Typography, Paper, TextField, Button, Avatar, Chip, Grid, IconButton, Tooltip } from '@mui/material';
import { ArrowBack, Save, Lock, Person, Star, ContentCopy, OpenInNew } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { authAPI, chatAPI } from '../utils/api';
import { useSnackbar } from 'notistack';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export function UserSettingsPage({ onBack }) {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [savingPw, setSavingPw] = useState(false);

  const changePassword = async () => {
    if (passwords.new !== passwords.confirm) {
      enqueueSnackbar('Les mots de passe ne correspondent pas', { variant: 'error' });
      return;
    }
    setSavingPw(true);
    try {
      await authAPI.changePassword({ current_password: passwords.current, new_password: passwords.new });
      enqueueSnackbar('Mot de passe mis à jour!', { variant: 'success' });
      setPasswords({ current: '', new: '', confirm: '' });
    } catch (err) {
      enqueueSnackbar(err.response?.data?.error || 'Erreur', { variant: 'error' });
    } finally {
      setSavingPw(false);
    }
  };

  return (
      <Box sx={{ flex: 1, overflow: 'auto', bgcolor: 'background.default', p: 3, maxWidth: 700, mx: 'auto', '&::-webkit-scrollbar': { width: 6 }, '&::-webkit-scrollbar-thumb': { backgroundColor: 'divider', borderRadius: 3 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
          <Box onClick={onBack} sx={{ cursor: 'pointer', color: 'text.secondary', '&:hover': { color: 'text.primary' }, display: 'flex', alignItems: 'center' }}>
            <ArrowBack />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>⚙️ Paramètres</Typography>
        </Box>

        {/* Profile */}
        <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
            <Person sx={{ color: 'primary.main' }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary' }}>Profil</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3 }}>
            <Avatar sx={{ width: 64, height: 64, bgcolor: user?.avatar_color, fontSize: '1.4rem', fontWeight: 700 }}>
              {user?.avatar_initials}
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600 }}>{user?.username}</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>{user?.email}</Typography>
              <Chip label={user?.role === 'admin' ? 'Administrateur' : 'Utilisateur'} size="small" sx={{ mt: 0.5, bgcolor: 'rgba(124,58,237,0.15)', color: '#9D5FFF', fontSize: '0.7rem' }} />
            </Box>
          </Box>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider', textAlign: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>{(user?.total_tokens_used || 0).toLocaleString()}</Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>Tokens utilisés</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider', textAlign: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: 'secondary.main' }}>{user?.preferred_model?.replace('deepseek-', '')}</Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>Modèle préféré</Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* Change Password */}
        <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
            <Lock sx={{ color: 'error.main' }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary' }}>Sécurité</Typography>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label="Mot de passe actuel" type="password" size="small" value={passwords.current} onChange={e => setPasswords(p => ({ ...p, current: e.target.value }))} />
            <TextField label="Nouveau mot de passe" type="password" size="small" value={passwords.new} onChange={e => setPasswords(p => ({ ...p, new: e.target.value }))} />
            <TextField label="Confirmer le nouveau mot de passe" type="password" size="small" value={passwords.confirm} onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))} />
            <Button variant="contained" onClick={changePassword} disabled={savingPw || !passwords.current || !passwords.new} startIcon={<Save />} sx={{ alignSelf: 'flex-start' }}>
              {savingPw ? 'Sauvegarde...' : 'Mettre à jour le mot de passe'}
            </Button>
          </Box>
        </Paper>

        {/* Keyboard shortcuts */}
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary', mb: 2 }}>⌨️ Raccourcis clavier</Typography>
          {[
            { key: 'Entrée', action: 'Envoyer le message' },
            { key: 'Shift + Entrée', action: 'Nouvelle ligne' },
            { key: 'Ctrl + K', action: 'Nouvelle conversation' },
            { key: 'Esc', action: 'Fermer les panneaux' },
          ].map(({ key, action }) => (
              <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>{action}</Typography>
                <Chip label={key} size="small" sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }} />
              </Box>
          ))}
        </Paper>
      </Box>
  );
}

export function BookmarksPage({ onBack, onOpenConversation }) {
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const { enqueueSnackbar } = useSnackbar();

  useState(() => {
    chatAPI.getBookmarks()
        .then(res => setBookmarks(res.data.bookmarks))
        .catch(() => enqueueSnackbar('Erreur', { variant: 'error' }))
        .finally(() => setLoading(false));
  });

  const copy = async (content) => {
    await navigator.clipboard.writeText(content);
    enqueueSnackbar('Copié!', { variant: 'success' });
  };

  return (
      <Box sx={{ flex: 1, overflow: 'auto', bgcolor: 'background.default', p: 3, '&::-webkit-scrollbar': { width: 6 }, '&::-webkit-scrollbar-thumb': { backgroundColor: 'divider', borderRadius: 3 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
          <Box onClick={onBack} sx={{ cursor: 'pointer', color: 'text.secondary', '&:hover': { color: 'text.primary' }, display: 'flex' }}>
            <ArrowBack />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>🔖 Favoris</Typography>
          <Chip label={`${bookmarks.length} messages`} size="small" sx={{ bgcolor: 'rgba(124,58,237,0.15)', color: '#9D5FFF' }} />
        </Box>

        {bookmarks.length === 0 && !loading ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Star sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
              <Typography sx={{ color: 'text.secondary' }}>Aucun message en favori</Typography>
              <Typography variant="caption" sx={{ color: 'text.disabled' }}>Cliquez sur l'icône ⭐ d'un message pour le sauvegarder</Typography>
            </Box>
        ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {bookmarks.map((bm, i) => (
                  <motion.div key={bm.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <Paper sx={{ p: 2.5, borderRadius: 2, '&:hover': { borderColor: 'primary.main' }, transition: 'border-color 0.2s' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                        <Box>
                          <Typography variant="caption" sx={{ color: 'primary.light', fontWeight: 600 }}>{bm.conversation_title}</Typography>
                          <Typography variant="caption" sx={{ color: 'text.disabled', ml: 1 }}>
                            {formatDistanceToNow(new Date(bm.created_at), { addSuffix: true, locale: fr })}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title="Copier">
                            <IconButton size="small" onClick={() => copy(bm.content)} sx={{ color: 'text.disabled' }}>
                              <ContentCopy sx={{ fontSize: 14 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Voir la conversation">
                            <IconButton size="small" onClick={() => onOpenConversation(bm.conversation_id)} sx={{ color: 'text.disabled' }}>
                              <OpenInNew sx={{ fontSize: 14 }} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>
                      <Box sx={{ p: 2, borderRadius: 1.5, bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="body2" sx={{ color: 'text.primary', lineHeight: 1.7, whiteSpace: 'pre-wrap', maxHeight: 200, overflow: 'auto' }}>
                          {bm.content}
                        </Typography>
                      </Box>
                      <Chip label={bm.role === 'assistant' ? '🤖 Assistant' : '👤 Vous'} size="small" sx={{ mt: 1, height: 20, fontSize: '0.65rem', bgcolor: bm.role === 'assistant' ? 'rgba(124,58,237,0.1)' : 'rgba(6,182,212,0.1)', color: bm.role === 'assistant' ? '#9D5FFF' : '#06B6D4' }} />
                    </Paper>
                  </motion.div>
              ))}
            </Box>
        )}
      </Box>
  );
}