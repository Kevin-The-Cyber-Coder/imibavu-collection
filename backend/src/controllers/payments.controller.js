const env = require("../config/env");
const logger = require("../utils/logger");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const Payment = require("../models/Payment");
const Order = require("../models/Order");
const payments = require("../services/payments.service");

function toPublicPayment(p) {
  const d = p && p.toObject ? p.toObject() : p || {};
  return {
    txRef: d.txRef,
    orderCode: d.orderCode,
    method: d.method,
    network: d.network,
    amount: d.amount,
    currency: d.currency,
    status: d.status,
    checkoutUrl: d.checkoutUrl,
    flwTxId: d.flwTxId,
    paidAt: d.paidAt,
    createdAt: d.createdAt,
  };
}

/* Does the requester own this order? Guests match by x-guest-id, users by id. */
function ownsOrder(order, req) {
  if (!order.user && !order.guestId) return true;
  if (req.user && order.user && String(order.user) === String(req.user.id)) return true;
  const gid = req.headers["x-guest-id"];
  if (order.guestId && gid && String(order.guestId) === String(gid)) return true;
  return false;
}

const initiatePayment = asyncHandler(async (req, res) => {
  const { orderId, code, method = "momo", network = "", phone, email } = req.body;
  const key = String(orderId || code || "").toUpperCase();
  if (!key) throw ApiError.validation([{ path: "orderId", message: "orderId is required" }]);

  const order = await Order.findOne({ orderId: key });
  if (!order) throw ApiError.notFound("Order not found");
  if (!ownsOrder(order, req)) throw ApiError.forbidden("Not your order");

  const result = await payments.initiatePayment({
    order,
    method,
    network,
    phone,
    email,
    name: order.name,
  });

  if (!result.offline) {
    order.payment = String(method).toLowerCase();
    order.paymentStatus = "pending";
    order.paymentRef = result.payment.txRef;
    await order.save();
  }

  res.status(201).json({
    mode: payments.isLive() ? "flutterwave" : "console",
    offline: result.offline,
    status: result.status,
    checkoutUrl: result.checkoutUrl || "",
    payment: result.payment ? toPublicPayment(result.payment) : null,
  });
});

const getPayment = asyncHandler(async (req, res) => {
  const txRef = String(req.params.txRef);
  const payment = await Payment.findOne({ txRef });
  if (!payment) throw ApiError.notFound("Payment not found");
  if (payments.isLive()) await payments.verifyPayment(payment);
  res.json({ mode: payments.isLive() ? "flutterwave" : "console", payment: toPublicPayment(payment) });
});

const verifyPayment = asyncHandler(async (req, res) => {
  const txRef = String(req.params.txRef);
  const payment = await Payment.findOne({ txRef });
  if (!payment) throw ApiError.notFound("Payment not found");
  await payments.verifyPayment(payment);
  res.json({ payment: toPublicPayment(payment) });
});

const webhook = asyncHandler(async (req, res) => {
  const ok = payments.verifyWebhook(req.headers, req.body);
  if (ok !== true) {
    // Always 200 so Flutterwave does not retry on ignored/unknown events.
    return res.status(200).json({ received: true, ignored: true });
  }
  const data = req.body?.data || {};
  const txRef = data.tx_ref;
  const payment = txRef ? await Payment.findOne({ txRef }) : null;
  if (payment) {
    if (data.status === "successful") {
      await payments.settlePayment(payment, "successful", { flwTxId: String(data.id || "") });
    } else if (data.status === "failed") {
      await payments.settlePayment(payment, "failed");
    }
  }
  res.status(200).json({ received: true });
});

/* ---- Local mock checkout (only when PAYMENTS_MODE=console) ---- */

const mockCheckout = asyncHandler(async (req, res) => {
  if (payments.isLive()) throw ApiError.notFound("Mock checkout is disabled");
  const txRef = String(req.query.tx_ref || "");
  const payment = await Payment.findOne({ txRef });
  if (!payment) throw ApiError.notFound("Payment not found");
  const order = await Order.findById(payment.order);
  const back = payments.orderRedirectUrl(payment.orderCode);
  const complete = `${env.payments.apiBaseUrl}/payments/mock-checkout/complete`;
  const payUrl = `${complete}?tx_ref=${encodeURIComponent(payment.txRef)}&action=pay&redirect=${encodeURIComponent(back)}`;
  const cancelUrl = `${complete}?tx_ref=${encodeURIComponent(payment.txRef)}&action=cancel&redirect=${encodeURIComponent(back)}`;
  res.set("Referrer-Policy", "same-origin");
  res.set("Content-Type", "text/html; charset=utf-8").send(`<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="icon" href="data:,">
<title>Imibavu — Mock Payment</title>
<style>
  body{font-family:system-ui,Segoe UI,sans-serif;background:#faf7f2;color:#1a1a1a;display:grid;place-items:center;min-height:100vh;margin:0}
  .card{background:#fff;border:1px solid #e7e0d5;border-radius:16px;padding:32px;max-width:420px;width:calc(100% - 40px);box-shadow:0 10px 30px rgba(0,0,0,.06)}
  h1{font-family:Georgia,serif;margin:0 0 4px}
  .muted{color:#7a7368;font-size:14px;margin:0 0 20px}
  .row{display:flex;justify-content:space-between;border-top:1px solid #eee;padding:10px 0;font-size:15px}
  .row.total{font-weight:700;font-family:Georgia,serif;font-size:18px}
  a.btn{display:block;text-align:center;text-decoration:none;padding:14px;border-radius:999px;font-size:16px;cursor:pointer;margin-top:12px}
  .pay{background:#0f5132;color:#fff}
  .cancel{background:#eee;color:#333}
  .tag{display:inline-block;background:#efe9df;border-radius:999px;padding:4px 10px;font-size:12px;margin-bottom:12px}
</style></head><body>
  <div class="card">
    <span class="tag">DEV MOCK · no real money</span>
    <h1>Imibavu Collection</h1>
    <p class="muted">${payment.method.toUpperCase()} request for order ${payment.orderCode}</p>
    <div class="row"><span>Customer</span><b>${order ? order.name : ""}</b></div>
    <div class="row"><span>Phone</span><b>${payment.phone || ""}</b></div>
    <div class="row total"><span>Amount</span><b>${Number(payment.amount).toLocaleString()} ${payment.currency}</b></div>
    <a class="btn pay" href="${payUrl}">Approve payment</a>
    <a class="btn cancel" href="${cancelUrl}">Cancel</a>
  </div>
</body></html>`);
});

const mockComplete = asyncHandler(async (req, res) => {
  if (payments.isLive()) throw ApiError.notFound("Mock checkout is disabled");
  const src = req.method === "GET" ? req.query : req.body;
  const txRef = String(src.tx_ref || "");
  const redirect = String(src.redirect || env.payments.redirectUrl);
  const payment = await Payment.findOne({ txRef });
  if (!payment) throw ApiError.notFound("Payment not found");
  if (src.action === "pay") {
    await payments.settlePayment(payment, "successful", { flwTxId: "MOCK-" + payment.txRef });
  } else {
    await payments.settlePayment(payment, "cancelled");
  }
  res.redirect(302, redirect || "/");
});

module.exports = {
  initiatePayment,
  getPayment,
  verifyPayment,
  webhook,
  mockCheckout,
  mockComplete,
  toPublicPayment,
};
