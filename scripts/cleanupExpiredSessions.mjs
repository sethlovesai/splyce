/**
 * Manual maintenance: delete expired live-splitting sessions from Firestore.
 *
 * This is a STANDALONE, run-by-hand tool (like scripts/testLiveSession.mjs) — no
 * Cloud Functions, no billing, no scheduler. It's a manual backstop for the
 * automatic Firestore TTL policy on `expiresAt`; run it occasionally if you want
 * to reap expired sessions immediately instead of waiting for TTL.
 *
 * WHY THE ADMIN SDK (unlike testLiveSession.mjs, which uses the client SDK):
 *   Deleting a session is gated by the rule `allow delete: if isHost()`
 *   (request.auth.uid == the session's hostId). A cleanup tool has to delete
 *   sessions created by ANY host, so it must run with privileged Admin
 *   credentials that bypass security rules. The client SDK + anonymous auth used
 *   by the Stage-1 test scripts can read sessions but would be rejected on every
 *   delete.
 *
 * ONE-TIME SETUP:
 *   1. Install the Admin SDK (already added to package.json):  npm install
 *   2. Firebase console → Project settings → Service accounts →
 *      "Generate new private key" → save the JSON locally (and gitignore it!).
 *   3. Point GOOGLE_APPLICATION_CREDENTIALS at that file — e.g. add to .env:
 *        GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json
 *      (EXPO_PUBLIC_FIREBASE_PROJECT_ID from .env is reused for the project id.)
 *
 * RUN:
 *   node --env-file=.env scripts/cleanupExpiredSessions.mjs --dry-run   # preview only
 *   node --env-file=.env scripts/cleanupExpiredSessions.mjs             # actually delete
 */
import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const SESSIONS = 'sessions';
const BATCH_LIMIT = 500; // Firestore's hard cap on operations per batched write.
const dryRun = process.argv.includes('--dry-run');

/** Human-readable "how long ago" from a millisecond delta. */
function formatAgo(ms) {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m ago`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h ago`;
}

/** Split an array into chunks of at most `size`. */
function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function main() {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error(
      '✗ Missing GOOGLE_APPLICATION_CREDENTIALS.\n' +
        '  Download a service account key (Firebase console → Project settings →\n' +
        '  Service accounts → Generate new private key), then point this env var\n' +
        '  at it — e.g. add to .env:  GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json',
    );
    process.exit(1);
  }

  const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
  const app = getApps().length
    ? getApps()[0]
    : initializeApp({ credential: applicationDefault(), ...(projectId ? { projectId } : {}) });
  const db = getFirestore(app);

  const now = Timestamp.now();
  console.log(
    `${dryRun ? '[DRY RUN] ' : ''}Scanning '${SESSIONS}' for sessions expired before ` +
      `${now.toDate().toISOString()}…\n`,
  );

  // `read: if true`, so this query works with any credentials. Ordered oldest-
  // expired first purely for readable output.
  const snap = await db
    .collection(SESSIONS)
    .where('expiresAt', '<', now)
    .orderBy('expiresAt', 'asc')
    .get();

  if (snap.empty) {
    console.log('✓ No expired sessions found. Nothing to clean up.');
    process.exit(0);
  }

  console.log(`Found ${snap.size} expired session${snap.size === 1 ? '' : 's'}:`);
  snap.docs.forEach((docSnap, i) => {
    const data = docSnap.data();
    const expiredAgo = data.expiresAt ? formatAgo(now.toMillis() - data.expiresAt.toMillis()) : 'unknown';
    const name = data.restaurantName || '(no name)';
    console.log(`  ${i + 1}. ${docSnap.id}  ·  ${name}  ·  expired ${expiredAgo}`);
  });
  console.log('');

  if (dryRun) {
    console.log(
      `[DRY RUN] Would delete ${snap.size} session${snap.size === 1 ? '' : 's'}. ` +
        'No changes were made.',
    );
    process.exit(0);
  }

  // Delete in batches to stay under Firestore's 500-ops-per-batch limit.
  const batches = chunk(snap.docs, BATCH_LIMIT);
  let deleted = 0;
  for (const [idx, group] of batches.entries()) {
    const batch = db.batch();
    group.forEach((docSnap) => batch.delete(docSnap.ref));
    await batch.commit();
    deleted += group.length;
    if (batches.length > 1) {
      console.log(`  · committed batch ${idx + 1}/${batches.length} (${group.length} deleted)`);
    }
  }

  console.log(`\n✓ Deleted ${deleted} expired session${deleted === 1 ? '' : 's'}. Cleanup complete.`);
  process.exit(0);
}

main().catch((err) => {
  console.error('✗ Cleanup failed:', err);
  process.exit(1);
});
