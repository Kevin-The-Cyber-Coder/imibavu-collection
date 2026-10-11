const crypto = require("crypto");
const env = require("../config/env");
const logger = require("../utils/logger");
const ApiError = require("../utils/ApiError");
const Payment = require("../models/Payment");
const { notifyPayment } = require("./notifications.service");

const FLW_BASE = "https://api.flutterwave.com/v3";

const onlineMethods = ["momo", "card"];

const isLive = () =>
  env.payments.mode === "flutterwave" && Boolean(env.payments.secretKey);

const isOnline = (method) => onlineMethods.includes(String(method || "momo").toLowerCase());

function normalizeNetwork(network) {
  const n = String(network || "").trim().toUpperCase();
  if (["MTN", "MOMO", "MTN_MOMO", "MTN_MONEY"].includes(n)) return "MTN";
  if (["AIRTEL", "AIRTEL_MONEY"].includes(n)) return "AIRTEL";
  return "";
}

function newTxRef(orderCode) {
  return `${orderCode}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

/* Frontend order-confirmation route used after checkout redirects. */
function orderRedirectUrl(orderCode) {
  return `${env.payments.redirectUrl}/#/order/${orderCode}`;
}

async function flwFetch(path, { method = "GET", body } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(`${FLW_BASE}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${env.payments.secretKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.status === "error") {
      logger.error({ status: res.status, data }, "[payments] flutterwave error");
      throw ApiError.badRequest(data.message || "Payment provider error");
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

/* Create a pending Payment plus a customer-facing checkout link.
   Returns { payment, checkoutUrl, status, offline }. */
async function initiatePayment({ order, method = "momo", network = "", phone = "", email = "", name = "" }) {
  const m = String(method || "momo").toLowerCase();

  // Cash / pickup are settled offline — nothing to charge.
  if (!isOnline(m)) {
    return { offline: true, method: m, status: "unpaid", checkoutUrl: "" };
  }

  const txRef = newTxRef(order.orderId);
  const amount = order.total;
  const currency = env.payments.currency;
  const net = normalizeNetwork(network);
  const contact = phone || order.phone;
  const contactEmail = email || order.email || "orders@imibavucollection.rw";

  const payment = await Payment.create({
    txRef,
    order: order._id,
    orderCode: order.orderId,
    user: order.user,
    provider: "flutterwave",
    method: m,
    network: net,
    phone: contact,
    amount,
    currency,
    status: "pending",
  });

  try {
    if (isLive()) {
      const data = await flwFetch("/payments", {
        method: "POST",
        body: {
          tx_ref: txRef,
          amount,
          currency,
          redirect_url: orderRedirectUrl(order.orderId),
          payment_options: m === "card" ? "card" : "mobilemoneyrwanda,card",
          customer: { email: contactEmail, phonenumber: contact, name: order.name || name },
          customizations: {
            title: "Imibavu Collection",
            description: `Order ${order.orderId}`,
          },
        },
      });
      payment.checkoutUrl = data?.data?.link || "";
      payment.status = "processing";
      payment.raw = data?.data || {};
    } else {
      // Local mock checkout page served by this API.
      payment.checkoutUrl = `${env.payments.apiBaseUrl}/payments/mock-checkout?tx_ref=${encodeURIComponent(
        txRef
      )}`;
      payment.status = "processing";
    }
    await payment.save();
  } catch (err) {
    payment.status = "failed";
    payment.raw = { error: err.message };
    await payment.save();
    throw err;
  }

  return { payment, checkoutUrl: payment.checkoutUrl, status: payment.status, offline: false };
}

/* Fetch the authoritative status from Flutterwave and settle the payment. */
async function verifyPayment(payment) {
  if (!payment) throw ApiError.notFound("Payment not found");
  if (payment.status === "successful") return payment;
  if (!isLive() || !payment.flwTxId) return payment;

  const data = await flwFetch(`/transactions/${payment.flwTxId}/verify`);
  const remote = data?.data || {};
  payment.raw = remote;
  if (remote.status === "successful") {
    await settlePayment(payment, "successful", { flwTxId: String(remote.id || payment.flwTxId) });
  } else if (["failed"].includes(remote.status)) {
    await settlePayment(payment, "failed");
  }
  return payment;
}

/* Settle a payment + its order and fire notifications. */
async function settlePayment(payment, status, extra = {}) {
  if (extra.flwTxId) payment.flwTxId = extra.flwTxId;
  if (status === "successful") payment.paidAt = new Date();
  payment.status = status;
  await payment.save();

  const Order = require("../models/Order");
  const order = await Order.findById(payment.order);
  if (order) {
    if (status === "successful") {
      order.paymentStatus = "paid";
      order.paidAt = payment.paidAt;
      order.paymentRef = payment.txRef;
    } else if (["failed", "cancelled"].includes(status)) {
      order.paymentStatus = "failed";
      order.paymentRef = payment.txRef;
    } else if (status === "processing" || status === "pending") {
      order.paymentStatus = "pending";
      order.paymentRef = payment.txRef;
    }
    await order.save();
    notifyPayment(order, payment);
  }
  return payment;
}

function verifyWebhook(headers, body) {
  if (!env.payments.secretHash) return false;
  const hash = headers["verif-hash"] || headers["Verif-Hash"];
  if (!hash || hash !== env.payments.secretHash) return false;
  const event = body && body.event;
  if (event !== "charge.completed") return { ignored: true };
  return true;
}

module.exports = {
  isLive,
  isOnline,
  initiatePayment,
  verifyPayment,
  settlePayment,
  verifyWebhook,
  normalizeNetwork,
  newTxRef,
  orderRedirectUrl,
};
