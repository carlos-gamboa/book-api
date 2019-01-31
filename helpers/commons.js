const jwt = require('jsonwebtoken');

const secret = '9.P3rGzv,h9B5W diu4#R|,0fuJw]PpQ40]:d1Qzd@7=oTz%Dbm5,Znj*4CBj=KL';
const tokenOptions = {
  expiresIn: 60 * 5
}

class Commons {

  isPathPublic (path) {
    return (path === '/v2/user' || path === '/v2/user/login');
  }

  /**
  * Check if the data received is a string with at least 11 character.
  *
  * @param {Array} data Array with the request data.
  * @returns true if data is valid | false
  */
  isDataValid (data) {
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

  verifyToken (token, ignoreExpiration) {
    try {
      return jwt.verify(token, secret, {...tokenOptions, ignoreExpiration: ignoreExpiration});
    }
    catch (error) {
      throw error;
    }
  }

  /**
  * Generates a JWT based on a username and customer.
  *
  * @param {string} username 
  * @param {string} customer
  * @returns JWT
  */
  generateToken (username, customer) {
    const tokenData = {
      username: username,
      customer: customer
    };
  
    return jwt.sign(tokenData, secret, tokenOptions)
  }
}

module.exports = new Commons();