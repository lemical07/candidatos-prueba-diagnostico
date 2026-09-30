const express = require('express');
const routes = require('./applications.routes');
const errorHandler = require('./errorHandler');

const app = express();
app.use(express.json({ limit: '50kb' }));
app.use('/applications', routes);
app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));
app.use(errorHandler);

module.exports = app;