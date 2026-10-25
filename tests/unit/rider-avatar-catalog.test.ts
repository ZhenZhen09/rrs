import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';
import { transform } from 'esbuild';
import catalog from '../../shared/riderAvatarCatalog.json';
import { getRiderAvatarUrl } from '../../src/app/utils/riderAvatarCatalog.generated';
import { getDefaultRiderAvatarId, getDefaultRiderAvatarUrl } from '../../src/app/utils/riderAvatar';
import { isRiderAvatarId } from '../../server/services/riderAvatarCatalog.generated';

describe('rider avatar catalog', () => {
  it('contains eight stable IDs, safe filenames, and unique fixed seeds', () => {
    expect(catalog).toHaveLength(8);
    expect(catalog.map(({ id }) => id)).toEqual([
      'avatar_01', 'avatar_02', 'avatar_03', 'avatar_04',
      'avatar_05', 'avatar_06', 'avatar_07', 'avatar_08',
    ]);
    expect(catalog.map(({ seed }) => seed)).toEqual([
      'rider-avatar-01', 'rider-avatar-02', 'rider-avatar-03', 'rider-avatar-04',
      'rider-avatar-05', 'rider-avatar-06', 'rider-avatar-07', 'rider-avatar-08',
    ]);
    expect(catalog.map(({ file }) => file)).toEqual([
      'avatar_01.png', 'avatar_02.png', 'avatar_03.png', 'avatar_04.png',
      'avatar_05.png', 'avatar_06.png', 'avatar_07.png', 'avatar_08.png',
    ]);
    expect(new Set(catalog.map(({ seed }) => seed)).size).toBe(8);
  });

  it('maps only catalog IDs to local web URLs and server allowlist entries', () => {
    for (const { id, file } of catalog) {
      expect(getRiderAvatarUrl(id)).toBe(`/rider-avatars/${file}`);
      expect(isRiderAvatarId(id)).toBe(true);
    }
    for (const value of [null, undefined, '', 'avatar_09', '../avatar_01.png']) {
      expect(getRiderAvatarUrl(value)).toBeNull();
      expect(isRiderAvatarId(value)).toBe(false);
    }
  });

  it('assigns a stable existing avatar image from rider identity without a database avatar field', () => {
    expect(getDefaultRiderAvatarId('rider-1')).toBe('avatar_05');
    expect(getDefaultRiderAvatarId('rider-2')).toBe('avatar_06');
    expect(getDefaultRiderAvatarUrl('rider-1')).toBe('/rider-avatars/avatar_05.png');
  });

  it('uses a saved avatar catalog ID directly when rendering its image URL', () => {
    expect(getDefaultRiderAvatarUrl('avatar_02')).toBe('/rider-avatars/avatar_02.png');
  });

  it('maps mobile IDs to bundled static sources and returns null for unknown IDs', async () => {
    const source = await readFile(join('mobile-app', 'assets', 'rider-avatars', 'catalog.generated.ts'), 'utf8');
    const compiled = await transform(source, { loader: 'ts', format: 'cjs' });
    const module = { exports: {} as { getRiderAvatarSource: (id: string | null) => string | null } };
    runInNewContext(compiled.code, { module, exports: module.exports, require: (path: string) => path });
    const { getRiderAvatarSource } = module.exports;
    for (const { id, file } of catalog) {
      expect(getRiderAvatarSource(id)).toBe(`./${file}`);
    }
    expect(getRiderAvatarSource(null)).toBeNull();
    expect(getRiderAvatarSource('avatar_09')).toBeNull();
  });

  it('ships byte-identical, nonempty 128px PNGs to both apps', async () => {
    for (const { file } of catalog) {
      const shared = await readFile(join('shared', 'rider-avatars', file));
      const mobile = await readFile(join('mobile-app', 'assets', 'rider-avatars', file));
      const web = await readFile(join('public', 'rider-avatars', file));
      expect(shared.length).toBeGreaterThan(100);
      expect(shared.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))).toBe(true);
      expect(shared.readUInt32BE(16)).toBe(128);
      expect(shared.readUInt32BE(20)).toBe(128);
      expect(mobile.equals(shared)).toBe(true);
      expect(web.equals(shared)).toBe(true);
    }
  });

  it('ships the style source and CC0 notice with each asset set', async () => {
    for (const dir of [
      join('shared', 'rider-avatars'),
      join('mobile-app', 'assets', 'rider-avatars'),
      join('public', 'rider-avatars'),
    ]) {
      const notice = await readFile(join(dir, 'NOTICE.md'), 'utf8');
      expect(notice).toContain('Lorelei Neutral');
      expect(notice).toContain('CC0 1.0');
      expect(notice).toContain('@dicebear/core 10.7.0');
      expect(notice).toContain('@dicebear/styles 10.6.0');
    }
  });
});
