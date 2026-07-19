import { DesignContract } from '../../domain/models/template.model';

export interface VersionSaveInfo {
  exists: boolean;
  latestVersion: number;
  nextVersion: number;
}

export function calculateVersionSaveInfo(
  current: DesignContract,
  templates: DesignContract[],
): VersionSaveInfo {
  const normalizedName = normalizeDesignName(current.document.name);
  const exists = templates.some(
    (template) => template.document.id === current.document.id,
  );
  const versions = templates
    .filter(
      (template) =>
        normalizeDesignName(template.document.name) === normalizedName,
    )
    .map((template) => template.document.version ?? 1);
  const latestVersion = versions.length
    ? Math.max(...versions)
    : (current.document.version ?? 1);

  return {
    exists,
    latestVersion,
    nextVersion: latestVersion + 1,
  };
}

function normalizeDesignName(name: string): string {
  return name.trim().toLocaleLowerCase('es');
}
