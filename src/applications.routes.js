const { Router } = require('express');
const controller = require('./applications.controller');

const router = Router();
router.post('/', controller.create);
router.get('/', controller.list);
router.put('/:id/status', controller.changeStatus);

module.exports = router;