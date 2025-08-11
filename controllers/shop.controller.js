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

export const assignShopsToAuditor = async (req, res) => {
  try {
    const { auditorId, shopIds } = req.body;

    if (!auditorId || !shopIds || !shopIds.length) {
      return res
        .status(400)
        .json({ message: "auditorId and shopIds are required" });
    }

    // Check if user is auditor
    const auditor = await userModel.findById(auditorId);
    if (!auditor || auditor.role !== "auditor") {
      return res.status(400).json({ message: "Invalid auditor" });
    }

    // Assign shops
    const result = await shopModel.updateMany(
      { _id: { $in: shopIds } },
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
