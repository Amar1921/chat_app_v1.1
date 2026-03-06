import { useState } from 'react';
import {
  Box, List, ListItemButton, ListItemText, ListItemIcon, Typography,
  IconButton, Button, Tooltip, TextField, InputAdornment, Chip,
  Menu, MenuItem, Divider, Avatar, CircularProgress
} from '@mui/material';
import {
  Add, Search, ChatBubble, Delete, Edit, MoreVert, PushPin,
  Archive, ContentCopy, Share, Psychology,
  Analytics, BookmarkBorder, KeyboardArrowDown, Settings,
  LightMode, DarkMode
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { conversationsAPI } from '../utils/api';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from 'notistack';
import {useThemeMode} from "../contexts/ThemeContext.jsx";
//import {useThemeMode} from "@/contexts/ThemeContext.jsx";
//import { useThemeMode } from '../themes/ThemeContext'; // adjust path if needed

export default function Sidebar({
                                  conversations, loading, selectedId, onSelect, onNew, onDelete,
                                  onUpdate, onNavigate, refreshConversations
                                }) {
  const [search, setSearch] = useState('');
  const [contextMenu, setContextMenu] = useState(null);
  const [menuConv, setMenuConv] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const { user, logout } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const { mode, toggleTheme } = useThemeMode();
  const isDark = mode === 'dark';

  const filtered = conversations.filter(c => c.title?.toLowerCase().includes(search.toLowerCase()));
  const pinned  = filtered.filter(c => c.is_pinned);
  const regular = filtered.filter(c => !c.is_pinned);

  const handleContextMenu = (e, conv) => {
    e.preventDefault(); e.stopPropagation();
    setContextMenu({ mouseX: e.clientX, mouseY: e.clientY });
    setMenuConv(conv);
  };

  const handlePin = async () => {
    try {
      await conversationsAPI.update(menuConv.id, { is_pinned: !menuConv.is_pinned });
      onUpdate(menuConv.id, { is_pinned: !menuConv.is_pinned });
      enqueueSnackbar(menuConv.is_pinned ? 'Conversation désépinglée' : 'Conversation épinglée', { variant: 'success' });
    } catch { enqueueSnackbar('Erreur', { variant: 'error' }); }
    setContextMenu(null);
  };

  const handleArchive = async () => {
    try {
      await conversationsAPI.update(menuConv.id, { is_archived: !menuConv.is_archived });
      refreshConversations();
      enqueueSnackbar('Archivé avec succès', { variant: 'success' });
    } catch { enqueueSnackbar('Erreur', { variant: 'error' }); }
    setContextMenu(null);
  };

  const handleDuplicate = async () => {
    try {
      const res = await conversationsAPI.duplicate(menuConv.id);
      refreshConversations();
      onSelect(res.data.conversation.id);
      enqueueSnackbar('Conversation dupliquée', { variant: 'success' });
    } catch { enqueueSnackbar('Erreur', { variant: 'error' }); }
    setContextMenu(null);
  };

  const handleShare = async () => {
    try {
      const res = await conversationsAPI.share(menuConv.id);
      if (res.data.is_shared) {
        const url = `${window.location.origin}/share/${res.data.share_token}`;
        await navigator.clipboard.writeText(url);
        enqueueSnackbar('Lien copié dans le presse-papiers!', { variant: 'success' });
      } else {
        enqueueSnackbar('Partage désactivé', { variant: 'info' });
      }
    } catch { enqueueSnackbar('Erreur', { variant: 'error' }); }
    setContextMenu(null);
  };

  const handleDelete = async () => {
    try {
      await conversationsAPI.delete(menuConv.id);
      onDelete(menuConv.id);
      enqueueSnackbar('Conversation supprimée', { variant: 'success' });
    } catch { enqueueSnackbar('Erreur', { variant: 'error' }); }
    setContextMenu(null);
  };

  const startEdit = (conv) => { setEditingId(conv.id); setEditTitle(conv.title); setContextMenu(null); };

  const saveEdit = async (id) => {
    if (!editTitle.trim()) return;
    try { await conversationsAPI.update(id, { title: editTitle }); onUpdate(id, { title: editTitle }); } catch {}
    setEditingId(null);
  };

  const ConvItem = ({ conv }) => (
      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
        <ListItemButton
            selected={conv.id === selectedId}
            onClick={() => onSelect(conv.id)}
            onContextMenu={(e) => handleContextMenu(e, conv)}
            sx={{ pr: 1, py: 1.2, position: 'relative', '&:hover .more-btn': { opacity: 1 } }}
        >
          <ListItemIcon sx={{ minWidth: 36 }}>
            {conv.is_pinned
                ? <PushPin sx={{ fontSize: 16, color: 'warning.main' }} />
                : <ChatBubble sx={{ fontSize: 16, color: 'text.disabled' }} />
            }
          </ListItemIcon>
          {editingId === conv.id ? (
              <TextField
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  onBlur={() => saveEdit(conv.id)}
                  onKeyDown={e => { if (e.key === 'Enter') saveEdit(conv.id); if (e.key === 'Escape') setEditingId(null); }}
                  autoFocus size="small"
                  onClick={e => e.stopPropagation()}
                  sx={{ '& .MuiInputBase-input': { fontSize: '0.8rem', py: 0.5 } }}
              />
          ) : (
              <ListItemText
                  primary={conv.title || 'Sans titre'}
                  secondary={conv.last_message_at ? formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true, locale: fr }) : 'Nouvelle'}
                  primaryTypographyProps={{ noWrap: true, fontSize: '0.85rem', fontWeight: conv.id === selectedId ? 600 : 400, color: 'text.primary' }}
                  secondaryTypographyProps={{ noWrap: true, fontSize: '0.7rem', color: 'text.disabled' }}
              />
          )}
          <IconButton
              className="more-btn"
              size="small"
              onClick={e => { e.stopPropagation(); handleContextMenu(e, conv); }}
              sx={{ opacity: 0, transition: 'opacity 0.2s', ml: 0.5, flexShrink: 0 }}
          >
            <MoreVert sx={{ fontSize: 16 }} />
          </IconButton>
        </ListItemButton>
      </motion.div>
  );

  return (
      <Box sx={{
        width: 260, flexShrink: 0, height: '100vh', display: 'flex', flexDirection: 'column',
        bgcolor: 'background.paper',
        borderRight: '1px solid', borderColor: 'divider',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Box sx={{ width: 32, height: 32, borderRadius: 2, background: 'linear-gradient(135deg, #7C3AED, #06B6D4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Psychology sx={{ fontSize: 18, color: 'white' }} />
            </Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary', letterSpacing: '-0.3px', flex: 1 }}>
              AS-ChatIA
            </Typography>
            {/* ── Theme toggle ── */}
            <Tooltip title={isDark ? 'Mode clair' : 'Mode sombre'}>
              <IconButton
                  size="small"
                  onClick={toggleTheme}
                  sx={{
                    width: 28, height: 28,
                    color: 'text.secondary',
                    border: '1px solid', borderColor: 'divider',
                    bgcolor: 'action.hover',
                    transition: 'all 0.2s',
                    '&:hover': { color: 'primary.main', transform: 'scale(1.1) rotate(15deg)' },
                  }}
              >
                {isDark ? <LightMode sx={{ fontSize: 14 }} /> : <DarkMode sx={{ fontSize: 14 }} />}
              </IconButton>
            </Tooltip>
          </Box>
          <Button fullWidth variant="contained" startIcon={<Add />} onClick={onNew} size="small" sx={{ py: 1, mb: 1.5, justifyContent: 'flex-start' }}>
            Nouvelle conversation
          </Button>
          <TextField
              size="small" fullWidth placeholder="Rechercher..."
              value={search} onChange={e => setSearch(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 18 }} /></InputAdornment> }}
              sx={{ '& .MuiInputBase-input': { fontSize: '0.8rem' } }}
          />
        </Box>

        {/* Navigation */}
        <Box sx={{ px: 1, pt: 1.5, pb: 0.5 }}>
          {[
            { icon: <Analytics sx={{ fontSize: 18 }} />,      label: 'Dashboard', path: '/analytics' },
            { icon: <BookmarkBorder sx={{ fontSize: 18 }} />, label: 'Favoris',    path: '/bookmarks' },
            { icon: <Settings sx={{ fontSize: 18 }} />,       label: 'Paramètres', path: '/settings'  },
          ].map(item => (
              <ListItemButton key={item.path} onClick={() => onNavigate(item.path)} sx={{ py: 0.8 }}>
                <ListItemIcon sx={{ minWidth: 32, color: 'text.secondary' }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: '0.82rem', color: 'text.secondary' }} />
              </ListItemButton>
          ))}
        </Box>

        <Divider sx={{ mx: 2, my: 1 }} />

        {/* Conversations list */}
        <Box sx={{ flex: 1, overflow: 'auto', px: 0.5, '&::-webkit-scrollbar': { width: 4 }, '&::-webkit-scrollbar-thumb': { backgroundColor: 'divider', borderRadius: 2 } }}>
          {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4 }}>
                <CircularProgress size={24} sx={{ color: 'primary.main' }} />
              </Box>
          ) : (
              <>
                {pinned.length > 0 && (
                    <>
                      <Typography variant="caption" sx={{ px: 2, py: 0.5, display: 'block', color: 'text.disabled', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        📌 Épinglées
                      </Typography>
                      <AnimatePresence>{pinned.map(c => <ConvItem key={c.id} conv={c} />)}</AnimatePresence>
                      <Divider sx={{ mx: 2, my: 0.5 }} />
                    </>
                )}
                {regular.length === 0 && pinned.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 4, px: 2 }}>
                      <ChatBubble sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>Aucune conversation</Typography>
                      <Typography variant="caption" sx={{ color: 'text.disabled' }}>Commencez par en créer une !</Typography>
                    </Box>
                ) : (
                    <AnimatePresence>{regular.map(c => <ConvItem key={c.id} conv={c} />)}</AnimatePresence>
                )}
              </>
          )}
        </Box>

        {/* User profile */}
        <Box sx={{ p: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1, borderRadius: 2, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' }, transition: 'background 0.2s' }}
               onClick={() => onNavigate('/settings')}>
            <Avatar sx={{ width: 34, height: 34, bgcolor: user?.avatar_color, fontSize: '0.8rem', fontWeight: 700 }}>
              {user?.avatar_initials}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', fontSize: '0.82rem' }} noWrap>
                {user?.username}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.7rem' }}>
                {(user?.total_tokens_used || 0).toLocaleString()} tokens
              </Typography>
            </Box>
            <Tooltip title="Déconnexion">
              <IconButton size="small" onClick={(e) => { e.stopPropagation(); logout(); }}>
                <KeyboardArrowDown sx={{ fontSize: 18, color: 'text.disabled' }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Context menu */}
        <Menu
            open={Boolean(contextMenu)}
            onClose={() => setContextMenu(null)}
            anchorReference="anchorPosition"
            anchorPosition={contextMenu ? { top: contextMenu.mouseY, left: contextMenu.mouseX } : undefined}
            PaperProps={{ sx: { minWidth: 200 } }}
        >
          <MenuItem onClick={() => startEdit(menuConv)}><Edit sx={{ mr: 1.5, fontSize: 18 }} /> Renommer</MenuItem>
          <MenuItem onClick={handlePin}><PushPin sx={{ mr: 1.5, fontSize: 18 }} /> {menuConv?.is_pinned ? 'Désépingler' : 'Épingler'}</MenuItem>
          <MenuItem onClick={handleDuplicate}><ContentCopy sx={{ mr: 1.5, fontSize: 18 }} /> Dupliquer</MenuItem>
          <MenuItem onClick={handleShare}><Share sx={{ mr: 1.5, fontSize: 18 }} /> Partager</MenuItem>
          <MenuItem onClick={handleArchive}><Archive sx={{ mr: 1.5, fontSize: 18 }} /> Archiver</MenuItem>
          <Divider />
          <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}><Delete sx={{ mr: 1.5, fontSize: 18 }} /> Supprimer</MenuItem>
        </Menu>
      </Box>
  );
}