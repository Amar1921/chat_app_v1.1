import jwt from 'jsonwebtoken';
import { queryOne } from '../models/db.js';

export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token manquant' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ FIX: était decoded.userId — le token est signé avec { id: ... } dans auth.js
    const user = await queryOne(
        'SELECT id, username, email, role, is_active, preferred_model, preferred_max_tokens, preferred_temperature, preferred_language, avatar_color, avatar_initials, total_tokens_used FROM users WHERE id = ?',
        [decoded.id]
    );

    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Utilisateur non trouvé ou désactivé' });
    }

    // Update last active
    await queryOne('UPDATE users SET last_active_at = NOW() WHERE id = ?', [user.id]);

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expiré' });
    }
    return res.status(401).json({ error: 'Token invalide' });
  }
}

export function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return next();
  authenticate(req, res, next);
}