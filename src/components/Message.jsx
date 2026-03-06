import { useState, memo, useCallback } from 'react';
import {
    Box, Typography, IconButton, Tooltip, Chip, Collapse, Avatar, Paper
} from '@mui/material';
import {
    ContentCopy, BookmarkAdded, BookmarkBorder, ThumbUp, ThumbDown,
    ExpandMore, ExpandLess, Check, Psychology, Person, Code, AccessTime
} from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { chatAPI } from '../utils/api';
import { useSnackbar } from 'notistack';
import { useTheme } from '@mui/material/styles';
import copyFormattedMarkdown from "../utils/copyMarkdown";

// ── Code block (theme-aware) ─────────────────────────────────────────────────
const CodeBlock = memo(function CodeBlock({ language, value }) {
    const [copied, setCopied] = useState(false);
    const theme   = useTheme();
    const isDark  = theme.palette.mode === 'dark';

    const copy = async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Box sx={{
            position: 'relative', my: 1.5, borderRadius: 2, overflow: 'hidden',
            border: '1px solid', borderColor: 'divider',
        }}>
            <Box sx={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                px: 2, py: 0.8,
                bgcolor: isDark ? '#1A1A28' : '#F0EEFF',
                borderBottom: '1px solid', borderColor: 'divider',
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Code sx={{ fontSize: 14, color: 'primary.main' }} />
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
                        {language || 'code'}
                    </Typography>
                </Box>
                <Tooltip title={copied ? 'Copié!' : 'Copier'}>
                    <IconButton size="small" onClick={copy} sx={{ color: copied ? 'success.main' : 'text.secondary' }}>
                        {copied ? <Check sx={{ fontSize: 14 }} /> : <ContentCopy sx={{ fontSize: 14 }} />}
                    </IconButton>
                </Tooltip>
            </Box>
            <SyntaxHighlighter
                language={language}
                style={isDark ? oneDark : oneLight}
                customStyle={{
                    margin: 0, borderRadius: 0, fontSize: '0.82rem',
                    background: isDark ? '#0D0D18' : '#FAFAFA',
                }}
                showLineNumbers
            >
                {value}
            </SyntaxHighlighter>
        </Box>
    );
});

// ── Build markdown components (receives theme tokens) ────────────────────────
function buildMdComponents(isDark) {
    return {
        code({ node, inline, className, children, ...props }) {
            const match    = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            const value    = String(children).replace(/\n$/, '');
            if (!inline && (match || value.includes('\n'))) {
                return <CodeBlock language={language} value={value} />;
            }
            return (
                <Box
                    component="code"
                    sx={{
                        px: 0.8, py: 0.2, borderRadius: 1, fontSize: '0.82em',
                        bgcolor: 'rgba(124,58,237,0.15)',
                        color: isDark ? '#C084FC' : '#7C3AED',
                        fontFamily: '"JetBrains Mono", monospace',
                    }}
                    {...props}
                >
                    {children}
                </Box>
            );
        },
        blockquote({ children }) {
            return (
                <Box sx={{
                    borderLeft: '3px solid #7C3AED', pl: 2, my: 1,
                    color: 'text.secondary', fontStyle: 'italic',
                }}>
                    {children}
                </Box>
            );
        },
        table({ children }) {
            return (
                <Box sx={{ overflowX: 'auto', my: 2 }}>
                    <Box component="table" sx={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.85rem' }}>
                        {children}
                    </Box>
                </Box>
            );
        },
        th({ children }) {
            return (
                <Box component="th" sx={{
                    border: '1px solid', borderColor: 'divider',
                    px: 2, py: 1,
                    bgcolor: 'rgba(124,58,237,0.1)',
                    fontWeight: 600, textAlign: 'left',
                    color: 'text.primary',
                }}>
                    {children}
                </Box>
            );
        },
        td({ children }) {
            return (
                <Box component="td" sx={{
                    border: '1px solid', borderColor: 'divider',
                    px: 2, py: 1,
                    color: 'text.primary',
                }}>
                    {children}
                </Box>
            );
        },
    };
}

// ── Streaming bubble ─────────────────────────────────────────────────────────
function StreamingBubble({ content }) {
    const theme  = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const mdComponents = buildMdComponents(isDark);

    return (
        <Box sx={{
            color: 'text.primary',
            lineHeight: 1.7,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            '& p': { m: 0 },
        }}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    ...mdComponents,
                    p: ({ children }) => <span>{children}</span>,
                }}
            >
                {content}
            </ReactMarkdown>
            {/* Blinking cursor */}
            <Box
                component="span"
                sx={{
                    display: 'inline-block', width: 7, height: 15,
                    ml: '2px', mb: '-2px',
                    bgcolor: 'primary.light',
                    borderRadius: '2px',
                    animation: 'cursorBlink 0.8s step-end infinite',
                    '@keyframes cursorBlink': {
                        '0%,100%': { opacity: 1 },
                        '50%':     { opacity: 0 },
                    },
                }}
            />
        </Box>
    );
}

