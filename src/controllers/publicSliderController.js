import Slider from "../models/sliderModel.js";

export const getPublicSliders = async (req, res) => {
  try {
    const sliders = await Slider.find({ sliderStatus: "Yes" })
      .select("title sliderLink sliderOrder clientLogo")
      .sort({ sliderOrder: 1 });

    res.status(200).json({
      success: true,
      sliders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching sliders",
    });
  }
};
