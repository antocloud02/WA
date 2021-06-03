const { Client } = require("whatsapp-web.js");
const express = require("express");
const socketIO = require("socket.io");
const http = require("http");
const qrcode = require("qrcode");
const port = process.env.PORT || 8000;

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const db = require("./helpers/db.js");

(async () => {
  app.get("/", (req, res) => {
    res.sendFile("index.html", {
      root: __dirname,
    });
  });

  const savedSession = await db.readSession();
  // db.removeSession();
  // console.log("QR RECEIVED", savedSession);
  const client = new Client({
    restartOnAuthFail: true,
    puppeteer: {
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--single-process", // <- this one doesn't works in Windows
        "--disable-gpu",
      ],
    },
    session: savedSession,
  });

  client.on("message", (msg) => {
    if (msg.body == "!ping") {
      msg.reply("pong");
    }
  });

  client.initialize();
  console.log("QR RECEIVED", "sss");

  // Socket IO
  io.sockets.on("connection", function (socket) {
    console.log("QR RECEIVED", "gggg");
    socket.emit("message", "Connection...");

    client.on("qr", (qr) => {
      // Generate and scan this code with your phone
      console.log("QR RECEIVED", qr);
      qrcode.toDataURL(qr, (err, url) => {
        socket.emit("qr", url);
        socket.emit("message", "Silahkan di scan QR Codenya...");
      });
    });

    client.on("ready", () => {
      socket.emit("ready", "WA is ready!");
      socket.emit("message", "WA is ready!");
    });

    client.on("authenticated", (session) => {
      socket.emit("authenticated", "WA is authenticated!");
      socket.emit("message", "WA is authenticated!");
      console.log("AUTHENTICATED", session);
      // savedSession = session;
      db.saveSession(session);
    });
  });

  //Kirim Pesan
  app.post("/kirim", (req, res) => {
    const nomor = req.body.nomor;
    const pesan = req.body.pesan;

    client
      .sendMessage(nomor, pesan)
      .then((response) => {
        res.status(200).json({
          status: true,
          response: response,
        });
      })
      .catch((err) => {
        res.status(500).json({
          status: true,
          response: response,
        });
      });
  });

  server.listen(port, function () {
    console.log("App running on :" + port);
  });
})();
