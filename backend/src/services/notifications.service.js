const env = require("../config/env");
const logger = require("../utils/logger");
const { sendSms } = require("./sms.service");

function money(n) {
  return Number(n || 0).toLocaleString("en-RW");
}

async function safeSend(to, message) {
  if (!to) return;
  try {
    await sendSms(to, message);
  } catch (err) {
    logger.error({ err, to }, "[notify] failed to send SMS");
  }
}

/* Fire-and-forget so a messaging hiccup never blocks an order or payment. */
function notifyOrderPlaced(order) {
  const code = order.orderId || order.code;
  const payText =
    order.payment === "momo"
      ? "We will send a MoMo payment request shortly."
      : order.payment === "cash"
      ? "Pay the rider on delivery."
      : "Pay at the store on pickup.";
  safeSend(
    order.phone,
    `Imibavu Collection: order ${code} received. Total ${money(order.total)} RWF. ${payText}`
  );
  if (env.storePhone) {
    safeSend(
      env.storePhone,
      `New order ${code} — ${order.name} (${order.phone}), ${money(order.total)} RWF, ${order.zoneLabel || order.zone}.`
    );
  }
}

function notifyPayment(order, payment) {
  const code = order.orderId || order.code;
  if (payment && payment.status === "successful") {
    safeSend(
      order.phone,
      `Imibavu Collection: payment of ${money(payment.amount)} RWF confirmed for order ${code}. Thank you!`
    );
    if (env.storePhone) {
      safeSend(env.storePhone, `Payment received for ${code}: ${money(payment.amount)} RWF.`);
    }
  } else if (payment && ["failed", "cancelled"].includes(payment.status)) {
    safeSend(
      order.phone,
      `Imibavu Collection: payment for order ${code} was not completed. You can retry anytime.`
    );
  }
}

function notifyStatus(order) {
  const code = order.orderId || order.code;
  safeSend(
    order.phone,
    `Imibavu Collection: order ${code} is now ${String(order.status).toUpperCase()}.`
  );
}

function fmtWhen(date) {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-RW", { day: "2-digit", month: "short", year: "numeric" });
}

function notifyBooking(booking) {
  safeSend(
    booking.phone,
    `Imibavu Collection: blending session requested for ${fmtWhen(booking.date)} at ${booking.time}. We will confirm shortly.`
  );
  if (env.storePhone) {
    safeSend(
      env.storePhone,
      `New blending request — ${booking.name} (${booking.phone}), ${fmtWhen(booking.date)} at ${booking.time}.`
    );
  }
}

function notifyBookingStatus(booking) {
  safeSend(
    booking.phone,
    `Imibavu Collection: your blending session on ${fmtWhen(booking.date)} at ${booking.time} is now ${String(
      booking.status
    ).toUpperCase()}.`
  );
}

module.exports = { notifyOrderPlaced, notifyPayment, notifyStatus, notifyBooking, notifyBookingStatus };
