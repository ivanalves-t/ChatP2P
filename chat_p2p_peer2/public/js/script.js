let chatAtivo = null;
let notificacoes = new Set();
const mensagensVistas = {};
let minhaPorta = null;

function extrairPorta(peerUrl) {
  let porta = peerUrl.split(':').pop();
  porta = porta.split('/')[0];
  return porta;
}

async function carregarMinhaPorta() {
  try {
    const res = await fetch('/config');
    const json = await res.json();
    minhaPorta = json.porta.toString();
    document.getElementById('porta').value = minhaPorta;
  } catch (e) {
    console.error('Erro ao obter porta local', e);
  }
}

async function carregarMensagens() {
  try {
    const res = await fetch('/mensagens');
    const msgs = await res.json();
    const lista = document.getElementById('mensagens');
    const painelNotificacoes = document.getElementById('notificacoes');
    const listaPeers = document.getElementById('peers');

    painelNotificacoes.innerHTML = '';

    const todosPeers = new Set(msgs.map(m => m.origem));

    listaPeers.innerHTML = '';
    todosPeers.forEach(peer => {
      const li = document.createElement('li');
      li.textContent = `Peer ${extrairPorta(peer)}`;
      li.dataset.peer = peer;

      if (peer === chatAtivo) {
        li.classList.add('active');
      }

      const totalRecebidas = msgs.filter(m => !m.remetente && m.origem === peer).length;
      const vistas = mensagensVistas[peer] || 0;
      const naoLidas = totalRecebidas - vistas;

      if (naoLidas > 0) {
        li.textContent += ` 🔔 (${naoLidas})`;
      }

      li.onclick = () => {
        chatAtivo = peer;
        mensagensVistas[peer] = msgs.filter(m => !m.remetente && m.origem === peer).length;
        document.getElementById('porta').value = extrairPorta(peer); // Atualiza o campo porta
        carregarMensagens();
      };

      listaPeers.appendChild(li);
    });

    if (!chatAtivo) {
      lista.innerHTML = `<li style="text-align:center;">⚠️ Clique em um peer para abrir o chat</li>`;
      return;
    }

    const msgsFiltradas = msgs.filter(m => m.origem === chatAtivo);

    lista.innerHTML = msgsFiltradas.map(m => {
      const classe = m.remetente ? 'remetente' : 'destinatario';
      return `<li class="${classe}">${m.texto}</li>`;
    }).join('');
    lista.scrollTop = lista.scrollHeight;

    mensagensVistas[chatAtivo] = msgs.filter(m => !m.remetente && m.origem === chatAtivo).length;

    // Monta notificações com clique para trocar chat e atualizar campo porta
    notificacoes.clear();

    msgs.forEach(m => {
      if (!m.remetente && m.origem !== chatAtivo) {
        notificacoes.add(m.origem);
      }
    });

    notificacoes.forEach(peer => {
      const div = document.createElement('div');
      div.className = 'notificacao';
      div.textContent = `🔔 O peer ${extrairPorta(peer)} te enviou uma nova mensagem!`;
      div.onclick = () => {
        chatAtivo = peer;
        mensagensVistas[peer] = msgs.filter(m => !m.remetente && m.origem === peer).length;
        document.getElementById('porta').value = extrairPorta(peer); // Atualiza o campo porta ao clicar na notificação
        carregarMensagens();
      };
      painelNotificacoes.appendChild(div);
    });

  } catch (e) {
    console.error('Erro ao carregar mensagens', e);
  }
}

async function enviarMensagem(event) {
  event.preventDefault();

  const portaInput = document.getElementById('porta');
  const mensagemInput = document.getElementById('mensagem');
  const mensagem = mensagemInput.value.trim();
  const porta = portaInput.value.trim();

  if (!porta) {
    alert('Digite a porta do peer');
    return;
  }

  if (porta === minhaPorta) {
    alert('Você não pode enviar mensagem para si mesmo.');
    return;
  }

  const destino = `http://localhost:${porta}`;

  if (!chatAtivo) {
    chatAtivo = destino;
  } else if (destino !== chatAtivo) {
    chatAtivo = destino;
  }

  if (mensagem === '') {
    alert('Não envie mensagens vazias');
    return;
  }

  try {
    await fetch('/enviar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mensagem, destino }),
    });
    mensagemInput.value = '';
    portaInput.value = extrairPorta(chatAtivo);
    carregarMensagens();
  } catch (e) {
    alert('Erro ao enviar mensagem');
  }
}

window.onload = async () => {
  await carregarMinhaPorta();
  carregarMensagens();
  setInterval(carregarMensagens, 3000);
};
