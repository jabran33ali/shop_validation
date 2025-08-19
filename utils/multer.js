import multer from "multer";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

export const uploadVisitImages = upload.fields([
  { name: "shopImage", maxCount: 1 },
  { name: "shelfImage", maxCount: 1 },
]);