// ── Finished bubble ──────────────────────────────────────────────────────────
function FinishedBubble({ content }) {
    const theme  = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const mdComponents = buildMdComponents(isDark);

    return (
        <Box sx={{
            color: 'text.primary',
            '& p':            { mt: 0, mb: 1, lineHeight: 1.7 },
            '& p:last-child': { mb: 0 },
            '& h1,h2,h3,h4':  { color: 'text.primary', mt: 1.5, mb: 1, fontWeight: 600 },
            '& ul,ol':         { pl: 2.5, mb: 1 },
            '& li':            { mb: 0.5 },
            '& a':             { color: 'primary.light', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } },
            '& hr':            { border: 'none', borderTop: '1px solid', borderColor: 'divider', my: 2 },
            '& strong':        { color: 'text.primary', fontWeight: 700 },
        }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                {content}
            </ReactMarkdown>
        </Box>
    );
}

// ── Main Message component ────────────────────────────────────────────────────
const Message = memo(function Message({ message, isStreaming }) {
    const [showReasoning, setShowReasoning] = useState(false);
    const [copied, setCopied]               = useState(false);
    const [bookmarked, setBookmarked]       = useState(!!message.is_bookmarked);
    const [reaction, setReaction]           = useState(message.reaction);
    const { enqueueSnackbar }               = useSnackbar();
    const theme  = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const isUser = message.role === 'user';

    const copy = useCallback(async () => {
        await copyFormattedMarkdown(message.content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, [message.content]);

    const toggleBookmark = useCallback(async () => {
        try {
            await chatAPI.bookmarkMessage(message.id);
            setBookmarked(p => !p);
            enqueueSnackbar(bookmarked ? 'Retiré des favoris' : 'Ajouté aux favoris', { variant: 'success' });
        } catch {}
    }, [message.id, bookmarked]);

    const handleReaction = useCallback(async (r) => {
        const next = reaction === r ? null : r;
        try {
            await chatAPI.reactToMessage(message.id, next);
            setReaction(next);
        } catch {}
    }, [message.id, reaction]);

    return (
        <Box sx={{
            display: 'flex',
            flexDirection: isUser ? 'row-reverse' : 'row',
            gap: 1.5, mb: 3, alignItems: 'flex-start',
            px: { xs: 1, md: 2 },
            animation: 'fadeSlideIn 0.25s ease',
            '@keyframes fadeSlideIn': { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'none' } },
        }}>
            {/* Avatar */}
            <Avatar sx={{
                width: 32, height: 32, flexShrink: 0, mt: 0.5,
                bgcolor: isUser ? 'primary.main' : (isDark ? '#1A1A28' : '#EDE9FE'),
                border: isUser ? 'none' : '1px solid',
                borderColor: 'divider',
            }}>
                {isUser
                    ? <Person sx={{ fontSize: 18, color: 'white' }} />
                    : <Psychology sx={{ fontSize: 18, color: 'primary.light' }} />
                }
            </Avatar>

            <Box sx={{ maxWidth: '80%', minWidth: 60 }}>

                {/* Reasoning block (DeepSeek R1) */}
                {message.reasoning_content && (
                    <Paper sx={{
                        mb: 1, p: 1.5, borderRadius: 2,
                        background: 'rgba(6,182,212,0.05)',
                        border: '1px solid rgba(6,182,212,0.2)',
                    }}>
                        <Box
                            sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', mb: showReasoning ? 1 : 0 }}
                            onClick={() => setShowReasoning(p => !p)}
                        >
                            <Psychology sx={{ fontSize: 14, color: '#06B6D4' }} />
                            <Typography variant="caption" sx={{ color: '#06B6D4', fontWeight: 600 }}>Raisonnement interne</Typography>
                            {showReasoning
                                ? <ExpandLess sx={{ fontSize: 14, color: '#06B6D4' }} />
                                : <ExpandMore  sx={{ fontSize: 14, color: '#06B6D4' }} />
                            }
                        </Box>
                        <Collapse in={showReasoning}>
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontStyle: 'italic', lineHeight: 1.6, display: 'block' }}>
                                {message.reasoning_content}
                            </Typography>
                        </Collapse>
                    </Paper>
                )}

                {/* Message bubble */}
                <Box sx={{
                    p: 2,
                    borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    // User bubble: always purple gradient (readable on both themes)
                    background: isUser
                        ? 'linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)'
                        : (isDark ? '#16161F' : '#FFFFFF'),
                    border: isUser ? 'none' : '1px solid',
                    borderColor: isUser ? 'transparent' : 'divider',
                    boxShadow: isUser
                        ? '0 4px 20px rgba(124,58,237,0.3)'
                        : (isDark ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(124,58,237,0.06)'),
                }}>
                    {isUser ? (
                        // User text always white (on purple background)
                        <Typography sx={{ color: 'white', lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                            {message.content}
                        </Typography>
                    ) : isStreaming ? (
                        <StreamingBubble content={message.content} />
                    ) : (
                        <FinishedBubble content={message.content} />
                    )}
                </Box>

                {/* Hover actions */}
                {!isStreaming && (
                    <Box sx={{
                        display: 'flex', gap: 0.5, mt: 0.5,
                        justifyContent: isUser ? 'flex-end' : 'flex-start',
                        opacity: 0, transition: 'opacity 0.15s',
                        '.message-wrapper:hover &': { opacity: 1 },
                    }}>
                        <Tooltip title={copied ? 'Copié!' : 'Copier'}>
                            <IconButton size="small" onClick={copy} sx={{ color: 'text.disabled', p: 0.5 }}>
                                {copied
                                    ? <Check sx={{ fontSize: 14, color: 'success.main' }} />
                                    : <ContentCopy sx={{ fontSize: 14 }} />
                                }
                            </IconButton>
                        </Tooltip>
                        {!isUser && (
                            <>
                                <Tooltip title={bookmarked ? 'Retirer des favoris' : 'Ajouter aux favoris'}>
                                    <IconButton size="small" onClick={toggleBookmark} sx={{ color: bookmarked ? 'warning.main' : 'text.disabled', p: 0.5 }}>
                                        {bookmarked ? <BookmarkAdded sx={{ fontSize: 14 }} /> : <BookmarkBorder sx={{ fontSize: 14 }} />}
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Utile">
                                    <IconButton size="small" onClick={() => handleReaction('like')} sx={{ color: reaction === 'like' ? 'success.main' : 'text.disabled', p: 0.5 }}>
                                        <ThumbUp sx={{ fontSize: 14 }} />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Pas utile">
                                    <IconButton size="small" onClick={() => handleReaction('dislike')} sx={{ color: reaction === 'dislike' ? 'error.main' : 'text.disabled', p: 0.5 }}>
                                        <ThumbDown sx={{ fontSize: 14 }} />
                                    </IconButton>
                                </Tooltip>
                            </>
                        )}
                    </Box>
                )}

                {/* Token / time metadata */}
                {!isUser && (message.tokens_used || message.tokens) > 0 && !isStreaming && (
                    <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                        <Chip
                            icon={<AccessTime sx={{ fontSize: 10 }} />}
                            label={`${message.generation_time_ms ?? '-'}ms`}
                            size="small"
                            sx={{
                                height: 18, fontSize: '0.65rem',
                                bgcolor: 'rgba(124,58,237,0.1)', color: 'text.secondary',
                                '& .MuiChip-icon': { fontSize: '10px !important', color: 'text.secondary' },
                            }}
                        />
                        <Chip
                            label={`${message.tokens_used ?? message.tokens ?? 0} tokens`}
                            size="small"
                            sx={{ height: 18, fontSize: '0.65rem', bgcolor: 'rgba(6,182,212,0.1)', color: 'text.secondary' }}
                        />
                    </Box>
                )}
            </Box>
        </Box>
    );
});

export default Message;