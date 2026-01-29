import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

// Environment variables (set in Netlify dashboard):
// - CLOUDINARY_CLOUD_NAME
// - CLOUDINARY_API_KEY
// - CLOUDINARY_API_SECRET
// - NOTIFICATION_EMAIL (your email: alex@pearhaus.com)
// - SENDGRID_API_KEY

interface SubmissionData {
  reviewerName: string;
  responses: Record<string, { rating?: string; comment?: string; timestamp?: string }>;
  additionalFeedback?: string;
  uploadedImages?: Array<{ name: string; data: string; type: string }>;
  submittedAt: string;
}

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const data: SubmissionData = JSON.parse(event.body || "{}");

    // Validate required fields
    if (!data.reviewerName || !data.responses) {
      return {
        statusCode: 400,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Missing required fields" }),
      };
    }

    // Upload images to Cloudinary if any
    const uploadedImageUrls: string[] = [];
    if (data.uploadedImages && data.uploadedImages.length > 0) {
      for (const image of data.uploadedImages) {
        try {
          const cloudinaryUrl = await uploadToCloudinary(image, data.reviewerName);
          if (cloudinaryUrl) {
            uploadedImageUrls.push(cloudinaryUrl);
          }
        } catch (err) {
          console.error("Failed to upload image:", image.name, err);
        }
      }
    }

    // Generate CSV attachment
    const csvContent = generateCSV(data, uploadedImageUrls);
    const csvBase64 = Buffer.from(csvContent).toString('base64');

    // Generate JSON backup (full data)
    const jsonContent = JSON.stringify({
      ...data,
      uploadedImageUrls,
      processedAt: new Date().toISOString()
    }, null, 2);
    const jsonBase64 = Buffer.from(jsonContent).toString('base64');

    // Format the email content
    const emailContent = formatEmailContent(data, uploadedImageUrls);

    // Send email notification with attachments
    await sendEmailNotification(data.reviewerName, emailContent, csvBase64, jsonBase64, data);

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        success: true,
        message: "Review submitted successfully",
        uploadedImages: uploadedImageUrls.length
      }),
    };
  } catch (error) {
    console.error("Submission error:", error);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Failed to process submission" }),
    };
  }
};

async function uploadToCloudinary(
  image: { name: string; data: string; type: string },
  reviewerName: string
): Promise<string | null> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    console.error("Cloudinary credentials not configured");
    return null;
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = `pa-art-review-submissions/${reviewerName.replace(/\s+/g, '-').toLowerCase()}`;

  // Create signature
  const crypto = await import("crypto");
  const signatureString = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
  const signature = crypto.createHash("sha1").update(signatureString).digest("hex");

  const formData = new URLSearchParams();
  formData.append("file", image.data);
  formData.append("api_key", apiKey);
  formData.append("timestamp", timestamp.toString());
  formData.append("signature", signature);
  formData.append("folder", folder);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    throw new Error(`Cloudinary upload failed: ${response.statusText}`);
  }

  const result = await response.json();
  return result.secure_url;
}

