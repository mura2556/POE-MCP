import fs from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import simpleGit from 'simple-git';
import fetch from 'node-fetch';
import { loadConfig } from '../config/index.js';
import { assertPoe1 } from '../validate/noPoe2.js';

export interface GitRepoResult {
  localPath: string;
  commit: string;
  license: string;
}

export async function cloneOrUpdateRepo(url: string, ref: string = 'master'): Promise<GitRepoResult> {
  const cfg = loadConfig();
  assertPoe1(url, `clone:${url}`, 'url');
  const repoName = url.split('/').pop() ?? 'repo';
  const reposRoot = path.join(cfg.cacheDir, 'repos');
  await fs.mkdir(reposRoot, { recursive: true });
  const targetDir = path.join(reposRoot, repoName);

  const repoExists = await fs
    .stat(path.join(targetDir, '.git'))
    .then(() => true)
    .catch(() => false);

  if (!repoExists) {
    await fs.rm(targetDir, { recursive: true, force: true });
    try {
      await simpleGit().clone(url, targetDir, ['--depth', '1', '--branch', ref]);
    } catch (cloneError) {
      await simpleGit().clone(url, targetDir);
    }
  }

  const repoGit = simpleGit(targetDir);
  await repoGit.fetch();
  await repoGit.checkout(ref).catch(async () => {
    await repoGit.checkout(`origin/${ref}`).catch(() => undefined);
  });
  await repoGit.pull('origin', ref).catch(() => undefined);

  const log = await repoGit.log({ n: 1 });
  const commit = log.latest?.hash ?? 'unknown';

  const licenseCandidates = ['LICENSE', 'LICENSE.md', 'LICENSE.txt'];
  let license = 'UNKNOWN';
  for (const candidate of licenseCandidates) {
    const candidatePath = path.join(targetDir, candidate);
    try {
      const stat = await fs.stat(candidatePath);
      if (stat.isFile()) {
        const raw = await fs.readFile(candidatePath, 'utf-8');
        license = raw.split('\n')[0]?.trim() || raw.trim() || 'UNKNOWN';
        break;
      }
    } catch (error) {
      // ignore
    }
  }

  return { localPath: targetDir, commit, license };
}

export async function fetchFileFromRepo(url: string, filePath: string, ref = 'master'): Promise<string> {
  const { localPath } = await cloneOrUpdateRepo(url, ref);
  const fullPath = path.join(localPath, filePath);
  return fs.readFile(fullPath, 'utf-8');
}

export async function downloadReleaseAsset(repo: string, assetName: string): Promise<string> {
  const tmp = path.join(tmpdir(), 'poe-mcp');
  await fs.mkdir(tmp, { recursive: true });
  const target = path.join(tmp, assetName);
  // Placeholder stub: rely on manual download when running in production.
  await fs.writeFile(target, '');
  return target;
}

export interface GithubRepoMirror {
  fullName: string;
  cloneUrl: string;
  defaultBranch: string;
  license?: string;
  updatedAt?: string;
}

export async function searchGithubMirrors(repoFullName: string): Promise<GithubRepoMirror[]> {
  const cfg = loadConfig();
  const query = `repo:${repoFullName} fork:true archived:false`; // search forks/mirrors
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=updated&order=desc&per_page=5`;
  const headers: Record<string, string> = {
    'User-Agent': 'poe-mcp/0.1 (+https://github.com/anthropics/poe-mcp)',
    Accept: 'application/vnd.github+json',
  };
  if (cfg.githubToken) {
    headers.Authorization = `Bearer ${cfg.githubToken}`;
  }
  try {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`GitHub search failed ${response.status}`);
    }
    const json = (await response.json()) as {
      items: Array<{ full_name: string; clone_url: string; default_branch: string; license?: { spdx_id?: string; name?: string }; updated_at?: string }>;
    };
    return json.items.map((item) => ({
      fullName: item.full_name,
      cloneUrl: item.clone_url,
      defaultBranch: item.default_branch,
      license: item.license?.spdx_id ?? item.license?.name,
      updatedAt: item.updated_at,
    }));
  } catch (error) {
    return [];
  }
}
