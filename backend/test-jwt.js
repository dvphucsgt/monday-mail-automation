const jwt = require('jsonwebtoken');
const token = process.argv[2];
const secret = process.argv[3];
try {
  const decoded = jwt.verify(token, secret);
  console.log('Valid:', decoded);
} catch (e) {
  console.log('Error:', e.message);
}
