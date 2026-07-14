import mongoose from "mongoose";

const SliderSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    sliderLink: {
      type: String,
      required: false,
      trim: true,
    },
    sliderOrder: {
      type: Number,
      required: true,
    },
    sliderStatus: {
      type: String,
      enum: ["Yes", "No"],
      default: "Yes",
    },
    clientLogo: {
      type: String, // URL or base64 string for the image
      required: true,
    },
  },
  { timestamps: true, collection: "sliders" }
);

const Slider = mongoose.model("Slider", SliderSchema);

export default Slider;
