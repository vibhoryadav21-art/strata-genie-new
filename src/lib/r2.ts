import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
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

// Deletes every file in one campaign folder ("userid/campaignid/").
export async function deletePrefix(prefix: string): Promise<number> {
  // Safety: refuse anything that isn't exactly "<uuid>/<uuid>/"
  if (!/^[0-9a-f-]{36}\/[0-9a-f-]{36}\/$/.test(prefix)) {
    throw new Error("Refusing to delete: unexpected folder name");
  }
  const c = client();
  const Bucket = process.env.R2_BUCKET!;
  let token: string | undefined;
  let deleted = 0;
  do {
    const list = await c.send(
      new ListObjectsV2Command({ Bucket, Prefix: prefix, ContinuationToken: token })
    );
    const keys = (list.Contents ?? []).map((o) => o.Key).filter((k): k is string => !!k);
    for (let i = 0; i < keys.length; i += 10) {
      await Promise.all(
        keys.slice(i, i + 10).map((Key) => c.send(new DeleteObjectCommand({ Bucket, Key })))
      );
    }
    deleted += keys.length;
    token = list.IsTruncated ? list.NextContinuationToken : undefined;
  } while (token);
  return deleted;
}

// Deletes every file of one user ("userid/"). Used when an admin deletes a user.
export async function deleteUserFolder(userId: string): Promise<number> {
  if (!/^[0-9a-f-]{36}$/.test(userId)) {
    throw new Error("Refusing to delete: unexpected user id");
  }
  const c = client();
  const Bucket = process.env.R2_BUCKET!;
  const prefix = `${userId}/`;
  let token: string | undefined;
  let deleted = 0;
  do {
    const list = await c.send(
      new ListObjectsV2Command({ Bucket, Prefix: prefix, ContinuationToken: token })
    );
    const keys = (list.Contents ?? []).map((o) => o.Key).filter((k): k is string => !!k);
    for (let i = 0; i < keys.length; i += 10) {
      await Promise.all(
        keys.slice(i, i + 10).map((Key) => c.send(new DeleteObjectCommand({ Bucket, Key })))
      );
    }
    deleted += keys.length;
    token = list.IsTruncated ? list.NextContinuationToken : undefined;
  } while (token);
  return deleted;
}