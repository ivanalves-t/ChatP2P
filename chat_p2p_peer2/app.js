const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');
const https = require('https');
const url = require('url');
const app = express();

const port = process.env.PORT || 5002;

app.get('/config', (req, res) => {
  res.json({ porta: port });
});

let mensagens = [];

app.use(bodyParser.json());
app.use(express.static('public'));

app.get('/mensagens', (req, res) => {
  res.json(mensagens);
});

function enviarPost(destino, dados) {
  return new Promise((resolve, reject) => {
    const parsedUrl = url.parse(destino);
    const dataString = JSON.stringify(dados);

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(dataString),
        'x-origem-peer': `http://localhost:${port}`
      }
    };

    const reqModule = parsedUrl.protocol === 'https:' ? https : http;

    const req = reqModule.request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => { responseData += chunk; });
      res.on('end', () => resolve(responseData));
    });

    req.on('error', reject);

    req.write(dataString);
    req.end();
  });
}

app.post('/enviar', async (req, res) => {
  const { destino, mensagem } = req.body;

  try {
    mensagens.push({
      texto: mensagem,
      remetente: true,
      origem: destino
    });

    await enviarPost(`${destino}/receber`, { mensagem });
  } catch (err) {
    mensagens.push({
      texto: "[ERRO] Falha ao enviar",
      remetente: true,
      origem: destino
    });
  }

  res.sendStatus(200);
});

app.post('/receber', (req, res) => {
  const origem = req.headers['x-origem-peer'] || 'desconhecido';

  mensagens.push({
    texto: req.body.mensagem,
    remetente: false,
    origem
  });

  res.send('OK');
});

app.listen(port, () => {
  console.log(`✅ Chat P2P rodando em http://localhost:${port}`);
});
