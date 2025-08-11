import mongoose from "mongoose";

const shopSchema = new mongoose.Schema(
  {
    assignedTo: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User", // linking to auditor
      },
    ],
  },
  { strict: false, timestamps: true }
); // accept any fields

const Shop = mongoose.model("Shop", shopSchema);
export default Shop;
