import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import pool from '../models/db.js';

const router = express.Router();

// Middleware de validation
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

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

// OPTIONS handler for preflight
router.options('*', (req, res) => {
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.sendStatus(200);
});

// POST /api/auth/login
router.post('/login',
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
    validate,
    async (req, res, next) => {
        try {
            const { email, password } = req.body;

            const [rows] = await pool.query(
                'SELECT * FROM users WHERE email = ? AND is_active = 1',
                [email]
            );

            const user = rows[0];

            if (!user || !(await bcrypt.compare(password, user.password_hash))) {
                return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
            }

            // Mettre à jour dernière activité
            await pool.query(
                'UPDATE users SET last_active_at = NOW() WHERE id = ?',
                [user.id]
            );

            const token = jwt.sign(
                {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    role: user.role
                },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );

            const refreshToken = jwt.sign(
                { id: user.id },
                process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
                { expiresIn: '30d' }
            );

            // Stocker refresh token (vous devrez peut-être ajouter cette colonne)
            try {
                await pool.query(
                    'UPDATE users SET refresh_token = ? WHERE id = ?',
                    [refreshToken, user.id]
                );
            } catch (err) {
                // Ignorer si la colonne n'existe pas
                console.log('Refresh token column not found');
            }

            res.json({
                token,
                refreshToken,
                user: {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    name: user.username,
                    role: user.role,
                    avatar_color: user.avatar_color,
                    avatar_initials: user.avatar_initials,
                    preferred_model: user.preferred_model,
                    preferred_max_tokens: user.preferred_max_tokens,
                    preferred_temperature: parseFloat(user.preferred_temperature)
                }
            });
        } catch (error) {
            next(error);
        }
    }
);

