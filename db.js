// db.js
import mariadb from 'mariadb';
import dotenv from 'dotenv';

// 1. Carrega as variáveis do arquivo .env para o process.env
dotenv.config();

function conectarBanco() {
    // 2. Cria o pool de conexões usando as variáveis carregadas
    const con = mariadb.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
        port: Number(process.env.DB_PORT) || 3306 // Força a conversão para número
    });
    return con;
}

export default conectarBanco;