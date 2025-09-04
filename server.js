const express = require('express');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORTA = process.env.PORT || 3000;

const db = new sqlite3.Database(path.join(__dirname, 'cis.db'), (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err.message);
    } else {
        console.log('Conectado ao banco de dados SQLite.');
        // Cria a tabela se ela não existir
        db.run(`CREATE TABLE IF NOT EXISTS cis (
            id TEXT PRIMARY KEY,
            numeroCi TEXT NOT NULL,
            remetente TEXT NOT NULL,
            destinatario TEXT NOT NULL,
            assunto TEXT NOT NULL,
            dataRecebimento TEXT NOT NULL,
            arquivoCi TEXT,
            lida INTEGER
        )`);
    }
});

// Middleware
app.use(cors());

// Criar pasta para uploads se não existir
const diretorioUploads = path.join(__dirname, 'paginaweb', 'uploads');
if (!fs.existsSync(diretorioUploads)) {
    fs.mkdirSync(diretorioUploads, { recursive: true });
}

// Configuração do Multer para armazenamento de arquivos
const armazenamento = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, diretorioUploads);
    },
    filename: function (req, file, cb) {
        const sufixoUnico = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + sufixoUnico + path.extname(file.originalname));
    }
});

const filtroArquivo = (req, file, cb) => {
    if (file.mimetype === 'image/png') {
        cb(null, true);
    } else {
        cb(new Error('Apenas arquivos PNG são permitidos!'), false);
    }
};

const upload = multer({
    storage: armazenamento,
    fileFilter: filtroArquivo,
    limits: { fileSize: 5 * 1024 * 1024 }
});

app.use(express.static(path.join(__dirname, 'paginaWeb')));

// GET /api/cis - Retorna todas as CIs
app.get('/api/cis', (req, res) => {
    db.all("SELECT * FROM cis ORDER BY dataRecebimento DESC", [], (err, rows) => {
        if (err) {
            return res.status(500).json({ mensagem: err.message });
        }
        res.json(rows);
    });
});

// POST /api/cis - Adiciona uma nova CI com upload de arquivo
app.post('/api/cis', upload.single('arquivoCi'), (req, res) => {
    const { numeroCi, remetente, destinatario, assunto, dataRecebimento } = req.body;

    if (!numeroCi || !remetente || !destinatario || !assunto || !dataRecebimento) {
        return res.status(400).json({ mensagem: 'Todos os campos de texto são obrigatórios.' });
    }

    const caminhoArquivo = req.file ? `/uploads/${req.file.filename}` : null;
    const lida = 0;

    const sql = `INSERT INTO cis (id, numeroCi, remetente, destinatario, assunto, dataRecebimento, arquivoCi, lida) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    const params = [uuidv4(), numeroCi, remetente, destinatario, assunto, dataRecebimento, caminhoArquivo, lida];

    db.run(sql, params, function(err) {
        if (err) {
            return res.status(500).json({ mensagem: err.message });
        }
        res.status(201).json({ id: this.lastID, ...req.body, lida: false, arquivoCi: caminhoArquivo });
    });
});

// PUT /api/cis/:id - Atualiza uma CI (neste caso, o status 'lida')
app.put('/api/cis/:id', express.json(), (req, res) => {
    const { id } = req.params;
    const { lida } = req.body;

    if (typeof lida !== 'boolean') {
        return res.status(400).json({ mensagem: 'O campo "lida" deve ser um booleano.' });
    }

    const lidaStatus = lida ? 1 : 0;
    const sql = `UPDATE cis SET lida = ? WHERE id = ?`;

    db.run(sql, [lidaStatus, id], function(err) {
        if (err) {
            return res.status(500).json({ mensagem: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ mensagem: 'CI não encontrada.' });
        }
        res.json({ mensagem: 'Status da CI atualizado com sucesso.' });
    });
});

// DELETE /api/cis/:id - Remove uma CI e seu arquivo anexado
app.delete('/api/cis/:id', (req, res) => {
    const { id } = req.params;

    // Primeiro, busque a CI para encontrar o caminho do arquivo
    db.get("SELECT arquivoCi FROM cis WHERE id = ?", [id], (err, row) => {
        if (err) {
            return res.status(500).json({ mensagem: err.message });
        }
        if (!row) {
            return res.status(404).json({ mensagem: 'CI não encontrada.' });
        }

        // Se houver um arquivo, tente deletá-lo
        if (row.arquivoCi) {
            const caminhoCompletoArquivo = path.join(__dirname, 'public', row.arquivoCi);
            fs.unlink(caminhoCompletoArquivo, (erro) => {
                if (erro) {
                    console.error(`Erro ao deletar arquivo ${caminhoCompletoArquivo}:`, erro);
                } else {
                    console.log(`Arquivo ${caminhoCompletoArquivo} deletado com sucesso.`);
                }
            });
        }

        // Em seguida, delete a CI do banco de dados
        db.run("DELETE FROM cis WHERE id = ?", id, function(err) {
            if (err) {
                return res.status(500).json({ mensagem: err.message });
            }
            if (this.changes === 0) {
                 return res.status(404).json({ mensagem: 'CI não encontrada após a verificação.' });
            }
            res.status(204).send();
        });
    });
});

// Iniciar o servidor
app.listen(PORTA, () => {
    console.log(`Servidor rodando em http://localhost:${PORTA}`);
    console.log(`Acesse o frontend em http://localhost:${PORTA}`);
});