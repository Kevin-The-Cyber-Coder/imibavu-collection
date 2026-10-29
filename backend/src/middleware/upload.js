/* Imibavu Collection — product image uploads.
   Stores uploaded images on disk under backend/uploads and serves them from
   /uploads. Only real image types are accepted, capped at 5 MB each. */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const ApiError = require("../utils/ApiError");

const UPLOADS_DIR = path.join(__dirname, "..", "..", "uploads");
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const ALLOWED = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/avif": ".avif",
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = ALLOWED[file.mimetype] || path.extname(file.originalname) || ".jpg";
    cb(null, `p_${Date.now()}_${crypto.randomBytes(6).toString("hex")}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  if (!ALLOWED[file.mimetype]) {
    return cb(ApiError.validation([{ path: "file", message: "Only JPG, PNG, WebP or AVIF images are allowed" }]));
  }
  cb(null, true);
}

const uploadImages = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 8 },
});

module.exports = { uploadImages, UPLOADS_DIR };
