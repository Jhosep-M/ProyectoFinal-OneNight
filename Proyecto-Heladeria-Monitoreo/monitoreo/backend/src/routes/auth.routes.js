const { Router } = require('express');
const { authenticateJWT } = require('../middlewares/auth.middleware');
const { me } = require('../controllers/auth.controller');

const router = Router();
router.get('/me', authenticateJWT, me);

module.exports = { authRouter: router };
