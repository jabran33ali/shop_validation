// routes/shopRoutes.js
import express from "express";
import { isAdmin, verifyJWT } from "../middlewares/auth.middleware.js";
import {
  assignShopsToAuditors,
  getShopById,
  getShops,
  uploadShops,
} from "../controllers/shop.controller.js";
import { upload } from "../middlewares/upload.js";
import { allowRoles } from "../middlewares/role.middleware.js";

const router = express.Router();

router.post("/upload", verifyJWT, isAdmin, upload.single("file"), uploadShops);
router.get("/get-shops", verifyJWT, getShops);
router.get("/get-shop/:id", verifyJWT, getShopById);
router.post(
  "/assign-shops",
  verifyJWT,
  allowRoles("admin", "manager", "supervisor", "executive"),
  assignShopsToAuditors
);

export default router;
