import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { detectStaticImage } from "../src/lib/clubs/club-media.ts";

const root = process.cwd();
const migrationPath =
  "supabase/migrations/202608130008_add_event_posters.sql";
const schoolId = "aaaaaaaa-0000-4000-8000-000000000001";
const eventId = "bbbbbbbb-0000-4000-8000-000000000001";
const fileId = "cccccccc-0000-4000-8000-000000000001";

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

test("event poster migration adds only a controlled nullable path and private bucket", () => {
  const migration = read(migrationPath);

  assert.match(migration, /add column if not exists poster_path text/);
  assert.match(migration, /events_poster_path_valid/);
  assert.match(migration, /'event-media',[\s\S]*false,[\s\S]*5242880/);
  assert.match(migration, /array\['image\/jpeg', 'image\/png', 'image\/webp'\]/);
  assert.doesNotMatch(migration, /public\s*=\s*true|getPublicUrl|signed_url/i);
});

test("event poster storage permits exact upload return and attached reads without listing", () => {
  const migration = read(migrationPath);

  assert.match(
    migration,
    /for insert[\s\S]*current_user_can_upload_event_poster\(name\)[\s\S]*event_poster_upload_metadata_is_valid\(name, metadata\)/,
  );
  assert.match(
    migration,
    /storage\.allow_only_operation\('storage\.object\.get_authenticated'\)[\s\S]*current_user_can_read_event_poster\(name\)/,
  );
  assert.match(
    migration,
    /storage\.allow_only_operation\('storage\.object\.upload'\)[\s\S]*current_user_can_upload_event_poster\(name\)/,
  );
  assert.doesNotMatch(migration, /storage\.object\.list/);
  assert.doesNotMatch(
    migration,
    /create policy "[^"]+"\s+on storage\.objects\s+for (update|delete)/i,
  );
});

test("poster authorization matches staff, platform, and leader workflow boundaries", () => {
  const migration = read(migrationPath);

  assert.match(migration, /current_platform_admin_can_use_event_school\(e\.school_id\)/);
  assert.match(migration, /current_user_can_manage_school\(e\.school_id\)/);
  assert.match(migration, /current_user_is_club_leader\(e\.club_id\)/);
  assert.match(migration, /e\.status in \('draft', 'rejected'\)/);
  assert.match(
    migration,
    /e\.status = 'pending_approval' and e\.poster_path is null/,
  );
  assert.doesNotMatch(
    migration,
    /e\.status in \('draft', 'rejected', 'approved'\)/,
  );
  assert.match(migration, /p\.status = 'active'/);
  assert.match(migration, /p\.school_id = e\.school_id/);
});

test("poster reference RPC is service-only and cannot change unrelated event fields", () => {
  const migration = read(migrationPath);
  const functionStart = migration.indexOf(
    "create or replace function public.set_event_poster",
  );
  const functionEnd = migration.indexOf(
    "alter function public.set_event_poster",
    functionStart,
  );
  const body = migration.slice(functionStart, functionEnd);

  assert.match(body, /event_poster_actor_can_edit\(actor_profile_id, target_event_id\)/);
  assert.match(body, /o\.bucket_id = 'event-media'[\s\S]*o\.name = media_path/);
  assert.match(body, /update public\.events[\s\S]*set poster_path = media_path/);
  assert.doesNotMatch(body, /set\s+(title|status|school_id|club_id)\s*=/i);
  assert.match(
    migration,
    /revoke all on function public\.set_event_poster\(uuid, text, uuid\)[\s\S]*from public, anon, authenticated/,
  );
  assert.match(
    migration,
    /grant execute on function public\.set_event_poster\(uuid, text, uuid\)[\s\S]*to service_role/,
  );
});

test("controlled poster paths contain no names or user data", () => {
  const posterHelper = read("src/lib/events/event-poster.ts");
  const path = `${schoolId}/${eventId}/poster/${fileId}.webp`;

  assert.equal(path, `${schoolId}/${eventId}/poster/${fileId}.webp`);
  assert.match(posterHelper, /\$\{schoolId\}\/\$\{eventId\}\/poster\/\$\{fileId\}/);
  assert.match(posterHelper, /isControlledEventPosterPath/);
  assert.match(posterHelper, /escapeRegExp\(schoolId\)/);
  assert.match(posterHelper, /escapeRegExp\(eventId\)/);
});

test("poster inspection accepts supported static portrait images", () => {
  assert.deepEqual(detectStaticImage(makePng(800, 1000)), {
    animated: false,
    height: 1000,
    mimeType: "image/png",
    width: 800,
  });
  assert.equal(detectStaticImage(makeJpeg(1200, 1500))?.mimeType, "image/jpeg");
  assert.equal(detectStaticImage(makeWebp(800, 1000))?.mimeType, "image/webp");
  const posterHelper = read("src/lib/events/event-poster.ts");
  assert.match(posterHelper, /EVENT_POSTER_MIN_WIDTH = 800/);
  assert.match(posterHelper, /EVENT_POSTER_MIN_HEIGHT = 1000/);
  assert.match(posterHelper, /detected\.mimeType !== claimedMimeType/);
  assert.match(posterHelper, /detected\.animated/);
});

