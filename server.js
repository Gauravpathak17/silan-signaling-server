const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());

/* ---------- HEALTH CHECK ---------- */
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "signaling" });
});

/* ---------- HTTP SERVER ---------- */
const server = http.createServer(app);

/* ---------- SOCKET.IO ---------- */
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join", (room) => {
    socket.join(room);
    socket.to(room).emit("peer-joined", { id: socket.id });
  });

  socket.on("signal", ({ to, data }) => {
    io.to(to).emit("signal", { from: socket.id, data });
  });

  /* ---- RECEIVE PREDICTION TEXT AND SEND TO OTHER USER ---- */
  socket.on("prediction", ({ room, text }) => {
    socket.to(room).emit("prediction", { text });
  });

  socket.on("disconnect", () => {
    console.log("Disconnected:", socket.id);
  });
});

/* ---------- ML PREDICTION API ---------- */
const FLASK_URL = process.env.FLASK_URL;

app.post("/predict", async (req, res) => {
  try {
    const r = await axios.post(FLASK_URL, req.body);
    res.json(r.data);
  } catch (e) {
    res.status(500).json({ error: "Prediction failed" });
  }
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log("Server running on", PORT);
});
