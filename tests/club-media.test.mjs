import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  buildClubMediaPath,
  inspectClubImage,
  isControlledClubMediaPath,
} from "../src/lib/clubs/club-media.ts";

const root = process.cwd();
const migrationPath =
  "supabase/migrations/202608130006_add_club_profile_media.sql";
const uploadReturnMigrationPath =
  "supabase/migrations/202608130007_allow_club_media_upload_return.sql";
const schoolId = "aaaaaaaa-0000-4000-8000-000000000001";
const clubId = "cccccccc-0000-4000-8000-000000000001";
const fileId = "dddddddd-0000-4000-8000-000000000001";

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

test("club media migration stores controlled nullable paths in a private bucket", () => {
  const migration = read(migrationPath);

  assert.match(migration, /add column if not exists logo_path text/);
  assert.match(migration, /add column if not exists banner_path text/);
  assert.match(migration, /club_profiles_logo_path_valid/);
  assert.match(migration, /club_profiles_banner_path_valid/);
  assert.match(migration, /'club-media',[\s\S]*false,[\s\S]*5242880/);
  assert.match(migration, /array\['image\/jpeg', 'image\/png', 'image\/webp'\]/);
  assert.doesNotMatch(migration, /public\s*=\s*true|createSignedUrl|getPublicUrl/);
});

test("storage policies allow controlled uploads and referenced reads without listing", () => {
  const migration = read(migrationPath);
  const uploadReturnMigration = read(uploadReturnMigrationPath);

  assert.match(migration, /for insert[\s\S]*current_user_can_upload_club_media\(name\)/);
  assert.match(migration, /club_media_upload_metadata_is_valid\(name, metadata\)/);
  assert.match(migration, /for select[\s\S]*storage\.allow_only_operation\('storage\.object\.get_authenticated'\)/);
  assert.match(migration, /current_user_can_read_club_media\(name\)/);
  assert.doesNotMatch(
    migration,
    /create policy "[^"]+"\s+on storage\.objects\s+for (update|delete)/i,
  );
  assert.match(
    uploadReturnMigration,
    /storage\.allow_only_operation\('storage\.object\.upload'\)/,
  );
  assert.match(
    uploadReturnMigration,
    /current_user_can_upload_club_media\(name\)[\s\S]*club_media_upload_metadata_is_valid\(name, metadata\)/,
  );
  assert.match(
    uploadReturnMigration,
    /storage\.allow_only_operation\('storage\.object\.get_authenticated'\)[\s\S]*current_user_can_read_club_media\(name\)/,
  );
  assert.doesNotMatch(uploadReturnMigration, /storage\.object\.list/);
});

