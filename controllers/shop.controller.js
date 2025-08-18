import xlsx from "xlsx";
import shopModel from "../models/shop.model.js";
import userModel from "../models/user.model.js";

export const uploadShops = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Read Excel file
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonData = xlsx.utils.sheet_to_json(sheet);

    if (!jsonData.length) {
      return res.status(400).json({ message: "Excel file is empty" });
    }

    // Insert into MongoDB
    const inserted = await shopModel.insertMany(jsonData);

    res.status(200).json({
      message: "Shops uploaded successfully",
      count: inserted.length,
    });
  } catch (error) {
    console.error("Error uploading shops:", error);
    res
      .status(500)
      .json({ message: "Error uploading shops", error: error.message });
  }
};

export const getShops = async (req, res) => {
  try {
    const shops = await shopModel.find();

    res.status(200).json({
      message: "Shops fetched successfully",
      count: shops.length,
      data: shops,
    });
  } catch (error) {
    console.error("Error fetching shops:", error);
    res
      .status(500)
      .json({ message: "Error fetching shops", error: error.message });
  }
};

export const getShopById = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("req.params:", req.params);
    console.log("req.query:", req.query);
    const shop = await shopModel.findById(id);
    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }
    res.status(200).json({
      message: "Shop fetched successfully",
      data: shop,
    });
  } catch (error) {
    console.error("Error fetching shop:", error);
    res
      .status(500)
      .json({ message: "Error fetching shop", error: error.message });
  }
};

export const assignShopsToAuditor = async (req, res) => {
  try {
    const { auditorId, shopIds } = req.body;

    if (!auditorId || !shopIds?.length) {
      return res.status(400).json({
        message: "auditorId (string) and shopIds (array) are required",
      });
    }

    // Validate auditor
    const auditor = await userModel.findOne({
      _id: auditorId,
      role: "auditor",
    });
    if (!auditor) {
      return res.status(400).json({ message: "Invalid auditor" });
    }

    // Find shops that are already assigned
    const alreadyAssigned = await shopModel.find({
      _id: { $in: shopIds },
      assignedTo: { $ne: null }, // shop already has an auditor
    });

    if (alreadyAssigned.length > 0) {
      return res.status(400).json({
        message: "Some shops are already assigned to another auditor",
        alreadyAssigned: alreadyAssigned.map((shop) => shop._id),
      });
    }

    // Assign shops that are free
    const result = await shopModel.updateMany(
      { _id: { $in: shopIds }, assignedTo: null },
      { $set: { assignedTo: auditorId } }
    );

    res.status(200).json({
      message: "Shops assigned successfully",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Error assigning shops:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getShopsByAuditor = async (req, res) => {
  try {
    const { auditorId } = req.params;

    if (!auditorId) {
      return res.status(400).json({ message: "auditorId is required" });
    }

    const shops = await shopModel.find({ assignedTo: auditorId });

    res.status(200).json({
      count: shops.length,
      shops,
    });
  } catch (error) {
    console.error("Error fetching shops by auditor:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Auditor visit upload controller
export const uploadVisitPictures = async (req, res) => {
  try {
    const { shopId, auditorId } = req.body;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No pictures uploaded" });
    }

    const imagePaths = req.files.map((file) => `/uploads/${file.filename}`);

    const shop = await shopModel.findById(shopId);

    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    if (shop.assignedTo.toString() !== auditorId) {
      return res
        .status(403)
        .json({ message: "This shop is not assigned to you" });
    }

    shop.visit = true;
    shop.visitImages.push(...imagePaths);
    shop.visitedBy = auditorId;
    shop.visitedAt = new Date();

    await shop.save();

    res.status(200).json({
      message: "Visit recorded successfully",
      shop,
    });
  } catch (error) {
    console.error("Error uploading visit pictures:", error);
    res.status(500).json({ message: "Server error" });
  }
};
