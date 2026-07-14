import Enquiry from "../models/enquiryModel.js";
import { sendEmail } from "../services/emailService.js";


const FIXED_RECIPIENTS = [
  "connect@360eye.in",
  "dhaval@360eye.in",
  "viraj@360eye.in",
  "allsolutionway@gmail.com"
];

const parseAdditionalRecipients = (value) => {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value
      .map((entry) => String(entry).trim())
      .filter(Boolean);
  }

  return String(value)
    .split(/[,;]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
};

// Create a new enquiry
export const createEnquiry = async (req, res) => {
  try {
    const { name, phone, email, message, recipients } = req.body;

    // Validation
    if (!name || !phone || !email || !message) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const enquiry = new Enquiry({
      name,
      phone,
      email,
      message,
    });

    await enquiry.save();

    const notificationRecipients = Array.from(
      new Set([...FIXED_RECIPIENTS, ...parseAdditionalRecipients(recipients)])
    );

    let emailError = null;

    if (notificationRecipients.length) {
      const subject = `New enquiry from ${name}`;
      const textContent = `You have received a new enquiry via the website contact form.\n\n` +
        `Name: ${name}\n` +
        `Phone: ${phone}\n` +
        `Email: ${email}\n\n` +
        `Message:\n${message}`;

      try {
        await sendEmail({
          to: notificationRecipients,
          subject,
          text: textContent,
          replyTo: email,
        });
      } catch (error) {
        emailError = error;
        console.error("Failed to send enquiry notification email", error);
      }
    }

    res.status(201).json({
      message: emailError
        ? "Enquiry submitted, but notification email could not be sent"
        : "Enquiry submitted successfully",
      enquiry,
      emailNotificationSent: !emailError,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// Get all enquiries
export const getAllEnquiries = async (req, res) => {
  try {
    const enquiries = await Enquiry.find().sort({ createdAt: -1 }); // Sort by latest first
    res.status(200).json(enquiries);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// Delete an enquiry
export const deleteEnquiry = async (req, res) => {
  try {
    const { id } = req.params;

    const enquiry = await Enquiry.findByIdAndDelete(id);
    if (!enquiry) {
      return res.status(404).json({ message: "Enquiry not found" });
    }

    res.status(200).json({ message: "Enquiry deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};