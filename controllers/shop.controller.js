import xlsx from "xlsx";
import shopModel from "../models/shop.model.js";
import userModel from "../models/user.model.js";
import { analyzeImageForLays } from "../utils/aiDetection.js";
import { validateVisitGPS } from "../utils/gpsValidation.js";

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
}; // delete this api later

export const addShop = async (req, res) => {
  try {
    const { shop_name, shop_address, gps_e, gps_n } = req.body;

    // Basic validation
    if (
      !shop_name ||
      !shop_address ||
      gps_e === undefined ||
      gps_n === undefined
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Create new shop
    const newShop = new shopModel({
      shop_name,
      shop_address,
      gps_e,
      gps_n,
    });

    await newShop.save();

    res.status(201).json({
      message: "Shop added successfully",
      shop: newShop,
    });
  } catch (error) {
    console.error("Error adding shop:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const updateShop = async (req, res) => {
  try {
    const { shopId } = req.params;
    const { userId, ...updateData } = req.body; // ✅ take all fields from body

    if (!shopId || !userId) {
      return res
        .status(400)
        .json({ message: "shopId and userId are required" });
    }

    // ✅ Check user role
    const user = await userModel.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.role !== "saleperson" && user.role !== "qc") {
      return res
        .status(403)
        .json({ message: "You are not authorized to update shops" });
    }

    // ✅ Update shop with all provided fields
    const updatedShop = await shopModel.findByIdAndUpdate(
      shopId,
      { $set: updateData },
      { new: true, runValidators: true } // return updated shop & validate schema
    );

    if (!updatedShop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    res.status(200).json({
      message: "Shop updated successfully",
      shop: updatedShop,
    });
  } catch (error) {
    console.error("Error updating shop:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const updateThirtyMeterRadius = async (req, res) => {
  try {
    const { shopIds, thirtyMeterRadius } = req.body;

    if (typeof thirtyMeterRadius !== "boolean") {
      return res
        .status(400)
        .json({ message: "thirtyMeterRadius must be true or false" });
    }

    // If only one shopId is provided
    if (typeof shopIds === "string") {
      const shop = await shopModel.findByIdAndUpdate(
        shopIds,
        { $set: { thirtyMeterRadius } },
        { new: true }
      );

      if (!shop) {
        return res.status(404).json({ message: "Shop not found" });
      }

      return res.status(200).json({
        message: "thirtyMeterRadius updated for single shop",
        shop,
      });
    }

    // If multiple shopIds are provided
    if (Array.isArray(shopIds)) {
      const result = await shopModel.updateMany(
        { _id: { $in: shopIds } },
        { $set: { thirtyMeterRadius } }
      );

      return res.status(200).json({
        message: "thirtyMeterRadius updated for multiple shops",
        modifiedCount: result.modifiedCount,
      });
    }

    res.status(400).json({
      message: "shopIds must be either a string (single shopId) or an array",
    });
  } catch (error) {
    console.error("Error updating thirtyMeterRadius:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// export const getShops = async (req, res) => {
//   try {
//     const { unassigned, page = 1, limit = 10 } = req.query;

//     let filter = {};

//     if (unassigned === "true") {
//       filter = {
//         $or: [{ assignedTo: { $exists: false } }, { assignedTo: null }],
//       };
//     }

//     const pageNum = parseInt(page, 10);
//     const limitNum = parseInt(limit, 10);

//     const totalShops = await shopModel.countDocuments(filter);

//     const shops = await shopModel
//       .find(filter)
//       .sort({ createdAt: -1 }) // 👈 sort latest first
//       .skip((pageNum - 1) * limitNum)
//       .limit(limitNum);

//     res.status(200).json({
//       message: "Shops fetched successfully",
//       pagination: {
//         total: totalShops,
//         page: pageNum,
//         limit: limitNum,
//         totalPages: Math.ceil(totalShops / limitNum),
//       },
//       count: shops.length,
//       data: shops,
//     });
//   } catch (error) {
//     console.error("Error fetching shops:", error);
//     res
//       .status(500)
//       .json({ message: "Error fetching shops", error: error.message });
//   }
// };

export const getShops = async (req, res) => {
  try {
    const { unassigned, shop_name, page = 1, limit = 10 } = req.query;

    let filter = {};

    // 🔍 Optional filter: only unassigned
    if (unassigned === "true") {
      filter.$or = [{ assignedTo: { $exists: false } }, { assignedTo: null }];
    }

    // 🔍 Optional filter: shop_name search (case-insensitive)
    if (shop_name) {
      filter.shop_name = { $regex: shop_name, $options: "i" };
    }

    // Pagination numbers
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    // Count with filters
    const totalShops = await shopModel.countDocuments(filter);

    // Fetch shops with filters + pagination + sorting
    const shops = await shopModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    res.status(200).json({
      message: "Shops fetched successfully",
      pagination: {
        total: totalShops,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalShops / limitNum),
      },
      count: shops.length,
      data: shops,
    });
  } catch (error) {
    console.error("Error fetching shops:", error);
    res.status(500).json({
      message: "Error fetching shops",
      error: error.message,
    });
  }
};

export const getVisitedShops = async (req, res) => {
  const { auditorId } = req.query;
  try {
    const shops = await shopModel.find({ auditorId, visit: true });

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

export const getPendingAndVistedShops = async (req, res) => {
  const { visit, visitByQc, visitBySaleperson, userId } = req.query;

  try {
    const user = await userModel.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let shops = [];

    if (user.role === "auditor") {
      shops = await shopModel.find({
        visit,
        assignedTo: userId,
      });
    } else if (user.role === "qc") {
      shops = await shopModel.find({
        visitByQc,
        assignedQc: userId,
      });
    } else if (user.role === "saleperson") {
      shops = await shopModel.find({
        visitBySaleperson,
        assignedSalesperson: userId,
      });
    } else if (user.role === "admin") {
      shops = await shopModel.find({
        visit,
        $or: [
          { assignedTo: { $exists: true, $ne: null } }, // auditor
          { assignedQc: { $exists: true, $ne: null } }, // qc
          { assignedSalesperson: { $exists: true, $ne: null } }, // saleperson
        ],
      });
    }

    res.status(200).json({
      message: "Shops fetched successfully",
      count: shops.length,
      data: shops,
    });
  } catch (error) {
    console.error("Error fetching shops:", error);
    res.status(500).json({
      message: "Error fetching shops",
      error: error.message,
    });
  }
};

export const getShopById = async (req, res) => {
  try {
    const { id } = req.params;
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

export const assignShops = async (req, res) => {
  try {
    const { userId, shopIds, role } = req.body;

    if (!userId || !shopIds?.length || !role) {
      return res.status(400).json({
        message: "userId, role, and shopIds are required",
      });
    }

    // Validate user
    const user = await userModel.findOne({ _id: userId, role });
    if (!user) {
      return res.status(400).json({ message: `Invalid ${role}` });
    }

    let result;

    if (role === "auditor") {
      // Check if already assigned to another auditor
      const alreadyAssigned = await shopModel.find({
        _id: { $in: shopIds },
        assignedTo: { $ne: null },
      });

      if (alreadyAssigned.length > 0) {
        return res.status(400).json({
          message: "Some shops are already assigned to another auditor",
          alreadyAssigned: alreadyAssigned.map((shop) => shop._id),
        });
      }

      // Assign auditor
      result = await shopModel.updateMany(
        { _id: { $in: shopIds }, assignedTo: null },
        { $set: { assignedTo: userId } }
      );
    } else if (role === "qc") {
      // Check if already assigned to another QC
      const alreadyAssignedQc = await shopModel.find({
        _id: { $in: shopIds },
        assignedQc: { $ne: null },
      });

      if (alreadyAssignedQc.length > 0) {
        return res.status(400).json({
          message: "Some shops are already assigned to another QC",
          alreadyAssigned: alreadyAssignedQc.map((shop) => shop._id),
        });
      }

      // Assign QC
      result = await shopModel.updateMany(
        { _id: { $in: shopIds }, assignedQc: null },
        { $set: { assignedQc: userId } }
      );
    } else if (role === "saleperson") {
      // Check if already assigned to another salesperson
      const alreadyAssignedSales = await shopModel.find({
        _id: { $in: shopIds },
        assignedSalesperson: { $ne: null },
      });

      if (alreadyAssignedSales.length > 0) {
        return res.status(400).json({
          message: "Some shops are already assigned to another salesperson",
          alreadyAssigned: alreadyAssignedSales.map((shop) => shop._id),
        });
      }

      // Assign salesperson
      result = await shopModel.updateMany(
        { _id: { $in: shopIds }, assignedSalesperson: null },
        { $set: { assignedSalesperson: userId } }
      );
    } else if (role === "manager") {
      // Check if already assigned to another QC
      const alreadyAssignedManager = await shopModel.find({
        _id: { $in: shopIds },
        assignedManagerId: { $ne: null },
      });

      if (alreadyAssignedManager.length > 0) {
        return res.status(400).json({
          message: "Some shops are already assigned to another Manager",
          alreadyAssigned: alreadyAssignedManager.map((shop) => shop._id),
        });
      }

      // Assign manager
      result = await shopModel.updateMany(
        { _id: { $in: shopIds }, assignedManagerId: null },
        { $set: { assignedManagerId: userId } }
      );
    } else {
      return res
        .status(400)
        .json({ message: "Role must be auditor, qc, manager or salesperson" });
    }

    res.status(200).json({
      message: `${role} assigned successfully`,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Error assigning shops:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getShopsByAuditor = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "User id is required" });
    }

    const user = await userModel.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let shops = [];
    if (user.role === "auditor") {
      shops = await shopModel.find({ assignedTo: id });
    } else if (user.role === "qc") {
      shops = await shopModel.find({ assignedQc: id });
    } else if (user.role === "saleperson") {
      shops = await shopModel.find({ assignedSalesperson: id });
    } else if (user.role === "manager") {
      shops = await shopModel.find({ assignedManagerId: id });
    } else {
      return res.status(400).json({ message: "User role not supported" });
    }

    res.status(200).json({
      count: shops.length,
      shops,
    });
  } catch (error) {
    console.error("Error fetching shops by user:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const recordStartAuditLocation = async (req, res) => {
  try {
    const { shopId, latitude, longitude } = req.body;

    const shop = await shopModel.findById(shopId);
    if (!shop) return res.status(404).json({ message: "Shop not found" });

    // Create a new visit entry in visitImages
    shop.visitImages.push({
      visitLocation: {
        startAudit: {
          latitude,
          longitude,
          timestamp: new Date(),
        },
        photoClick: null, // Initialize as null, will be set later
        proceedClick: null, // Initialize as null, will be set later
      },
    });

    await shop.save();
    res.status(200).json({
      message: "Photo click location saved",
      data: shop.visitImages[shop.visitImages.length - 1], // return the new visit object
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const recordPhotoCLickLocation = async (req, res) => {
  try {
    const { shopId, latitude, longitude } = req.body;

    const shop = await shopModel.findById(shopId);
    if (!shop) return res.status(404).json({ message: "Shop not found" });

    if (shop.visitImages.length === 0) {
      return res.status(400).json({ message: "No audit started yet" });
    }

    // Get last visitImage
    const lastVisit = shop.visitImages[shop.visitImages.length - 1];

    // Ensure visitLocation exists and initialize photoClick
    if (!lastVisit.visitLocation) {
      lastVisit.visitLocation = {};
    }

    lastVisit.visitLocation.photoClick = {
      latitude,
      longitude,
      timestamp: new Date(),
    };

    await shop.save();
    res
      .status(200)
      .json({ message: "Proceed location saved", data: lastVisit });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const uploadVisitPictures = async (req, res) => {
  try {
    const { shopId, userId, latitude, longitude } = req.body;

    if (!req.files || !req.files.shopImage || !req.files.shelfImage) {
      return res
        .status(400)
        .json({ message: "Both shop and shelf images are required" });
    }

    const shop = await shopModel.findById(shopId);
    if (!shop) return res.status(404).json({ message: "Shop not found" });

    // ✅ find the user
    const user = await userModel.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // ✅ role-based assignment check
    if (user.role === "auditor") {
      if (!shop.assignedTo || shop.assignedTo.toString() !== userId) {
        return res
          .status(403)
          .json({ message: "This shop is not assigned to you" });
      }
    } else if (user.role === "qc") {
      if (!shop.assignedQc || shop.assignedQc.toString() !== userId) {
        return res
          .status(403)
          .json({ message: "This shop is not assigned to you" });
      }
    } else if (user.role === "saleperson") {
      if (
        !shop.assignedSalesperson ||
        shop.assignedSalesperson.toString() !== userId
      ) {
        return res
          .status(403)
          .json({ message: "This shop is not assigned to you" });
      }
    } else {
      return res.status(403).json({ message: "Unauthorized role" });
    }

    // Ensure an audit exists
    if (shop.visitImages.length === 0) {
      return res.status(400).json({ message: "No audit started yet" });
    }

    // ✅ Get last visit entry and update with Cloudinary URLs + location
    const lastVisit = shop.visitImages[shop.visitImages.length - 1];
    lastVisit.shopImage = req.files.shopImage[0].path; // Cloudinary secure_url
    lastVisit.shelfImage = req.files.shelfImage[0].path;

    // Ensure visitLocation exists and initialize proceedClick
    if (!lastVisit.visitLocation) {
      lastVisit.visitLocation = {};
    }

    lastVisit.visitLocation.proceedClick = {
      latitude: latitude ? Number(latitude) : null,
      longitude: longitude ? Number(longitude) : null,
      timestamp: new Date(),
    };

    // 🤖 AI Detection for Lay's products
    console.log("🤖 Starting AI detection for uploaded images...");
    try {
      // Analyze the shelf image for Lay's products
      const aiResult = await analyzeImageForLays(lastVisit.shelfImage);

      // Store AI detection results
      lastVisit.aiDetection = aiResult;

      console.log("✅ AI Detection completed:", {
        laysDetected: aiResult.laysDetected,
        laysCount: aiResult.laysCount,
        confidence: aiResult.confidence,
        detectionMethod: aiResult.detectionMethod,
      });
    } catch (aiError) {
      console.error("❌ AI Detection failed:", aiError);
      // Set default AI detection result on error
      lastVisit.aiDetection = {
        laysDetected: false,
        laysCount: 0,
        confidence: 0,
        detectionMethod: "none",
        logoDetections: [],
        extractedText: "",
        detectedObjects: [],
        detectedLabels: [],
        processedAt: new Date(),
        error: aiError.message,
      };
    }

    // 🗺️ GPS Validation for visit locations
    console.log("🗺️ Starting GPS validation for visit locations...");
    try {
      // Get shop coordinates
      const shopCoordinates = {
        gps_n: shop.gps_n,
        gps_e: shop.gps_e,
      };

      // Debug: Log the actual data being passed
      console.log("🔍 DEBUG - Shop coordinates:", shopCoordinates);
      console.log(
        "🔍 DEBUG - Visit location data:",
        JSON.stringify(lastVisit.visitLocation, null, 2)
      );
      console.log("🔍 DEBUG - Last visit object keys:", Object.keys(lastVisit));

      // Validate GPS coordinates for this visit
      const gpsValidationResult = validateVisitGPS(
        lastVisit.visitLocation,
        shopCoordinates,
        30
      );

      // Store GPS validation results
      lastVisit.gpsValidation = gpsValidationResult;

      console.log("✅ GPS Validation completed:", {
        isValid: gpsValidationResult.isValid,
        validationStatus: gpsValidationResult.validationStatus,
        startAuditDistance: gpsValidationResult.startAuditDistance,
        photoClickDistance: gpsValidationResult.photoClickDistance,
        proceedClickDistance: gpsValidationResult.proceedClickDistance,
      });
    } catch (gpsError) {
      console.error("❌ GPS Validation failed:", gpsError);
      // Set default GPS validation result on error
      lastVisit.gpsValidation = {
        isValid: false,
        validationStatus: "no_data",
        error: gpsError.message,
        shopCoordinates: null,
        startAuditDistance: null,
        photoClickDistance: null,
        proceedClickDistance: null,
        validationDetails: {
          startAuditValid: false,
          photoClickValid: false,
          proceedClickValid: false,
        },
        radiusThreshold: 30,
        validatedAt: new Date(),
      };
    }

    if (user.role === "auditor") {
      shop.visit = true;
      shop.visitedBy = userId;
      shop.visitedAt = new Date();
    } else if (user.role === "qc") {
      shop.visitByQc = true; // ✅ separate flag
      shop.vistedByQcId = userId;
      shop.visitedAtbYQc = new Date();
    } else if (user.role === "saleperson") {
      shop.visitBySaleperson = true;
      shop.visitedBySalespersonId = userId;
      shop.visitedAtBySalesperson = new Date();
    }

    await shop.save();

    res.status(200).json({
      message:
        user.role === "auditor"
          ? "Audit visit completed successfully"
          : "QC visit completed successfully",
      data: lastVisit,
      aiDetection: lastVisit.aiDetection,
      gpsValidation: lastVisit.gpsValidation,
    });
  } catch (error) {
    console.error("Error uploading visit pictures:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const resetAllVisits = async (req, res) => {
  try {
    const result = await shopModel.updateMany(
      {}, // match all shops
      {
        $set: {
          visit: false,
          visitImages: [], // clear array
        },
        $unset: {
          visitedBy: "",
          visitedAt: "",
        },
      }
    );

    res.status(200).json({
      message: "All visits reset successfully",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Error resetting visits:", error);
    res.status(500).json({ message: "Server error" });
  }
}; // delete this api later

export const getVisitCounts = async (req, res) => {
  try {
    const { id } = req.query; // user id
    let visitedCount = 0;
    let notVisitedCount = 0;
    let total = 0;

    if (id) {
      // ✅ first get the user role
      const user = await userModel.findById(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.role === "auditor") {
        // Auditor flow → show visited / not visited
        visitedCount = await shopModel.countDocuments({
          assignedTo: id,
          visit: true,
        });

        notVisitedCount = await shopModel.countDocuments({
          assignedTo: id,
          visit: false,
        });

        total = visitedCount + notVisitedCount;

        return res.status(200).json({
          message: "Visit counts for auditor fetched successfully",
          visited: visitedCount,
          notVisited: notVisitedCount,
          total,
        });
      } else if (user.role === "qc") {
        // QC flow → only assigned shops count (no visited filter)
        visitedCount = await shopModel.countDocuments({
          assignedQc: id,
          visitByQc: true,
        });

        notVisitedCount = await shopModel.countDocuments({
          assignedQc: id,
          visitByQc: false,
        });

        total = visitedCount + notVisitedCount;

        return res.status(200).json({
          message: "Assigned shops for QC fetched sussefully",
          visited: visitedCount,
          notVisited: notVisitedCount,
          total,
        });
      } else if (user.role === "saleperson") {
        // saleperson flow → only assigned shops count (no visited filter)
        visitedCount = await shopModel.countDocuments({
          assignedSalesperson: id,
          visitBySaleperson: true,
        });

        notVisitedCount = await shopModel.countDocuments({
          assignedSalesperson: id,
          visitBySaleperson: false,
        });

        total = visitedCount + notVisitedCount;
        return res.status(200).json({
          message: "Assigned shops for Sales Person fetched successfully",
          visited: visitedCount,
          notVisited: notVisitedCount,
          total,
        });
      } else {
        return res
          .status(400)
          .json({ message: "Role not supported for visit counts" });
      }
    } else {
      // ✅ global counts if no id passed
      visitedCount = await shopModel.countDocuments({ visit: true });
      notVisitedCount = await shopModel.countDocuments({ visit: false });
      total = visitedCount + notVisitedCount;

      return res.status(200).json({
        message: "Global visit counts fetched successfully",
        visited: visitedCount,
        notVisited: notVisitedCount,
        total,
      });
    }
  } catch (error) {
    console.error("Error fetching visit counts:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const markShopFound = async (req, res) => {
  try {
    const { shopId } = req.params;
    const { status, latitude, longitude, userId } = req.body;

    if (typeof status !== "boolean") {
      return res
        .status(400)
        .json({ message: "status must be true (found) or false (not found)" });
    }

    // Find user to check role
    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Prepare update object
    const updateData = {
      shopFound: {
        status,
        latitude,
        longitude,
        timestamp: new Date(),
        markedBy: user.role, // store who marked it
      },
    };

    // Based on role, mark visit flag
    if (user.role === "saleperson") {
      updateData.visitBySaleperson = true;
    } else if (user.role === "qc") {
      updateData.visitByQc = true;
    } else if (user.role === "auditor") {
      updateData.visit = true;
    }

    const shop = await shopModel.findByIdAndUpdate(
      shopId,
      { $set: updateData },
      { new: true }
    );

    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    res.status(200).json({
      message: `Shop marked as ${status ? "Found" : "Not Found"} by ${
        user.role
      }`,
      shop,
    });
  } catch (error) {
    console.error("Error marking shop found:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const updateShopsFromExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Read Excel file
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    let jsonData = xlsx.utils.sheet_to_json(sheet); // ✅ use let

    if (!jsonData.length) {
      return res.status(400).json({ message: "Excel file is empty" });
    }

    // ✅ Sanitize keys (remove dots/spaces)
    jsonData = jsonData.map((row) => {
      const cleaned = {};
      Object.keys(row).forEach((key) => {
        const safeKey = key.replace(/\./g, "_").trim(); // replace "." with "_"
        cleaned[safeKey] = row[key];
      });
      return cleaned;
    });

    // ✅ Bulk update operations
    const bulkOps = jsonData.map((shop) => {
      // Build filter dynamically
      let filter = {};
      if (shop.shop_name) filter.shop_name = shop.shop_name;
      if (shop.shop_address) filter.shop_address = shop.shop_address;
      if (shop.district) filter.district = shop.district;
      if (shop.city) filter.city = shop.city;
      if (shop.area) filter.area = shop.area;
      if (shop.channel_type) filter.channel_type = shop.channel_type;

      return {
        updateOne: {
          filter,
          update: { $set: shop },
          upsert: true, // insert if not found
        },
      };
    });

    const result = await shopModel.bulkWrite(bulkOps);

    res.status(200).json({
      message: "Shops updated successfully",
      matched: result.matchedCount,
      modified: result.modifiedCount,
      upserted: result.upsertedCount,
    });
  } catch (error) {
    console.error("Error updating shops:", error);
    res
      .status(500)
      .json({ message: "Error updating shops", error: error.message });
  }
}; /// delete this api later

////////////////////////////////////////////////////////  * AI APIs * ////////////////////////////////////////////////////////////////////////////////////////////////

// 🤖 Get AI detection results for a specific shop
export const getAIDetectionResults = async (req, res) => {
  try {
    const { shopId } = req.params;

    const shop = await shopModel.findById(shopId);
    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    // Extract AI detection results from all visit images
    const aiResults = shop.visitImages
      .filter((visit) => visit.aiDetection)
      .map((visit) => ({
        visitId: visit._id,
        shopImage: visit.shopImage,
        shelfImage: visit.shelfImage,
        aiDetection: visit.aiDetection,
        visitDate:
          visit.visitLocation?.proceedClick?.timestamp ||
          visit.visitLocation?.photoClick?.timestamp,
      }));

    // Calculate summary statistics
    const summary = {
      totalVisits: shop.visitImages.length,
      visitsWithAI: aiResults.length,
      totalLaysDetected: aiResults.reduce(
        (sum, result) =>
          sum +
          (result.aiDetection.laysDetected ? result.aiDetection.laysCount : 0),
        0
      ),
      averageConfidence:
        aiResults.length > 0
          ? aiResults.reduce(
              (sum, result) => sum + result.aiDetection.confidence,
              0
            ) / aiResults.length
          : 0,
      detectionMethods: [
        ...new Set(
          aiResults.map((result) => result.aiDetection.detectionMethod)
        ),
      ],
      lastDetection:
        aiResults.length > 0
          ? aiResults[aiResults.length - 1].aiDetection.processedAt
          : null,
    };

    res.status(200).json({
      message: "AI detection results fetched successfully",
      shopId,
      summary,
      results: aiResults,
    });
  } catch (error) {
    console.error("Error fetching AI detection results:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const saveGPSValidationResults = async (req, res) => {
  const { shopId } = req.params;
  const { gpsValidationResults } = req.body;

  try {
    console.log("🗺️ Saving GPS validation results for shop:", shopId);
    console.log(
      "📊 GPS validation data:",
      JSON.stringify(gpsValidationResults, null, 2)
    );

    const shop = await shopModel.findById(shopId);
    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    if (!shop.visitImages || shop.visitImages.length === 0) {
      return res
        .status(400)
        .json({ message: "No visit images found for this shop" });
    }

    if (!gpsValidationResults || !Array.isArray(gpsValidationResults)) {
      return res
        .status(400)
        .json({ message: "Invalid GPS validation results data" });
    }

    // Update GPS validation results for each visit
    let updatedCount = 0;
    for (
      let i = 0;
      i < shop.visitImages.length && i < gpsValidationResults.length;
      i++
    ) {
      const visit = shop.visitImages[i];
      const gpsResult = gpsValidationResults[i];

      if (gpsResult && gpsResult.calculatedGPSValidation) {
        // Update the GPS validation data
        visit.gpsValidation = {
          isValid: gpsResult.calculatedGPSValidation.isValid,
          validationStatus: gpsResult.calculatedGPSValidation.validationStatus,
          startAuditDistance:
            gpsResult.calculatedGPSValidation.startAuditDistance,
          photoClickDistance:
            gpsResult.calculatedGPSValidation.photoClickDistance,
          shopCoordinates: gpsResult.calculatedGPSValidation.shopCoordinates,
          validationDetails:
            gpsResult.calculatedGPSValidation.validationDetails,
          radiusThreshold:
            gpsResult.calculatedGPSValidation.radiusThreshold || 30,
          validatedAt: new Date(),
        };
        updatedCount++;

        console.log(`✅ Updated GPS validation for visit ${i + 1}:`, {
          isValid: visit.gpsValidation.isValid,
          validationStatus: visit.gpsValidation.validationStatus,
          startAuditDistance: visit.gpsValidation.startAuditDistance,
          photoClickDistance: visit.gpsValidation.photoClickDistance,
        });
      }
    }

    // Save the updated shop
    await shop.save();

    console.log(
      `🎯 Successfully saved GPS validation results for ${updatedCount} visits in shop ${shopId}`
    );

    res.status(200).json({
      message: "GPS validation results saved successfully",
      shopId,
      updatedVisits: updatedCount,
      totalVisits: shop.visitImages.length,
    });
  } catch (error) {
    console.error("Error saving GPS validation results:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const saveAIDetectionResults = async (req, res) => {
  const { shopId } = req.params;
  const { aiDetectionResults } = req.body;

  try {
    console.log("🤖 Saving AI detection results for shop:", shopId);
    console.log(
      "📊 AI detection data:",
      JSON.stringify(aiDetectionResults, null, 2)
    );

    const shop = await shopModel.findById(shopId);
    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    if (!shop.visitImages || shop.visitImages.length === 0) {
      return res
        .status(400)
        .json({ message: "No visit images found for this shop" });
    }

    if (!aiDetectionResults || !Array.isArray(aiDetectionResults)) {
      return res
        .status(400)
        .json({ message: "Invalid AI detection results data" });
    }

    // Update AI detection results for each visit
    let updatedCount = 0;
    for (
      let i = 0;
      i < shop.visitImages.length && i < aiDetectionResults.length;
      i++
    ) {
      const visit = shop.visitImages[i];
      const aiResult = aiDetectionResults[i];

      if (aiResult && aiResult.calculatedAIDetection) {
        // Update the AI detection data
        visit.aiDetection = {
          laysDetected: aiResult.calculatedAIDetection.laysDetected,
          laysCount: aiResult.calculatedAIDetection.laysCount,
          confidence: aiResult.calculatedAIDetection.confidence,
          detectionMethod: aiResult.calculatedAIDetection.detectionMethod,
          logoDetections: aiResult.calculatedAIDetection.logoDetections || [],
          extractedText: aiResult.calculatedAIDetection.extractedText || "",
          detectedObjects: aiResult.calculatedAIDetection.detectedObjects || [],
          detectedLabels: aiResult.calculatedAIDetection.detectedLabels || [],
          processedAt: new Date(),
        };
        updatedCount++;

        console.log(`✅ Updated AI detection for visit ${i + 1}:`, {
          laysDetected: visit.aiDetection.laysDetected,
          laysCount: visit.aiDetection.laysCount,
          confidence: visit.aiDetection.confidence,
          detectionMethod: visit.aiDetection.detectionMethod,
        });
      }
    }

    // Save the updated shop
    await shop.save();

    console.log(
      `🎯 Successfully saved AI detection results for ${updatedCount} visits in shop ${shopId}`
    );

    res.status(200).json({
      message: "AI detection results saved successfully",
      shopId,
      updatedVisits: updatedCount,
      totalVisits: shop.visitImages.length,
    });
  } catch (error) {
    console.error("Error saving AI detection results:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/////delete them later
//
// PREVIEW latest N shops
export const previewLatestShops = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;

    const shops = await shopModel.find({}).sort({ createdAt: -1 }).limit(limit);

    return res.status(200).json({
      message: "Preview of shops to be deleted",
      count: shops.length,
      data: shops,
    });
  } catch (error) {
    console.error("Preview error:", error);
    return res.status(500).json({
      message: "Error previewing shops",
      error: error.message,
    });
  }
};

// DELETE latest N shops
export const deleteLatestShops = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;

    // 1. Fetch shops first
    const shopsToDelete = await shopModel
      .find({})
      .sort({ createdAt: -1 })
      .limit(limit);

    if (shopsToDelete.length === 0) {
      return res.status(404).json({ message: "No shops found to delete" });
    }

    // 2. Delete using IDs
    await shopModel.deleteMany({
      _id: { $in: shopsToDelete.map((s) => s._id) },
    });

    return res.status(200).json({
      message: "Latest shops deleted successfully",
      deletedCount: shopsToDelete.length,
    });
  } catch (error) {
    console.error("Delete error:", error);
    return res.status(500).json({
      message: "Error deleting shops",
      error: error.message,
    });
  }
};
