const { Router } = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = uuidv4() + path.extname(file.originalname);
    cb(null, unique);
  }
});

const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

function canAccess(fileId, userId, writeRequired = false) {
  const file = db.prepare('SELECT * FROM files WHERE id = ?').get(fileId);
  if (!file) return null;

  if (file.owner_id === userId) return { ...file, permission: 'owner' };

  if (writeRequired) {
    const share = db.prepare('SELECT * FROM shares WHERE file_id = ? AND shared_with_id = ? AND permission = ?').get(fileId, userId, 'write');
    if (share) return { ...file, permission: 'write' };
    return null;
  }

  const share = db.prepare('SELECT * FROM shares WHERE file_id = ? AND shared_with_id = ?').get(fileId, userId);
  if (share) return { ...file, permission: share.permission };

  if (file.is_public) return { ...file, permission: 'public' };

  return null;
}

router.post('/upload', authenticate, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const id = uuidv4();
  const { filename, originalname, mimetype, size } = req.file;

  db.prepare(
    'INSERT INTO files (id, owner_id, filename, original_name, mime_type, size) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, req.user.id, filename, originalname, mimetype, size);

  res.status(201).json({ message: 'File uploaded', file: { id, original_name: originalname, size, mime_type: mimetype } });
});

router.get('/', authenticate, (req, res) => {
  const owned = db.prepare('SELECT * FROM files WHERE owner_id = ?').all(req.user.id);
  const sharedIds = db.prepare('SELECT file_id FROM shares WHERE shared_with_id = ?').all(req.user.id).map(s => s.file_id);
  let shared = [];
  if (sharedIds.length > 0) {
    const placeholders = sharedIds.map(() => '?').join(',');
    shared = db.prepare(`SELECT f.*, s.permission as shared_permission FROM files f JOIN shares s ON s.file_id = f.id WHERE f.id IN (${placeholders}) AND s.shared_with_id = ?`).all(...sharedIds, req.user.id);
  }
  res.json({ owned, shared });
});

router.get('/public', (req, res) => {
  const files = db.prepare('SELECT * FROM files WHERE is_public = 1').all();
  res.json({ files });
});

router.get('/:id', (req, res) => {
  const file = db.prepare('SELECT * FROM files WHERE id = ?').get(req.params.id);
  if (!file) return res.status(404).json({ error: 'File not found' });

  const canRead = file.is_public || (req.headers.authorization && (() => {
    try {
      const token = req.headers.authorization.split(' ')[1];
      const user = require('jsonwebtoken').verify(token, process.env.JWT_SECRET);
      return canAccess(req.params.id, user.id);
    } catch { return false; }
  })());

  if (!canRead) return res.status(403).json({ error: 'Access denied' });

  const filePath = path.join(__dirname, '..', 'uploads', file.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File data missing' });

  res.download(filePath, file.original_name);
});

router.patch('/:id/visibility', authenticate, (req, res) => {
  const file = db.prepare('SELECT * FROM files WHERE id = ? AND owner_id = ?').get(req.params.id, req.user.id);
  if (!file) return res.status(404).json({ error: 'File not found or not owned by you' });

  const { is_public } = req.body;
  db.prepare('UPDATE files SET is_public = ? WHERE id = ?').run(is_public ? 1 : 0, req.params.id);
  res.json({ message: 'Visibility updated' });
});

router.delete('/:id', authenticate, (req, res) => {
  const file = db.prepare('SELECT * FROM files WHERE id = ? AND owner_id = ?').get(req.params.id, req.user.id);
  if (!file) return res.status(404).json({ error: 'File not found or not owned by you' });

  const filePath = path.join(__dirname, '..', 'uploads', file.filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  db.prepare('DELETE FROM files WHERE id = ?').run(req.params.id);
  res.json({ message: 'File deleted' });
});

router.post('/:id/share', authenticate, (req, res) => {
  const file = db.prepare('SELECT * FROM files WHERE id = ? AND owner_id = ?').get(req.params.id, req.user.id);
  if (!file) return res.status(404).json({ error: 'File not found or not owned by you' });

  const { username, permission } = req.body;
  const targetUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (!targetUser) return res.status(404).json({ error: 'User not found' });
  if (targetUser.id === req.user.id) return res.status(400).json({ error: 'Cannot share with yourself' });

  const existing = db.prepare('SELECT * FROM shares WHERE file_id = ? AND shared_with_id = ?').get(req.params.id, targetUser.id);
  if (existing) {
    db.prepare('UPDATE shares SET permission = ? WHERE file_id = ? AND shared_with_id = ?').run(permission || 'read', req.params.id, targetUser.id);
    return res.json({ message: 'Share permission updated' });
  }

  const shareId = uuidv4();
  db.prepare('INSERT INTO shares (id, file_id, shared_with_id, permission) VALUES (?, ?, ?, ?)').run(shareId, req.params.id, targetUser.id, permission || 'read');
  res.status(201).json({ message: `File shared with ${username}` });
});

router.delete('/:id/share/:username', authenticate, (req, res) => {
  const file = db.prepare('SELECT * FROM files WHERE id = ? AND owner_id = ?').get(req.params.id, req.user.id);
  if (!file) return res.status(404).json({ error: 'File not found or not owned by you' });

  const targetUser = db.prepare('SELECT id FROM users WHERE username = ?').get(req.params.username);
  if (!targetUser) return res.status(404).json({ error: 'User not found' });

  db.prepare('DELETE FROM shares WHERE file_id = ? AND shared_with_id = ?').run(req.params.id, targetUser.id);
  res.json({ message: 'Share removed' });
});

module.exports = router;
