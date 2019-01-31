const express = require('express');
const bodyParser = require("body-parser");
const cors = require('cors');
const jwt = require('jsonwebtoken');
const uuid = require('uuid/v1');
const app = express();
app.use(bodyParser.json());

const users = [];
const books = {};
const secret = '9.P3rGzv,h9B5W diu4#R|,0fuJw]PpQ40]:d1Qzd@7=oTz%Dbm5,Znj*4CBj=KL';
const tokenOptions = {
  expiresIn: 60 * 5
}

const dataIsValid = (data) => {
  let valid = true;
  let i = 0;
  while (valid && i < data.length) {
    if (!data[i] || data[i] === '') {
      valid = false;
    }
    ++i;
  }
  return valid;
}

const generateToken = (username, customer) => {
  const tokenData = {
    username: username,
    customer: customer
  };
 
  return jwt.sign(tokenData, secret, tokenOptions)
}

const userExists = (username) => {
  return users.some((user) => user.username === username);
}

const createUser = (username, password, customer) => {
  users.push({
    customer: customer,
    username: username,
    password: password,
    books: []
  });

  if (!books[customer]) {
    books[customer] = [];
  }
}

const login = (username, password) => {
  return users.find((user) => (user.username === username && user.password === password))
}

const getCustomerByUser = (username) => {
  const user = users.find((user) => user.username === username );
  return user.customer;
}

const addBook = (customer, book) => {
  const id = uuid();
  const newBook = {
    ...book,
    id
  }
  books[customer].push(newBook);
  return newBook;
}

const updateBook = (customer, bookId, newData) => {
  const customerBooks = books[customer];
  const bookIndex = getBookIndexById(customerBooks, bookId)
  const book = books[customer][bookIndex];
  const updatedBook = {
    ...book,
    ...newData
  }
  books[customer][bookIndex] = updatedBook;
  return updatedBook;
}

const getBookById = (customerBooks, bookId) => {
  return customerBooks.find((book) => book.id === bookId );
}

const getBookIndexById = (customerBooks, bookId) => {
  return customerBooks.findIndex((book) => book.id === bookId );
}

const removeBookById = (customer, bookId) => {
  const customerBooks = books[customer];
  const bookIndex = getBookIndexById(customerBooks, bookId);
  books[customer].splice(bookIndex, 1);
}

const isPublicPath = (path) => {
  return (path === '/v2/user' || path === '/v2/user/login');
}

app.use(cors(), (req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  if (isPublicPath(req.path)) {
    next();
  } else {
    try {
      const token = req.headers['auth-token'];
      const tokenData = jwt.verify(token, secret, tokenOptions);
      req.username = tokenData.username;
      req.customer = tokenData.customer;
      next();
    } catch (e) {
      res.status(401);
      res.send();
    }
  }
});

app.get('/v2/user', (req, res) => {
  res.send(users);
});

app.post('/v2/user', (req, res) => {
  const { username, password, customer } = req.body;
  if (dataIsValid([username, password, customer])) {
    if (!userExists(username)) {
      createUser(username, password, customer);
      res.status(200);
      res.send();
    } else {
      res.status(405);
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
  if (dataIsValid([username, password])) {
    const user = login(username, password);
    if (user) {
      res.status(200);
      res.json({
        username: username,
        customer: getCustomerByUser(username),
        token: generateToken(user.username, user.customer)
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
  res.json({
    token: generateToken(req.username, req.customer),
    username: req.username,
    customer: req.customer
  });
});

app.route('/v2/book')
  .get((req, res) => {
    res.status(200);
    res.json(books[req.customer]);
  })
  .post((req, res) => {
    const { name, author } = req.body;
    if (dataIsValid([name, author])) {
      const book = addBook(req.customer, {name: name, author: author});
      res.status(200);
      res.json(book);
    }
    else {
      res.status(400);
      res.send();
    }
  });

app.route('/v2/book/:id')
  .get((req, res) => {
    const book = getBookById(books[req.customer], req.params.id)
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
    const legit = jwt.verify(token, secret, tokenOptions);
    const id = req.params.id;
    const updatedBook = updateBook(legit.customer, id, req.body);

    res.status(200);
    res.json(updatedBook);
  })
  .delete((req, res) => {
    const token = req.headers['auth-token'];
    const legit = jwt.verify(token, secret, tokenOptions);
    const id = req.params.id;
    const customer = getCustomerByUser(legit.username);
    removeBookById(customer, id);

    res.status(200);
    res.send();
  });

app.get('/', (req, res) => {
  res.send('Server is running!');
});

app.listen(3000, () => {
  console.log('Book server listening on port 3000!');
});