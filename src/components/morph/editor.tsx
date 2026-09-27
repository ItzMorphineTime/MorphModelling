"use client";
import { useEffect, useRef, useState, useCallback, type ReactNode } from "react";
import {
  Box,
  MousePointer2,
  Move,
  RotateCw,
  Scaling,
  Layers,
  Grid2X2,
  Magnet,
  Plus,
  Eye,
  EyeOff,
  ChevronDown,
  Undo2,
  Redo2,
  Download,
  Upload,
  Save,
  FolderOpen,
  Trash2,
  Copy,
  Maximize2,
  Focus,
  Wrench,
  Paintbrush,
  Check,
  HelpCircle,
  Map,
  PanelRightClose,
  PanelRightOpen,
  Diamond,
  CircleDot,
  Waypoints,
  Square,
  Triangle,
  Circle,
  Scissors,
  Sun,
  ArrowUpRight,
  FilePlus2,
  Link2,
  Unlink,
  Scan,
  Search,
  Folder,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Toaster, toast } from "sonner";
import * as THREE from "three";
import {
  applyMatrix,
  arr,
  bevel,
  clone,
  compact,
  deleteFaces,
  edges,
  extrude,
  fillFace,
  inset,
  joinObjects,
  materialPresets,
  matrix,
  mergeSelected,
  object,
  packUV,
  projectUV,
  selectedFaces,
  selectedVertices,
  sliceMesh,
  starterProject,
  subdivide,
  triangulate,
  uid,
  vec,
  weld,
  type ElementMode,
  type MaterialData,
  type ModelObject,
  type Project,
  type V3,
} from "@/lib/morph/model";
import { autosave, exportModel, importFiles, recover, saveProject, svgUV } from "@/lib/morph/files";
import { brand } from "@/lib/morph/theme";
import { Viewport, type ViewState } from "@/lib/morph/viewport";
import UVEditor from "./uv-editor";
import { phases, HelpContent } from "./roadmap";
import monogramUrl from "@/assets/brand/morph-monogram-dark.svg";
import wordmarkUrl from "@/assets/brand/morph-wordmark-dark.svg";
import "./editor.css";
const primitives = ["Cube", "Sphere", "Cylinder", "Cone", "Torus", "Plane", "Icosphere"];
const iconFor = (name: string) =>
  name.includes("Sphere") ? Circle : name === "Plane" ? Square : name === "Cone" ? Triangle : Box;
