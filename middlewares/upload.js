import multer from "multer";
import path from "path";
import fs from "fs";

// Ensure uploads/excel folder exists
const excelUploadPath = "uploads/excel";
if (!fs.existsSync(excelUploadPath)) {
  fs.mkdirSync(excelUploadPath, { recursive: true });
}

// Storage setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, excelUploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, "_")}`);
  },
});

// File filter (only Excel allowed)
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext !== ".xlsx" && ext !== ".xls") {
    return cb(new Error("Only Excel files are allowed"), false);
  }
  cb(null, true);
};

export const xlUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 5MB max
});
