import { useState, useEffect } from 'react';
import {
  Drawer, Box, Typography, IconButton, Divider, FormControl,
  InputLabel, Select, MenuItem, Slider, TextField, Button,
  Tooltip, Chip, Accordion, AccordionSummary, AccordionDetails,
  Switch, FormControlLabel, Alert, CircularProgress
} from '@mui/material';
import {
  Close, ExpandMore, Info, Tune, Psychology, SystemUpdate,
  RestartAlt, SaveAlt, AutoAwesome, Memory, Speed
} from '@mui/icons-material';
import { conversationsAPI } from '../utils/api';
import { useSnackbar } from 'notistack';

const MODELS = [
  {
    id: 'deepseek-chat',
    name: 'DeepSeek Chat',
    description: 'Modèle polyvalent, rapide et efficace pour conversations générales',
    badge: 'Recommandé',
    maxTokens: 8192,
    features: ['streaming', 'functions']
  },
  {
    id: 'deepseek-reasoner',
    name: 'DeepSeek Reasoner',
    description: 'Raisonnement avancé (R1) pour tâches complexes',
    badge: 'R1',
    maxTokens: 4096,
    features: ['streaming', 'reasoning']
  },
  {
    id: 'deepseek-coder',
    name: 'DeepSeek Coder',
    description: 'Optimisé pour la génération de code',
    badge: 'Code',
    maxTokens: 8192,
    features: ['streaming', 'code']
  }
];

const PRESET_PROMPTS = [
  { label: 'Assistant standard', value: '' },
  { label: 'Expert technique', value: 'Tu es un expert technique spécialisé en développement logiciel, architecture système et bonnes pratiques. Tu fournis des explications détaillées et des exemples de code.' },
  { label: 'Créatif', value: 'Tu es un assistant créatif qui aide à générer des idées, des histoires et du contenu original. Tu encourages la pensée hors des sentiers battus.' },
  { label: 'Pédagogue', value: 'Tu es un tuteur patient qui explique les concepts de manière simple et progressive. Tu utilises des analogies et vérifies la compréhension.' },
  { label: 'Analyste', value: 'Tu es un analyste objectif qui examine les problèmes sous tous les angles. Tu présentes des arguments équilibrés et des analyses approfondies.' }
];

