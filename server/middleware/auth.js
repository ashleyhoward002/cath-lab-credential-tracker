const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

const requireCoordinator = (req, res, next) => {
  if (!req.session.userId || !['coordinator', 'manager'].includes(req.session.userRole)) {
    return res.status(403).json({ error: 'Forbidden - Coordinator or Manager access required' });
  }
  next();
};

const requireManager = (req, res, next) => {
  if (!req.session.userId || !['coordinator', 'manager'].includes(req.session.userRole)) {
    return res.status(403).json({ error: 'Forbidden - Manager access required' });
  }
  next();
};

module.exports = { requireAuth, requireCoordinator, requireManager };
