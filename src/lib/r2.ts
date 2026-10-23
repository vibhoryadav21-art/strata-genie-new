import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function client() {
  return new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
    // Newer AWS SDK versions add extra checksum headers that R2 can reject.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
}

export async function presignUpload(key: string, contentType: string) {
  return getSignedUrl(
    client(),
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET!,
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn: 900 } // 15 minutes
  );
}

// Link for showing a file in the page (valid for 1 hour)
export async function presignView(key: string) {
  return getSignedUrl(
    client(),
    new GetObjectCommand({ Bucket: process.env.R2_BUCKET!, Key: key }),
    { expiresIn: 3600 }
  );
}

// Link that makes the browser download the file instead of opening it
export async function presignDownload(key: string, filename: string) {
  return getSignedUrl(
    client(),
    new GetObjectCommand({
      Bucket: process.env.R2_BUCKET!,
      Key: key,
      ResponseContentDisposition: `attachment; filename="${filename}"`,
    }),
    { expiresIn: 3600 }
  );
}