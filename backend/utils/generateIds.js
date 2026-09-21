const crypto = require("crypto");

function todayStamp() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

function generateFineId() {
  const rand = crypto.randomBytes(2).toString("hex").toUpperCase();
  return `FIN-${todayStamp()}-${rand}`;
}

function generatePaymentId() {
  const rand = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `PAY-${rand}`;
}

function generateTxnRef() {
  const rand = crypto.randomBytes(5).toString("hex").toUpperCase();
  return `TXN-${rand}`;
}

module.exports = { generateFineId, generatePaymentId, generateTxnRef };
