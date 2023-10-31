// Middleware to authenticate JWT token
const jwt = require('jsonwebtoken');
module.exports.authenticateJwt = (req, res, next) => {
    console.log('Headers:', req.headers);
    const authHeader = req.headers.authorization;
  
    if (authHeader) {
      const token = authHeader.split(' ')[1];
  
      jwt.verify(token, secretKey, (err, user) => {
        if (err) {
          return res.status(401).json({ message: 'Unauthorized' }); // Unauthorized
        }
  
        req.user = user;
        next();
      });
    } else {
      return res.status(403).json({ message: 'Forbidden' }); // Forbidden
    }
  };
  