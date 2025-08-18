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
        type: String, // store uploaded image URL or filename
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
); // accept any fields

const Shop = mongoose.model("Shop", shopSchema);
export default Shop;