// POST /api/auth/register
router.post('/register',
    body('email').isEmail().normalizeEmail(),
    body('username').isLength({ min: 3, max: 50 }).trim(),
    body('password').isLength({ min: 8 }),
    validate,
    async (req, res, next) => {
        try {
            const { email, username, password } = req.body;

            // Vérifier si l'email existe déjà
            const [existingEmail] = await pool.query(
                'SELECT id FROM users WHERE email = ?',
                [email]
            );

            if (existingEmail.length > 0) {
                return res.status(400).json({ error: 'Email déjà utilisé' });
            }

            // Vérifier si le username existe déjà
            const [existingUsername] = await pool.query(
                'SELECT id FROM users WHERE username = ?',
                [username]
            );

            if (existingUsername.length > 0) {
                return res.status(400).json({ error: 'Nom d\'utilisateur déjà pris' });
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            const userId = uuidv4();

            // Générer les initiales pour l'avatar
            const initials = username
                .split(' ')
                .map(word => word[0])
                .join('')
                .toUpperCase()
                .substring(0, 2);

            const [result] = await pool.query(
                `INSERT INTO users (id, username, email, password_hash, avatar_initials, created_at)
         VALUES (?, ?, ?, ?, ?, NOW())`,
                [userId, username, email, hashedPassword, initials]
            );

            const token = jwt.sign(
                { id: userId, email, username, role: 'user' },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );

            res.status(201).json({
                token,
                user: {
                    id: userId,
                    email,
                    username,
                    name: username,
                    role: 'user',
                    avatar_initials: initials,
                    preferred_model: 'deepseek-chat',
                    preferred_max_tokens: 2048,
                    preferred_temperature: 0.7
                }
            });
        } catch (error) {
            next(error);
        }
    }
);

// POST /api/auth/refresh
router.post('/refresh', async (req, res, next) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(401).json({ error: 'Refresh token manquant' });
        }

        jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, async (err, decoded) => {
            if (err) {
                return res.status(403).json({ error: 'Refresh token invalide' });
            }

            const [rows] = await pool.query(
                'SELECT * FROM users WHERE id = ? AND is_active = 1',
                [decoded.id]
            );

            if (rows.length === 0) {
                return res.status(403).json({ error: 'Utilisateur non trouvé' });
            }

            const user = rows[0];

            const newToken = jwt.sign(
                {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    role: user.role
                },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );

            res.json({ token: newToken });
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/auth/logout
router.post('/logout', authenticateToken, async (req, res, next) => {
    try {
        // Optionnel: supprimer le refresh token
        try {
            await pool.query(
                'UPDATE users SET refresh_token = NULL WHERE id = ?',
                [req.user.id]
            );
        } catch (err) {
            // Ignorer si la colonne n'existe pas
        }
        res.json({ message: 'Déconnexion réussie' });
    } catch (error) {
        next(error);
    }
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req, res, next) => {
    try {
        const [rows] = await pool.query(
            `SELECT id, username, email, avatar_color, avatar_initials, role, 
              is_active, preferred_model, preferred_max_tokens, 
              preferred_temperature, preferred_language, total_messages_sent,
              total_tokens_used, last_active_at, created_at
       FROM users 
       WHERE id = ?`,
            [req.user.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        const user = rows[0];

        res.json({
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                name: user.username,
                role: user.role,
                avatar_color: user.avatar_color,
                avatar_initials: user.avatar_initials,
                preferred_model: user.preferred_model,
                preferred_max_tokens: user.preferred_max_tokens,
                preferred_temperature: parseFloat(user.preferred_temperature),
                preferred_language: user.preferred_language,
                total_messages_sent: user.total_messages_sent,
                total_tokens_used: user.total_tokens_used,
                last_active_at: user.last_active_at,
                created_at: user.created_at
            }
        });
    } catch (error) {
        next(error);
    }
});

// PUT /api/auth/preferences
router.put('/preferences', authenticateToken, async (req, res, next) => {
    try {
        const { preferred_model, preferred_max_tokens, preferred_temperature, preferred_language } = req.body;

        const updates = [];
        const values = [];

        if (preferred_model !== undefined) {
            updates.push('preferred_model = ?');
            values.push(preferred_model);
        }
        if (preferred_max_tokens !== undefined) {
            updates.push('preferred_max_tokens = ?');
            values.push(preferred_max_tokens);
        }
        if (preferred_temperature !== undefined) {
            updates.push('preferred_temperature = ?');
            values.push(preferred_temperature);
        }
        if (preferred_language !== undefined) {
            updates.push('preferred_language = ?');
            values.push(preferred_language);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'Aucune préférence à mettre à jour' });
        }

        values.push(req.user.id);

        await pool.query(
            `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
            values
        );

        const [rows] = await pool.query(
            'SELECT preferred_model, preferred_max_tokens, preferred_temperature, preferred_language FROM users WHERE id = ?',
            [req.user.id]
        );

        res.json({ preferences: rows[0] });
    } catch (error) {
        next(error);
    }
});

// PUT /api/auth/password
router.put('/password',
    authenticateToken,
    body('current_password').notEmpty(),
    body('new_password').isLength({ min: 8 }),
    validate,
    async (req, res, next) => {
        try {
            const { current_password, new_password } = req.body;

            const [rows] = await pool.query(
                'SELECT password_hash FROM users WHERE id = ?',
                [req.user.id]
            );

            const user = rows[0];

            if (!(await bcrypt.compare(current_password, user.password_hash))) {
                return res.status(401).json({ error: 'Mot de passe actuel incorrect' });
            }

            const hashedPassword = await bcrypt.hash(new_password, 10);

            await pool.query(
                'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
                [hashedPassword, req.user.id]
            );

            res.json({ message: 'Mot de passe mis à jour' });
        } catch (error) {
            next(error);
        }
    }
);

// GET /api/auth/check-email/:email
router.get('/check-email/:email',
    async (req, res, next) => {
        try {
            const { email } = req.params;

            const [rows] = await pool.query(
                'SELECT id FROM users WHERE email = ?',
                [email]
            );

            res.json({ available: rows.length === 0 });
        } catch (error) {
            next(error);
        }
    }
);

// GET /api/auth/check-username/:username
router.get('/check-username/:username',
    async (req, res, next) => {
        try {
            const { username } = req.params;

            const [rows] = await pool.query(
                'SELECT id FROM users WHERE username = ?',
                [username]
            );

            res.json({ available: rows.length === 0 });
        } catch (error) {
            next(error);
        }
    }
);

export default router;