export const HOURLY_REVALIDATE_SECONDS = 3600;

export function getHourlyBucket(date = new Date()): string {
  const bucket = new Date(date);
  bucket.setUTCMinutes(0, 0, 0);
  return bucket.toISOString();
}
