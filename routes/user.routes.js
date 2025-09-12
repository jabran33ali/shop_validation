import express from "express";
import {
  registerUser,
  loginUser,
  getAllAssignies,
  getAllUsers,
  updateUserById,
  getSalespersons,
} from "../controllers/user.controller.js";
import { protect, verifyJWT } from "../middlewares/auth.middleware.js";
import { allowRoles } from "../middlewares/role.middleware.js";
import { getShopsByAuditor } from "../controllers/shop.controller.js";

const router = express.Router();

router.post("/login", loginUser);

// Admin creates admin via Postman, so no auth on this route:
router.post("/admin-create", registerUser);

// Protected route to create other users
router.post("/register", protect, registerUser);

router.get(
  "/get-assignies",
  protect,
  allowRoles("admin", "manager", "supervisor", "executive"),
  getAllAssignies
);

router.get("/get-all-users", protect, allowRoles("admin"), getAllUsers);

router.get("/get-assigned-shops-for-auditor/:id", protect, getShopsByAuditor);

router.put(
  "/update-user/:id",
  protect,
  allowRoles("admin", "manager", "supervisor", "executive"),
  updateUserById
);

router.get('/get-salepersons', verifyJWT, getSalespersons)

export default router;
