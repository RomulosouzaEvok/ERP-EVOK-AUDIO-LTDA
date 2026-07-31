import express from 'express';

const router = express.Router();

router.post('/n8n', (req, res) => {
  const signature = req.header('X-Evok-Signature');

  if (!signature) {
    res.status(400).json({
      success: false,
      error: 'Assinatura ausente',
    });
    return;
  }

  res.status(202).json({
    success: true,
    accepted: true,
    event: req.body?.event ?? null,
  });
});

export default router;
module.exports = router;