function IconButton({
  label,
  children,
  onClick,
  active = false,
  disabled = false,
}: {
  label: string;
  children: ReactNode;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={`icon-button ${active ? "active" : ""}`}
          aria-label={label}
          disabled={disabled}
          onClick={onClick}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}
function Choice({
  value,
  onChange,
  items,
  label,
}: {
  value: string;
  onChange: (s: string) => void;
  items: { value: string; label: string }[];
  label: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label} size="sm" className="morph-select">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((i) => (
          <SelectItem value={i.value} key={i.value}>
            {i.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
function NumberField({
  value,
  onChange,
  label,
  step = 0.1,
  min,
  max,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
  step?: number;
  min?: number;
  max?: number;
}) {
  const [text, setText] = useState(String(Number(value.toFixed(3))));
  useEffect(() => setText(String(Number(value.toFixed(3)))), [value]);
  return (
    <input
      className="number-field"
      type="number"
      aria-label={label}
      value={text}
      step={step}
      min={min}
      max={max}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        const n = Number(text);
        if (Number.isFinite(n) && text.trim())
          onChange(Math.max(min ?? -1e7, Math.min(max ?? 1e7, n)));
        else setText(String(value));
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
    />
  );
}
function Range({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return (
    <label className="range-field">
      <span>
        {label}
        <b>{v.toFixed(2)}</b>
      </span>
      <Slider
        value={[v]}
        min={0}
        max={1}
        step={0.01}
        onValueChange={([n]) => setV(n)}
        onValueCommit={([n]) => onChange(n)}
        aria-label={label}
      />
    </label>
  );
}
export default function Editor() {
  const [project, setProject] = useState<Project>(() => starterProject()),
    [selected, setSelected] = useState<string[]>([]),
    [mode, setMode] = useState<"object" | "edit">("object"),
    [element, setElement] = useState<ElementMode>("face"),
    [selection, setSelection] = useState<number[]>([]),
    [tool, setTool] = useState<ViewState["tool"]>("select"),
    [workspace, setWorkspace] = useState("modeling"),
    [inspector, setInspector] = useState("object"),
    [snap, setSnap] = useState(false),
    [space, setSpace] = useState<"world" | "local">("world"),
    [shading, setShading] = useState<ViewState["shading"]>("material"),
    [grid, setGrid] = useState(true),
    [wire, setWire] = useState(false),
    [xray, setXray] = useState(false),
    [panel, setPanel] = useState(true),
    [shelf, setShelf] = useState(true),
    [dialog, setDialog] = useState<string | null>(null),
    [newType, setNewType] = useState<string | null>(null),
    [exportFormat, setExportFormat] = useState("glb"),
    [exportSelected, setExportSelected] = useState(false),
    [busy, setBusy] = useState(false),
    [ready, setReady] = useState(false),
    [webglError, setWebglError] = useState(""),
    [software, setSoftware] = useState(false),
    [saveStatus, setSaveStatus] = useState("Local project"),
    [viewName, setViewName] = useState("User perspective"),
    [, setHistoryTick] = useState(0),
    [operationValue, setOperationValue] = useState(0.25),
    [sliceAxis, setSliceAxis] = useState("x"),
    [slicePosition, setSlicePosition] = useState(0),
    [filter, setFilter] = useState("");
  const canvasHost = useRef<HTMLDivElement>(null),
    viewport = useRef<Viewport | null>(null),
    fileInput = useRef<HTMLInputElement>(null),
    textureInput = useRef<HTMLInputElement>(null),
    textureSlot = useRef<"texture" | "normalMap" | "roughnessMap">("texture"),
    history = useRef<{
      past: { p: Project; label: string }[];
      future: { p: Project; label: string }[];
    }>({ past: [], future: [] }),
    projectRef = useRef(project),
    stateRef = useRef<ViewState>({
      project,
      selected,
      mode,
      element,
      selection,
      tool,
      snap,
      space,
      shading,
      grid,
      wire,
      xray,
    });
  projectRef.current = project;
  stateRef.current = {
    project,
    selected,
    mode,
    element,
    selection,
    tool,
    snap,
    space,
    shading,
    grid,
    wire,
    xray,
  };
  const active = project.objects.find((o) => o.id === selected[0]),
    totalVertices = project.objects.reduce((s, o) => s + o.mesh.vertices.length, 0),
    totalFaces = project.objects.reduce((s, o) => s + o.mesh.faces.length, 0),
    lastAction = history.current.past.at(-1)?.label ?? "Ready";
  const commit = useCallback((label: string, fn: (p: Project) => void) => {
    const before = projectRef.current,
      next = clone(before);
    try {
      fn(next);
      if (next.objects.reduce((s, o) => s + o.mesh.vertices.length, 0) > 250000)
        throw new Error("Prototype limit: 250,000 vertices. Try a smaller mesh.");
      if (JSON.stringify(next) === JSON.stringify(before)) return false;
      history.current.past.push({ p: before, label });
      if (history.current.past.length > 35) history.current.past.shift();
      history.current.future = [];
      projectRef.current = next;
      setProject(next);
      setHistoryTick((t) => t + 1);
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "The operation could not be completed.");
      return false;
    }
  }, []);
  const replaceObject = useCallback(
    (o: ModelObject, label: string) => {
      commit(label, (p) => {
        p.objects = p.objects.map((x) => (x.id === o.id ? o : x));
      });
    },
    [commit],
  );
  const undo = useCallback(() => {
    const item = history.current.past.pop();
    if (!item) return;
    history.current.future.push({ p: projectRef.current, label: item.label });
    projectRef.current = item.p;
    setProject(item.p);
    setSelection([]);
    setSelected((s) => s.filter((id) => item.p.objects.some((o) => o.id === id)));
    setHistoryTick((n) => n + 1);
    toast("Undo: " + item.label);
  }, []);
  const redo = useCallback(() => {
    const item = history.current.future.pop();
    if (!item) return;
    history.current.past.push({ p: projectRef.current, label: item.label });
    projectRef.current = item.p;
    setProject(item.p);
    setSelection([]);
    setHistoryTick((n) => n + 1);
    toast("Redo: " + item.label);
  }, []);
  useEffect(() => {
    if (window.innerWidth <= 720) setPanel(false);
    let canceled = false;
    recover()
      .then((p) => {
        if (canceled) return;
        if (p) {
          projectRef.current = p;
          setProject(p);
          setSelected(p.objects[0] ? [p.objects[0].id] : []);
          toast("Recovered your local project");
        } else setSelected([projectRef.current.objects[0].id]);
        setReady(true);
      })
      .catch(() => {
        if (!canceled) {
          setReady(true);
          setSelected([projectRef.current.objects[0].id]);
          setSaveStatus("Recovery unavailable");
        }
      });
    return () => {
      canceled = true;
    };
  }, []);
  useEffect(() => {
    if (!ready) return;
    setSaveStatus("Saving locally…");
    const t = setTimeout(
      () =>
        autosave(project)
          .then(() => setSaveStatus("Saved on this device"))
          .catch(() => {
            setSaveStatus("Save a project file");
            toast.error(
              "Local recovery is unavailable. Download a Morph project to keep your work.",
            );
          }),
      800,
    );
    return () => clearTimeout(t);
  }, [project, ready]);
  useEffect(() => {
    if (!canvasHost.current) return;
    try {
      const v = new Viewport(
        canvasHost.current,
        (id, part, add) => {
          const s = stateRef.current;
          if (s.mode === "edit")
            setSelection((old) =>
              part === null
                ? add
                  ? old
                  : []
                : add
                  ? old.includes(part)
                    ? old.filter((i) => i !== part)
                    : [...old, part]
                  : [part],
            );
          else {
            setSelected((old) =>
              id === null
                ? []
                : add
                  ? old.includes(id)
                    ? old.filter((i) => i !== id)
                    : [...old, id]
                  : [id],
            );
            setSelection([]);
          }
        },
        (objects) => {
          commit(
            "Transform " + (stateRef.current.mode === "edit" ? "components" : "objects"),
            (p) => {
              p.objects = p.objects.map((o) => objects.find((x) => x.id === o.id) ?? o);
            },
          );
        },
        setViewName,
      );
      viewport.current = v;
      setSoftware(v.software);
      setWebglError("");
      v.update(stateRef.current);
      return () => {
        v.dispose();
        viewport.current = null;
      };
    } catch (e) {
      console.error("Viewport initialization failed", e);
      setWebglError(
        "The viewport could not start. Reload the page to try again; your local project is preserved.",
      );
    }
  }, [commit]);
  useEffect(() => {
    viewport.current?.update(stateRef.current);
  }, [project, selected, mode, element, selection, tool, snap, space, shading, grid, wire, xray]);
  function addPrimitive(kind: string) {
    const o = object(kind);
    o.name =
      kind +
      (projectRef.current.objects.some((o) => o.name === kind)
        ? " " + (projectRef.current.objects.length + 1)
        : "");
    if (commit("Add " + kind, (p) => p.objects.push(o))) {
      setSelected([o.id]);
      setSelection([]);
      setMode("object");
      toast(kind + " added");
    }
  }
  function changeMode(value: string) {
    if (value === "edit" && !active) {
      toast("Select a mesh first");
      return;
    }
    setMode(value as "object" | "edit");
    setSelection([]);
    setTool("select");
  }
  function duplicate() {
    if (!selected.length) return;
    const copies = project.objects
      .filter((o) => selected.includes(o.id))
      .map((o) => ({
        ...clone(o),
        id: uid(),
        name: o.name + " copy",
        position: [o.position[0] + 0.6, o.position[1], o.position[2] + 0.6] as V3,
      }));
    if (commit("Duplicate objects", (p) => p.objects.push(...copies))) {
      setSelected(copies.map((o) => o.id));
      setMode("object");
      setSelection([]);
    }
  }
  function remove() {
    if (mode === "object") {
      commit("Delete objects", (p) => {
        p.objects = p.objects.filter((o) => !selected.includes(o.id));
      });
      setSelected([]);
    } else if (active) {
      if (!selection.length) {
        toast("Select components to delete");
        return;
      }
      commit("Delete components", (p) => {
        const o = p.objects.find((o) => o.id === active.id)!;
        let fs = selection;
        if (element !== "face") {
          const vs = new Set(selectedVertices(o.mesh, element, selection));
          fs = o.mesh.faces.flatMap((f, i) => (f.some((v) => vs.has(v)) ? [i] : []));
        }
        deleteFaces(o.mesh, fs);
      });
      setSelection([]);
    }
  }
  function selectAll() {
    if (mode === "object") setSelected(project.objects.filter((o) => o.visible).map((o) => o.id));
    else if (active)
      setSelection(
        (element === "face"
          ? active.mesh.faces
          : element === "edge"
            ? edges(active.mesh)
            : active.mesh.vertices
        ).map((_, i) => i),
      );
  }
  function op(name: string) {
    if (!active) {
      toast("Select a mesh first");
      return;
    }
    let result: number[] = [];
    const ok = commit(name, (p) => {
      const o = p.objects.find((o) => o.id === active.id)!,
        m = o.mesh,
        fs = selectedFaces(m, element, selection);
      switch (name) {
        case "Extrude":
          result = extrude(m, fs, operationValue);
          break;
        case "Inset":
          result = inset(m, fs, Math.min(0.9, Math.abs(operationValue)));
          break;
        case "Bevel all edges":
          o.mesh = bevel(m, Math.min(0.45, Math.abs(operationValue)));
          break;
        case "Subdivide":
          subdivide(m);
          break;
        case "Loop slice":
          sliceMesh(m, ["x", "y", "z"].indexOf(sliceAxis), slicePosition);
          break;
        case "Merge by distance":
          weld(m, 0.001);
          break;
        case "Merge selected":
          mergeSelected(m, selectedVertices(m, element, selection));
          break;
        case "Fill selected":
          fillFace(m, selectedVertices(m, element, selection));
          break;
        case "Triangulate":
          triangulate(m);
          break;
        case "Flip normals": {
          const ids = mode === "edit" && fs.length ? fs : m.faces.map((_, i) => i);
          ids.forEach((i) => {
            m.faces[i].reverse();
            m.uvs[i].reverse();
          });
          break;
        }
        case "Mirror X":
        case "Mirror Y":
        case "Mirror Z": {
          const a = name.endsWith("X") ? 0 : name.endsWith("Y") ? 1 : 2;
          m.vertices.forEach((v) => (v[a] *= -1));
          m.faces.forEach((f) => f.reverse());
          m.uvs.forEach((f) => f.reverse());
          break;
        }
        case "Apply transforms":
          applyMatrix(m, matrix(o));
          o.position = [0, 0, 0];
          o.rotation = [0, 0, 0];
          o.scale = [1, 1, 1];
          break;
        case "Center origin": {
          const c = new THREE.Box3()
              .setFromPoints(m.vertices.map(vec))
              .getCenter(new THREE.Vector3()),
            world = c.clone().applyMatrix4(matrix(o));
          m.vertices = m.vertices.map((v) => arr(vec(v).sub(c)));
          o.position = arr(world);
          break;
        }
        default:
          throw new Error("Unknown operation");
      }
    });
    if (ok) {
      setSelection(result);
      if (result.length) {
        setElement("face");
        setMode("edit");
      }
    }
  }
  function join() {
    if (selected.length < 2) {
      toast("Select at least two objects");
      return;
    }
    const o = joinObjects(project.objects.filter((o) => selected.includes(o.id)));
    commit("Join objects", (p) => {
      p.objects = p.objects.filter((o) => !selected.includes(o.id));
      p.objects.push(o);
    });
    setSelected([o.id]);
    setMode("object");
    toast("Objects joined using the first object’s material");
  }
  function separate() {
    if (!active || mode !== "edit") return;
    const ids = selectedFaces(active.mesh, element, selection);
    if (!ids.length) {
      toast("Select faces to separate");
      return;
    }
    const o = clone(active);
    o.id = uid();
    o.name += " separated";
    o.mesh.faces = ids.map((i) => o.mesh.faces[i]);
    o.mesh.uvs = ids.map((i) => o.mesh.uvs[i]);
    compact(o.mesh);
    commit("Separate selected faces", (p) => {
      deleteFaces(p.objects.find((x) => x.id === active.id)!.mesh, ids);
      p.objects.push(o);
    });
    setSelected([o.id]);
    setSelection([]);
    setMode("object");
  }
  function materialPatch(patch: Partial<MaterialData>) {
    if (!active) return;
    commit("Update material", (p) =>
      p.objects
        .filter((o) => selected.includes(o.id))
        .forEach((o) => Object.assign(o.material, patch)),
    );
  }
  function applyPreset(mat: MaterialData) {
    if (!selected.length) {
      toast("Select an object to apply this material");
      return;
    }
    commit("Apply " + mat.name, (p) =>
      p.objects.filter((o) => selected.includes(o.id)).forEach((o) => (o.material = clone(mat))),
    );
    toast(mat.name + " applied");
  }
  function uvOperation(kind: string) {
    if (!active) return;
    commit(kind, (p) => {
      const m = p.objects.find((o) => o.id === active.id)!.mesh;
      if (["box", "planar", "cylinder", "face"].includes(kind)) projectUV(m, kind as "box");
      else if (kind === "Pack faces") packUV(m);
      else
        m.uvs.forEach((f) =>
          f.forEach((uv) => {
            if (kind === "Flip U") uv[0] = 1 - uv[0];
            if (kind === "Flip V") uv[1] = 1 - uv[1];
            if (kind === "Rotate 90°") {
              const u = uv[0];
              uv[0] = 1 - uv[1];
              uv[1] = u;
            }
          }),
        );
    });
  }
  async function load(files: File[]) {
    setBusy(true);
    try {
      const result = await importFiles(files);
      if (result.project) {
        const p = result.project;
        if (commit("Open project", (old) => Object.assign(old, p))) {
          setSelected(p.objects[0] ? [p.objects[0].id] : []);
          toast("Opened " + p.name);
        }
      } else if (result.objects) {
        const objects = result.objects.map((o) => ({ ...o, id: uid() }));
        if (commit("Import meshes", (p) => p.objects.push(...objects))) {
          setSelected(objects.map((o) => o.id));
          toast.success(result.note ?? "Model imported");
          setTimeout(() => viewport.current?.frame(), 150);
        }
      }
      setSelection([]);
      setMode("object");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }
  async function loadTexture(file?: File) {
    if (!file || !active) return;
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 12 * 1024 * 1024
    ) {
      toast.error("Use a PNG, JPEG or WebP image under 12 MB.");
      return;
    }
    const targetIds = [...selected],
      slot = textureSlot.current,
      reader = new FileReader();
    reader.onload = () => {
      commit("Assign texture", (p) =>
        p.objects
          .filter((o) => targetIds.includes(o.id))
          .forEach((o) =>
            Object.assign(o.material, { [slot]: reader.result as string, checker: false }),
          ),
      );
      toast("Texture applied");
    };
    reader.onerror = () => toast.error("Could not read this texture.");
    reader.readAsDataURL(file);
    if (textureInput.current) textureInput.current.value = "";
  }
  function screenshot() {
    const url = viewport.current?.screenshot();
    if (url) {
      const a = document.createElement("a");
      a.href = url;
      a.download = project.name + "_viewport." + (url.startsWith("data:image/svg") ? "svg" : "png");
      a.click();
    }
  }
  const actionsRef = useRef({ addPrimitive, selectAll, remove, duplicate, op, changeMode });
  actionsRef.current = { addPrimitive, selectAll, remove, duplicate, op, changeMode };
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.closest(
          'input,textarea,[role="dialog"],[role="menu"],[role="listbox"],[contenteditable="true"]',
        )
      )
        return;
      const ctrl = e.ctrlKey || e.metaKey,
        k = e.key.toLowerCase();
      if (ctrl && k === "s") {
        e.preventDefault();
        saveProject(projectRef.current);
        toast("Project downloaded");
        return;
      }
      if (ctrl && k === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (ctrl && k === "y") {
        e.preventDefault();
        redo();
        return;
      }
      if (ctrl && k === "o") {
        e.preventDefault();
        fileInput.current?.click();
        return;
      }
      if (e.key === "Tab") {
        e.preventDefault();
        actionsRef.current.changeMode(stateRef.current.mode === "object" ? "edit" : "object");
        return;
      }
      if (e.shiftKey && k === "d") {
        e.preventDefault();
        actionsRef.current.duplicate();
        return;
      }
      if (ctrl || e.altKey) return;
      const s = stateRef.current;
      if (k === "a") {
        e.preventDefault();
        actionsRef.current.selectAll();
      }
      if (k === "delete" || k === "backspace") {
        e.preventDefault();
        actionsRef.current.remove();
      }
      if (k === "g") setTool("translate");
      if (k === "r") setTool("rotate");
      if (k === "s") setTool("scale");
      if (k === "q") setTool("select");
      if (k === "escape") {
        setSelection([]);
        setTool("select");
      }
      if (k === "f") {
        e.preventDefault();
        viewport.current?.frame();
      }
      if (k === "home") {
        e.preventDefault();
        viewport.current?.frame(true);
      }
      if (s.mode === "edit") {
        if (k === "1") {
          setElement("vertex");
          setSelection([]);
        }
        if (k === "2") {
          setElement("edge");
          setSelection([]);
        }
        if (k === "3") {
          setElement("face");
          setSelection([]);
        }
        if (k === "e") actionsRef.current.op("Extrude");
        if (k === "i") actionsRef.current.op("Inset");
      }
      if (e.code === "Numpad1") viewport.current?.view("front");
      if (e.code === "Numpad3") viewport.current?.view("right");
      if (e.code === "Numpad7") viewport.current?.view("top");
      if (e.code === "Numpad5") viewport.current?.toggleProjection();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [undo, redo]);
  useEffect(() => {
    const context = (
      document as Document & {
        modelContext?: { registerTool: (tool: unknown, options: unknown) => Promise<void> };
      }
    ).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController(),
      register = (tool: unknown) => {
        try {
          void Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(
            () => {},
          );
        } catch {
          // WebMCP is optional; the editor works without it.
        }
      };
    register({
      name: "inspect_morph_scene",
      description: "Read names, transforms and topology counts in the open Morph project.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: () => ({
        name: projectRef.current.name,
        objects: projectRef.current.objects.map((o) => ({
          id: o.id,
          name: o.name,
          vertices: o.mesh.vertices.length,
          faces: o.mesh.faces.length,
          position: o.position,
          material: o.material.name,
        })),
      }),
    });
    register({
      name: "add_morph_primitive",
      description: "Create and select a mesh primitive in the open Morph project.",
      inputSchema: {
        type: "object",
        properties: { primitive: { type: "string", enum: primitives } },
        required: ["primitive"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false },
      execute: async (input: unknown) => {
        const kind = (input as { primitive: string })?.primitive;
        if (!primitives.includes(kind)) throw new Error("Unsupported primitive");
        actionsRef.current.addPrimitive(kind);
        await new Promise((resolve) => requestAnimationFrame(resolve));
        return { id: projectRef.current.objects.at(-1)?.id, primitive: kind };
      },
    });
    return () => lifecycle.abort();
  }, []);
  const editOnly = mode !== "edit" || !selection.length;
  return (
    <TooltipProvider delayDuration={350}>
      <main
        className="morph-app"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (e.dataTransfer.files.length) void load(Array.from(e.dataTransfer.files));
        }}
      >
        <header className="topbar">
          <div className="brand">
            <img className="brand-wordmark" src={wordmarkUrl} alt="Morph" />
            <img className="brand-monogram" src={monogramUrl} alt="Morph" />
            <span className="brand-product">Modeling</span>
            <span className="version">0.1</span>
          </div>
          <nav className="main-menu" aria-label="Application menus">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button>File</button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => setNewType("blank")}>
                  <FilePlus2 />
                  New project
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => fileInput.current?.click()}>
                  <FolderOpen />
                  Open / import…<kbd>Ctrl O</kbd>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    saveProject(project);
                    toast("Project downloaded");
                  }}
                >
                  <Save />
                  Save project<kbd>Ctrl S</kbd>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setDialog("export")}>
                  <Download />
                  Export model…
                </DropdownMenuItem>
                <DropdownMenuItem onClick={screenshot}>
                  <Sun />
                  Save viewport image
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setNewType("demo")}>
                  Load form study
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button>Edit</button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem disabled={!history.current.past.length} onClick={undo}>
                  <Undo2 />
                  Undo
                </DropdownMenuItem>
                <DropdownMenuItem disabled={!history.current.future.length} onClick={redo}>
                  <Redo2 />
                  Redo
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={duplicate} disabled={!active}>
                  <Copy />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem onClick={join} disabled={selected.length < 2}>
                  <Link2 />
                  Join selected
                </DropdownMenuItem>
                <DropdownMenuItem onClick={separate} disabled={editOnly}>
                  <Unlink />
                  Separate faces
                </DropdownMenuItem>
                <DropdownMenuItem onClick={remove} disabled={!active}>
                  <Trash2 />
                  Delete selected
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button>Add</button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {primitives.map((p) => {
                  const I = iconFor(p);
                  return (
                    <DropdownMenuItem key={p} onClick={() => addPrimitive(p)}>
                      <I />
                      {p}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button>View</button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {["perspective", "front", "right", "top", "back", "left"].map((v) => (
                  <DropdownMenuItem key={v} onClick={() => viewport.current?.view(v)}>
                    {v[0].toUpperCase() + v.slice(1)}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => viewport.current?.toggleProjection()}>
                  Toggle orthographic
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => viewport.current?.frame(true)}>
                  Frame all
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setGrid((x) => !x)}>
                  Toggle floor grid
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShelf((x) => !x)}>
                  Toggle material library
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
          <div className="project-title">
            <span className="project-dot" />
            <input
              aria-label="Project name"
              value={project.name}
              onChange={(e) => {
                const name = e.target.value;
                commit("Rename project", (p) => (p.name = name));
              }}
              spellCheck={false}
            />
            <span className="local-badge">LOCAL</span>
          </div>
          <div className="header-actions">
            <button className="roadmap-button" onClick={() => setDialog("roadmap")}>
              <Map size={15} />
              Roadmap
            </button>
            <IconButton label="Help & shortcuts" onClick={() => setDialog("help")}>
              <HelpCircle size={18} />
            </IconButton>
            <button className="export-button" onClick={() => setDialog("export")}>
              Export
              <ArrowUpRight size={16} />
            </button>
          </div>
        </header>
        <div className="workspace-bar">
          <Tabs
            value={workspace}
            onValueChange={(v) => {
              setWorkspace(v);
              setInspector(v === "materials" ? "material" : v === "uv" ? "uv" : "object");
            }}
          >
            <TabsList className="workspace-tabs" variant="line">
              <TabsTrigger value="modeling">
                <Box />
                Modeling
              </TabsTrigger>
              <TabsTrigger value="materials">
                <Paintbrush />
                Materials
              </TabsTrigger>
              <TabsTrigger value="uv">
                <Grid2X2 />
                UV Editing
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <span className="workspace-spacer" />
          <div className="undo-group">
            <IconButton
              label="Undo (Ctrl Z)"
              disabled={!history.current.past.length}
              onClick={undo}
            >
              <Undo2 size={17} />
            </IconButton>
            <IconButton
              label="Redo (Ctrl Shift Z)"
              disabled={!history.current.future.length}
              onClick={redo}
            >
              <Redo2 size={17} />
            </IconButton>
          </div>
          <span className="save-state">
            <Check size={13} />
            {saveStatus}
          </span>
          <IconButton
            label={panel ? "Hide properties" : "Show properties"}
            onClick={() => setPanel((p) => !p)}
          >
            {panel ? <PanelRightClose size={17} /> : <PanelRightOpen size={17} />}
          </IconButton>
        </div>
        <div className={"editor-layout " + (!panel ? "no-panel" : "")}>
          <section className="working-area">
            <div className="viewport-toolbar">
              <Choice
                label="Editing mode"
                value={mode}
                onChange={changeMode}
                items={[
                  { value: "object", label: "Object Mode" },
                  { value: "edit", label: "Edit Mode" },
                ]}
              />
              {mode === "edit" && (
                <div className="component-switch">
                  {[
                    { id: "vertex", icon: CircleDot, label: "Vertex selection (1)" },
                    { id: "edge", icon: Waypoints, label: "Edge selection (2)" },
                    { id: "face", icon: Square, label: "Face selection (3)" },
                  ].map(({ id, icon: I, label }) => (
                    <IconButton
                      key={id}
                      label={label}
                      active={element === id}
                      onClick={() => {
                        setElement(id as ElementMode);
                        setSelection([]);
                      }}
                    >
                      <I size={15} />
                    </IconButton>
                  ))}
                </div>
              )}
              <div className="toolbar-divider" />
              <Choice
                label="Transform space"
                value={space}
                onChange={(s) => setSpace(s as "world" | "local")}
                items={[
                  { value: "world", label: "Global" },
                  { value: "local", label: "Local" },
                ]}
              />
              <IconButton
                label="Snap: 0.25 m / 15° / 0.1 scale"
                active={snap}
                onClick={() => setSnap((x) => !x)}
              >
                <Magnet size={16} />
              </IconButton>
              <span className="grow" />
              <IconButton label="X-ray selection" active={xray} onClick={() => setXray((x) => !x)}>
                <Scan size={16} />
              </IconButton>
              <IconButton
                label="Mesh edges overlay"
                active={wire}
                onClick={() => setWire((x) => !x)}
              >
                <Diamond size={16} />
              </IconButton>
              <IconButton label="Floor grid" active={grid} onClick={() => setGrid((x) => !x)}>
                <Grid2X2 size={16} />
              </IconButton>
              <div className="toolbar-divider" />
              <Choice
                label="Viewport shading"
                value={shading}
                onChange={(s) => setShading(s as ViewState["shading"])}
                items={[
                  { value: "material", label: "Material" },
                  { value: "solid", label: "Solid" },
                  { value: "wireframe", label: "Wireframe" },
                ]}
              />
            </div>
            <div className={"canvas-row " + (workspace === "uv" ? "split-uv" : "")}>
              {workspace === "uv" && <UVEditor object={active} onChange={replaceObject} />}
              <div className="viewport-wrap">
                <div className="viewport-canvas" ref={canvasHost} />
                <div className="viewport-label">
                  <strong>{viewName}</strong>
                  <span>
                    {active?.name ?? "Scene collection"}
                    {mode === "edit" ? " · " + element + " select" : ""}
                  </span>
                </div>
                <div className="tool-rail">
                  {[
                    { id: "select", label: "Select (Q)", icon: MousePointer2 },
                    { id: "translate", label: "Move (G)", icon: Move },
                    { id: "rotate", label: "Rotate (R)", icon: RotateCw },
                    { id: "scale", label: "Scale (S)", icon: Scaling },
                  ].map(({ id, label, icon: I }) => (
                    <IconButton
                      key={id}
                      label={label}
                      active={tool === id}
                      onClick={() => setTool(id as ViewState["tool"])}
                    >
                      <I size={21} />
                    </IconButton>
                  ))}
                  <div className="rail-line" />
                  {mode === "edit" ? (
                    <>
                      <IconButton
                        label="Extrude selected faces (E)"
                        disabled={editOnly}
                        onClick={() => op("Extrude")}
                      >
                        <ArrowUpRight size={20} />
                      </IconButton>
                      <IconButton
                        label="Inset selected faces (I)"
                        disabled={editOnly}
                        onClick={() => op("Inset")}
                      >
                        <Square size={19} />
                      </IconButton>
                      <IconButton
                        label="Subdivide mesh"
                        disabled={!active}
                        onClick={() => op("Subdivide")}
                      >
                        <Grid2X2 size={20} />
                      </IconButton>
                      <IconButton
                        label="Bevel all edges"
                        disabled={!active}
                        onClick={() => op("Bevel all edges")}
                      >
                        <Diamond size={20} />
                      </IconButton>
                    </>
                  ) : (
                    <>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="icon-button" aria-label="Add primitive">
                            <Plus size={22} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent side="right">
                          {primitives.map((p) => (
                            <DropdownMenuItem key={p} onClick={() => addPrimitive(p)}>
                              {p}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <IconButton
                        label="Duplicate (Shift D)"
                        disabled={!active}
                        onClick={duplicate}
                      >
                        <Copy size={19} />
                      </IconButton>
                    </>
                  )}
                  <div className="rail-line" />
                  <IconButton label="Frame selected (F)" onClick={() => viewport.current?.frame()}>
                    <Focus size={20} />
                  </IconButton>
                </div>
                <div className="axis-gizmo" aria-label="View orientation">
                  <button
                    className="axis-y"
                    onClick={() => viewport.current?.view("top")}
                    title="Top view"
                  >
                    Y
                  </button>
                  <button
                    className="axis-x"
                    onClick={() => viewport.current?.view("right")}
                    title="Right view"
                  >
                    X
                  </button>
                  <button
                    className="axis-z"
                    onClick={() => viewport.current?.view("front")}
                    title="Front view"
                  >
                    Z
                  </button>
                  <button
                    className="axis-center"
                    aria-label="Perspective view"
                    onClick={() => viewport.current?.view("perspective")}
                  />
                </div>
                <div className="view-controls">
                  <IconButton
                    label="Toggle perspective / orthographic"
                    onClick={() => viewport.current?.toggleProjection()}
                  >
                    <Box size={16} />
                  </IconButton>
                  <IconButton
                    label="Frame all (Home)"
                    onClick={() => viewport.current?.frame(true)}
                  >
                    <Maximize2 size={16} />
                  </IconButton>
                </div>
                <div className="viewport-caption">
                  <span className="small-cross">+</span>
                  <span>
                    <strong>
                      {mode === "edit"
                        ? `${selection.length} ${element}${selection.length === 1 ? "" : "s"} selected`
                        : `${selected.length} object${selected.length === 1 ? "" : "s"} selected`}
                    </strong>
                    <small>
                      {active
                        ? `${active.mesh.vertices.length.toLocaleString()} vertices · ${active.mesh.faces.length.toLocaleString()} faces`
                        : "Select an object to begin"}
                    </small>
                  </span>
                </div>
                <div className="viewport-unit">
                  METERS <span>·</span> Y UP
                </div>
                {software && (
                  <div
                    className="software-notice"
                    title="WebGL is unavailable. Modeling works with simplified lighting; texture and PBR previews need hardware acceleration."
                  >
                    Compatibility viewport · simplified materials
                  </div>
                )}
                {webglError && (
                  <div className="viewport-error">
                    <HelpCircle />
                    <p>{webglError}</p>
                  </div>
                )}
                {busy && (
                  <div className="busy-indicator">
                    <span className="spinner" />
                    Processing model…
                  </div>
                )}
              </div>
            </div>
            <div className="viewport-hints">
              <span>
                <MousePointer2 size={13} />
                Drag to orbit<span className="hint-separator">/</span>Scroll to zoom
                <span className="hint-separator">/</span>Right-drag to pan
              </span>
              <span>
                <kbd>Shift</kbd>add to selection<kbd>Tab</kbd>edit mode
              </span>
            </div>
            {shelf && (
              <section className="material-shelf">
                <div className="shelf-heading">
                  <span>
                    <span className="accent-line" />
                    MATERIAL LIBRARY <small>{materialPresets.length} PRESETS</small>
                  </span>
                  <button onClick={() => setInspector("material")}>
                    Material properties
                    <ArrowUpRight size={13} />
                  </button>
                </div>
                <div className="material-presets">
                  {materialPresets.map((mat) => (
                    <button
                      className={"preset " + (active?.material.name === mat.name ? "chosen" : "")}
                      key={mat.name}
                      onClick={() => applyPreset(mat)}
                      title={"Apply " + mat.name}
                    >
                      <span
                        className="material-orb"
                        style={{
                          background: `radial-gradient(circle at 33% 25%, #ffffffaa 0, ${mat.color} 36%, ${brand.black} 94%)`,
                        }}
                      />
                      <span>{mat.name}</span>
                      {active?.material.name === mat.name && (
                        <Check size={12} className="preset-check" />
                      )}
                    </button>
                  ))}
                  <button
                    className="new-material"
                    onClick={() => {
                      setWorkspace("materials");
                      setInspector("material");
                    }}
                  >
                    <Plus size={23} />
                    <span>Custom material</span>
                  </button>
                </div>
              </section>
            )}
          </section>
          {panel && (
            <aside className="properties">
              <section className="outliner">
                <div className="panel-title">
                  <span>
                    <Layers size={15} />
                    SCENE COLLECTION
                  </span>
                  <span className="count-badge">{project.objects.length}</span>
                </div>
                <label className="scene-search">
                  <Search size={14} />
                  <input
                    aria-label="Filter objects"
                    placeholder="Find an object…"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  />
                </label>
                <div className="collection-label">
                  <ChevronDown size={13} />
                  <Folder size={14} />
                  Collection<span>{project.objects.length}</span>
                </div>
                <div className="object-list">
                  {project.objects
                    .filter((o) => o.name.toLowerCase().includes(filter.toLowerCase()))
                    .map((o) => (
                      <div
                        key={o.id}
                        className={"object-row " + (selected.includes(o.id) ? "selected" : "")}
                      >
                        <button
                          onClick={(e) => {
                            setSelected(
                              e.shiftKey
                                ? selected.includes(o.id)
                                  ? selected.filter((id) => id !== o.id)
                                  : [...selected, o.id]
                                : [o.id],
                            );
                            setSelection([]);
                          }}
                          onDoubleClick={() => viewport.current?.frame()}
                        >
                          <Box size={15} />
                          <span>{o.name}</span>
                        </button>
                        <button
                          className="visibility-toggle"
                          aria-label={(o.visible ? "Hide " : "Show ") + o.name}
                          onClick={() =>
                            commit("Toggle visibility", (p) => {
                              p.objects.find((x) => x.id === o.id)!.visible = !o.visible;
                            })
                          }
                        >
                          {o.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                        </button>
                      </div>
                    ))}
                  {!project.objects.length && (
                    <div className="empty-scene">
                      Your scene is empty.
                      <button onClick={() => addPrimitive("Cube")}>Add a cube</button>
                    </div>
                  )}
                </div>
              </section>
              <Tabs value={inspector} onValueChange={setInspector} className="inspector-tabs">
                <TabsList className="property-tabs" variant="line">
                  <TabsTrigger value="object" aria-label="Object properties">
                    <Box size={16} />
                  </TabsTrigger>
                  <TabsTrigger value="mesh" aria-label="Mesh operations">
                    <Wrench size={16} />
                  </TabsTrigger>
                  <TabsTrigger value="material" aria-label="Material properties">
                    <Paintbrush size={16} />
                  </TabsTrigger>
                  <TabsTrigger value="uv" aria-label="UV properties">
                    <Grid2X2 size={16} />
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="inspector-content">
                {!active ? (
                  <div className="no-selection">
                    <MousePointer2 size={25} />
                    <h3>No object selected</h3>
                    <p>Select a mesh in the viewport or add your first primitive.</p>
                    <button className="secondary-button" onClick={() => addPrimitive("Cube")}>
                      <Plus size={15} />
                      Add cube
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="object-heading">
                      <Box size={17} />
                      <input
                        key={active.id + "-" + active.name}
                        aria-label="Object name"
                        defaultValue={active.name}
                        onBlur={(e) => {
                          const name = e.target.value.trim() || "Mesh";
                          commit(
                            "Rename object",
                            (p) => (p.objects.find((o) => o.id === active.id)!.name = name),
                          );
                        }}
                        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                      />
                      <span className="type-tag">MESH</span>
                    </div>
                    {inspector === "object" && (
                      <>
                        <section className="property-section">
                          <h3>
                            <ChevronDown size={13} />
                            Transform<span>LOCAL</span>
                          </h3>
                          {(["position", "rotation", "scale"] as const).map((prop) => (
                            <div className="transform-group" key={prop}>
                              <div className="field-label">
                                {prop === "position"
                                  ? "Location"
                                  : prop === "rotation"
                                    ? "Rotation"
                                    : "Scale"}
                                <span>
                                  {prop === "rotation" ? "°" : prop === "position" ? "m" : ""}
                                </span>
                              </div>
                              <div className="xyz-fields">
                                {["X", "Y", "Z"].map((axis, i) => (
                                  <label
                                    key={axis}
                                    className={"axis-field field-" + axis.toLowerCase()}
                                  >
                                    <span>{axis}</span>
                                    <NumberField
                                      label={`${prop} ${axis}`}
                                      value={active[prop][i]}
                                      step={prop === "rotation" ? 1 : 0.1}
                                      onChange={(v) =>
                                        commit("Change " + prop, (p) => {
                                          p.objects.find((o) => o.id === active.id)![prop][i] =
                                            prop === "scale" && Math.abs(v) < 0.001 ? 0.001 : v;
                                        })
                                      }
                                    />
                                  </label>
                                ))}
                              </div>
                            </div>
                          ))}
                          <button className="wide-subtle" onClick={() => op("Apply transforms")}>
                            <Check size={13} />
                            Apply transforms
                          </button>
                        </section>
                        <section className="property-section">
                          <h3>
                            <ChevronDown size={13} />
                            Mesh data
                          </h3>
                          <div className="mesh-stats">
                            <div>
                              <b>{active.mesh.vertices.length.toLocaleString()}</b>
                              <span>Vertices</span>
                            </div>
                            <div>
                              <b>{edges(active.mesh).length.toLocaleString()}</b>
                              <span>Edges</span>
                            </div>
                            <div>
                              <b>{active.mesh.faces.length.toLocaleString()}</b>
                              <span>Faces</span>
                            </div>
                          </div>
                          <label className="check-field">
                            <Checkbox
                              checked={active.smooth}
                              onCheckedChange={(v) =>
                                commit(
                                  "Shade " + (v ? "smooth" : "flat"),
                                  (p) => (p.objects.find((o) => o.id === active.id)!.smooth = !!v),
                                )
                              }
                            />
                            Smooth shading
                          </label>
                          <button className="wide-subtle" onClick={() => op("Center origin")}>
                            <Focus size={13} />
                            Origin to geometry
                          </button>
                        </section>
                        <section className="property-section">
                          <h3>
                            <ChevronDown size={13} />
                            Quick actions
                          </h3>
                          <div className="operation-grid">
                            <button onClick={duplicate}>
                              <Copy size={14} />
                              Duplicate
                            </button>
                            <button
                              onClick={() => {
                                changeMode(mode === "object" ? "edit" : "object");
                                setInspector("mesh");
                              }}
                            >
                              <Waypoints size={14} />
                              Edit mesh
                            </button>
                            <button onClick={join} disabled={selected.length < 2}>
                              <Link2 size={14} />
                              Join
                            </button>
                            <button onClick={remove}>
                              <Trash2 size={14} />
                              Delete
                            </button>
                          </div>
                        </section>
                        <div className="inspector-note">
                          <kbd>Tab</kbd>
                          <span>Switch between object and mesh editing.</span>
                        </div>
                      </>
                    )}
                    {inspector === "mesh" && (
                      <>
                        <section className="property-section">
                          <h3>
                            <ChevronDown size={13} />
                            Mesh modeling
                          </h3>
                          <label className="inline-field">
                            Extrude distance / inset ratio
                            <NumberField
                              label="Operation amount"
                              value={operationValue}
                              onChange={setOperationValue}
                            />
                          </label>
                          <div className="operation-grid">
                            <button onClick={() => op("Extrude")} disabled={editOnly}>
                              Extrude<kbd>E</kbd>
                            </button>
                            <button onClick={() => op("Inset")} disabled={editOnly}>
                              Inset<kbd>I</kbd>
                            </button>
                            <button onClick={() => op("Bevel all edges")}>Bevel all edges</button>
                            <button onClick={() => op("Subdivide")}>Subdivide</button>
                            <button onClick={() => op("Fill selected")} disabled={editOnly}>
                              Fill selected
                            </button>
                            <button onClick={() => op("Merge selected")} disabled={editOnly}>
                              Merge selected
                            </button>
                            <button onClick={separate} disabled={editOnly}>
                              Separate faces
                            </button>
                            <button onClick={() => op("Triangulate")}>Triangulate</button>
                          </div>
                          <p className="field-help">
                            Extrude and inset use selected faces. Bevel chamfers the whole mesh
                            using the amount as a ratio (max 0.45).
                          </p>
                          {mode === "object" && (
                            <button
                              className="secondary-button full"
                              onClick={() => changeMode("edit")}
                            >
                              Enter Edit Mode<kbd>Tab</kbd>
                            </button>
                          )}
                        </section>
                        <section className="property-section">
                          <h3>
                            <ChevronDown size={13} />
                            Loop slice
                          </h3>
                          <p className="field-help">
                            Insert an axis-aligned cut through the mesh. Position is in object
                            coordinates.
                          </p>
                          <div className="slice-controls">
                            <Choice
                              label="Slice axis"
                              value={sliceAxis}
                              onChange={setSliceAxis}
                              items={["x", "y", "z"].map((v) => ({
                                value: v,
                                label: v.toUpperCase(),
                              }))}
                            />
                            <NumberField
                              label="Slice position"
                              value={slicePosition}
                              onChange={setSlicePosition}
                            />
                            <button className="secondary-button" onClick={() => op("Loop slice")}>
                              <Scissors size={13} />
                              Cut
                            </button>
                          </div>
                        </section>
                        <section className="property-section">
                          <h3>
                            <ChevronDown size={13} />
                            Cleanup & symmetry
                          </h3>
                          <div className="operation-grid">
                            <button onClick={() => op("Merge by distance")}>Weld 0.001 m</button>
                            <button onClick={() => op("Flip normals")}>Flip normals</button>
                            {["X", "Y", "Z"].map((a) => (
                              <button key={a} onClick={() => op("Mirror " + a)}>
                                Mirror {a}
                              </button>
                            ))}
                            <button onClick={remove}>Delete selected</button>
                          </div>
                          <p className="field-help">
                            Operations change the mesh directly. Undo restores the previous
                            geometry.
                          </p>
                        </section>
                      </>
                    )}
                    {inspector === "material" && (
                      <>
                        <section className="property-section">
                          <div className="material-preview">
                            <span
                              className="material-orb large"
                              style={{
                                background: `radial-gradient(circle at 32% 25%, #ffffffbb, ${active.material.color} 38%, ${brand.black} 91%)`,
                              }}
                            />
                            <span>
                              <strong>{active.material.name}</strong>
                              <small>Principled surface</small>
                            </span>
                          </div>
                          <label className="inline-field">
                            Base color
                            <input
                              className="color-field"
                              type="color"
                              aria-label="Base color"
                              value={active.material.color}
                              onChange={(e) =>
                                materialPatch({ color: e.target.value, name: "Custom material" })
                              }
                            />
                            <span className="hex-value">{active.material.color.toUpperCase()}</span>
                          </label>
                          <Range
                            label="Metallic"
                            value={active.material.metalness}
                            onChange={(v) => materialPatch({ metalness: v })}
                          />
                          <Range
                            label="Roughness"
                            value={active.material.roughness}
                            onChange={(v) => materialPatch({ roughness: v })}
                          />
                          <Range
                            label="Opacity"
                            value={active.material.opacity}
                            onChange={(v) => materialPatch({ opacity: v })}
                          />
                          <label className="inline-field">
                            Emission
                            <input
                              className="color-field"
                              type="color"
                              aria-label="Emission color"
                              value={active.material.emissive}
                              onChange={(e) => materialPatch({ emissive: e.target.value })}
                            />
                          </label>
                        </section>
                        <section className="property-section">
                          <h3>
                            <ChevronDown size={13} />
                            Texture maps
                          </h3>
                          {(["texture", "normalMap", "roughnessMap"] as const).map((slot, i) => (
                            <div className="texture-slot" key={slot}>
                              <span>
                                {["Base color", "Normal", "Roughness"][i]}
                                <small>
                                  {active.material[slot] ? "Image assigned" : "No image"}
                                </small>
                              </span>
                              <button
                                className="icon-button"
                                aria-label={"Upload " + slot}
                                onClick={() => {
                                  textureSlot.current = slot;
                                  textureInput.current?.click();
                                }}
                              >
                                <Upload size={15} />
                              </button>
                              {active.material[slot] && (
                                <button
                                  className="icon-button"
                                  aria-label={"Remove " + slot}
                                  onClick={() => materialPatch({ [slot]: undefined })}
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          ))}
                          <label className="inline-field">
                            Texture repeat
                            <NumberField
                              label="Texture repeat"
                              value={active.material.repeat}
                              min={0.01}
                              max={100}
                              step={0.5}
                              onChange={(v) => materialPatch({ repeat: v })}
                            />
                          </label>
                          <label className="check-field">
                            <Checkbox
                              checked={!!active.material.checker}
                              onCheckedChange={(v) => materialPatch({ checker: !!v })}
                            />
                            UV checker texture
                          </label>
                          <p className="field-help">
                            PNG, JPEG or WebP · up to 12 MB. Textures stay with your saved Morph and
                            GLB files.
                          </p>
                        </section>
                      </>
                    )}
                    {inspector === "uv" && (
                      <>
                        <section className="property-section">
                          <h3>
                            <ChevronDown size={13} />
                            UV projection
                          </h3>
                          <p className="field-help">
                            Project coordinates, then arrange faces or individual UV corners in the
                            UV editor.
                          </p>
                          <div className="operation-grid">
                            {[
                              { k: "box", l: "Box projection" },
                              { k: "planar", l: "Planar (XZ)" },
                              { k: "cylinder", l: "Cylindrical" },
                              { k: "face", l: "Per-face project" },
                            ].map((x) => (
                              <button key={x.k} onClick={() => uvOperation(x.k)}>
                                {x.l}
                              </button>
                            ))}
                          </div>
                          <button
                            className="secondary-button full"
                            onClick={() => uvOperation("Pack faces")}
                          >
                            <Grid2X2 size={14} />
                            Pack faces to 0–1
                          </button>
                          <p className="field-help">
                            Packing treats each polygon as a separate island. Seam-based unwrapping
                            is on the roadmap.
                          </p>
                        </section>
                        <section className="property-section">
                          <h3>
                            <ChevronDown size={13} />
                            Transform all UVs
                          </h3>
                          <div className="operation-grid">
                            {["Flip U", "Flip V", "Rotate 90°"].map((k) => (
                              <button key={k} onClick={() => uvOperation(k)}>
                                {k}
                              </button>
                            ))}
                            <button onClick={() => svgUV(active)}>
                              <Download size={14} />
                              UV layout
                            </button>
                          </div>
                          <label className="check-field">
                            <Checkbox
                              checked={!!active.material.checker}
                              onCheckedChange={(v) => materialPatch({ checker: !!v })}
                            />
                            Preview checker
                          </label>
                          {workspace !== "uv" && (
                            <button
                              className="secondary-button full"
                              onClick={() => setWorkspace("uv")}
                            >
                              Open UV editor
                              <ArrowUpRight size={14} />
                            </button>
                          )}
                        </section>
                      </>
                    )}
                  </>
                )}
              </div>
            </aside>
          )}
        </div>
        <footer className="statusbar">
          <span className="status-brand">Morph Modeling</span>
          <span className="status-action">{lastAction}</span>
          <div className="scene-totals">
            <span>
              Objects<b>{project.objects.length}</b>
            </span>
            <span>
              Vertices<b>{totalVertices.toLocaleString()}</b>
            </span>
            <span>
              Faces<b>{totalFaces.toLocaleString()}</b>
            </span>
            <span className="prototype-tag">PROTOTYPE 0.1</span>
          </div>
        </footer>
        <input
          type="file"
          multiple
          ref={fileInput}
          hidden
          accept=".morph,.json,.obj,.glb,.gltf,.stl,.bin,.png,.jpg,.jpeg,.webp"
          onChange={(e) => e.target.files && void load(Array.from(e.target.files))}
        />
        <input
          type="file"
          hidden
          ref={textureInput}
          accept="image/png,image/jpeg,image/webp"
          onChange={(e) => void loadTexture(e.target.files?.[0])}
        />
        <Dialog open={dialog !== null} onOpenChange={(open) => !open && setDialog(null)}>
          <DialogContent
            className={
              "morph-dialog " +
              (dialog === "roadmap" ? "roadmap-dialog" : dialog === "help" ? "help-dialog" : "")
            }
          >
            <DialogHeader>
              <DialogTitle>
                {dialog === "export"
                  ? "Export your model"
                  : dialog === "roadmap"
                    ? "The road ahead"
                    : "Make something that matters."}
              </DialogTitle>
              <DialogDescription>
                {dialog === "export"
                  ? "Choose a format for your next workflow."
                  : dialog === "roadmap"
                    ? "Morph Modeling · from a practical prototype to a complete creative tool."
                    : "A quick guide to your Morph Modeling workspace."}
              </DialogDescription>
            </DialogHeader>
            {dialog === "export" && (
              <div className="export-content">
                <label className="field-label">File format</label>
                <Choice
                  value={exportFormat}
                  onChange={setExportFormat}
                  label="Export format"
                  items={[
                    { value: "glb", label: "GLB — geometry, UVs & materials" },
                    { value: "gltf", label: "glTF — embedded scene & materials" },
                    { value: "obj", label: "OBJ — geometry & UVs" },
                    { value: "stl", label: "STL — triangulated geometry" },
                  ]}
                />
                <p className="export-note">
                  {exportFormat === "glb"
                    ? "Recommended for transferring your static scene, with textures embedded in a single file."
                    : exportFormat === "obj"
                      ? "Polygon geometry and UVs. Materials and textures are not included in this OBJ export."
                      : exportFormat === "stl"
                        ? "Geometry only. STL does not store units, UVs or materials. This scene uses meters."
                        : "A glTF 2.0 JSON file with embedded buffers and textures."}
                </p>
                <label className="check-field">
                  <Checkbox
                    checked={exportSelected}
                    disabled={!selected.length}
                    onCheckedChange={(v) => setExportSelected(!!v)}
                  />
                  Selected objects only ({selected.length})
                </label>
                <p className="field-help">
                  {exportSelected ? "Selected" : "All"} objects are exported, including hidden
                  objects. Save a Morph project to preserve editable polygon topology.
                </p>
                <button
                  className="primary-button"
                  disabled={busy || !project.objects.length}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await exportModel(
                        project,
                        exportFormat,
                        exportSelected ? selected : undefined,
                      );
                      toast.success("Model exported");
                      setDialog(null);
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "Export failed");
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <Download size={17} />
                  {busy ? "Preparing export…" : "Export " + exportFormat.toUpperCase()}
                </button>
                <button
                  className="secondary-button full"
                  onClick={() => {
                    saveProject(project);
                    toast("Editable Morph project downloaded");
                  }}
                >
                  <Save size={15} />
                  Save editable .morph project
                </button>
              </div>
            )}
            {dialog === "roadmap" && (
              <div className="roadmap-content">
                {phases.map((phase, i) => (
                  <article className="roadmap-phase" key={phase.version}>
                    <div className={"phase-number " + (!i ? "current" : "")}>{phase.version}</div>
                    <div>
                      <div className="phase-title">
                        <h3>{phase.title}</h3>
                        <span className={!i ? "shipped" : ""}>{phase.status}</span>
                      </div>
                      <ul>
                        {phase.items.map((s) => (
                          <li key={s}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  </article>
                ))}
                <p className="roadmap-disclaimer">
                  This prototype covers a focused modeling workflow. It is not yet a replacement for
                  Blender. Future milestones are priorities, not promised delivery dates.
                </p>
                <a
                  className="secondary-button full"
                  href={`${import.meta.env.BASE_URL}ROADMAP.md`}
                  download
                >
                  <Download size={15} />
                  Download engineering roadmap
                </a>
              </div>
            )}
            {dialog === "help" && <HelpContent />}
          </DialogContent>
        </Dialog>
        <AlertDialog open={newType !== null} onOpenChange={(v) => !v && setNewType(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {newType === "demo" ? "Load the form study?" : "Start a new project?"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                The current scene will be replaced. Download a Morph project if you want to keep a
                separate copy. You can also undo this change.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  const p =
                    newType === "demo"
                      ? starterProject()
                      : {
                          format: "morph-modeling" as const,
                          version: 1 as const,
                          name: "Untitled",
                          objects: [],
                        };
                  commit("New project", (old) => Object.assign(old, p));
                  setSelected(p.objects[0] ? [p.objects[0].id] : []);
                  setSelection([]);
                  setMode("object");
                  setNewType(null);
                }}
              >
                Continue
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Toaster
          theme="dark"
          position="bottom-center"
          richColors
          closeButton
          toastOptions={{
            style: {
              background: "var(--ui-gray-5)",
              borderColor: "var(--ui-gray-18)",
              color: "var(--ui-text)",
            },
          }}
        />
      </main>
    </TooltipProvider>
  );
}
