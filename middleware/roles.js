const supporter = (req, res, next) => {
  if (req.user && req.user.role === 'supporter') return next();
  res.status(403).json({ message: 'Supporter access required' });
};

const creator = (req, res, next) => {
  if (req.user && req.user.role === 'creator') return next();
  res.status(403).json({ message: 'Creator access required' });
};

const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') return next();
  res.status(403).json({ message: 'Admin access required' });
};

module.exports = { supporter, creator, admin };
