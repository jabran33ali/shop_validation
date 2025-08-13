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

export const assignShopsToAuditors = async (req, res) => {
  try {
    const { auditorIds, shopIds } = req.body; // now accepts multiple auditors

    if (!auditorIds?.length || !shopIds?.length) {
      return res.status(400).json({
        message: "auditorIds (array) and shopIds (array) are required",
      });
    }

    // Validate auditors
    const auditors = await userModel.find({
      _id: { $in: auditorIds },
      role: "auditor",
    });

    if (auditors.length !== auditorIds.length) {
      return res
        .status(400)
        .json({ message: "One or more auditor IDs are invalid" });
    }

    // Assign shops (push new auditors without duplicates)
    const result = await shopModel.updateMany(
      { _id: { $in: shopIds } },
      { $addToSet: { assignedTo: { $each: auditorIds } } } // prevents duplicates
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