test("poster inspection rejects disguised, animated, undersized, and oversized files", () => {
  assert.equal(detectStaticImage(makeJpeg(800, 1000))?.mimeType, "image/jpeg");
  assert.equal(detectStaticImage(makePng(799, 1000))?.width, 799);
  assert.equal(detectStaticImage(makePng(800, 1000, true))?.animated, true);
  assert.equal(
    detectStaticImage(new Uint8Array([71, 73, 70, 56, 57, 97])),
    null,
  );
  const posterHelper = read("src/lib/events/event-poster.ts");
  assert.match(posterHelper, /EVENT_POSTER_MAX_BYTES = 5 \* 1024 \* 1024/);
  assert.match(posterHelper, /code: "mimeMismatch"/);
  assert.match(posterHelper, /code: "dimensions"/);
  assert.match(posterHelper, /code: "animated"/);
  assert.match(posterHelper, /code: "invalidImage"/);
  assert.match(posterHelper, /code: "tooLarge"/);
});

test("event list uses poster-led responsive cards without wrapping card actions", () => {
  const browser = read("src/app/(admin)/events/event-browser.tsx");

  assert.match(browser, /md:grid-cols-\[minmax\(13rem,0\.85fr\)_minmax\(0,2fr\)\]/);
  assert.match(browser, /aspect-\[16\/10\][\s\S]*md:aspect-\[4\/5\]/);
  assert.match(browser, /src=\{item\.posterUrl\}/);
  assert.match(browser, /event-card-poster-fallback/);
  assert.match(browser, /href=\{`\/events\/\$\{item\.id\}`\}/);
  assert.match(browser, /target\.closest\("a, button, form, input, select, textarea"\)/);
  assert.doesNotMatch(browser, /<button[^>]*>[\s\S]*<article/);
});

test("creation and detail reuse the same secure poster editor", () => {
  const createForm = read("src/app/(admin)/events/create-event-form.tsx");
  const detail = read("src/app/(admin)/events/[eventId]/page.tsx");
  const uploader = read("src/components/events/event-poster-uploader.tsx");
  const actions = read("src/app/(admin)/events/poster-actions.ts");

  assert.match(createForm, /<EventPosterUploader[\s\S]*deferUntilEventCreated/);
  assert.match(detail, /<EventPosterUploader/);
  assert.match(uploader, /uploadToSignedUrl\(/);
  assert.match(uploader, /createdWithoutPoster/);
  assert.match(actions, /if \(updateError\) \{[\s\S]*removeExactObject\(input\.path\)/);
  assert.match(actions, /previousPath !== input\.path[\s\S]*removeExactObject\(previousPath\)/);
  assert.match(actions, /media_path: null/);
  assert.match(actions, /access\.posterPath !== input\.path/);
});

function makePng(width, height, animated = false) {
  const chunks = [
    pngChunk("IHDR", uint32(width), uint32(height), new Uint8Array(5)),
    ...(animated ? [pngChunk("acTL", uint32(1), uint32(0))] : []),
    pngChunk("IDAT", new Uint8Array([1])),
    pngChunk("IEND"),
  ];
  return concat(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), ...chunks);
}

function pngChunk(type, ...parts) {
  const data = concat(...parts);
  return concat(uint32(data.length), new TextEncoder().encode(type), data, new Uint8Array(4));
}

function makeJpeg(width, height) {
  return new Uint8Array([
    0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08,
    (height >> 8) & 0xff, height & 0xff,
    (width >> 8) & 0xff, width & 0xff,
    0x03, 0x01, 0x11, 0x00, 0x02, 0x11, 0x00, 0x03, 0x11, 0x00,
    0xff, 0xd9,
  ]);
}

function makeWebp(width, height) {
  const bytes = new Uint8Array(30);
  bytes.set(new TextEncoder().encode("RIFF"), 0);
  bytes.set([22, 0, 0, 0], 4);
  bytes.set(new TextEncoder().encode("WEBPVP8X"), 8);
  bytes.set([10, 0, 0, 0], 16);
  setUint24(bytes, 24, width - 1);
  setUint24(bytes, 27, height - 1);
  return bytes;
}

function uint32(value) {
  return new Uint8Array([
    (value >>> 24) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 8) & 0xff,
    value & 0xff,
  ]);
}

function setUint24(bytes, offset, value) {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >> 8) & 0xff;
  bytes[offset + 2] = (value >> 16) & 0xff;
}

function concat(...arrays) {
  const result = new Uint8Array(arrays.reduce((sum, value) => sum + value.length, 0));
  let offset = 0;
  for (const value of arrays) {
    result.set(value, offset);
    offset += value.length;
  }
  return result;
}
