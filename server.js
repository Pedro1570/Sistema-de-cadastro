/**
 * ════════════════════════════════════════════════════════════
 * SERVER.JS — Sistema Eleitoral de Campo
 * Node.js + Express + MySQL + JWT
 * ════════════════════════════════════════════════════════════
 *
 * Instalar dependências (rode UMA vez):
 *   npm install express mysql2 jsonwebtoken bcryptjs cors dotenv
 *
 * Iniciar servidor:
 *   node server.js
 * ════════════════════════════════════════════════════════════
 */

require('dotenv').config();
const express    = require('express');
const mysql      = require('mysql2/promise');
const jwt        = require('jsonwebtoken');
const bcrypt     = require('bcryptjs');
const cors       = require('cors');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── JWT secret ────────────────────────────────────────────────
const JWT_SECRET  = process.env.JWT_SECRET  || '';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '12h';

// ════════════════════════════════════════════════════════════
// CORS — permite o Live Server (5500) e qualquer localhost
// ════════════════════════════════════════════════════════════
app.use(cors({
  origin: function(origin, callback) {
    // Permite requisições sem origin (Postman, apps mobile, etc.)
    if (!origin) return callback(null, true);

    const permitidos = [
      /^http:\/\/localhost(:\d+)?$/,
      /^http:\/\/127\.0\.0\.1(:\d+)?$/,
      /^http:\/\/10\.0\.2\.2(:\d+)?$/,
      /^https:\/\/cad-astro.com(:\d+)?$/,
    ];

    const ok = permitidos.some(r => r.test(origin));
    if (ok) {
      callback(null, true);
    } else {
      // Em produção, adicione seu domínio aqui
      callback(null, true); // liberado para todos por enquanto
    }
  },
  credentials: true,
  methods:     ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// ════════════════════════════════════════════════════════════
// BANCO DE DADOS — MySQL
// ════════════════════════════════════════════════════════════
const dbConfig = {
  host:     process.env.DB_HOST     || 'localhost',
  port:     process.env.DB_PORT     || 3306,
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASS     || '',        // 
  database: process.env.DB_NAME     || 'eleitorall',
  charset:  'utf8mb4',
  timezone: '-03:00',
  waitForConnections: true,
  connectionLimit:    10,
};

let pool;

async function conectarBanco() {
  try {
    pool = await mysql.createPool(dbConfig);
    // Testa a conexão
    const conn = await pool.getConnection();
    console.log('✅ MySQL conectado:', dbConfig.host + ':' + dbConfig.port + '/' + dbConfig.database);
    conn.release();
  } catch (err) {
    console.error('❌ Erro ao conectar MySQL:', err.message);
    console.error('   Verifique DB_HOST, DB_USER, DB_PASS e DB_NAME no .env ou no topo do server.js');
    process.exit(1);
  }
}

// ════════════════════════════════════════════════════════════
// MIDDLEWARE — Verificar JWT
// ════════════════════════════════════════════════════════════
function autenticar(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ erro: 'Token não fornecido' });
  }
  try {
    req.usuario = jwt.verify(auth.split(' ')[1], JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ erro: 'Token inválido ou expirado' });
  }
}

function apenasAdm(req, res, next) {
  if (req.usuario.role !== 'adm') return res.status(403).json({ erro: 'Acesso restrito ao administrador' });
  next();
}

function admOuCoord(req, res, next) {
  if (!['adm', 'coord'].includes(req.usuario.role)) return res.status(403).json({ erro: 'Sem permissão' });
  next();
}

// ════════════════════════════════════════════════════════════
// ROTA RAIZ — Health check (resolve o 404 no ping)
// ════════════════════════════════════════════════════════════
const path = require('path');

