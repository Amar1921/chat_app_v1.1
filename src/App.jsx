import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Box, useMediaQuery, Drawer, IconButton, Fab } from '@mui/material';
import { Menu as MenuIcon, Add } from '@mui/icons-material';
import { SnackbarProvider } from 'notistack';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthPage from './pages/AuthPage';
import ChatPage from './pages/ChatPage';
import AnalyticsPage from './pages/AnalyticsPage';
import { UserSettingsPage, BookmarksPage } from './pages/UtilityPages';
import Sidebar from './components/Sidebar';
import { conversationsAPI } from './utils/api';
import {AppThemeProvider} from "./contexts/ThemeContext.jsx";
//import {AppThemeProvider} from "@/contexts/ThemeContext.jsx";
//import {AppThemeProvider} from "@/contexts/ThemeContext.jsx";

function AppLayout() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loadingConvs, setLoadingConvs] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [currentView, setCurrentView] = useState('chat');
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width:768px)');

  const fetchConversations = useCallback(() => {
    setLoadingConvs(true);
    conversationsAPI.list()
        .then(res => setConversations(res.data.conversations))
        .catch(console.error)
        .finally(() => setLoadingConvs(false));
  }, []);

  useEffect(() => { if (user) fetchConversations(); }, [user]);

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); handleNewConversation(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleNewConversation = async () => {
    try {
      const res = await conversationsAPI.create({ title: 'Nouvelle conversation' });
      const conv = res.data.conversation;
      setConversations(prev => [conv, ...prev]);
      setSelectedId(conv.id);
      setCurrentView('chat');
      if (isMobile) setMobileOpen(false);
    } catch (err) { console.error('Error creating conversation:', err); }
  };

  const handleSelectConversation = (id) => { setSelectedId(id); setCurrentView('chat'); if (isMobile) setMobileOpen(false); };
  const handleDeleteConversation = (id) => { setConversations(prev => prev.filter(c => c.id !== id)); if (selectedId === id) setSelectedId(null); };
  const handleUpdateConversation = (id, updates) => setConversations(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  const handleNavigate = (path) => { setCurrentView(path.replace('/', '')); if (isMobile) setMobileOpen(false); };

  const sidebar = (
      <Sidebar
          conversations={conversations} loading={loadingConvs} selectedId={selectedId}
          onSelect={handleSelectConversation} onNew={handleNewConversation}
          onDelete={handleDeleteConversation} onUpdate={handleUpdateConversation}
          onNavigate={handleNavigate} refreshConversations={fetchConversations}
      />
  );

  const mainContent = () => {
    switch (currentView) {
      case 'analytics': return <AnalyticsPage onBack={() => setCurrentView('chat')} />;
      case 'settings':  return <UserSettingsPage onBack={() => setCurrentView('chat')} />;
      case 'bookmarks': return <BookmarksPage onBack={() => setCurrentView('chat')} onOpenConversation={(id) => { setSelectedId(id); setCurrentView('chat'); }} />;
      default: return <ChatPage conversationId={selectedId} onConversationUpdate={handleUpdateConversation} />;
    }
  };

  return (
      <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden', bgcolor: 'background.default' }}>
        {isMobile ? (
            <>
              <Drawer open={mobileOpen} onClose={() => setMobileOpen(false)} PaperProps={{ sx: { width: 260 } }}>
                {sidebar}
              </Drawer>
              <Box sx={{
                position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
                display: 'flex', alignItems: 'center', px: 2, py: 1,
                bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider',
                backdropFilter: 'blur(10px)',
              }}>
                <IconButton onClick={() => setMobileOpen(true)}><MenuIcon /></IconButton>
              </Box>
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', pt: 7 }}>{mainContent()}</Box>
              <Fab onClick={handleNewConversation} sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 100, background: 'linear-gradient(135deg, #7C3AED, #5B21B6)', boxShadow: '0 8px 30px rgba(124,58,237,0.4)' }}>
                <Add sx={{ color: 'white' }} />
              </Fab>
            </>
        ) : (
            <>
              {sidebar}
              <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>{mainContent()}</Box>
            </>
        )}
      </Box>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
      <Box sx={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
        <Box sx={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid', borderColor: 'primary.main', borderTopColor: 'transparent', animation: 'spin 1s linear infinite', '@keyframes spin': { to: { transform: 'rotate(360deg)' } } }} />
      </Box>
  );
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
      <BrowserRouter>
        {/* AppThemeProvider remplace ThemeProvider + CssBaseline et gère le toggle dark/light */}
        <AppThemeProvider>
          <SnackbarProvider maxSnack={3} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} style={{ borderRadius: 12 }}>
            <AuthProvider>
              <Routes>
                <Route path="/login" element={<AuthPage />} />
                <Route path="/*" element={<ProtectedRoute><AppLayout /></ProtectedRoute>} />
              </Routes>
            </AuthProvider>
          </SnackbarProvider>
        </AppThemeProvider>
      </BrowserRouter>
  );
}