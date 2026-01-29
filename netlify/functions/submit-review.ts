import { Handler } from '@netlify/functions';
import sgMail from '@sendgrid/mail';

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

interface ArtworkResponse {
  artworkId: string;
  category: string;
  rating: number | null;
  comment: string;
}

interface UploadedImage {
  name: string;
  data: string; // base64
}

interface SubmissionData {
  reviewerName: string;
  reviewerEmail?: string;
  responses: ArtworkResponse[];
  additionalFeedback: string;
  uploadedImages: UploadedImage[];
  submittedAt: string;
}

// Upload image to Cloudinary
async function uploadToCloudinary(imageData: string, fileName: string): Promise<string> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Cloudinary credentials not configured');
  }

  const timestamp = Math.round(Date.now() / 1000);
  const folder = 'art-review-uploads';

  // Create signature
  const crypto = await import('crypto');
  const signatureString = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
  const signature = crypto.createHash('sha1').update(signatureString).digest('hex');

  const formData = new URLSearchParams();
  formData.append('file', imageData);
  formData.append('api_key', apiKey);
  formData.append('timestamp', timestamp.toString());
  formData.append('signature', signature);
  formData.append('folder', folder);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Cloudinary upload failed: ${error}`);
  }

  const result = await response.json();
  return result.secure_url;
}

// Generate CSV content
function generateCSV(data: SubmissionData, imageUrls: string[]): string {
  const lines: string[] = [];

  // Header
  lines.push('Artwork ID,Category,Rating,Comment');

  // Data rows
  for (const response of data.responses) {
    const rating = response.rating !== null ? response.rating.toString() : 'Not rated';
    const comment = response.comment ? `"${response.comment.replace(/"/g, '""')}"` : '';
    lines.push(`${response.artworkId},${response.category},${rating},${comment}`);
  }

  // Add summary section
  lines.push('');
  lines.push('--- SUBMISSION SUMMARY ---');
  lines.push(`Reviewer Name,${data.reviewerName}`);
  if (data.reviewerEmail) {
    lines.push(`Reviewer Email,${data.reviewerEmail}`);
  }
  lines.push(`Submitted At,${data.submittedAt}`);
  lines.push(`Total Responses,${data.responses.length}`);
  lines.push(`Additional Feedback,"${(data.additionalFeedback || '').replace(/"/g, '""')}"`);

  if (imageUrls.length > 0) {
    lines.push('');
    lines.push('--- UPLOADED IMAGES ---');
    imageUrls.forEach((url, i) => {
      lines.push(`Image ${i + 1},${url}`);
    });
  }

  return lines.join('\n');
}

// Generate JSON content
function generateJSON(data: SubmissionData, imageUrls: string[]): string {
  return JSON.stringify({
    reviewer: {
      name: data.reviewerName,
      email: data.reviewerEmail || null,
    },
    submittedAt: data.submittedAt,
    totalResponses: data.responses.length,
    responses: data.responses,
    additionalFeedback: data.additionalFeedback,
    uploadedImageUrls: imageUrls,
  }, null, 2);
}

const handler: Handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const data: SubmissionData = JSON.parse(event.body || '{}');

    // Validate required fields
    if (!data.reviewerName || !data.responses) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields' }),
      };
    }

    // Upload images to Cloudinary
    const imageUrls: string[] = [];
    if (data.uploadedImages && data.uploadedImages.length > 0) {
      for (const image of data.uploadedImages) {
        try {
          const url = await uploadToCloudinary(image.data, image.name);
          imageUrls.push(url);
        } catch (err) {
          console.error('Failed to upload image:', err);
          // Continue with other images
        }
      }
    }

    // Generate attachments
    const csvContent = generateCSV(data, imageUrls);
    const jsonContent = generateJSON(data, imageUrls);

    // Calculate statistics
    const ratedResponses = data.responses.filter(r => r.rating !== null);
    const avgRating = ratedResponses.length > 0
      ? (ratedResponses.reduce((sum, r) => sum + (r.rating || 0), 0) / ratedResponses.length).toFixed(2)
      : 'N/A';

    // Build email HTML
    const emailHtml = `
      <h1>New Art Collection Review Submission</h1>
      <h2>Reviewer Information</h2>
      <p><strong>Name:</strong> ${data.reviewerName}</p>
      ${data.reviewerEmail ? `<p><strong>Email:</strong> ${data.reviewerEmail}</p>` : ''}
      <p><strong>Submitted:</strong> ${new Date(data.submittedAt).toLocaleString()}</p>

      <h2>Summary</h2>
      <ul>
        <li>Total artworks reviewed: ${data.responses.length}</li>
        <li>Artworks rated: ${ratedResponses.length}</li>
        <li>Average rating: ${avgRating}</li>
        <li>Images uploaded: ${imageUrls.length}</li>
      </ul>

      ${data.additionalFeedback ? `
        <h2>Additional Feedback</h2>
        <p>${data.additionalFeedback}</p>
      ` : ''}

      ${imageUrls.length > 0 ? `
        <h2>Uploaded Images</h2>
        ${imageUrls.map((url, i) => `
          <p>Image ${i + 1}: <a href="${url}">${url}</a></p>
        `).join('')}
      ` : ''}

      <h2>Top Rated Artworks</h2>
      <ul>
        ${data.responses
          .filter(r => r.rating !== null && r.rating >= 4)
          .sort((a, b) => (b.rating || 0) - (a.rating || 0))
          .slice(0, 10)
          .map(r => `<li>${r.artworkId} (${r.category}): ${r.rating} stars${r.comment ? ` - "${r.comment}"` : ''}</li>`)
          .join('')}
      </ul>

      <p><em>Full details are attached as CSV and JSON files.</em></p>
    `;

    // Send email
    const recipientEmail = process.env.RECIPIENT_EMAIL || 'alex@pearhaus.com';

    await sgMail.send({
      to: recipientEmail,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@pearhaus.com',
      subject: `Art Review Submission from ${data.reviewerName}`,
      html: emailHtml,
      attachments: [
        {
          content: Buffer.from(csvContent).toString('base64'),
          filename: `art-review-${data.reviewerName.replace(/\s+/g, '-')}-${Date.now()}.csv`,
          type: 'text/csv',
          disposition: 'attachment',
        },
        {
          content: Buffer.from(jsonContent).toString('base64'),
          filename: `art-review-${data.reviewerName.replace(/\s+/g, '-')}-${Date.now()}.json`,
          type: 'application/json',
          disposition: 'attachment',
        },
      ],
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Review submitted successfully',
        imageUrls,
      }),
    };

  } catch (error) {
    console.error('Submission error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to process submission',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};

export { handler };
