'use strict';

const express = require('express');
const app = express();
const redis = require('redis');
const redisClient = redis.createClient();
const shortener = require('./link_shortener');
const bodyparse = require('body-parser');
const handlebars = require('express-handlebars');
const server = require('http').createServer(app);
const io = require('socket.io')(server);

app.use(
  '/socket.io',
  express.static(__dirname + 'node_modules/socket.io-client/dist/')
);

const hbs = handlebars.create({
  defaultLayout: 'main'
});

app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');

app.use(bodyparse());

app.get('/', (req, res) => {
  res.render('index');
});

app.post('/', (req, res, next) => {
  let url = req.body.original_url;
  let short_url = shortener(url);
  redisClient.set(short_url[0], short_url[1], err => {
    if (err) {
      next(err);
    } else {
      let redKeys = redisClient.keys('*', (err, keys) => {
        if (err) {
          console.error(err);
        } else {
          console.log(keys);
          let originalUrls = [];
          for (let i = 0; i < keys.length; i++) {
            originalUrls.push(keys[i]);
          }
          console.log(originalUrls);
          return keys;
        }
      });
    }
  });
});

app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }
  if (err.stack) {
    err = err.stack;
  }
  res.status(500).json({ error: err });
});

let count = 0;

io.on('connection', client => {
  client.emit('new count', count);

  //increment
  client.on('increment', () => {
    count++;
    io.emit('new count', count); //emit count to all clients connected to this socket
  });
});

server.listen(3000);
