const http = require('node:http');
const { handleRequest } = require('./app');

const port = process.env.PORT || 3000;

http.createServer(handleRequest).listen(port, () => {
  console.log(`API escuchando en el puerto ${port}`);
});