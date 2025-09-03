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
    // optional query param ?unassigned=true
    const { unassigned } = req.query;

    let filter = {};

    if (unassigned === "true") {
      filter = {
        $or: [
          { assignedTo: { $exists: false } }, // key doesn't exist
          { assignedTo: null }, // key exists but value is null
        ],
      };
    }

    const shops = await shopModel.find(filter);

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
  const { visit } = req.query;

  try {
    const shops = await shopModel.find({
      visit,
      assignedTo: { $exists: true, $ne: null }, // must exist and not be null
    });

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

// export const assignShopsToAuditor = async (req, res) => {
//   try {
//     const { auditorId, shopIds } = req.body;

//     if (!auditorId || !shopIds?.length) {
//       return res.status(400).json({
//         message: "auditorId  and shopIds  are required",
//       });
//     }

//     // Validate auditor
//     const auditor = await userModel.findOne({
//       _id: auditorId,
//       role: "auditor",
//     });
//     if (!auditor) {
//       return res.status(400).json({ message: "Invalid auditor" });
//     }

//     // Find shops that are already assigned
//     const alreadyAssigned = await shopModel.find({
//       _id: { $in: shopIds },
//       assignedTo: { $ne: null }, // shop already has an auditor
//     });

//     if (alreadyAssigned.length > 0) {
//       return res.status(400).json({
//         message: "Some shops are already assigned to another auditor",
//         alreadyAssigned: alreadyAssigned.map((shop) => shop._id),
//       });
//     }

//     // Assign shops that are free
//     const result = await shopModel.updateMany(
//       { _id: { $in: shopIds }, assignedTo: null },
//       { $set: { assignedTo: auditorId } }
//     );

//     res.status(200).json({
//       message: "Shops assigned successfully",
//       modifiedCount: result.modifiedCount,
//     });
//   } catch (error) {
//     console.error("Error assigning shops:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// };

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
      // Find shops already assigned to some auditor
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
      // ✅ A shop can always have a QC assigned (independent of auditor)
      result = await shopModel.updateMany(
        { _id: { $in: shopIds } },
        { $set: { assignedQc: userId } }
      );
    } else {
      return res.status(400).json({ message: "Role must be auditor or qc" });
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
// export const uploadVisitPictures = async (req, res) => {
//   try {
//     const { shopId, auditorId } = req.body;

//     if (!req.files || req.files.length === 0) {
//       return res.status(400).json({ message: "No pictures uploaded" });
//     }

//     const imagePaths = req.files.map((file) => `/uploads/${file.filename}`);

//     const shop = await shopModel.findById(shopId);

//     if (!shop) {
//       return res.status(404).json({ message: "Shop not found" });
//     }

//     if (shop.assignedTo.toString() !== auditorId) {
//       return res
//         .status(403)
//         .json({ message: "This shop is not assigned to you" });
//     }

//     shop.visit = true;
//     shop.visitImages.push(...imagePaths);
//     shop.visitedBy = auditorId;
//     shop.visitedAt = new Date();

//     await shop.save();

//     res.status(200).json({
//       message: "Visit recorded successfully",
//       shop,
//     });
//   } catch (error) {
//     console.error("Error uploading visit pictures:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// };

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
    const { shopId, auditorId, latitude, longitude } = req.body;

    if (!req.files || !req.files.shopImage || !req.files.shelfImage) {
      return res
        .status(400)
        .json({ message: "Both shop and shelf images are required" });
    }

    const shop = await shopModel.findById(shopId);
    if (!shop) return res.status(404).json({ message: "Shop not found" });

    if (shop.assignedTo.toString() !== auditorId) {
      return res
        .status(403)
        .json({ message: "This shop is not assigned to you" });
    }

    if (shop.visitImages.length === 0) {
      return res.status(400).json({ message: "No audit started yet" });
    }

    // Get last visitImage
    const lastVisit = shop.visitImages[shop.visitImages.length - 1];
    lastVisit.shopImage = `/uploads/${req.files.shopImage[0].filename}`;
    lastVisit.shelfImage = `/uploads/${req.files.shelfImage[0].filename}`;
    lastVisit.visitLocation.proceedClick = {
      latitude: latitude ? Number(latitude) : null,
      longitude: longitude ? Number(longitude) : null,
      timestamp: new Date(),
    };

    shop.visit = true;
    shop.visitedBy = auditorId;
    shop.visitedAt = new Date();

    await shop.save();

    res.status(200).json({
      message: "Visit completed successfully",
      data: lastVisit,
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
};

export const getVisitCounts = async (req, res) => {
  try {
    const { id } = req.query; // pass id in params

    let visitedCount;
    let notVisitedCount;
    let total;

    if (id) {
      // ✅ filter only shops assigned to this auditor
      visitedCount = await shopModel.countDocuments({
        assignedTo: id,
        visit: true,
      });

      notVisitedCount = await shopModel.countDocuments({
        assignedTo: id,
        visit: false,
      });

      total = visitedCount + notVisitedCount;
    } else {
      // ✅ global counts if no id is passed
      visitedCount = await shopModel.countDocuments({ visit: true });
      notVisitedCount = await shopModel.countDocuments({ visit: false });
      total = visitedCount + notVisitedCount;
    }

    res.status(200).json({
      message: id
        ? "Visit counts for auditor fetched successfully"
        : "Global visit counts fetched successfully",
      visited: visitedCount,
      notVisited: notVisitedCount,
      total,
    });
  } catch (error) {
    console.error("Error fetching visit counts:", error);
    res.status(500).json({ message: "Server error" });
  }
};
