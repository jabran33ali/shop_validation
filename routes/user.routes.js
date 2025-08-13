import express from "express";
import {
  registerUser,
  loginUser,
  getAllAuditors,
} from "../controllers/user.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { allowRoles } from "../middlewares/role.middleware.js";
import { getShopsByAuditor } from "../controllers/shop.controller.js";

const router = express.Router();

router.post("/login", loginUser);

// Admin creates admin via Postman, so no auth on this route:
router.post("/admin-create", registerUser);

// Protected route to create other users
router.post("/register", protect, registerUser);

router.get(
  "/get-auditors",
  protect,
  allowRoles("admin", "manager", "supervisor", "executive"),
  getAllAuditors
);

router.get(
  "/get-assigned-shops-for-auditor/:auditorId",
  protect,
  getShopsByAuditor
);

export default router;
