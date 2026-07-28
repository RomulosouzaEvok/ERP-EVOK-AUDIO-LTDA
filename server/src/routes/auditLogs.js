const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const authz = require('../middlewares/auth').authorize;

// Dynamic import to avoid circular dependency
let auditController;
const getController = () => {
  if (!auditController) {
    auditController = require('../controllers/auditLogController');
  }
  return auditController;
};

router.get('/', auth, authz('admin'), async (req, res, next) => {
  try {
    const ctrl = getController();
    await ctrl.list(req, res);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', auth, authz('admin'), async (req, res, next) => {
  try {
    const ctrl = getController();
    await ctrl.getById(req, res);
  } catch (error) {
    next(error);
  }
});

module.exports = router;

