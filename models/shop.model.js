import mongoose from "mongoose";

const shopSchema = new mongoose.Schema(
  {
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // linking to auditor
      default: null,
    },
    assignedQc: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    assignedSalesperson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // salesperson
    },
    assignedManagerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    visit: {
      type: Boolean,
      default: false,
    },
    visitByQc: {
      type: Boolean,
      default: false,
    },
    visitBySaleperson: {
      type: Boolean,
      default: false,
    },
    visitImages: [
      {
        shopImage: { type: String },
        shelfImage: { type: String },
        visitLocation: {
          startAudit: {
            latitude: { type: Number },
            longitude: { type: Number },
            timestamp: { type: Date },
          },
          photoClick: {
            latitude: { type: Number },
            longitude: { type: Number },
            timestamp: { type: Date },
          },
          proceedClick: {
            latitude: { type: Number },
            longitude: { type: Number },
            timestamp: { type: Date },
          },
        },
        // AI Detection Results
        aiDetection: {
          laysDetected: { type: Boolean, default: false },
          laysCount: { type: Number, default: 0 },
          confidence: { type: Number, default: 0 },
          detectionMethod: {
            type: String,
            enum: ["logo", "text", "object", "none"],
            default: "none",
          },
          logoDetections: [
            {
              description: { type: String },
              score: { type: Number },
              boundingPoly: {
                vertices: [
                  {
                    x: { type: Number },
                    y: { type: Number },
                  },
                ],
              },
            },
          ],
          extractedText: { type: String },
          detectedObjects: [
            {
              name: { type: String },
              score: { type: Number },
            },
          ],
          detectedLabels: [
            {
              description: { type: String },
              score: { type: Number },
            },
          ],
          processedAt: { type: Date, default: Date.now },
        },
        // GPS Validation Results
        gpsValidation: {
          isValid: { type: Boolean, default: false },
          validationStatus: {
            type: String,
            enum: ["valid", "invalid", "partial", "no_data"],
            default: "no_data",
          },
          startAuditDistance: { type: Number, default: null }, // Distance in meters
          photoClickDistance: { type: Number, default: null }, // Distance in meters
          proceedClickDistance: { type: Number, default: null }, // Distance in meters
          shopCoordinates: {
            latitude: { type: Number },
            longitude: { type: Number },
          },
          validationDetails: {
            startAuditValid: { type: Boolean, default: false },
            photoClickValid: { type: Boolean, default: false },
            proceedClickValid: { type: Boolean, default: false },
          },
          radiusThreshold: { type: Number, default: 30 }, // 30 meters
          validatedAt: { type: Date, default: Date.now },
        },
      },
    ],
    visitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // who visited
    },
    vistedByQcId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // who visited
    },
    visitedBySalespersonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // who visited
    },
    visitedAt: {
      type: Date,
    },
    visitedAtbYQc: {
      type: Date,
    },
    visitedAtBySalesperson: {
      type: Date,
    },

    // ✅ Track shop found/not found action
    shopFound: {
      status: { type: Boolean, default: null }, // true = found, false = not found
      latitude: { type: Number },
      longitude: { type: Number },
      timestamp: { type: Date },
    },
    shop_name: { type: String },
    shop_address: { type: String },
    gps_e: { type: Number },
    gps_n: { type: Number },
    thirtyMeterRadius: {
      type: Boolean,
      default: true,
    },
  },
  { strict: false, timestamps: true }
);

shopSchema.index({ assignedTo: 1 });

shopSchema.index({ assignedQc: 1 });

const Shop = mongoose.model("Shop", shopSchema);
export default Shop;
