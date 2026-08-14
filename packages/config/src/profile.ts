/**
 * Deployment profiles.
 *
 * The same artefact runs in all three (NFR-18). A profile changes *configuration*, never
 * code — the moment a profile appears in an `if` inside a request handler, the thing being
 * tested locally has stopped being the thing that runs in production.
 *
 * Profiles exist here to decide **how strict the environment contract is**, which is a
 * boot-time question and therefore safe to branch on.
 */

import { z } from 'zod';

export const deploymentProfileSchema = z.enum(['local', 'vps', 'cloud']);

export type DeploymentProfile = z.infer<typeof deploymentProfileSchema>;

/**
 * Whether a profile is running for real.
 *
 * `local` may fall back to the development defaults in `.env.example`; `vps` and `cloud`
 * may not. The distinction matters most for secrets: `IRODORA_SESSION_SECRET=replace-me`
 * is a fine default on a workstation and a compromised deployment anywhere else, and it is
 * the kind of value that ships because nothing stopped it.
 */
export function isProductionProfile(profile: DeploymentProfile): boolean {
  return profile !== 'local';
}
