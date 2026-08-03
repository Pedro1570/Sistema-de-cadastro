const bcrypt = require('bcrypt');
bcrypt.hash('123456', 12).then(hash => {
    console.log(hash);
});