const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  getMyMatches,
  getMatchCount,
  confirmMatch,
  denyMatch,
  getMyLinks,
  getLinkedTreeInfo,
} = require('../controllers/crossTreeController');

router.get('/matches',            auth, getMyMatches);
router.get('/matches/count',      auth, getMatchCount);
router.put('/matches/:id/confirm', auth, confirmMatch);
router.put('/matches/:id/deny',    auth, denyMatch);
router.get('/links',              auth, getMyLinks);
router.get('/tree/:viewCode',     auth, getLinkedTreeInfo);

module.exports = router;
