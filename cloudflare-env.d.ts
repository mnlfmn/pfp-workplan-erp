declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    PFP_INITIAL_ADMIN_EMAIL?: string;
  }
}
