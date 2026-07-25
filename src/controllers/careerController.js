import CareerRole from "../models/careerRoleModel.js";
import CareerSettings from "../models/careerSettingsModel.js";
import CareerApplication from "../models/careerApplicationModel.js";
import multer from "multer";
import {
  uploadFileToDrive,
  appendRowToSheet,
  isGoogleIntegrationConfigured,
} from "../services/googleIntegrationService.js";

const storage = multer.memoryStorage();
export const uploadApplicationFiles = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
}).any();

// ---- Applications ----

export const submitApplication = async (req, res) => {
  try {
    const { roleId, answers } = req.body;
    if (!roleId) {
      return res.status(400).json({ success: false, message: "roleId is required" });
    }

    const role = await CareerRole.findById(roleId);
    if (!role) {
      return res.status(404).json({ success: false, message: "Role not found" });
    }

    let parsedAnswers = [];
    try {
      parsedAnswers = typeof answers === "string" ? JSON.parse(answers) : (answers || []);
    } catch {
      parsedAnswers = [];
    }

    const files = req.files || [];
    const configured = isGoogleIntegrationConfigured();

    const finalAnswers = [];
    for (const ans of parsedAnswers) {
      if (ans.fieldType === "file") {
        const matchedFile = files.find((f) => f.fieldname === ans.label);
        let fileUrl = "";
        if (matchedFile && configured) {
          try {
            const uploaded = await uploadFileToDrive(matchedFile.buffer, matchedFile.originalname, matchedFile.mimetype);
            fileUrl = uploaded.webViewLink;
          } catch (uploadErr) {
            console.error("Drive upload failed:", uploadErr.message);
          }
        }
        finalAnswers.push({ label: ans.label, fieldType: ans.fieldType, value: matchedFile?.originalname || "", fileUrl });
      } else {
        finalAnswers.push({ label: ans.label, fieldType: ans.fieldType, value: ans.value || "" });
      }
    }

    const nameAnswer = finalAnswers.find((a) => /name/i.test(a.label));
    const emailAnswer = finalAnswers.find((a) => /email/i.test(a.label));

    const application = new CareerApplication({
      roleId,
      roleTitle: role.title,
      answers: finalAnswers,
      applicantName: nameAnswer?.value || "",
      applicantEmail: emailAnswer?.value || "",
    });

    if (configured) {
      try {
        const row = [
          new Date().toISOString(),
          role.title,
          ...finalAnswers.map((a) => (a.fieldType === "file" ? (a.fileUrl || "") : a.value)),
        ];
        await appendRowToSheet(row);
        application.syncedToSheet = true;
      } catch (sheetErr) {
        application.syncError = sheetErr.message;
        console.error("Sheet sync failed:", sheetErr.message);
      }
    }

    await application.save();

    res.status(201).json({ success: true, message: "Application submitted successfully", application });
  } catch (error) {
    console.error("Error submitting application:", error);
    res.status(500).json({ success: false, message: "Error submitting application" });
  }
};

export const getAllApplications = async (req, res) => {
  try {
    const applications = await CareerApplication.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, applications });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching applications" });
  }
};

export const deleteApplication = async (req, res) => {
  try {
    const application = await CareerApplication.findByIdAndDelete(req.params.id);
    if (!application) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }
    res.status(200).json({ success: true, message: "Application deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error deleting application" });
  }
};

// ---- Roles ----

export const getAllRoles = async (req, res) => {
  try {
    const filter = req.query.openOnly === "true" ? { isOpen: true } : {};
    const roles = await CareerRole.find(filter).sort({ roleOrder: 1, createdAt: -1 });
    res.status(200).json({ success: true, roles });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching roles" });
  }
};

export const addRole = async (req, res) => {
  try {
    const { title, description = "", isOpen = true, roleOrder = 0, questions } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: "Role title is required" });
    }
    let parsedQuestions;
    if (questions !== undefined) {
      try {
        parsedQuestions = typeof questions === "string" ? JSON.parse(questions) : questions;
      } catch {
        parsedQuestions = undefined;
      }
    }
    const role = new CareerRole({
      title: title.trim(),
      description,
      isOpen: isOpen === true || isOpen === "true",
      roleOrder: parseInt(roleOrder) || 0,
      ...(parsedQuestions !== undefined ? { questions: parsedQuestions } : {}),
    });
    await role.save();
    res.status(201).json({ success: true, message: "Role created successfully", role });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error creating role" });
  }
};

export const updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, isOpen, roleOrder, questions } = req.body;
    const role = await CareerRole.findById(id);
    if (!role) {
      return res.status(404).json({ success: false, message: "Role not found" });
    }
    if (title !== undefined && title.trim()) role.title = title.trim();
    if (description !== undefined) role.description = description;
    if (isOpen !== undefined) role.isOpen = isOpen === true || isOpen === "true";
    if (roleOrder !== undefined) role.roleOrder = parseInt(roleOrder) || 0;
    if (questions !== undefined) {
      try {
        role.questions = typeof questions === "string" ? JSON.parse(questions) : questions;
      } catch {
        // ignore malformed questions payload
      }
    }
    await role.save();
    res.status(200).json({ success: true, message: "Role updated successfully", role });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error updating role" });
  }
};

export const deleteRole = async (req, res) => {
  try {
    const role = await CareerRole.findByIdAndDelete(req.params.id);
    if (!role) {
      return res.status(404).json({ success: false, message: "Role not found" });
    }
    res.status(200).json({ success: true, message: "Role deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error deleting role" });
  }
};

// ---- Settings ----

export const getSettings = async (req, res) => {
  try {
    let settings = await CareerSettings.findOne();
    if (!settings) {
      settings = await CareerSettings.create({});
    }
    res.status(200).json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching settings" });
  }
};

export const updateSettings = async (req, res) => {
  try {
    const { googleFormBaseUrl, roleEntryId, tagline, subline } = req.body;
    let settings = await CareerSettings.findOne();
    if (!settings) {
      settings = new CareerSettings({});
    }
    if (googleFormBaseUrl !== undefined) settings.googleFormBaseUrl = googleFormBaseUrl;
    if (roleEntryId !== undefined) settings.roleEntryId = roleEntryId;
    if (tagline !== undefined) settings.tagline = tagline;
    if (subline !== undefined) settings.subline = subline;
    await settings.save();
    res.status(200).json({ success: true, message: "Settings updated successfully", settings });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error updating settings" });
  }
};
