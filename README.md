# Morph Modeling

Browser-based 3D modeling prototype in Morph's black, red and gold identity.

## Development

Use Node 22.13+ and the pinned pnpm lockfile. Run `pnpm install` then `pnpm dev` in a standard local environment. This managed checkout uses the Sites preview helper and its configured scripts. Production uses the included build scripts and Cloudflare-compatible output.

- `pnpm exec tsc --noEmit`: static type checks.
- `node --import tsx --test tests/*.test.ts`: topology, serialization, and GLB/glTF/STL/OBJ round-trip tests.
- `pnpm build`: production build.

## User workflow

Add primitives, choose Object or Edit Mode, select faces/edges/vertices, and use the transform handles. The Mesh properties tab exposes geometry operations and their amount. Materials and UV Editing have dedicated workspaces. Save .morph projects for portable editable backups; use GLB for static asset interchange. Browser recovery is device-local.

See [the roadmap](public/ROADMAP.md) for implemented capabilities, limits and future milestones. The application is an engineering prototype rather than a complete Blender replacement.

## Verification

The prototype passes 16 automated tests and TypeScript checks. See [validation notes](VALIDATION.md) for browser coverage and known verification limits.