test("media reference changes are service-only and recheck the exact actor and club", () => {
  const migration = read(migrationPath);

  assert.match(migration, /create or replace function public\.set_club_profile_media/);
  assert.match(migration, /club_profile_actor_can_edit_media\([\s\S]*actor_profile_id/);
  assert.match(migration, /o\.bucket_id = 'club-media'[\s\S]*o\.name = media_path/);
  assert.match(migration, /grant execute on function public\.set_club_profile_media[\s\S]*to service_role/);
  assert.match(migration, /revoke all on function public\.set_club_profile_media[\s\S]*from public, anon, authenticated/);
});

test("controlled paths contain only school, club, kind, and generated file name", () => {
  const path = buildClubMediaPath(
    schoolId,
    clubId,
    "logo",
    "image/png",
    fileId,
  );

  assert.equal(
    path,
    `${schoolId}/${clubId}/logo/${fileId}.png`,
  );
  assert.equal(isControlledClubMediaPath(path, schoolId, clubId, "logo"), true);
  assert.equal(isControlledClubMediaPath(path, schoolId, clubId, "banner"), false);
  assert.equal(
    isControlledClubMediaPath(
      `bbbbbbbb-0000-4000-8000-000000000002/${clubId}/logo/${fileId}.png`,
      schoolId,
      clubId,
      "logo",
    ),
    false,
  );
});

test("server-compatible inspection accepts supported static images with safe dimensions", () => {
  const png = makePng(256, 256);
  const jpeg = makeJpeg(1200, 400);
  const webp = makeWebp(1200, 400);

  assert.deepEqual(inspectClubImage(png, "image/png", "logo"), {
    animated: false,
    height: 256,
    mimeType: "image/png",
    ok: true,
    ratioWarning: false,
    width: 256,
  });
  assert.equal(inspectClubImage(jpeg, "image/jpeg", "banner").ok, true);
  assert.equal(inspectClubImage(webp, "image/webp", "banner").ok, true);
});

test("inspection rejects disguised, animated, undersized, unsupported, and oversized files", () => {
  assert.deepEqual(inspectClubImage(makeJpeg(256, 256), "image/png", "logo"), {
    code: "mimeMismatch",
    ok: false,
  });
  assert.deepEqual(inspectClubImage(makePng(128, 128), "image/png", "logo"), {
    code: "dimensions",
    ok: false,
  });
  assert.deepEqual(inspectClubImage(makePng(256, 256, true), "image/png", "logo"), {
    code: "animated",
    ok: false,
  });
  assert.deepEqual(inspectClubImage(new Uint8Array([60, 115, 118, 103]), "image/svg+xml", "logo"), {
    code: "invalidType",
    ok: false,
  });
  assert.deepEqual(inspectClubImage(new Uint8Array([71, 73, 70, 56, 57, 97]), "image/png", "logo"), {
    code: "invalidImage",
    ok: false,
  });
  assert.deepEqual(inspectClubImage(new Uint8Array(2 * 1024 * 1024 + 1), "image/png", "logo"), {
    code: "tooLarge",
    ok: false,
  });
});

test("club media UI uses protected media routes, fallbacks, and bilingual guidance", () => {
  const profilePage = read("src/app/(admin)/clubs/[clubId]/page.tsx");
  const editPage = read("src/app/(admin)/clubs/[clubId]/edit/page.tsx");
  const manager = read("src/app/(admin)/clubs/[clubId]/edit/club-media-manager.tsx");
  const english = read("src/lib/i18n/dictionaries/en.ts");
  const mongolian = read("src/lib/i18n/dictionaries/mn.ts");

  assert.match(profilePage, /aspect-\[3\/1\]/);
  assert.match(profilePage, /clubs\.profile\.media\.logoAlt/);
  assert.match(profilePage, /clubs\.profile\.media\.bannerAlt/);
  assert.match(editPage, /<ClubMediaManager/);
  assert.match(manager, /accept="image\/jpeg,image\/png,image\/webp"/);
  assert.match(manager, /inspectClubImage/);
  assert.match(manager, /router\.refresh\(\)/);
  assert.match(english, /Use a club logo, artwork, or activity image/);
  assert.match(mongolian, /Сургууль нийтлэхийг зөвшөөрсөн клубын лого/);
});

test("replacement validates before switching references and cleans only safe objects", () => {
  const actions = read(
    "src/app/(admin)/clubs/[clubId]/edit/media-actions.ts",
  );
  const inspectionIndex = actions.indexOf("inspectClubImage(");
  const referenceUpdateIndex = actions.indexOf('"set_club_profile_media"');
  const oldObjectCleanupIndex = actions.indexOf("removeExactObject(previousPath)");

  assert.ok(inspectionIndex >= 0 && inspectionIndex < referenceUpdateIndex);
  assert.ok(
    referenceUpdateIndex >= 0 && referenceUpdateIndex < oldObjectCleanupIndex,
  );
  assert.match(actions, /if \(updateError\) \{[\s\S]*removeExactObject\(input\.path\)/);
  assert.match(actions, /isControlledClubMediaPath\([\s\S]*previousPath/);
  assert.match(actions, /media_path: null/);
  assert.match(actions, /revalidatePath\("\/clubs"\)/);
  assert.match(actions, /revalidatePath\(`\/clubs\/\$\{clubId\}`\)/);
});

function makePng(width, height, animated = false) {
  const chunks = [
    pngChunk("IHDR", uint32(width), uint32(height), new Uint8Array(5)),
    ...(animated ? [pngChunk("acTL", uint32(1), uint32(0))] : []),
    pngChunk("IDAT", new Uint8Array([1])),
    pngChunk("IEND"),
  ];

  return concat(
    new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    ...chunks,
  );
}

function pngChunk(type, ...parts) {
  const data = concat(...parts);
  return concat(
    uint32(data.length),
    new TextEncoder().encode(type),
    data,
    new Uint8Array(4),
  );
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
