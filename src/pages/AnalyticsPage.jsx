import React,{ useState, useEffect } from 'react';
import { Box, Typography, Paper, Grid, Chip, Divider, CircularProgress } from '@mui/material';
import { TrendingUp, ChatBubble, Token, Speed, Psychology, BarChart, Timeline, EmojiEvents, ArrowBack } from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart as ReBarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { statsAPI } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useTheme } from '@mui/material/styles';

const COLORS = ['#7C3AED', '#06B6D4', '#10B981', '#F59E0B', '#EF4444'];

function StatCard({ icon, label, value, sub, color = '#7C3AED', delay = 0 }) {
  return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.4 }}>
        <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box sx={{ width: 44, height: 44, borderRadius: 2, bgcolor: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Box sx={{ color }}>{icon}</Box>
            </Box>
            {sub && <Chip label={sub} size="small" sx={{ fontSize: '0.65rem' }} />}
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.5 }}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>{label}</Typography>
        </Paper>
      </motion.div>
  );
}

export default function AnalyticsPage({ onBack }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const chartGrid     = isDark ? '#1E1E2A' : '#E8E3FF';
  const chartTick     = isDark ? '#9090A8' : '#6B7280';
  const tooltipBg     = isDark ? '#1A1A28' : '#FFFFFF';
  const tooltipBorder = isDark ? '#2A2A38' : '#DDD6FE';

  useEffect(() => {
    statsAPI.dashboard().then(res => setStats(res.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
          <CircularProgress sx={{ color: 'primary.main' }} />
        </Box>
    );
  }

  const msgChartData   = stats?.charts?.msgPerDay?.map(d => ({ date: format(new Date(d.date), 'dd/MM', { locale: fr }), Messages: d.count })) || [];
  const tokenChartData = stats?.charts?.tokensPerDay?.map(d => ({ date: format(new Date(d.date), 'dd/MM', { locale: fr }), Tokens: d.total })) || [];
  const modelData      = stats?.modelUsage?.map((m, i) => ({ name: m.model?.replace('deepseek-', '').toUpperCase(), value: m.count, color: COLORS[i % COLORS.length] })) || [];

  const tooltipStyle = { background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 8, color: theme.palette.text.primary };

  return (
      <Box sx={{ flex: 1, overflow: 'auto', bgcolor: 'background.default', p: 3, '&::-webkit-scrollbar': { width: 6 }, '&::-webkit-scrollbar-thumb': { backgroundColor: 'divider', borderRadius: 3 } }}>

        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
          <Box onClick={onBack} sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'text.secondary', '&:hover': { color: 'text.primary' }, transition: 'color 0.2s' }}>
            <ArrowBack sx={{ fontSize: 20 }} />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>📊 Analytics</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>Vos statistiques d'utilisation</Typography>
          </Box>
          <Box sx={{ ml: 'auto' }}>
            <Chip icon={<EmojiEvents sx={{ fontSize: 14 }} />} label={`${(user?.total_tokens_used || 0).toLocaleString()} tokens au total`} sx={{ bgcolor: 'rgba(245,158,11,0.15)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.2)' }} />
          </Box>
        </Box>

        {/* Stat cards */}
        <Grid container spacing={2.5} sx={{ mb: 4 }}>
          {[
            { icon: <ChatBubble />, label: 'Conversations',          value: stats?.totals?.conversations || 0,  color: '#7C3AED', delay: 0   },
            { icon: <TrendingUp />, label: 'Messages envoyés',       value: stats?.totals?.messages || 0,       color: '#06B6D4', delay: 0.1 },
            { icon: <Token />,      label: 'Tokens utilisés',        value: stats?.totals?.tokens || 0,         color: '#10B981', delay: 0.2 },
            { icon: <Speed />,      label: 'Temps de réponse moyen', value: `${stats?.avgResponseTime || 0}ms`, color: '#F59E0B', delay: 0.3 },
          ].map((card, i) => <Grid item xs={12} sm={6} md={3} key={i}><StatCard {...card} /></Grid>)}
        </Grid>

        {/* Charts row */}
        <Grid container spacing={2.5} sx={{ mb: 4 }}>
          <Grid item xs={12} md={8}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <Paper sx={{ p: 3, borderRadius: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                  <Timeline sx={{ color: '#7C3AED' }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary' }}>Messages des 7 derniers jours</Typography>
                </Box>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={msgChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: chartTick }} />
                    <YAxis tick={{ fontSize: 11, fill: chartTick }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Line type="monotone" dataKey="Messages" stroke="#7C3AED" strokeWidth={2} dot={{ fill: '#7C3AED', r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </Paper>
            </motion.div>
          </Grid>
          <Grid item xs={12} md={4}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
              <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                  <Psychology sx={{ color: '#06B6D4' }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary' }}>Modèles utilisés</Typography>
                </Box>
                {modelData.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={150}>
                        <PieChart>
                          <Pie data={modelData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value">
                            {modelData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                          </Pie>
                          <Tooltip contentStyle={tooltipStyle} />
                        </PieChart>
                      </ResponsiveContainer>
                      {modelData.map((m, i) => (
                          <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 1 }}>
                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: m.color, flexShrink: 0 }} />
                            <Typography variant="caption" sx={{ color: 'text.secondary', flex: 1 }}>{m.name}</Typography>
                            <Typography variant="caption" sx={{ color: 'text.disabled' }}>{m.value}x</Typography>
                          </Box>
                      ))}
                    </>
                ) : (
                    <Box sx={{ textAlign: 'center', py: 4, color: 'text.disabled' }}>Aucune donnée</Box>
                )}
              </Paper>
            </motion.div>
          </Grid>
        </Grid>

        {/* Token chart */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <Paper sx={{ p: 3, borderRadius: 3, mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
              <BarChart sx={{ color: '#10B981' }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary' }}>Consommation de tokens (7 jours)</Typography>
            </Box>
            <ResponsiveContainer width="100%" height={200}>
              <ReBarChart data={tokenChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: chartTick }} />
                <YAxis tick={{ fontSize: 11, fill: chartTick }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="Tokens" fill="#10B981" radius={[4, 4, 0, 0]} />
              </ReBarChart>
            </ResponsiveContainer>
          </Paper>
        </motion.div>

        {/* Recent activity */}
        {stats?.recentActivity?.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
              <Paper sx={{ p: 3, borderRadius: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary', mb: 2 }}>⚡ Activité récente</Typography>
                {stats.recentActivity.map((a, i) => (
                    <Box key={i}>
                      <Box sx={{ display: 'flex', gap: 2, py: 1.5, alignItems: 'flex-start' }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', mt: 0.8, flexShrink: 0, bgcolor: a.role === 'assistant' ? '#7C3AED' : '#06B6D4' }} />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block' }}>{a.title}</Typography>
                          <Typography variant="body2" sx={{ color: 'text.secondary' }} noWrap>{a.preview}</Typography>
                        </Box>
                      </Box>
                      {i < stats.recentActivity.length - 1 && <Divider />}
                    </Box>
                ))}
              </Paper>
            </motion.div>
        )}
      </Box>
  );
}