import mongoose from "mongoose";

const shopSchema = new mongoose.Schema(
  {
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // linking to auditor
    },
    visit: {
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
      },
    ],
    visitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // who visited
    },
    visitedAt: {
      type: Date,
    },
  },
  { strict: false, timestamps: true }
);

const Shop = mongoose.model("Shop", shopSchema);
export default Shop;
