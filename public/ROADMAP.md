# Morph Modeling — engineering roadmap

Version 0.1 · September 2026 · Joseph Loe / Morph

## Product goal
A web-based 3D editor inspired by Blender, with a local-first workflow and Morph's black, red and gold identity. The first prototype implements the path from primitive creation through polygon editing, materials, UV layout and portable export. It is not Blender feature parity.

## Available in 0.1

| Area | Implemented | Scope and limits |
| --- | --- | --- |
| Scene | Cube, plane, sphere, cylinder, cone, torus and icosphere; outliner; names and visibility; multi-selection | Mesh objects; no camera/light objects or nested collections |
| Navigation | Orbit, pan, zoom, frame, axis views, orthographic/perspective | Y up; meters |
| Transform | Move, rotate, scale; world/local handles; numeric object transforms; snapping; apply transforms; center origin | Gizmo-based component transforms; no numeric modal transform entry |
| Mesh | Vertex/edge/face selection; region extrusion; individual face inset; whole-mesh chamfer; linear subdivision; axis-aligned loop slice; triangulate; fill; weld; merge; mirror; flip normals | Best suited to simple, low-poly topology. Fill assumes coplanar convex selections. Bevel assumes closed convex topology and is not an arbitrary selected-edge bevel. Slice assumes convex planar source faces. No robust Boolean kernel yet. |
| Objects | Duplicate, delete, join, separate selected faces | Joining uses the first object's material. Operations are destructive but undoable. |
| Materials | Six presets; color, metalness, roughness, opacity, emission; base color, normal and roughness images; repeat; UV checker | One PBR material per object; PNG/JPEG/WebP images up to 12 MB. No painting, baking or material nodes. |
| UV | Box, planar XZ, cylindrical and per-face projection; independent polygon packing; face/corner selection; move, rotate, scale; flip U/V; UV SVG download | Projection-based tools. Each polygon is treated as an island; no seam-based conformal unwrap or connected-island detection. |
| Files | Editable .morph project; OBJ geometry/UV import/export; uncompressed static GLB/glTF with supported PBR maps; STL import/export | .blend, FBX, USD, compressed glTF, rigs, animations, material extensions and instancing are not guaranteed. glTF multi-material groups are split into separate mesh objects. |
| Recovery | Up to 35 undo entries, redo; IndexedDB local recovery | Device-local, no cloud sync. Browser data clearing removes recovery. Save a .morph file for a portable backup. |
| Rendering | WebGL 2 with PBR, studio illumination, shadows, wire/solid/material views | Compatibility SVG renderer supports geometry editing with simplified lighting, without texture/PBR preview. |

Prototype limits: 250,000 vertices per project, imports up to 80 MB, subdivision of at most 25,000 source faces, whole-mesh bevel of at most 5,000 faces. These are protective caps, not a performance guarantee; browser and GPU capabilities determine practical limits. The compatibility renderer is intended for small scenes.

## 0.2 — precision and production foundations

Priority order:

1. Replace indexed face arrays with an explicit half-edge topology layer, stable component IDs and adjacency caches. Implement validation for degenerate polygons, non-manifold edges, winding, and self-intersections.
2. Introduce transactional commands and delta-based undo, preserving stable component selection and UV corner data after topology edits.
3. Add interactive selected-edge bevel, edge loops/rings, edge slide, loop cut, bridge, dissolve, knife, proportional editing and modal numeric transforms.
4. Build a non-destructive modifier evaluator: mirror with clipping, array, Catmull–Clark subdivision and robust Boolean operations. Use a worker/WASM geometry backend where benchmarks justify it.
5. Add seam marking, LSCM or ABF conformal unwrap, connected UV islands, pinned UVs, texel-density controls and packing with rotation/margins.
6. Add grid/vertex/edge/face snapping targets, origin and pivot policies, and unit conversion.

Release gates: editing sequences preserve topology and UVs through undo/redo; robust manifold fixtures; no invalid meshes committed by failed operations; tests covering concave and boundary geometry; round-trip checks in Blender and Unreal; baseline latency and memory measurements on published hardware profiles.

## 0.3 — surfaces and scene organization

- Per-face material slots and a reusable material data model.
- Brush texture painting, normal/AO baking, UDIM addressing and texture channel controls.
- Collections, hierarchy, parenting, instances, linked assets and asset previews.
- Editable cameras, lights, HDRI environments and optional path-traced still output.
- Background geometry operations, cancellation, progress, incremental saves and large-scene benchmarks.
- Transform hierarchy and material round-trip test corpus; texture/color-space orientation checks.

Release gates: target browsers and devices tested explicitly; predictable memory budgets; tested recoverability after interrupted saves; consistent texture orientation and color interpretation across export formats.

## 1.0 — complete creative pipeline

- Sculpting, retopology, procedural geometry/material node graphs.
- Timeline, keyframes, constraints, rigs and skinning.
- FBX/USD workflows after evaluation of licensing, browser performance and fidelity.
- Optional authenticated cloud projects, version history, collaboration and conflict resolution.
- Sandboxed extension API, command palette, configurable shortcuts and scripting.
- Full keyboard navigation, assistive-technology support, localization and accessibility audit.

These are prioritized milestones, not dated delivery commitments. Each milestone should be scoped and estimated after its technical spikes and acceptance fixtures are complete.

## Architecture

- React / TypeScript interface built with Vite, using accessible Radix-based UI primitives.
- Three.js 0.186 renderer, controls, raycasting and import/export adapters.
- `src/lib/morph/model.ts`: plain serializable polygon meshes with per-corner UVs and geometry operations.
- `src/lib/morph/viewport.ts`: rendering, camera navigation, picking and transform gestures.
- `src/lib/morph/files.ts`: format adapters, project validation, local recovery and texture handling.
- `src/components/morph/editor.tsx`: scene transactions, history and UI orchestration.
- `src/components/morph/uv-editor.tsx`: UV editing surface.
- `tests/`: topology invariants, triangulation orientation, UV preservation and file round trips.

Projects and imported images are processed in the browser. They are not uploaded to an application server. The application is a static site; the host (for example GitHub Pages) only serves its files.

## Next engineering tasks

- [ ] Run a physical GPU/browser acceptance matrix for the PBR path.
- [ ] Add representative Blender/Unreal import/export fixtures, including negative scales, texture orientation, normal maps and material groups.
- [ ] Stabilize vertex identity and seams when importing coincident but disconnected vertices.
- [ ] Bound history by bytes and replace full snapshots with mesh deltas.
- [ ] Preserve multiple materials when joining meshes.
- [ ] Add worker-based cancellation and feedback for heavy geometry operations.
- [ ] Harden interaction support for touch, keyboard-only use and 200% text scaling.
- [ ] Decide which advanced geometry kernel and unwrap library meet quality and licensing needs before committing to integration.
