const bcrypt = require('bcrypt');
const senha = '123456';
const hash = '$2b$12$KkixMezgp49UUz0Mx9E0suWBFMnbw725EOAo/S4UXPJhhs3Iu8LKu';
bcrypt.compare(senha, hash).then(console.log);