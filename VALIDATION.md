# Prototype 0.1 validation

Verified 26–27 September 2026.

- 16 automated tests pass: primitive topology and winding, region extrusion, inset, bevel, subdivision, loop slice, UV packing, project validation, OBJ round-trip, and GLB/glTF/STL round-trips.
- Export tests exercise the application's actual exporters and importers. Geometry bounds are preserved across GLB, embedded glTF and STL; tested GLB/glTF material values survive the round-trip. They use browser API adapters in Node and untextured fixtures.
- TypeScript static checks pass.
- Production build passes.
- Browser interactions verified: object numeric transforms, undo, polygon picking and extrusion, material presets, UV face packing and dragging, and importing the generated GLB through the file chooser.

## Verification limits

The test browser has no WebGL support. Browser QA therefore exercised the SVG compatibility viewport, which supports modeling with simplified lighting. Full WebGL lighting, texture preview and PBR appearance still require testing on hardware-accelerated browsers. Texture file round-trips, touch interaction and large production assets were not exhaustively tested.

The automation browser did not expose completed file-download events. The export code was exercised and the generated file content verified directly, but download delivery to a user's disk was not verified end-to-end in this environment.

WebMCP registration is feature-detected. The test browser did not expose the required API, so tool execution remains unverified.

See public/ROADMAP.md for scope limits and the next engineering milestones. This is a prototype, not full Blender feature parity.
