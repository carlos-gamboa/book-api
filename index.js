const express = require('express');
const bodyParser = require("body-parser");
const cors = require('cors');
const app = express();
const data = require('./helpers/data');
const commons = require('./helpers/commons');

app.use(bodyParser.json());
app.use(cors());
app.use((req, res, next) => {
  if (commons.isPathPublic(req.path)) {
    next();
  } else {
    const token = req.headers['auth-token'];
    try {
      const tokenData = commons.verifyToken(token, false);
      if (data.isSessionValid(tokenData.username, token)) {
        req.username = tokenData.username;
        req.customer = tokenData.customer;
        next();
      } 
      else {
        res.status(401);
        res.send();
      }
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        const tokenData = commons.verifyToken(token, true);
        req.username = tokenData.username;
        data.deleteUserSession(tokenData.username, tokenData);
      }
      res.status(401);
      res.send();
    }
  }
});

app.get('/v2/user', (req, res) => {
  res.send(data.getAllUsers());
});

app.post('/v2/user', (req, res) => {
  const { username, password, customer } = req.body;
  if (commons.isDataValid([username, password, customer])) {
    if (!data.userExists(username)) {
      data.createUser(username, password, customer);
      res.status(200);
      res.send();
    } else {
      res.status(409);
      res.send();
    }
  } 
  else {
    res.status(400);
    res.send();
  }
});

app.post('/v2/user/login', (req, res) => {
  const { username, password } = req.body;
  if (commons.isDataValid([username, password])) {
    const user = data.login(username, password);
    if (user) {
      const token = commons.generateToken(user.username, user.customer);
      data.saveSession(user.username, token, req.headers['user-agent']);

      res.status(200);
      res.json({
        username: username,
        customer: data.getCustomerByUsername(username),
        token: token
      });
    }
    else {
      res.status(401);
      res.send();
    }
  } 
  else {
    res.status(400);
    res.send();
  }
});

app.post('/v2/user/renew', (req, res) => {
  const token = commons.generateToken(req.username, req.customer);
  data.saveSession(req.username, token, req.headers['user-agent']);
  res.json({
    token: token,
    username: req.username,
    customer: req.customer
  });
});

app.get('/v2/user/session', (req, res) => {
  data.removeExpiredTokens(req.username);
  res.status(200);
  res.json(data.getUserSessions(req.username));
});

app.delete('/v2/user/session/:sessionId', (req, res) => {
  data.deleteUserSession(req.username, req.params.sessionId)
  res.status(200);
  res.send();
});

app.route('/v2/book')
  .get((req, res) => {
    res.status(200);
    res.json(data.getBooksByCustomer(req.customer));
  })
  .post((req, res) => {
    const { name, author } = req.body;
    if (commons.isDataValid([name, author])) {
      const book = data.addBook(req.customer, {name: name, author: author});
      res.status(200);
      res.json(book);
    }
    else {
      res.status(400);
      res.send();
    }
  });

app.route('/v2/book/:bookId')
  .get((req, res) => {
    const book = data.getBookById(data.getBooksByCustomer(req.customer), req.params.bookId)
    if (book) {
      res.status(200);
      res.json(book);
    }
    else {
      res.status(404);
      res.send();
    }
  })
  .put((req, res) => {
    const token = req.headers['auth-token'];
    const legit = commons.verifyToken(token, false);
    const id = req.params.bookId;
    const updatedBook = data.updateBook(legit.customer, id, req.body);

    if (updatedBook) {
      res.status(200);
      res.json(updatedBook);
    }
    else {
      res.status(404);
      res.send();
    }
  })
  .delete((req, res) => {
    const token = req.headers['auth-token'];
    const legit = commons.verifyToken(token, false);
    const id = req.params.bookId;
    const customer = data.getCustomerByUsername(legit.username);
    const bookRemoved = data.removeBookById(customer, id);

    if (bookRemoved) {
      res.status(200);
      res.send();
    } 
    else {
      res.status(404);
    res.send();
    }
  });

app.get('/', (req, res) => {
  res.send('Server is running!');
});

app.listen(3000, () => {
  console.log('Book server listening on port 3000!');
});