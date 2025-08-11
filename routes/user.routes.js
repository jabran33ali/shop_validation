import express from "express";
import { registerUser, loginUser } from "../controllers/user.controller.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/login", loginUser);

// Admin creates admin via Postman, so no auth on this route:
router.post("/admin-create", registerUser);

// Protected route to create other users
router.post("/register", protect, registerUser);

export default router;
