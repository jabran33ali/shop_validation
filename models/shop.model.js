import mongoose from "mongoose";

const shopSchema = new mongoose.Schema(
  {
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // linking to auditor
    },
    assignedQc: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
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
          detectionMethod: { type: String, enum: ['logo', 'text', 'object', 'none'], default: 'none' },
          logoDetections: [{
            description: { type: String },
            score: { type: Number },
            boundingPoly: {
              vertices: [{
                x: { type: Number },
                y: { type: Number }
              }]
            }
          }],
          extractedText: { type: String },
          detectedObjects: [{
            name: { type: String },
            score: { type: Number }
          }],
          detectedLabels: [{
            description: { type: String },
            score: { type: Number }
          }],
          processedAt: { type: Date, default: Date.now }
        }
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
  },
  { strict: false, timestamps: true }
);

const Shop = mongoose.model("Shop", shopSchema);
export default Shop;
