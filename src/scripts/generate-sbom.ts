import { promises as fs } from 'fs';
import path from 'path';
import { load } from 'js-yaml';

interface LockfileImporterEntry {
  specifier: string;
  version: string;
}

interface LockfilePackageEntry {
  resolution?: {
    integrity?: string;
  };
  dev?: boolean;
}

interface CycloneDxComponent {
  name: string;
  version: string;
  type: 'application' | 'library';
  'bom-ref': string;
  purl: string;
  description?: string;
  licenses?: Array<{ license: { id: string } }>;
  hashes?: Array<{ alg: string; content: string }>;
}

interface CycloneDxBom {
  bomFormat: 'CycloneDX';
  specVersion: '1.4';
  version: number;
  metadata: {
    timestamp: string;
    tools?: Array<{ vendor?: string; name: string; version?: string }>;
    component: CycloneDxComponent;
    properties?: Array<{ name: string; value: string }>;
  };
  components: CycloneDxComponent[];
  dependencies?: Array<{ ref: string; dependsOn: string[] }>;
}

function sanitizeVersion(version: string): string {
  const parenIndex = version.indexOf('(');
  return parenIndex >= 0 ? version.slice(0, parenIndex) : version;
}

function toPurl(name: string, version: string): string {
  if (!name) {
    throw new Error('Cannot build purl for empty package name');
  }
  const encodedName = name.startsWith('@') ? `%40${name.slice(1)}` : name;
  return `pkg:npm/${encodedName}@${version}`;
}

function parsePackageKey(key: string): { name: string; version: string } {
  const atIndex = key.lastIndexOf('@');
  if (atIndex <= 0 || atIndex === key.length - 1) {
    throw new Error(`Unable to parse package key: ${key}`);
  }
  const name = key.slice(0, atIndex);
  const version = key.slice(atIndex + 1);
  return { name, version };
}

function integrityToHash(integrity?: string): Array<{ alg: string; content: string }> | undefined {
  if (!integrity) {
    return undefined;
  }
  const [algorithmRaw, value] = integrity.split('-', 2);
  if (!algorithmRaw || !value) {
    return undefined;
  }
  const algorithm = algorithmRaw.toUpperCase().replace('SHA', 'SHA-');
  try {
    const content = Buffer.from(value, 'base64').toString('hex');
    return [{ alg: algorithm, content }];
  } catch (error) {
    console.warn(`[sbom] Failed to decode integrity hash for ${integrity}:`, error);
    return undefined;
  }
}

async function main(): Promise<void> {
  const cwd = process.cwd();
  const packageJsonPath = path.resolve(cwd, 'package.json');
  const lockfilePath = path.resolve(cwd, 'pnpm-lock.yaml');

  const [packageJsonRaw, lockfileRaw] = await Promise.all([
    fs.readFile(packageJsonPath, 'utf8'),
    fs.readFile(lockfilePath, 'utf8'),
  ]);

  const packageJson = JSON.parse(packageJsonRaw) as {
    name: string;
    version: string;
    description?: string;
    license?: string;
  };

  const lock = load(lockfileRaw) as {
    importers?: Record<
      string,
      {
        dependencies?: Record<string, LockfileImporterEntry>;
        devDependencies?: Record<string, LockfileImporterEntry>;
        optionalDependencies?: Record<string, LockfileImporterEntry>;
      }
    >;
    packages?: Record<string, LockfilePackageEntry>;
  };

  if (!lock || !lock.packages) {
    throw new Error('pnpm-lock.yaml does not contain a packages section');
  }

  const components: CycloneDxComponent[] = [];
  const componentsByName = new Map<string, CycloneDxComponent[]>();

  for (const [key, pkg] of Object.entries(lock.packages)) {
    const { name, version } = parsePackageKey(key);
    const normalizedVersion = sanitizeVersion(version);
    const purl = toPurl(name, normalizedVersion);
    const component: CycloneDxComponent = {
      name,
      version: normalizedVersion,
      type: 'library',
      'bom-ref': purl,
      purl,
    };

    const hashes = integrityToHash(pkg.resolution?.integrity);
    if (hashes) {
      component.hashes = hashes;
    }

    components.push(component);
    const existing = componentsByName.get(name);
    if (existing) {
      existing.push(component);
    } else {
      componentsByName.set(name, [component]);
    }
  }

  components.sort((a, b) => {
    const nameComparison = a.name.localeCompare(b.name);
    if (nameComparison !== 0) {
      return nameComparison;
    }
    return a.version.localeCompare(b.version);
  });

  const mainComponent: CycloneDxComponent = {
    name: packageJson.name,
    version: packageJson.version,
    type: 'application',
    'bom-ref': toPurl(packageJson.name, packageJson.version),
    purl: toPurl(packageJson.name, packageJson.version),
  };

  if (packageJson.description) {
    mainComponent.description = packageJson.description;
  }
  if (packageJson.license) {
    mainComponent.licenses = [{ license: { id: packageJson.license } }];
  }

  const importer = lock.importers?.['.'];
  const dependsOn = new Set<string>();
  const candidateGroups = [
    importer?.dependencies,
    importer?.devDependencies,
    importer?.optionalDependencies,
  ];

  for (const group of candidateGroups) {
    if (!group) continue;
    for (const [depName, entry] of Object.entries(group)) {
      const desiredVersion = sanitizeVersion(entry.version);
      const matches = componentsByName.get(depName) ?? [];
      const matched =
        matches.find((component) => component.version === desiredVersion) ??
        matches[0];
      const ref = matched ? matched['bom-ref'] : toPurl(depName, desiredVersion);
      dependsOn.add(ref);
    }
  }

  const bom: CycloneDxBom = {
    bomFormat: 'CycloneDX',
    specVersion: '1.4',
    version: 1,
    metadata: {
      timestamp: new Date().toISOString(),
      tools: [
        {
          vendor: 'poe-mcp',
          name: 'generate-sbom',
          version: packageJson.version,
        },
      ],
      component: mainComponent,
      properties: [
        { name: 'sbom:generator', value: 'scripts/generate-sbom.ts' },
        { name: 'sbom:lockfile', value: 'pnpm-lock.yaml' },
      ],
    },
    components,
  };

  if (dependsOn.size > 0) {
    bom.dependencies = [
      {
        ref: mainComponent['bom-ref'],
        dependsOn: Array.from(dependsOn).sort(),
      },
    ];
  }

  const outputDir = path.resolve(cwd, 'dist/security');
  await fs.mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, 'sbom.json');
  await fs.writeFile(outputPath, `${JSON.stringify(bom, null, 2)}\n`, 'utf8');
  console.log(`[sbom] Wrote CycloneDX SBOM with ${components.length} components to ${outputPath}`);
}

main().catch((error) => {
  console.error('[sbom] Failed to generate CycloneDX output:', error);
  process.exitCode = 1;
});
