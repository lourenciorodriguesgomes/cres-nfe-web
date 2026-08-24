const mysql = require('mysql2/promise');


require('dotenv').config();
console.log('SENHA LIDA DO .ENV:', process.env.DB_PASSWORD || '(VAZIA ou não definida)');





const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || process.env.DB_HOST || 'localhost',
  user: process.env.MYSQL_USER || process.env.DB_USER || 'root',
  password: process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || process.env.DB_NAME || 'unoparnovo',
  port: process.env.MYSQL_PORT || process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
  connectTimeout: 60000
});

async function Conectar() {
  return pool.getConnection();
}

module.exports = { pool, Conectar };