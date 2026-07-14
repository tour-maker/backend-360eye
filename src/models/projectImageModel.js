import mongoose from "mongoose";

const projectImageSchema = new mongoose.Schema({
  imagePath: {
    type: String,
    required: true
  },
  projectName: {
    type: String,
    default: null
  },
  architect: {
    type: String,
    default: null
  },
  area: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'submitted'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const ProjectImage = mongoose.model('ProjectImage', projectImageSchema);

export default ProjectImage;