function generateCSV(data: SubmissionData, uploadedImageUrls: string[]): string {
  const { reviewerName, responses, additionalFeedback, submittedAt } = data;

  let csv = 'Category,Image ID,Rating,Comment,Timestamp\n';

  // Sort responses by category and ID
  const sortedEntries = Object.entries(responses).sort((a, b) => {
    const catA = getCategoryFromId(a[0]);
    const catB = getCategoryFromId(b[0]);
    if (catA !== catB) return catA.localeCompare(catB);
    return a[0].localeCompare(b[0]);
  });

  sortedEntries.forEach(([id, data]) => {
    const category = getCategoryFromId(id);
    const comment = (data.comment || '').replace(/"/g, '""').replace(/\n/g, ' ');
    const rating = data.rating || '';
    const timestamp = data.timestamp || '';
    csv += `"${category}","${id}","${rating}","${comment}","${timestamp}"\n`;
  });

  // Add summary section
  csv += '\n\n--- SUMMARY ---\n';
  csv += `Reviewer,${reviewerName}\n`;
  csv += `Submitted,${submittedAt}\n`;
  csv += `Total Responses,${Object.keys(responses).length}\n`;

  const counts = { yes: 0, maybe: 0, no: 0 };
  Object.values(responses).forEach((r) => {
    if (r.rating === 'yes') counts.yes++;
    else if (r.rating === 'maybe') counts.maybe++;
    else if (r.rating === 'no') counts.no++;
  });

  csv += `Thumbs Up (Yes),${counts.yes}\n`;
  csv += `Maybe,${counts.maybe}\n`;
  csv += `Thumbs Down (No),${counts.no}\n`;

  // Additional feedback
  if (additionalFeedback) {
    csv += '\n\n--- ADDITIONAL FEEDBACK ---\n';
    csv += `"${additionalFeedback.replace(/"/g, '""')}"\n`;
  }

  // Uploaded images
  if (uploadedImageUrls.length > 0) {
    csv += '\n\n--- UPLOADED REFERENCE IMAGES ---\n';
    uploadedImageUrls.forEach((url, i) => {
      csv += `Image ${i + 1},${url}\n`;
    });
  }

  return csv;
}

function getCategoryFromId(id: string): string {
  if (id.startsWith('book-')) return 'Books as Art';
  if (id.startsWith('de-')) return 'Delaware Artists';
  if (id.startsWith('free-')) return 'Freestanding Sculpture';
  if (id.startsWith('dim-')) return 'Dimensional Relief';
  if (id.startsWith('grid-')) return 'Grid & Modular';
  if (id.startsWith('abs-')) return 'Abstract Paintings';
  if (id.startsWith('surr-')) return 'Surrealism';
  if (id.startsWith('impr-')) return 'Impressionist';
  return 'Other';
}

function formatEmailContent(
  data: SubmissionData,
  uploadedImageUrls: string[]
): string {
  const { reviewerName, responses, additionalFeedback, submittedAt } = data;

  // Count ratings
  const counts = { yes: 0, maybe: 0, no: 0 };
  Object.values(responses).forEach((r) => {
    if (r.rating === 'yes') counts.yes++;
    else if (r.rating === 'maybe') counts.maybe++;
    else if (r.rating === 'no') counts.no++;
  });

  // Group by category
  const categories: Record<string, Array<{ id: string; rating: string; comment?: string }>> = {};
  Object.entries(responses).forEach(([id, data]) => {
    const category = getCategoryFromId(id);
    if (!categories[category]) categories[category] = [];
    if (data.rating) {
      categories[category].push({ id, rating: data.rating, comment: data.comment });
    }
  });

  let html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #1c1917; border-bottom: 2px solid #e7e5e4; padding-bottom: 16px;">
        Art Review Submission
      </h1>

      <div style="background: #fafaf9; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
        <p style="margin: 0 0 8px 0;"><strong>Reviewer:</strong> ${reviewerName}</p>
        <p style="margin: 0 0 8px 0;"><strong>Submitted:</strong> ${new Date(submittedAt).toLocaleString()}</p>
        <p style="margin: 0;"><strong>Total Responses:</strong> ${Object.keys(responses).length}</p>
      </div>

      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 12px; border-radius: 8px; margin-bottom: 24px;">
        <strong>📎 Attachments included:</strong>
        <ul style="margin: 8px 0 0 0; padding-left: 20px;">
          <li>CSV file with all responses (open in Excel)</li>
          <li>JSON file with complete data backup</li>
        </ul>
      </div>

      <h2 style="color: #44403c;">Summary</h2>
      <table style="width: 100%; margin-bottom: 24px;">
        <tr>
          <td style="background: #dcfce7; padding: 12px 20px; border-radius: 8px; text-align: center; width: 33%;">
            <div style="font-size: 24px; font-weight: bold; color: #16a34a;">👍 ${counts.yes}</div>
            <div style="color: #166534; font-size: 14px;">Yes</div>
          </td>
          <td style="width: 8px;"></td>
          <td style="background: #fef3c7; padding: 12px 20px; border-radius: 8px; text-align: center; width: 33%;">
            <div style="font-size: 24px; font-weight: bold; color: #d97706;">🤔 ${counts.maybe}</div>
            <div style="color: #92400e; font-size: 14px;">Maybe</div>
          </td>
          <td style="width: 8px;"></td>
          <td style="background: #fee2e2; padding: 12px 20px; border-radius: 8px; text-align: center; width: 33%;">
            <div style="font-size: 24px; font-weight: bold; color: #dc2626;">👎 ${counts.no}</div>
            <div style="color: #991b1b; font-size: 14px;">No</div>
          </td>
        </tr>
      </table>

      <h2 style="color: #44403c;">Highlights by Category</h2>
      <p style="color: #78716c; font-size: 14px; margin-bottom: 16px;">
        See attached CSV for complete details. Below are items with comments or strong reactions.
      </p>
  `;

  // Add each category - only show items with comments or highlight counts
  Object.entries(categories).forEach(([category, items]) => {
    const yesItems = items.filter(i => i.rating === 'yes');
    const noItems = items.filter(i => i.rating === 'no');
    const itemsWithComments = items.filter(i => i.comment && i.comment.trim());

    html += `
      <h3 style="color: #44403c; margin-top: 24px; margin-bottom: 8px;">
        ${category}
        <span style="font-weight: normal; color: #78716c; font-size: 14px;">
          (${yesItems.length} 👍, ${items.filter(i => i.rating === 'maybe').length} 🤔, ${noItems.length} 👎)
        </span>
      </h3>
    `;

    // Show items with comments
    if (itemsWithComments.length > 0) {
      html += `<div style="margin-left: 16px;">`;
      itemsWithComments.forEach((item) => {
        const ratingEmoji = item.rating === 'yes' ? '👍' : item.rating === 'maybe' ? '🤔' : '👎';
        html += `
          <p style="margin: 8px 0; padding: 8px; background: #fafaf9; border-radius: 4px;">
            <strong>${item.id}</strong> ${ratingEmoji}<br/>
            <span style="color: #57534e; font-style: italic;">"${item.comment}"</span>
          </p>
        `;
      });
      html += `</div>`;
    } else {
      html += `<p style="color: #a8a29e; font-size: 14px; margin-left: 16px;">No comments in this category</p>`;
    }
  });

  // Additional feedback
  if (additionalFeedback) {
    html += `
      <h2 style="color: #44403c; margin-top: 32px;">Additional Feedback</h2>
      <div style="background: #fafaf9; padding: 16px; border-radius: 8px; white-space: pre-wrap;">
        ${additionalFeedback}
      </div>
    `;
  }

  // Uploaded images
  if (uploadedImageUrls.length > 0) {
    html += `
      <h2 style="color: #44403c; margin-top: 32px;">Uploaded Reference Images</h2>
      <p style="color: #78716c; font-size: 14px;">Click images to view full size</p>
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
    `;
    uploadedImageUrls.forEach((url, i) => {
      html += `
        <a href="${url}" target="_blank" style="display: block;">
          <img src="${url}" alt="Reference ${i + 1}" style="width: 100%; border-radius: 8px; border: 1px solid #e7e5e4;" />
        </a>
      `;
    });
    html += `</div>`;
  }

  html += `
      <hr style="margin-top: 32px; border: none; border-top: 1px solid #e7e5e4;" />
      <p style="color: #78716c; font-size: 12px;">
        PA Art Collection Review Tool — Submission received ${new Date().toISOString()}<br/>
        <strong>Full data attached as CSV and JSON files.</strong>
      </p>
    </div>
  `;

  return html;
}

async function sendEmailNotification(
  reviewerName: string,
  htmlContent: string,
  csvBase64: string,
  jsonBase64: string,
  data: SubmissionData
): Promise<void> {
  const sendgridApiKey = process.env.SENDGRID_API_KEY;
  const notificationEmail = process.env.NOTIFICATION_EMAIL || "alex@pearhaus.com";

  // Generate filename with reviewer name and date
  const dateStr = new Date().toISOString().split('T')[0];
  const safeReviewerName = reviewerName.replace(/\s+/g, '-').toLowerCase();
  const baseFilename = `art-review-${safeReviewerName}-${dateStr}`;

  if (!sendgridApiKey) {
    console.log("SendGrid not configured, logging submission instead:");
    console.log("=".repeat(50));
    console.log("Reviewer:", reviewerName);
    console.log("Submitted:", data.submittedAt);
    console.log("Responses:", Object.keys(data.responses).length);
    console.log("Additional Feedback:", data.additionalFeedback || "(none)");
    console.log("=".repeat(50));

    // Log full data as JSON for backup
    console.log("FULL DATA:", JSON.stringify(data, null, 2));
    return;
  }

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sendgridApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: notificationEmail }] }],
      from: { email: "noreply@pearhaus.com", name: "PA Art Review" },
      subject: `Art Review Submission from ${reviewerName}`,
      content: [
        { type: "text/html", value: htmlContent },
      ],
      attachments: [
        {
          content: csvBase64,
          filename: `${baseFilename}.csv`,
          type: "text/csv",
          disposition: "attachment"
        },
        {
          content: jsonBase64,
          filename: `${baseFilename}.json`,
          type: "application/json",
          disposition: "attachment"
        }
      ]
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("SendGrid error:", errorText);
    throw new Error(`SendGrid error: ${response.statusText}`);
  }
}

export { handler };
