import mongoose from "mongoose";

const redirectSchema = new mongoose.Schema({
  oldUrl: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  newUrl: {
    type: String,
    required: true,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Redirect = mongoose.model("Redirect", redirectSchema);

export default Redirect;
