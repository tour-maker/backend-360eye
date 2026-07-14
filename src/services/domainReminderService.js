import cron from "node-cron";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import AllowedDomain from "../models/allowedDomainModel.js";
import { getCachedEmailSettings, sendEmail } from "./emailService.js";

const DEFAULT_TIMEZONE = process.env.DOMAIN_REMINDER_TZ || "Asia/Kolkata";
const DEFAULT_REMIND_BEFORE_DAYS = 15;
const CRON_EXPRESSION = process.env.DOMAIN_REMINDER_CRON || "0 6 * * *"; // Every day at 06:00 local time
const REMINDER_SUBJECT_TEMPLATE = "Domain expiry reminder";

const tzDayjs = () => {
  dayjs.extend(utc);
  dayjs.extend(timezone);
  return dayjs().tz(DEFAULT_TIMEZONE);
};

const isReminderDue = (domain) => {
  if (!domain?.expiryDate) {
    return false;
  }

  const remindBeforeDays = domain.remindBeforeDays || DEFAULT_REMIND_BEFORE_DAYS;
  const now = tzDayjs();
  const expiry = dayjs(domain.expiryDate);

  if (!expiry.isValid()) {
    return false;
  }

  const reminderDate = expiry.subtract(remindBeforeDays, "day");

  if (now.isBefore(reminderDate.startOf("day"))) {
    return false;
  }

  if (domain.lastReminderSentAt) {
    const lastSent = dayjs(domain.lastReminderSentAt);
    if (lastSent.isValid() && lastSent.isAfter(reminderDate.subtract(1, "day"))) {
      return false;
    }
  }

  return now.isBefore(expiry);
};

const buildRecipientList = (domain, defaultRecipient) => {
  const recipients = new Set();

  const addIfValid = (value) => {
    if (!value) return;
    const normalized = String(value).trim();
    if (normalized) {
      recipients.add(normalized);
    }
  };

  addIfValid(domain.contactEmail);
  addIfValid(defaultRecipient);

  if (Array.isArray(domain.ownerEmails)) {
    domain.ownerEmails.forEach(addIfValid);
  }

  return Array.from(recipients);
};

const buildReminderEmail = ({ domain, expiresInDays, expiryDate, recipients }) => {
  const html = `<!DOCTYPE html>
<html>
  <body>
    <p>Hello,</p>
    <p>This is a friendly reminder that the domain <strong>${domain.domain}</strong> will expire on <strong>${expiryDate}</strong>.</p>
    <p>Remaining time: <strong>${expiresInDays} day${expiresInDays === 1 ? "" : "s"}</strong>.</p>
    <p>Please take the necessary action to renew the domain in time. If this domain should remain active within 360EYE, update the renewal status after completing the process.</p>
    <p>Regards,<br />360EYE Team</p>
  </body>
</html>`;

  const text = `Hello,\n\nThis is a reminder that the domain ${domain.domain} will expire on ${expiryDate}.\nRemaining time: ${expiresInDays} day${expiresInDays === 1 ? "" : "s"}.\n\nPlease renew it in time.\n\nRegards,\n360EYE Team`;

  return {
    subject: `${REMINDER_SUBJECT_TEMPLATE}: ${domain.domain} expires on ${expiryDate}`,
    html,
    text,
    to: recipients,
  };
};

const markReminderSent = async (domainId) => {
  await AllowedDomain.updateOne(
    { _id: domainId },
    {
      $set: {
        lastReminderSentAt: new Date(),
      },
    }
  );
};

export const findExpiringDomains = async () => {
  const now = tzDayjs();
  const upperBound = now.add(90, "day");

  return AllowedDomain.find({
    expiryDate: { $exists: true, $ne: null, $gte: now.startOf("day").toDate(), $lte: upperBound.toDate() },
    isActive: true,
  }).lean();
};

export const processExpiringDomains = async () => {
  const settings = await getCachedEmailSettings();
  if (!settings) {
    console.warn("Domain reminder skipped: email settings not configured");
    return;
  }

  const domains = await findExpiringDomains();
  if (!domains.length) {
    return;
  }

  for (const domain of domains) {
    try {
      if (!isReminderDue(domain)) {
        continue;
      }

      const expiryDate = dayjs(domain.expiryDate).tz(DEFAULT_TIMEZONE);
      const expiresInDays = Math.max(0, expiryDate.diff(tzDayjs(), "day"));
      const recipients = buildRecipientList(domain, settings.toEmail);

      if (!recipients.length) {
        console.warn(
          `Reminder skipped for domain ${domain.domain}: no recipient addresses (contactEmail/ownerEmails)`
        );
        continue;
      }

      const emailPayload = buildReminderEmail({
        domain,
        expiresInDays,
        expiryDate: expiryDate.format("DD MMM YYYY"),
        recipients,
      });

      await sendEmail(emailPayload);
      await markReminderSent(domain._id);
      console.info(`Reminder email sent for domain ${domain.domain}`);
    } catch (error) {
      console.error(`Failed to send reminder for domain ${domain.domain}`, error);
    }
  }
};

let scheduledTask = null;

export const initDomainReminderScheduler = () => {
  if (scheduledTask) {
    return scheduledTask;
  }

  try {
    scheduledTask = cron.schedule(
      CRON_EXPRESSION,
      async () => {
        try {
          await processExpiringDomains();
        } catch (error) {
          console.error("Domain reminder scheduler encountered an error", error);
        }
      },
      {
        scheduled: true,
        timezone: DEFAULT_TIMEZONE,
      }
    );

    console.info(`Domain reminder scheduler initialized with cron '${CRON_EXPRESSION}' in timezone ${DEFAULT_TIMEZONE}`);
  } catch (error) {
    console.error("Failed to initialize domain reminder scheduler", error);
    scheduledTask = null;
  }

  return scheduledTask;
};

export const stopDomainReminderScheduler = () => {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
  }
};
