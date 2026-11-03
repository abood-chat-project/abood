
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const fs = require("fs");

const messagesFile = path.join(__dirname, "messages.json");
let messages = [];
if (fs.existsSync(messagesFile)) {
  try {
    const saved = JSON.parse(fs.readFileSync(messagesFile, "utf8"));
    if (Array.isArray(saved)) messages = saved;
  } catch (error) {
    console.log("تعذر قراءة الرسائل المحفوظة");
  }
}

const app = express();
const voiceDir = path.join(__dirname, "voice_messages");

if (!fs.existsSync(voiceDir)) {
  fs.mkdirSync(voiceDir, { recursive: true });
}

const voiceFile = path.join(voiceDir, "messages.json");

if (!fs.existsSync(voiceFile)) {
  fs.writeFileSync(voiceFile, "[]");
}
const server = http.createServer(app);
const io = new Server(server, { maxHttpBufferSize: 8e6 });

app.use(express.static(__dirname));

io.on("connection", (socket) => {
  console.log("مستخدم متصل");
socket.emit("chat history", messages);
let voiceMessages = [];

try {
  voiceMessages = JSON.parse(fs.readFileSync(voiceFile, "utf8"));
  if (!Array.isArray(voiceMessages)) voiceMessages = [];
} catch (error) {
  voiceMessages = [];
}

socket.emit("voice history", voiceMessages);

    socket.on("chat message", (message) => {
    if (!message || typeof message !== "object") return;

    const name = typeof message.name === "string"
      ? message.name.trim().slice(0, 30)
      : "عبود";

    const text = typeof message.text === "string"
      ? message.text.trim().slice(0, 1000)
      : "";

    if (text) {
      messages.push({ name: name || "عبود", text: text });
      fs.writeFileSync(messagesFile, JSON.stringify(messages));
      io.emit("chat message", {
        name: name || "عبود",
        text: text
      });
    }
  });

  socket.on("voice message", (message) => {
    if (!message || typeof message !== "object") return;

    const name = typeof message.name === "string"
      ? message.name.trim().slice(0, 30)
      : "عبود";

    const audio = typeof message.audio === "string"
      ? message.audio
      : "";

    if (!audio.startsWith("data:audio/") || audio.length > 7000000) return;

    let voiceMessages = [];

    try {
      voiceMessages = JSON.parse(fs.readFileSync(voiceFile, "utf8"));
      if (!Array.isArray(voiceMessages)) voiceMessages = [];
    } catch (error) {
      voiceMessages = [];
    }

    const savedVoice = {
      name: name || "عبود",
      audio: audio
    };

    voiceMessages.push(savedVoice);

    fs.writeFileSync(voiceFile, JSON.stringify(voiceMessages));

    io.emit("voice message", savedVoice);

  });

  socket.on("disconnect", () => {
    console.log("مستخدم غادر");
  });
});

const PORT = process.env.PORT || 8082;
server.listen(PORT, "0.0.0.0", () => {
  console.log("خادم عبود يعمل على المنفذ " + PORT);
});

