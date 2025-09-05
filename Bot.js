import makeWASocket, { useMultiFileAuthState } from "@adiwajshing/baileys";
import { Boom } from "@hapi/boom";
import Pino from "pino";
import qrcode from "qrcode-terminal";

const BOT_NAME = "Dr. Coringa";
const BOT_AUTHOR = "Dr. Coringa Lunático";
const BOT_VERSION = "1.0.0";

const MENSAGEM_PADRAO = "🤡 Olá! Esta é uma mensagem enviada pelo Bot Dr. Coringa.";

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("auth_info");

  const sock = makeWASocket({
    logger: Pino({ level: "silent" }),
    printQRInTerminal: true,
    auth: state
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) qrcode.generate(qr, { small: true });

    if (connection === "close") {
      const reason = lastDisconnect?.error?.output?.statusCode;
      console.log(`⚠️ Conexão fechada: ${reason}`);
      startBot(); // reconectar automaticamente
    } else if (connection === "open") {
      console.log(`✅ ${BOT_NAME} conectado!`);
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message) return;

    const from = msg.key.remoteJid;
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
    if (!text) return;

    console.log(`📩 Mensagem de ${from}: ${text}`);

    if (text.startsWith("/menu")) {
      const menuTexto = `
🤡 *${BOT_NAME} Menu* (v${BOT_VERSION})
/ping - Testar bot
/skill <numero> - Enviar mensagem automática
/help - Ajuda rápida
      `;
      await sock.sendMessage(from, { text: menuTexto });
    } else if (text.startsWith("/ping")) {
      await sock.sendMessage(from, { text: "🏓 PONG! Dr. Coringa está ativo." });
    } else if (text.startsWith("/skill")) {
      const numero = text.replace("/skill", "").trim();
      if (!numero) {
        await sock.sendMessage(from, { text: "❌ Use /skill <numero>" });
        return;
      }

      const jid = numero + "@s.whatsapp.net";
      try {
        await sock.sendMessage(jid, { text: MENSAGEM_PADRAO });
        await sock.sendMessage(from, { text: `✅ Mensagem enviada para ${numero}` });
      } catch (err) {
        await sock.sendMessage(from, { text: `❌ Erro ao enviar: ${err}` });
      }
    } else if (text.startsWith("/help")) {
      await sock.sendMessage(from, { text: "Use /menu para ver todas as opções do Bot Dr. Coringa." });
    }
  });
}

startBot();