export default function SettingsPanel({ open, onClose, conversation, onUpdate, onReset }) {
  const [settings, setSettings] = useState({
    model: conversation?.model || 'deepseek-chat',
    max_tokens: conversation?.max_tokens || 2048,
    temperature: parseFloat(conversation?.temperature) || 0.7,
    top_p: parseFloat(conversation?.top_p) || 1.0,
    presence_penalty: parseFloat(conversation?.presence_penalty) || 0,
    frequency_penalty: parseFloat(conversation?.frequency_penalty) || 0,
    system_prompt: conversation?.system_prompt || '',
    stream: conversation?.stream !== false,
    reasoning_effort: conversation?.reasoning_effort || 'medium',
    stop_sequences: conversation?.stop_sequences || [],
    response_format: conversation?.response_format || 'text',
    seed: conversation?.seed || null
  });

  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  // Détecter les changements
  useEffect(() => {
    if (conversation) {
      const initial = {
        model: conversation?.model || 'deepseek-chat',
        max_tokens: conversation?.max_tokens || 2048,
        temperature: parseFloat(conversation?.temperature) || 0.7,
        top_p: parseFloat(conversation?.top_p) || 1.0,
        presence_penalty: parseFloat(conversation?.presence_penalty) || 0,
        frequency_penalty: parseFloat(conversation?.frequency_penalty) || 0,
        system_prompt: conversation?.system_prompt || '',
        stream: conversation?.stream !== false,
        reasoning_effort: conversation?.reasoning_effort || 'medium',
        response_format: conversation?.response_format || 'text',
      };

      const changed = JSON.stringify(initial) !== JSON.stringify(settings);
      setHasChanges(changed);
    }
  }, [settings, conversation]);

  const save = async () => {
    setSaving(true);
    try {
      // Filtrer les paramètres null/undefined
      const cleanSettings = Object.fromEntries(
          Object.entries(settings).filter(([_, v]) => v != null)
      );

      const res = await conversationsAPI.update(conversation.id, cleanSettings);

      if (res.data?.conversation) {
        onUpdate(res.data.conversation);
        enqueueSnackbar('Paramètres sauvegardés avec succès', {
          variant: 'success',
          autoHideDuration: 3000
        });
        setHasChanges(false);
        onClose();
      } else {
        throw new Error('Réponse invalide du serveur');
      }
    } catch (error) {
      console.error('Save error:', error);
      enqueueSnackbar(
          error.response?.data?.error || 'Erreur lors de la sauvegarde',
          { variant: 'error' }
      );
    } finally {
      setSaving(false);
    }
  };

  const testSettings = async () => {
    setTesting(true);
    try {
      const testPrompt = "Réponds avec un message de test très court.";
      const res = await conversationsAPI.testSettings(conversation.id, {
        ...settings,
        test_prompt: testPrompt
      });

      enqueueSnackbar('Test réussi ! Vérifiez la réponse dans la console', {
        variant: 'info',
        autoHideDuration: 5000
      });
      console.log('Test response:', res.data);
    } catch (error) {
      enqueueSnackbar('Erreur lors du test', { variant: 'error' });
    } finally {
      setTesting(false);
    }
  };

  const resetToDefaults = () => {
    setSettings({
      model: 'deepseek-chat',
      max_tokens: 2048,
      temperature: 0.7,
      top_p: 1.0,
      presence_penalty: 0,
      frequency_penalty: 0,
      system_prompt: '',
      stream: true,
      reasoning_effort: 'medium',
      response_format: 'text',
      seed: null
    });
    onReset?.();
    enqueueSnackbar('Paramètres réinitialisés', { variant: 'info' });
  };

  const SliderField = ({ label, field, min, max, step, tooltip, marks, disabled }) => (
      <Box sx={{ mb: 2.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography variant="body2" sx={{ color: '#B0B0C8', fontWeight: 500 }}>
              {label}
            </Typography>
            {tooltip && (
                <Tooltip title={tooltip} arrow placement="top">
                  <Info sx={{ fontSize: 14, color: '#6060A0', cursor: 'help' }} />
                </Tooltip>
            )}
          </Box>
          <Chip
              label={settings[field]}
              size="small"
              sx={{
                bgcolor: 'rgba(124,58,237,0.15)',
                color: '#9D5FFF',
                fontSize: '0.75rem',
                height: 22,
                fontWeight: 600
              }}
          />
        </Box>
        <Slider
            value={settings[field]}
            onChange={(_, v) => setSettings(p => ({ ...p, [field]: v }))}
            min={min}
            max={max}
            step={step}
            marks={marks}
            disabled={disabled}
            sx={{
              color: '#7C3AED',
              '& .MuiSlider-markLabel': {
                color: '#6060A0',
                fontSize: '0.7rem'
              }
            }}
        />
      </Box>
  );

  return (
      <Drawer
          anchor="right"
          open={open}
          onClose={onClose}
          PaperProps={{
            sx: {
              width: 420,
              background: '#0D0D14',
              borderLeft: '1px solid #2A2A38',
              boxShadow: '-4px 0 20px rgba(0,0,0,0.5)'
            }
          }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Header */}
          <Box sx={{
            p: 2.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #1E1E2A',
            background: 'rgba(18,18,24,0.95)',
            backdropFilter: 'blur(8px)'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Tune sx={{ color: '#7C3AED' }} />
              <Typography variant="h6" sx={{ fontWeight: 700, color: 'white' }}>
                Paramètres
              </Typography>
              {hasChanges && (
                  <Chip
                      label="Modifié"
                      size="small"
                      sx={{
                        bgcolor: '#7C3AED',
                        color: 'white',
                        height: 20,
                        fontSize: '0.65rem'
                      }}
                  />
              )}
            </Box>
            <IconButton onClick={onClose} size="small" sx={{ color: '#9090A8' }}>
              <Close />
            </IconButton>
          </Box>

          <Box sx={{
            flex: 1,
            overflow: 'auto',
            p: 2.5,
            '&::-webkit-scrollbar': { width: 4 },
            '&::-webkit-scrollbar-track': { background: '#1A1A24' },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: '#2A2A38',
              borderRadius: 2,
              '&:hover': { backgroundColor: '#3A3A48' }
            },
          }}>

            {/* Model Selection */}
            <Accordion
                defaultExpanded
                sx={{
                  bgcolor: '#111118',
                  border: '1px solid #2A2A38',
                  mb: 2,
                  borderRadius: 2,
                  '&:before': { display: 'none' }
                }}
            >
              <AccordionSummary
                  expandIcon={<ExpandMore sx={{ color: '#9090A8' }} />}
                  sx={{ borderRadius: 2 }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Psychology sx={{ fontSize: 18, color: '#7C3AED' }} />
                  <Typography sx={{ fontWeight: 600, color: 'white' }}>Modèle</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                {MODELS.map(model => {
                  const isSelected = settings.model === model.id;
                  const currentModel = MODELS.find(m => m.id === settings.model);
                  const maxTokens = currentModel?.maxTokens || 8192;

                  return (
                      <Box
                          key={model.id}
                          onClick={() => {
                            setSettings(p => ({
                              ...p,
                              model: model.id,
                              max_tokens: Math.min(p.max_tokens, model.maxTokens)
                            }));
                          }}
                          sx={{
                            p: 1.5,
                            mb: 1.5,
                            borderRadius: 2,
                            cursor: 'pointer',
                            border: isSelected ? '2px solid #7C3AED' : '1px solid #2A2A38',
                            bgcolor: isSelected ? 'rgba(124,58,237,0.1)' : 'transparent',
                            transition: 'all 0.2s',
                            '&:hover': {
                              borderColor: '#7C3AED',
                              bgcolor: 'rgba(124,58,237,0.05)'
                            }
                          }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: 'white' }}>
                            {model.name}
                          </Typography>
                          {model.badge && (
                              <Chip
                                  label={model.badge}
                                  size="small"
                                  sx={{
                                    height: 20,
                                    fontSize: '0.65rem',
                                    bgcolor: isSelected ? '#7C3AED' : '#2A2A38',
                                    color: 'white',
                                    fontWeight: 600
                                  }}
                              />
                          )}
                        </Box>
                        <Typography variant="caption" sx={{ color: '#9090A8', display: 'block', mb: 1 }}>
                          {model.description}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          {model.features?.map(feature => (
                              <Chip
                                  key={feature}
                                  label={feature}
                                  size="small"
                                  sx={{
                                    height: 18,
                                    fontSize: '0.6rem',
                                    bgcolor: '#1A1A24',
                                    color: '#B0B0C8'
                                  }}
                              />
                          ))}
                        </Box>
                      </Box>
                  );
                })}
              </AccordionDetails>
            </Accordion>

            {/* Generation Parameters */}
            <Accordion
                defaultExpanded
                sx={{
                  bgcolor: '#111118',
                  border: '1px solid #2A2A38',
                  mb: 2,
                  borderRadius: 2,
                  '&:before': { display: 'none' }
                }}
            >
              <AccordionSummary expandIcon={<ExpandMore sx={{ color: '#9090A8' }} />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AutoAwesome sx={{ fontSize: 18, color: '#06B6D4' }} />
                  <Typography sx={{ fontWeight: 600, color: 'white' }}>Paramètres de génération</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <SliderField
                    label="Max Tokens"
                    field="max_tokens"
                    min={256}
                    max={MODELS.find(m => m.id === settings.model)?.maxTokens || 8192}
                    step={256}
                    tooltip="Nombre maximum de tokens dans la réponse (1 token ≈ 0.75 mot)"
                    marks={[
                      { value: 1024, label: '1K' },
                      { value: 4096, label: '4K' },
                      { value: 8192, label: '8K' }
                    ]}
                />

                <SliderField
                    label="Température"
                    field="temperature"
                    min={0}
                    max={2}
                    step={0.05}
                    tooltip="0 = déterministe, 2 = très créatif. Recommandé: 0.7 pour équilibre"
                    marks={[
                      { value: 0, label: 'Précis' },
                      { value: 1, label: 'Équilibré' },
                      { value: 2, label: 'Créatif' }
                    ]}
                />

                <SliderField
                    label="Top P"
                    field="top_p"
                    min={0}
                    max={1}
                    step={0.05}
                    tooltip="Nucleus sampling: ne considère que les tokens avec probabilité cumulée ≤ P"
                />

                <SliderField
                    label="Presence Penalty"
                    field="presence_penalty"
                    min={-2}
                    max={2}
                    step={0.1}
                    tooltip="Pénalise les nouveaux tokens selon leur présence dans le texte"
                />

                <SliderField
                    label="Frequency Penalty"
                    field="frequency_penalty"
                    min={-2}
                    max={2}
                    step={0.1}
                    tooltip="Pénalise les répétitions de tokens"
                />

                <FormControl fullWidth size="small" sx={{ mt: 1, mb: 2 }}>
                  <InputLabel sx={{ color: '#9090A8' }}>Effort de raisonnement</InputLabel>
                  <Select
                      value={settings.reasoning_effort}
                      onChange={(e) => setSettings(p => ({ ...p, reasoning_effort: e.target.value }))}
                      label="Effort de raisonnement"
                      sx={{ color: 'white' }}
                  >
                    <MenuItem value="low">Faible (plus rapide)</MenuItem>
                    <MenuItem value="medium">Moyen (équilibré)</MenuItem>
                    <MenuItem value="high">Élevé (plus précis)</MenuItem>
                  </Select>
                </FormControl>

                <FormControlLabel
                    control={
                      <Switch
                          checked={settings.stream}
                          onChange={(e) => setSettings(p => ({ ...p, stream: e.target.checked }))}
                          sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#7C3AED' } }}
                      />
                    }
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="body2">Streaming</Typography>
                        <Tooltip title="Affiche la réponse en temps réel">
                          <Info sx={{ fontSize: 14, color: '#6060A0' }} />
                        </Tooltip>
                      </Box>
                    }
                />
              </AccordionDetails>
            </Accordion>

            {/* System Prompt */}
            <Accordion
                sx={{
                  bgcolor: '#111118',
                  border: '1px solid #2A2A38',
                  mb: 2,
                  borderRadius: 2,
                  '&:before': { display: 'none' }
                }}
            >
              <AccordionSummary expandIcon={<ExpandMore sx={{ color: '#9090A8' }} />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SystemUpdate sx={{ fontSize: 18, color: '#F59E0B' }} />
                  <Typography sx={{ fontWeight: 600, color: 'white' }}>Prompt Système</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="caption" sx={{ color: '#9090A8', mb: 1.5, display: 'block' }}>
                  Définissez le comportement et la personnalité de l'assistant.
                </Typography>

                <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                  <InputLabel sx={{ color: '#9090A8' }}>Préréglages</InputLabel>
                  <Select
                      value=""
                      onChange={(e) => {
                        if (e.target.value) {
                          setSettings(p => ({ ...p, system_prompt: e.target.value }));
                        }
                      }}
                      label="Préréglages"
                      sx={{ color: 'white' }}
                  >
                    {PRESET_PROMPTS.map(preset => (
                        <MenuItem key={preset.label} value={preset.value}>
                          {preset.label}
                        </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                    multiline
                    rows={6}
                    fullWidth
                    placeholder="Tu es un assistant expert en..."
                    value={settings.system_prompt}
                    onChange={e => setSettings(p => ({ ...p, system_prompt: e.target.value }))}
                    sx={{
                      '& .MuiInputBase-root': {
                        bgcolor: '#1A1A24',
                      },
                      '& .MuiInputBase-input': {
                        fontSize: '0.82rem',
                        fontFamily: 'monospace',
                        color: 'white'
                      }
                    }}
                />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                  <Button
                      size="small"
                      startIcon={<RestartAlt />}
                      onClick={() => setSettings(p => ({ ...p, system_prompt: '' }))}
                      sx={{ color: '#9090A8' }}
                  >
                    Réinitialiser
                  </Button>
                  <Typography variant="caption" sx={{ color: '#6060A0' }}>
                    {settings.system_prompt.length} caractères
                  </Typography>
                </Box>
              </AccordionDetails>
            </Accordion>

            {/* Advanced Settings */}
            <Accordion
                sx={{
                  bgcolor: '#111118',
                  border: '1px solid #2A2A38',
                  mb: 2,
                  borderRadius: 2,
                  '&:before': { display: 'none' }
                }}
            >
              <AccordionSummary expandIcon={<ExpandMore sx={{ color: '#9090A8' }} />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Memory sx={{ fontSize: 18, color: '#10B981' }} />
                  <Typography sx={{ fontWeight: 600, color: 'white' }}>Paramètres avancés</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                  <InputLabel sx={{ color: '#9090A8' }}>Format de réponse</InputLabel>
                  <Select
                      value={settings.response_format}
                      onChange={(e) => setSettings(p => ({ ...p, response_format: e.target.value }))}
                      label="Format de réponse"
                      sx={{ color: 'white' }}
                  >
                    <MenuItem value="text">Texte</MenuItem>
                    <MenuItem value="json">JSON</MenuItem>
                    <MenuItem value="markdown">Markdown</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                    fullWidth
                    size="small"
                    label="Seed (optionnel)"
                    type="number"
                    value={settings.seed || ''}
                    onChange={(e) => setSettings(p => ({
                      ...p,
                      seed: e.target.value ? parseInt(e.target.value) : null
                    }))}
                    sx={{ mb: 2 }}
                    placeholder="Pour des résultats reproductibles"
                />

                <TextField
                    fullWidth
                    size="small"
                    label="Stop sequences"
                    placeholder="Séparez par des virgules"
                    value={settings.stop_sequences.join(', ')}
                    onChange={(e) => setSettings(p => ({
                      ...p,
                      stop_sequences: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                    }))}
                    helperText="Arrête la génération à ces séquences"
                />
              </AccordionDetails>
            </Accordion>

            {/* Info Box */}
            <Alert
                severity="info"
                sx={{
                  bgcolor: 'rgba(6, 182, 212, 0.1)',
                  color: '#90E0EF',
                  border: '1px solid #06B6D4',
                  '& .MuiAlert-icon': { color: '#06B6D4' }
                }}
            >
              Les paramètres affectent uniquement les nouveaux messages
            </Alert>
          </Box>

          {/* Footer */}
          <Box sx={{
            p: 2.5,
            borderTop: '1px solid #1E1E2A',
            background: 'rgba(18,18,24,0.95)',
            backdropFilter: 'blur(8px)'
          }}>
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<RestartAlt />}
                  onClick={resetToDefaults}
                  disabled={saving}
                  sx={{
                    borderColor: '#2A2A38',
                    color: '#9090A8',
                    '&:hover': { borderColor: '#7C3AED', color: '#7C3AED' }
                  }}
              >
                Réinitialiser
              </Button>
              <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<Speed />}
                  onClick={testSettings}
                  disabled={testing || saving}
                  sx={{
                    borderColor: '#2A2A38',
                    color: '#9090A8',
                    '&:hover': { borderColor: '#06B6D4', color: '#06B6D4' }
                  }}
              >
                {testing ? <CircularProgress size={20} /> : 'Tester'}
              </Button>
            </Box>

            <Button
                fullWidth
                variant="contained"
                startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveAlt />}
                onClick={save}
                disabled={saving || !hasChanges}
                sx={{
                  py: 1.2,
                  bgcolor: hasChanges ? '#7C3AED' : '#4A4A5A',
                  '&:hover': { bgcolor: hasChanges ? '#6D2ED9' : '#4A4A5A' }
                }}
            >
              {saving ? 'Sauvegarde...' : 'Sauvegarder les paramètres'}
            </Button>
          </Box>
        </Box>
      </Drawer>
  );
}