app.use(express.static(path.join(__dirname, 'frontend')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// ════════════════════════════════════════════════════════════
// AUTH — Login
// ════════════════════════════════════════════════════════════
app.post('/login', async (req, res) => {
  const { usuario, senha } = req.body;
  if (!usuario || !senha) return res.status(400).json({ erro: 'Usuário e senha obrigatórios' });

  try {
    const [rows] = await pool.query(
      `SELECT u.*, c.nome AS coordenador_nome
       FROM usuarios u
       LEFT JOIN usuarios c ON c.id = u.coordenador_id
       WHERE u.usuario = ? AND u.ativo = 1 LIMIT 1`,
      [usuario]
    );

    if (!rows.length) return res.status(401).json({ erro: 'Usuário ou senha incorretos' });

    const user = rows[0];
    
    const senhaOk = await bcrypt.compare(senha, user.senha);
    if (!senhaOk) return res.status(401).json({ erro: 'Usuário ou senha incorretos' });

    const payload = { id: user.id, nome: user.nome, role: user.role, usuario: user.usuario };
    const token   = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });

    res.json({
      token,
      usuario: { id: user.id, nome: user.nome, role: user.role, usuario: user.usuario }
    });
  } catch (err) {
    console.error('/login:', err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// ════════════════════════════════════════════════════════════
// CADASTROS
// ════════════════════════════════════════════════════════════

// GET /cadastros — lista conforme role
app.get('/cadastros', autenticar, async (req, res) => {
  try {
    let sql, params = [];

    if (req.usuario.role === 'adm') {
      // Admin vê todos
      sql = `
        SELECT c.*,
               c.cadastrado_por AS agente_nome,
               u2.nome          AS coord_nome
        FROM cadastros c
        LEFT JOIN usuarios u  ON u.usuario  = c.cadastrado_por
        LEFT JOIN usuarios u2 ON u2.id      = c.coordenador_id
        ORDER BY c.criado_em DESC`;

    } else if (req.usuario.role === 'coord') {
      // Coord vê os da sua equipe
      sql = `
        SELECT c.*,
               c.cadastrado_por AS agente_nome,
               ? AS coord_nome
        FROM cadastros c
        WHERE c.coordenador_id = ?
        ORDER BY c.criado_em DESC`;
      params = [req.usuario.nome, req.usuario.id];

    } else {
      // Campo vê só os seus
      sql = `
        SELECT c.*, c.cadastrado_por AS agente_nome
        FROM cadastros c
        WHERE c.cadastrado_por = ?
        ORDER BY c.criado_em DESC`;
      params = [req.usuario.usuario];
    }

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('GET /cadastros:', err);
    res.status(500).json({ erro: 'Erro ao buscar cadastros' });
  }
});

// POST /cadastros — criar
app.post('/cadastros', autenticar, async (req, res) => {
  const {
    anfitriao, telefone, endereco, numero_casa, bairro,
    sexo, idade, intencao_voto, obs_voto, adesivamento, qtd_moradores,
    moradores, observacao
  } = req.body;

  if (!anfitriao) return res.status(400).json({ erro: 'Nome do anfitrião é obrigatório' });

  try {
    // Buscar coordenador_id do agente de campo
    let coordenadorId = null;
    if (req.usuario.role === 'campo') {
      const [u] = await pool.query('SELECT coordenador_id FROM usuarios WHERE id = ?', [req.usuario.id]);
      coordenadorId = u[0]?.coordenador_id || null;
    } else if (req.usuario.role === 'coord') {
      coordenadorId = req.usuario.id;
    }

    const [result] = await pool.query(
      `INSERT INTO cadastros
        (anfitriao, telefone, endereco, numero_casa, bairro, sexo, idade,
         intencao_voto, obs_voto, adesivamento, qtd_moradores, moradores, observacao,
         cadastrado_por, coordenador_id)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        anfitriao,
        telefone   || null,
        endereco   || null,
        numero_casa|| null,
        bairro     || null,
        sexo       || null,
        idade      ? Number(idade) : null,
        intencao_voto || null,
        obs_voto      || null,
        adesivamento  || null,
        qtd_moradores ? Number(qtd_moradores) : 1,
        moradores  || null,
        observacao || null,
        req.usuario.usuario,
        coordenadorId,
      ]
    );

    res.status(201).json({ id: result.insertId, mensagem: 'Cadastro salvo com sucesso' });
  } catch (err) {
    console.error('POST /cadastros:', err);
    res.status(500).json({ erro: 'Erro ao salvar cadastro' });
  }
});

// ════════════════════════════════════════════════════════════
// USUÁRIOS
// ════════════════════════════════════════════════════════════

// GET /usuarios — admin vê todos; coord vê só sua equipe
app.get('/usuarios', autenticar, admOuCoord, async (req, res) => {
  try {
    let sql, params = [];

    if (req.usuario.role === 'adm') {
      sql = `
        SELECT u.id, u.nome, u.usuario, u.role, u.ativo, u.criado_em,
               c.nome AS coordenador_nome
        FROM usuarios u
        LEFT JOIN usuarios c ON c.id = u.coordenador_id
        WHERE u.role <> 'adm'
        ORDER BY u.role, u.nome`;
    } else {
      sql = `
        SELECT u.id, u.nome, u.usuario, u.role, u.ativo, u.criado_em,
               ? AS coordenador_nome
        FROM usuarios u
        WHERE u.coordenador_id = ? AND u.role = 'campo'
        ORDER BY u.nome`;
      params = [req.usuario.nome, req.usuario.id];
    }

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('GET /usuarios:', err);
    res.status(500).json({ erro: 'Erro ao buscar usuários' });
  }
});

// POST /usuarios — criar novo usuário (adm cria coord/campo; coord cria campo)
app.post('/usuarios', autenticar, admOuCoord, async (req, res) => {
  const { nome, usuario, senha, role } = req.body;
  if (!nome || !usuario || !senha || !role) return res.status(400).json({ erro: 'Preencha todos os campos' });
  if (senha.length < 6) return res.status(400).json({ erro: 'Senha mínima 6 caracteres' });

  // Coord só pode criar agentes de campo
  if (req.usuario.role === 'coord' && role !== 'campo') {
    return res.status(403).json({ erro: 'Coordenador só pode criar agentes de campo' });
  }

  try {
    const [existe] = await pool.query('SELECT id FROM usuarios WHERE usuario = ?', [usuario]);
    if (existe.length) return res.status(409).json({ erro: 'Usuário já existe' });

    const hash = await bcrypt.hash(senha, 12);
    const coordId = req.usuario.role === 'coord' ? req.usuario.id : null;

    await pool.query(
      'INSERT INTO usuarios (nome, usuario, senha, role, coordenador_id) VALUES (?,?,?,?,?)',
      [nome, usuario, hash, role, coordId]
    );

    res.status(201).json({ mensagem: 'Usuário criado com sucesso' });
  } catch (err) {
    console.error('POST /usuarios:', err);
    res.status(500).json({ erro: 'Erro ao criar usuário' });
  }
});

// ════════════════════════════════════════════════════════════
// RELATÓRIO — usado pelo painel admin
// ════════════════════════════════════════════════════════════
app.get('/relatorio', autenticar, apenasAdm, async (req, res) => {
  try {
    const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM cadastros');

    const [porVoto] = await pool.query(`
      SELECT COALESCE(intencao_voto, 'Não informado') AS candidato, COUNT(*) AS qtd
      FROM cadastros
      GROUP BY candidato
      ORDER BY qtd DESC`);

    const [porAdesivamento] = await pool.query(`
      SELECT COALESCE(adesivamento, 'Não informado') AS adesivamento, COUNT(*) AS qtd
      FROM cadastros
      GROUP BY adesivamento
      ORDER BY qtd DESC`);

    const [porBairro] = await pool.query(`
      SELECT COALESCE(bairro, 'Não informado') AS bairro, COUNT(*) AS qtd
      FROM cadastros
      GROUP BY bairro
      ORDER BY qtd DESC`);

    const [porAgente] = await pool.query(`
      SELECT c.cadastrado_por, COALESCE(u.nome, c.cadastrado_por) AS nome, COUNT(*) AS qtd
      FROM cadastros c
      LEFT JOIN usuarios u ON u.usuario = c.cadastrado_por
      GROUP BY c.cadastrado_por
      ORDER BY qtd DESC`);

    res.json({ total, porVoto, porAdesivamento, porBairro, porAgente });
  } catch (err) {
    console.error('GET /relatorio:', err);
    res.status(500).json({ erro: 'Erro ao gerar relatório' });
  }
});

app.delete('/cadastros/:id', autenticar, apenasAdm, async (req, res) => {
  const { id } = req.params;
  if (!id || isNaN(id)) return res.status(400).json({ erro: 'ID inválido' });

  try {
    // Verifica se existe
    const [existe] = await pool.query('SELECT id FROM cadastros WHERE id = ?', [id]);
    if (!existe.length) return res.status(404).json({ erro: 'Cadastro não encontrado' });

    // Deleta
    await pool.query('DELETE FROM cadastros WHERE id = ?', [id]);

    res.json({ mensagem: 'Cadastro excluído com sucesso' });
  } catch (err) {
    console.error('DELETE /cadastros/:id:', err);
    res.status(500).json({ erro: 'Erro ao excluir cadastro' });
  }
});

// ════════════════════════════════════════════════════════════
// DELETE /usuarios/:id — excluir usuário (admin apenas)
// ════════════════════════════════════════════════════════════
app.delete('/usuarios/:id', autenticar, apenasAdm, async (req, res) => {
  const { id } = req.params;
  if (!id || isNaN(id)) return res.status(400).json({ erro: 'ID inválido' });

  try {
    // Verifica se existe
    const [existe] = await pool.query('SELECT id, role, usuario FROM usuarios WHERE id = ?', [id]);
    if (!existe.length) return res.status(404).json({ erro: 'Usuário não encontrado' });

    // Não pode deletar a si mesmo
    if (existe[0].id === req.usuario.id) {
      return res.status(403).json({ erro: 'Você não pode deletar sua própria conta' });
    }

    // Não pode deletar outros admins
    if (existe[0].role === 'adm') {
      return res.status(403).json({ erro: 'Não é permitido deletar outro administrador' });
    }

    // Se for líder/coord, desvincula os cadastros dele (eles ficarão órfãos)
    if (existe[0].role === 'campo') {
      // Limpar cadastrados_por para não quebrar a FK
      await pool.query('UPDATE cadastros SET cadastrado_por = NULL WHERE cadastrado_por = ?', [existe[0].usuario]);
    }

    // Deleta o usuário
    await pool.query('DELETE FROM usuarios WHERE id = ?', [id]);

    res.json({ mensagem: 'Usuário excluído com sucesso' });
  } catch (err) {
    console.error('DELETE /usuarios/:id:', err);
    res.status(500).json({ erro: 'Erro ao excluir usuário' });
  }
});


// ════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ════════════════════════════════════════════════════════════
conectarBanco().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('🚀 Servidor rodando em http//192.168.1.8:' + PORT);
    console.log('');
  });
});