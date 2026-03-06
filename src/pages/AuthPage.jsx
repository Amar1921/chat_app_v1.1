import React,{ useState } from 'react';
import {
  Box, Paper, TextField, Button, Typography, Tab, Tabs, InputAdornment,
  IconButton, Alert, CircularProgress, Divider, Chip
} from '@mui/material';
import { Visibility, VisibilityOff, AutoAwesome, Psychology } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function AuthPage() {
  const [tab, setTab] = useState(0);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      if (tab === 0) {
        await login(form.email, form.password);
      } else {
       // await register(form.username, form.email, form.password);
        console.log("register")
      }
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 20% 50%, rgba(124,58,237,0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(6,182,212,0.1) 0%, transparent 50%), #0A0A0F',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      p: 2,
    }}>
      {/* Animated background orbs */}
      <Box sx={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        {[...Array(3)].map((_, i) => (
          <Box key={i} component={motion.div}
            animate={{ x: [0, 30, -20, 0], y: [0, -30, 20, 0], scale: [1, 1.1, 0.9, 1] }}
            transition={{ duration: 8 + i * 3, repeat: Infinity, delay: i * 2 }}
            sx={{
              position: 'absolute',
              width: 300 + i * 100,
              height: 300 + i * 100,
              borderRadius: '50%',
              background: i === 0
                ? 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)'
                : i === 1
                ? 'radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%)'
                : 'radial-gradient(circle, rgba(236,72,153,0.06) 0%, transparent 70%)',
              top: `${20 + i * 25}%`,
              left: `${10 + i * 35}%`,
              filter: 'blur(40px)',
            }}
          />
        ))}
      </Box>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 440 }}>

        {/* Logo */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box sx={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 64, height: 64, borderRadius: 3,
            background: 'linear-gradient(135deg, #7C3AED, #06B6D4)',
            boxShadow: '0 8px 32px rgba(124,58,237,0.4)',
            mb: 2,
          }}>
            <Psychology sx={{ fontSize: 36, color: 'white' }} />
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'white', letterSpacing: '-0.5px' }}>
            DeepSeek Chat
          </Typography>
          <Typography variant="body2" sx={{ color: '#9090A8', mt: 0.5 }}>
            Intelligence artificielle à votre service
          </Typography>
        </Box>

        <Paper sx={{
          p: 4, borderRadius: 3,
          background: 'rgba(17,17,24,0.9)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(124,58,237,0.2)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
        }}>
          <Tabs value={tab} onChange={(_, v) => { setTab(v); setError(''); }}
            sx={{ mb: 3, '& .MuiTab-root': { flex: 1, textTransform: 'none', fontWeight: 600 } }}>
            <Tab label="Connexion" />
            <Tab label="Créer un compte" />
          </Tabs>

          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, x: tab === 0 ? -10 : 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {tab === 1 && (
                  <TextField
                    label="Nom d'utilisateur" fullWidth
                    value={form.username}
                    onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                    InputProps={{ startAdornment: <InputAdornment position="start">@</InputAdornment> }}
                  />
                )}
                <TextField
                  label="Email" type="email" fullWidth
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                />
                <TextField
                  label="Mot de passe" type={showPw ? 'text' : 'password'} fullWidth
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPw(p => !p)} edge="end">
                          {showPw ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />
                {error && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}
                <Button
                  variant="contained" size="large" fullWidth
                  onClick={handleSubmit} disabled={loading}
                  sx={{ py: 1.5, mt: 1, fontSize: '1rem' }}
                  startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <AutoAwesome />}
                >
                  {loading ? 'Chargement...' : tab === 0 ? 'Se connecter' : 'Créer mon compte'}
                </Button>
              </Box>
            </motion.div>
          </AnimatePresence>

          <Divider sx={{ my: 3, borderColor: '#2A2A38' }}>
            <Chip label="Fonctionnalités" size="small" sx={{ color: '#6060A0', borderColor: '#2A2A38' }} variant="outlined" />
          </Divider>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
            {['Streaming IA', 'Multi-modèles', 'Historique', 'Analytics', 'Bookmarks', 'Partage'].map(f => (
              <Chip key={f} label={f} size="small" sx={{ bgcolor: 'rgba(124,58,237,0.1)', color: '#9D5FFF', border: '1px solid rgba(124,58,237,0.2)' }} />
            ))}
          </Box>
        </Paper>
      </motion.div>
    </Box>
  );
}
