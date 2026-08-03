-- ============================================================
-- BANCO DE DADOS — Sistema de Cadastro Eleitoral
-- MySQL 8+ | charset utf8mb4
-- ============================================================

CREATE DATABASE IF NOT EXISTS eleitorall
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE eleitorall;

-- ------------------------------------------------------------
-- Tabela: usuarios
-- Login/role: adm (Admin Master), coord (Coordenador), campo (Líder de Campo)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  nome            VARCHAR(150) NOT NULL,
  usuario         VARCHAR(60)  NOT NULL,
  senha           VARCHAR(255) NOT NULL,             -- hash bcrypt
  role            ENUM('adm','coord','campo') NOT NULL,
  coordenador_id  INT NULL,                          -- líder aponta para o coordenador responsável
  ativo           TINYINT(1) NOT NULL DEFAULT 1,
  criado_em       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uq_usuario (usuario),
  KEY idx_role (role),
  KEY idx_coordenador (coordenador_id),

  CONSTRAINT fk_usuario_coordenador
    FOREIGN KEY (coordenador_id) REFERENCES usuarios(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Tabela: cadastros
-- Cada linha = uma visita/cadastro feito por um líder de campo
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cadastros (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  anfitriao         VARCHAR(150) NOT NULL,
  telefone          VARCHAR(20)  NULL,
  idade             SMALLINT UNSIGNED NULL,
  endereco          VARCHAR(200) NULL,
  numero_casa       VARCHAR(20)  NULL,
  bairro            VARCHAR(100) NULL,
  sexo              ENUM('M','F','Outro') NULL,
  intencao_voto     VARCHAR(100) NULL,
  obs_voto          TEXT NULL,
  adesivamento      VARCHAR(50)  NULL,
  qtd_moradores     TINYINT UNSIGNED NOT NULL DEFAULT 1,
  moradores         JSON NULL,                       -- array [{nome,sexo,idade,tel,parentesco}]
  observacao        TEXT NULL,
  cadastrado_por_id INT NOT NULL,                    -- FK -> usuarios.id (líder que cadastrou)
  criado_em         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  KEY idx_bairro (bairro),
  KEY idx_intencao_voto (intencao_voto),
  KEY idx_adesivamento (adesivamento),
  KEY idx_cadastrado_por (cadastrado_por_id),
  KEY idx_criado_em (criado_em),

  CONSTRAINT fk_cadastro_usuario
    FOREIGN KEY (cadastrado_por_id) REFERENCES usuarios(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Tabela: auditoria
-- Registra criação/exclusão de cadastros e usuários
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auditoria (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id      INT NULL,                          -- quem executou a ação
  acao            VARCHAR(50) NOT NULL,               -- ex: criar_cadastro, excluir_cadastro, criar_usuario, excluir_usuario
  tabela_afetada  VARCHAR(50) NOT NULL,
  registro_id     INT NULL,
  detalhes        TEXT NULL,
  criado_em       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  KEY idx_usuario (usuario_id),
  KEY idx_acao (acao),
  KEY idx_criado_em (criado_em),

  CONSTRAINT fk_auditoria_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- View: vw_cadastros
-- Junta cadastros com nome do líder e do coordenador,
-- exatamente nos campos que o frontend espera (agente_nome, coord_nome,
-- cadastrado_por = login do líder)
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW vw_cadastros AS
SELECT
  c.id, c.anfitriao, c.telefone, c.idade, c.endereco, c.numero_casa,
  c.bairro, c.sexo, c.intencao_voto, c.obs_voto, c.adesivamento,
  c.qtd_moradores, c.moradores, c.observacao,
  lider.nome        AS agente_nome,
  lider.usuario     AS cadastrado_por,
  coord.nome        AS coord_nome,
  c.criado_em
FROM cadastros c
JOIN usuarios lider ON lider.id = c.cadastrado_por_id
LEFT JOIN usuarios coord ON coord.id = lider.coordenador_id;

-- ------------------------------------------------------------
-- Usuário administrador inicial
-- Troque o hash abaixo por um gerado com bcrypt (12 rounds) antes de usar em produção.
-- Ex.: node -e "console.log(require('bcrypt').hashSync('SUA_SENHA', 12))"
-- ------------------------------------------------------------
INSERT INTO usuarios (nome, usuario, senha, role, ativo)
VALUES ('Administrador', 'admin', '$2b$12$SUBSTITUA_POR_UM_HASH_BCRYPT_VALIDO', 'adm', 1)
ON DUPLICATE KEY UPDATE usuario = usuario;