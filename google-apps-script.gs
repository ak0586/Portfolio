const NOTIFICATION_EMAIL = 'er.ankit.kumar@zohomail.in';
const SHEET_PROPERTY = 'INQUIRY_SPREADSHEET_ID';
const SHEET_NAME = 'Project inquiries';
const INQUIRY_TYPES = [
  'New mobile app',
  'Flutter app improvements',
  'Firebase or Supabase integration',
  'Payments, analytics, or ads',
  'Bug fixes or app maintenance',
  'Other',
];

function setupInquirySheet() {
  const properties = PropertiesService.getScriptProperties();
  let spreadsheetId = properties.getProperty(SHEET_PROPERTY);
  let spreadsheet;

  if (spreadsheetId) {
    spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  } else {
    spreadsheet = SpreadsheetApp.create('Portfolio project inquiries');
    spreadsheetId = spreadsheet.getId();
    properties.setProperty(SHEET_PROPERTY, spreadsheetId);
  }

  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) {
    const sheets = spreadsheet.getSheets();
    if (sheets.length === 1 && sheets[0].getLastRow() === 0) {
      sheet = sheets[0].setName(SHEET_NAME);
    } else {
      sheet = spreadsheet.insertSheet(SHEET_NAME);
    }
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      'Received at',
      'Name',
      'Email',
      'Project type',
      'Budget',
      'Deadline',
      'Requirements',
    ]);
    sheet.setFrozenRows(1);
  }

  console.log(`Inquiry sheet ready: ${spreadsheet.getUrl()}`);
  return spreadsheet.getUrl();
}

function doPost(event) {
  const parameters = event && event.parameter ? event.parameter : {};
  const requestId = String(parameters.requestId || '');
  const cache = CacheService.getScriptCache();

  if (!/^[\w-]{1,64}$/.test(requestId)) {
    return responsePage(requestId, false, false, 'Invalid inquiry. Please refresh the page and try again.');
  }

  const cacheKey = `inquiry-${requestId}`;
  const cachedResponse = cache.get(cacheKey);
  if (cachedResponse) {
    const result = JSON.parse(cachedResponse);
    return responsePage(requestId, result.ok, result.emailSent, result.message);
  }

  try {
    if (parameters.website) {
      throw new Error('Invalid inquiry.');
    }

    const inquiry = {
      name: cleanField(parameters.name, 100),
      email: cleanField(parameters.email, 254),
      projectType: cleanField(parameters.projectType, 100),
      budget: cleanField(parameters.budget, 80),
      deadline: cleanField(parameters.deadline, 10),
      requirements: cleanField(parameters.requirements, 3000),
    };

    if (!inquiry.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inquiry.email)) {
      throw new Error('Please provide your name and a valid email address.');
    }
    if (!INQUIRY_TYPES.includes(inquiry.projectType)) {
      throw new Error('Please select a valid project type.');
    }
    const deadlineDate = new Date(`${inquiry.deadline}T00:00:00Z`);
    const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    if (
      !inquiry.budget ||
      !/^\d{4}-\d{2}-\d{2}$/.test(inquiry.deadline) ||
      Number.isNaN(deadlineDate.getTime()) ||
      deadlineDate.toISOString().slice(0, 10) !== inquiry.deadline ||
      inquiry.deadline < today ||
      !inquiry.requirements
    ) {
      throw new Error('Please provide your budget, deadline, and project requirements.');
    }
    if (parameters.consent !== 'yes') {
      throw new Error('Please confirm that I may contact you about this inquiry.');
    }

    const spreadsheetId = PropertiesService.getScriptProperties().getProperty(SHEET_PROPERTY);
    if (!spreadsheetId) {
      throw new Error('The inquiry sheet has not been initialized. Run setupInquirySheet first.');
    }

    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);
    if (!sheet) throw new Error('The project inquiry sheet is missing. Run setupInquirySheet again.');

    const lock = LockService.getScriptLock();
    let duplicateResult;
    lock.waitLock(10000);
    try {
      const resultInProgress = cache.get(cacheKey);
      if (resultInProgress) {
        duplicateResult = JSON.parse(resultInProgress);
      } else {
        sheet.appendRow([
          new Date(),
          safeCell(inquiry.name),
          safeCell(inquiry.email),
          safeCell(inquiry.projectType),
          safeCell(inquiry.budget),
          safeCell(inquiry.deadline),
          safeCell(inquiry.requirements),
        ]);
        cache.put(
          cacheKey,
          JSON.stringify({ ok: true, emailSent: false, message: 'Inquiry saved; notification is processing.' }),
          21600,
        );
      }
    } finally {
      lock.releaseLock();
    }

    if (duplicateResult) {
      return responsePage(requestId, duplicateResult.ok, duplicateResult.emailSent, duplicateResult.message);
    }

    let emailSent = true;
    let message = 'Inquiry saved and notification sent.';
    try {
      MailApp.sendEmail({
        to: NOTIFICATION_EMAIL,
        subject: `New portfolio inquiry: ${inquiry.projectType}`,
        body: [
          'A new project inquiry was submitted through your portfolio.',
          '',
          `Name: ${inquiry.name}`,
          `Email: ${inquiry.email}`,
          `Project type: ${inquiry.projectType}`,
          `Budget: ${inquiry.budget}`,
          `Deadline: ${inquiry.deadline}`,
          '',
          'Requirements:',
          inquiry.requirements,
          '',
          `Open inquiry sheet: ${spreadsheet.getUrl()}`,
        ].join('\n'),
        replyTo: inquiry.email,
      });
    } catch (emailError) {
      emailSent = false;
      message = 'Inquiry saved, but the notification email could not be sent.';
      console.error(`Inquiry email notification failed: ${emailError.message}`);
    }

    const result = { ok: true, emailSent, message };
    cache.put(cacheKey, JSON.stringify(result), 21600);
    return responsePage(requestId, result.ok, result.emailSent, result.message);
  } catch (error) {
    const result = {
      ok: false,
      emailSent: false,
      message: error.message || 'The inquiry could not be saved. Please try again.',
    };
    cache.put(cacheKey, JSON.stringify(result), 300);
    console.error(`Project inquiry failed: ${error.message}`);
    return responsePage(requestId, result.ok, result.emailSent, result.message);
  }
}

function cleanField(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength);
}

function safeCell(value) {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

function responsePage(requestId, ok, emailSent, message) {
  const payload = JSON.stringify({
    type: 'portfolio-inquiry',
    requestId,
    ok,
    emailSent,
    message,
  }).replace(/</g, '\\u003c');

  return HtmlService.createHtmlOutput(
    `<!doctype html><html><body><script>parent.postMessage(${payload}, '*');</script></body></html>`,
  ).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
