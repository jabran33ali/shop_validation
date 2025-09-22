// routes/shopRoutes.js
import express from "express";
import { isAdmin, verifyJWT } from "../middlewares/auth.middleware.js";
import {
  addShop,
  assignShops,
  getPendingAndVistedShops,
  getShopById,
  getShops,
  getVisitCounts,
  getVisitedShops,
  recordPhotoCLickLocation,
  recordStartAuditLocation,
  resetAllVisits,
  updateShop,
  uploadShops,
  uploadVisitPictures,
} from "../controllers/shop.controller.js";

import { allowRoles } from "../middlewares/role.middleware.js";

import { xlUpload } from "../middlewares/upload.js";

import upload from "../middlewares/multer.js";

const router = express.Router();

router.post(
  "/upload",
  verifyJWT,
  isAdmin,
  xlUpload.single("file"),
  uploadShops
);
router.post("/add-shop", verifyJWT, addShop);
router.put('/update-shop/:shopId', verifyJWT, updateShop)
router.get("/get-shops", verifyJWT, getShops);
router.get("/get-visited-shops", verifyJWT, getVisitedShops);
router.get(
  "/get-pending-and-visted-shops",

  getPendingAndVistedShops
);
router.get("/get-shop/:id", verifyJWT, getShopById);
router.post(
  "/assign-shops",
  verifyJWT,
  allowRoles("admin", "manager", "supervisor", "executive"),
  assignShops
);

router.post("/start-audit-location", verifyJWT, recordStartAuditLocation);
router.post("/photoclick-location", verifyJWT, recordPhotoCLickLocation);
router.post(
  "/visit",
  verifyJWT,
  upload.fields([{ name: "shopImage" }, { name: "shelfImage" }]),
  uploadVisitPictures
);

router.delete("/reset-visits", resetAllVisits);

router.get("/get-visit-stats", getVisitCounts);

export default router;
