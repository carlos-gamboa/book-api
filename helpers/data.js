const uuid = require('uuid/v1');
const encrypter = require('sha256');
const parser = require('ua-parser-js');
const commons = require('./commons');

class Data {
  constructor() {
    this.users = [];
    this.books = {};
    this.sessions = {};
  }

  getAllUsers() {
    return this.users;
  }

  getBooksByCustomer(customer) {
    return this.books[customer];
  }

  /**
  * Check if a username is already taken.
  *
  * @param {string} username
  * @returns true if a user already has the same username.
  */
  userExists (username) {
    return this.users.some((user) => user.username === username);
  }

  /**
  * Checks if the username and password match an existing user.
  *
  * @param {string} username
  * @param {string} password
  * @returns true if the values match | false
  */
  login (username, password) {
    return this.users.find((user) => (user.username === username && user.password === encrypter(password)))
  }

  /**
  * Adds a new user to the users array. Also creates an empty Array of books
  * if the customer is new.
  *
  * @param {string} username
  * @param {string} password
  * @param {string} customer
  */
  createUser (username, password, customer) {
    this.users.push({
      customer: customer,
      username: username,
      password: encrypter(password),
      books: []
    });

    if (!this.books[customer]) {
      this.books[customer] = [];
    }
    if(!this.sessions[customer]) {
      this.sessions[username] = {};
    }
  }

  /**
  * Stores a session into a user's session array.
  *
  * @param {string} username
  * @param {string} token
  * @param {Object} ua User Agent
  */
  saveSession (username, token, ua) {
    const uaParsed = parser(ua);
    const sessionData = {
      browser: uaParsed.browser.name,
      os: uaParsed.os.name,
      device: uaParsed.device.vendor,
      iat: new Date()
    }
    this.sessions[username][token] = sessionData;
  }

  getCustomerByUsername (username) {
    const user = this.users.find((user) => user.username === username );
    return user.customer;
  }
  
  /**
  * Adds a book containing the param data to the customer's books array.
  * A new ID will be assigned to the book.
  *
  * @param {string} customer
  * @param {Object} book 
  * @returns The new book.
  */
  addBook (customer, book) {
    const id = uuid();
    const newBook = {
      ...book,
      id
    }
    this.books[customer].push(newBook);
    return newBook;
  }
  
  /**
  * Updates the information of a customer's book.
  *
  * @param {string} customer
  * @param {string} bookId
  * @param {Object} newData New data for the book.
  * @returns The updated book | null if the book doesn't exist.
  */
  updateBook (customer, bookId, newData) {
    const customerBooks = this.books[customer];
    const bookIndex = this.getBookIndexById(customerBooks, bookId);
    if (bookIndex !== -1) {
      const book = this.books[customer][bookIndex];
      const updatedBook = {
        ...book,
        ...newData
      }
      this.books[customer][bookIndex] = updatedBook;
      return updatedBook;
    }
    else {
      return null;
    }
  }
  
  /**
  * Gets a book from an Array of books based on the book ID.
  *
  * @param {Array} customerBooks Array where the book will be searched.
  * @param {string} bookId
  * @returns Book data | null
  */
  getBookById (customerBooks, bookId) {
    return customerBooks.find((book) => book.id === bookId );
  }
  
  /**
  * Gets the book's array index from an Array of books based on the book ID.
  *
  * @param {Array} customerBooks Array where the book will be searched.
  * @param {string} bookId
  * @returns if the book is found: Book's array index | -1 
  */
  getBookIndexById (customerBooks, bookId) {
    return customerBooks.findIndex((book) => book.id === bookId );
  }
  
  /**
  * Removes a book from the customer's book Array based on the book ID.
  *
  * @param {string} customer
  * @param {string} bookId
  * @returns true if the book was deleted | false
  */
  removeBookById (customer, bookId) {
    const customerBooks = this.books[customer];
    const bookIndex = this.getBookIndexById(customerBooks, bookId);
    if (bookIndex !== -1) {
      this.books[customer].splice(bookIndex, 1);
      return true;
    }
    return false;
  }

  /**
   * Checks if the session hasn't been revoked
   *
   * @param {string} username
   * @param {string} token
   * @returns true if the session is valid
   */
  isSessionValid(username, token) {
    return this.sessions[username][token] !== undefined;
  }

  getUserSessions (username) {
    return this.sessions[username];
  }

  deleteUserSession (username, token) {
    this.sessions[username][token] = undefined;
  }

  /**
  * Checks and removes all the expired tokens from a user
  *
  * @param {string} username
  */
  removeExpiredTokens (username) {
    const tokens = Object.keys(this.sessions[username]);
    for(const token of tokens) {
      try {
        commons.verifyToken(token, false);
      } 
      catch (error) {
        this.deleteUserSession(username, token);
      }
    }
  }
}

module.exports = new Data();