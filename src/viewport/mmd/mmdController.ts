import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { ImportMeshAsync } from "@babylonjs/core/Loading/sceneLoader";

// Side-effect imports: register the PMX loader and the model + camera runtimes.
import "babylon-mmd/esm/Loader/pmxLoader";
import "babylon-mmd/esm/Runtime/Animation/mmdRuntimeModelAnimation";
import "babylon-mmd/esm/Runtime/Animation/mmdRuntimeCameraAnimation";
import { SdefInjector } from "babylon-mmd/esm/Loader/sdefInjector";
import { MmdStandardMaterialBuilder } from "babylon-mmd/esm/Loader/mmdStandardMaterialBuilder";
import { MmdMaterialRenderMethod } from "babylon-mmd/esm/Loader/materialBuilderBase";
import { VmdLoader } from "babylon-mmd/esm/Loader/vmdLoader";
import { MmdRuntime } from "babylon-mmd/esm/Runtime/mmdRuntime";
import { MmdCamera } from "babylon-mmd/esm/Runtime/mmdCamera";
import type { MmdMesh } from "babylon-mmd/esm/Runtime/mmdMesh";
import type { MmdModel } from "babylon-mmd/esm/Runtime/mmdModel";
import type { MmdAnimation } from "babylon-mmd/esm/Loader/Animation/mmdAnimation";
import type { MmdRuntimeAnimationHandle } from "babylon-mmd/esm/Runtime/mmdRuntimeAnimationHandle";

import { Model3dInfo } from "./types";

interface Vowel {
  name: string;
  open: number;
}

interface LoadedModel {
  mmdModel: MmdModel;
  mesh: MmdMesh;
  handles: Map<string, MmdRuntimeAnimationHandle>;
  playing: MmdRuntimeAnimationHandle | null;
  vowels: Vowel[];
  target: Vector3;
  radius: number;
}

// One queued clip: its runtime animation on the model, plus the MMD-camera
// runtime animation from the emote's camera VMD (null when it has none).
interface Step {
  model: MmdRuntimeAnimationHandle;
  camera: MmdRuntimeAnimationHandle | null;
}

// A clip to play: the motion VMD name, plus an optional separate camera VMD.
interface ClipSpec {
  name: string;
  camera: string | null;
}

// Mouth shapes cycled while talking (over the mouth-free base motion). Names
// aren't standardized: stock MMD uses kana あいうえお, exported models use
// `Mouth_NN_0(TalkA_A_L)[M_Face]` and similar.
const VOWEL_SPECS: { patterns: string[]; open: number }[] = [
  { patterns: ["あ", "TalkA_A_L", "TalkB_A_L", "_A_L"], open: 1.0 },
  { patterns: ["い", "TalkA_I_L", "TalkB_I_L", "TalkC_I", "_I_L"], open: 0.7 },
  { patterns: ["う", "TalkA_U_L", "_U_L"], open: 0.7 },
  { patterns: ["え", "TalkA_E_L", "TalkB_E_L", "_E_L"], open: 0.85 },
  { patterns: ["お", "TalkA_O_L", "_O_L"], open: 0.9 },
];
const VOWEL_HOLD_SECONDS = 0.22;
const TALK_FADE_RATE = 12;

// VMD candidates for an animation reference. A block-format name already carries
// its extension (used as-is); a legacy stem gets `.vmd`, with the `(a)`-prefixed
// name some packs use as a fallback.
const HAS_EXTENSION = /\.[^.\s/]+$/;
function vmdCandidates(folder: string, name: string): string[] {
  return HAS_EXTENSION.test(name)
    ? [`${folder}${encodeURI(name)}`]
    : [`${folder}${encodeURI(name)}.vmd`, `${folder}${encodeURI(`(a)${name}`)}.vmd`];
}

/** Prefers an exact match (so "い" doesn't grab "笑い"), then substring. */
function resolveVowels(morphNames: string[]): Vowel[] {
  const vowels: Vowel[] = [];
  for (const spec of VOWEL_SPECS) {
    let found = spec.patterns.find((p) => morphNames.includes(p));
    if (!found) {
      for (const pattern of spec.patterns) {
        const match = morphNames.find((n) => n.includes(pattern));
        if (match) {
          found = match;
          break;
        }
      }
    }
    if (found) vowels.push({ name: found, open: spec.open });
  }
  return vowels;
}

/**
 * Owns a single Babylon engine/scene that renders MMD (.pmx/.vmd) characters in
 * place of the 2D sprite. One canvas is reparented into whichever `.client_char`
 * slot is speaking, so the courtroom flip/offset/pan DOM logic applies unchanged.
 *
 * Per emote it chains preanim (intro, once) -> anim (loop) and, on switching
 * emotes, plays the previous emote's postanim (outro) first; the emote's camera
 * VMD drives the view when present. Talking layers mouth morphs over the loop.
 *
 * Binary model/motion data is read with the fetch loader, so 3D characters
 * require the asset host to allow cross-origin reads (sprites do not).
 */
export class MmdController {
  private canvas: HTMLCanvasElement;
  private engine: Engine;
  private scene: Scene;
  private camera: ArcRotateCamera; // default framing camera (skeleton-fit)
  private mmdCamera: MmdCamera; // driven by an emote's baked camera VMD
  private runtime: MmdRuntime;
  private materialBuilder: MmdStandardMaterialBuilder;
  private vmdLoader: VmdLoader;

  private models = new Map<string, Promise<LoadedModel | null>>();
  private motions = new Map<string, Promise<MmdAnimation | null>>();
  private cameraHandles = new Map<string, MmdRuntimeAnimationHandle>();
  private active: LoadedModel | null = null;

  // Play queue of one-shot clips; the last loops when `loopLast`.
  private steps: Step[] = [];
  private stepIndex = 0;
  private loopLast = false;
  private pendingAdvance = false;
  /** The emote currently playing, to skip re-chaining and to find its outro. */
  private playingEmote: Model3dInfo | null = null;

  private talking = false;
  private talkTime = 0;
  private talkAmp = 0;
  private host = "";

  private characterFolder(name: string): string {
    return `${this.host}characters/${encodeURI(name.toLowerCase())}/`;
  }

  constructor() {
    this.canvas = document.createElement("canvas");
    this.canvas.className = "client_char_3d";

    this.engine = new Engine(this.canvas, true, { alpha: true, stencil: true }, true);
    SdefInjector.OverrideEngineCreateEffect(this.engine);

    this.scene = new Scene(this.engine);
    // Transparent so the courtroom background shows behind the model.
    this.scene.clearColor = new Color4(0, 0, 0, 0);
    this.scene.ambientColor = new Color3(0.5, 0.5, 0.5);

    this.camera = new ArcRotateCamera(
      "camera",
      -Math.PI / 2,
      Math.PI / 2,
      32,
      new Vector3(0, 12, 0),
      this.scene,
    );
    this.camera.minZ = 0.1;
    this.camera.maxZ = 5000;

    // Framed by an emote's camera VMD; only made active while a clip has one.
    this.mmdCamera = new MmdCamera("mmdCamera", new Vector3(0, 10, 0), this.scene, false);

    const hemi = new HemisphericLight("hemi", new Vector3(0, 1, 0), this.scene);
    hemi.intensity = 0.7;
    const dir = new DirectionalLight("dir", new Vector3(0.4, -1, 0.6), this.scene);
    dir.intensity = 0.7;

    this.runtime = new MmdRuntime(this.scene);
    this.runtime.register(this.scene);
    // Drive the MMD camera off the same clock as the model.
    this.runtime.addAnimatable(this.mmdCamera);

    // A clip pauses on reaching its end: advance the queue, or loop the last.
    this.runtime.onPauseAnimationObservable.add(() => {
      if (!this.active) return;
      const duration = this.runtime.animationFrameTimeDuration;
      const atEnd = duration > 0 && this.runtime.currentFrameTime >= duration - 1e-3;
      if (!atEnd) return;
      if (this.stepIndex < this.steps.length - 1) {
        // Defer the swap to frame start (advancePending) to avoid a bind-pose flash.
        this.pendingAdvance = true;
      } else if (this.loopLast) {
        this.runtime.seekAnimation(0, true);
        void this.runtime.playAnimation();
      }
    });

    this.materialBuilder = new MmdStandardMaterialBuilder();
    this.materialBuilder.renderMethod = MmdMaterialRenderMethod.AlphaEvaluation;
    this.guardTextureLoader();

    this.vmdLoader = new VmdLoader(this.scene);
    this.scene.onBeforeRenderObservable.add(() => this.updateTalk());
    this.scene.onBeforeAnimationsObservable.add(() => this.advancePending());

    this.engine.runRenderLoop(() => this.scene.render());
    window.addEventListener("resize", () => this.engine.resize());
  }

  /**
   * Loads the model + motions for a message and measures the preanim length so
   * the chat_tick timeline waits the right amount before speaking. Returns null
   * (falling back to sprites) if the model can't load.
   */
  async preload(
    host: string,
    charName: string,
    modelFile: string,
    emote: string,
    preanim: string | null,
    postanim: string | null,
    camera: string | null,
  ): Promise<Model3dInfo | null> {
    this.host = host;
    const model = await this.loadModel(charName, modelFile);
    if (!model) return null;

    const folder = this.characterFolder(charName);
    const [, preanimAnim] = await Promise.all([
      this.resolveMotion(vmdCandidates(folder, emote)), // warm the base loop
      preanim ? this.resolveMotion(vmdCandidates(folder, preanim)) : Promise.resolve(null),
    ]);

    const preanimDurationMs = preanimAnim ? (preanimAnim.endFrame / 30) * 1000 : 0;
    return { charName, modelFile, emote, preanim, postanim, camera, preanimDurationMs };
  }

  /** Reparents the render canvas into the active character slot. */
  place(container: HTMLElement): void {
    if (this.canvas.parentElement !== container) {
      container.appendChild(this.canvas);
    }
    this.canvas.style.display = "";
    this.engine.resize();
  }

  /** Enables the message's model, disables the rest, and frames the camera. */
  async show(info: Model3dInfo): Promise<void> {
    const model = await this.loadModel(info.charName, info.modelFile);
    if (!model) return;

    this.resetTalk();
    for (const loaded of await this.loadedModels()) {
      if (loaded !== model) {
        loaded.mesh.setEnabled(false);
        loaded.mmdModel.setRuntimeAnimation(null);
        loaded.playing = null;
      }
    }
    model.mesh.setEnabled(true);
    this.active = model;
    this.camera.setTarget(model.target);
    this.camera.radius = model.radius;
    this.scene.activeCamera = this.camera;
    this.engine.resize();
  }

  /**
   * Plays an emote: chains [prev emote's postanim] -> [this emote's preanim] ->
   * loop(anim) so the body passes through its base pose instead of snapping, and
   * drives the view from the emote's camera VMD. Re-playing the same emote is a
   * no-op (keeps the running loop).
   */
  async playEmote(info: Model3dInfo): Promise<void> {
    const model = this.active ?? (await this.loadModel(info.charName, info.modelFile));
    if (!model) return;

    const prev = this.playingEmote;
    if (prev && prev.charName === info.charName && prev.emote === info.emote) return;

    const specs: ClipSpec[] = [];
    // Outro of the emote we leave (same character only).
    if (prev && prev.charName === info.charName && prev.postanim) {
      specs.push({ name: prev.postanim, camera: null });
    }
    if (info.preanim) specs.push({ name: info.preanim, camera: null }); // intro
    specs.push({ name: info.emote, camera: info.camera }); // loop, with its camera

    const folder = this.characterFolder(info.charName);
    const steps = await this.resolveSteps(model, folder, specs);
    if (steps.length) this.playSteps(model, steps);
    this.playingEmote = info;
  }

  /** Talking is orthogonal to the emote: mouth morphs layered over the motion. */
  setTalking(on: boolean): void {
    if (on) this.startTalk();
    else this.stopTalk();
  }

  /** Detaches the canvas and stops animating the active model. */
  hide(): void {
    this.resetTalk();
    this.steps = [];
    this.loopLast = false;
    this.pendingAdvance = false;
    this.playingEmote = null;
    if (this.runtime.isAnimationPlaying) this.runtime.pauseAnimation();
    if (this.active) {
      this.active.mesh.setEnabled(false);
      this.active.mmdModel.setRuntimeAnimation(null);
      this.active.playing = null;
      this.active = null;
    }
    this.mmdCamera.setRuntimeAnimation(null);
    this.scene.activeCamera = this.camera;
    this.canvas.style.display = "none";
    if (this.canvas.parentElement) this.canvas.remove();
  }

  // -- clip queue -----------------------------------------------------------

  private async resolveSteps(
    model: LoadedModel,
    folder: string,
    specs: ClipSpec[],
  ): Promise<Step[]> {
    const steps: Step[] = [];
    for (const spec of specs) {
      const step = await this.resolveStep(model, folder, spec);
      if (step) steps.push(step);
    }
    return steps;
  }

  private playSteps(model: LoadedModel, steps: Step[]): void {
    this.steps = steps;
    this.stepIndex = 0;
    this.loopLast = true;
    this.pendingAdvance = false;
    if (steps.length > 0) this.playStep(model);
  }

  /** Apply a queued clip swap at frame start (see the onPause handler). */
  private advancePending(): void {
    if (!this.pendingAdvance || !this.active) return;
    this.pendingAdvance = false;
    this.stepIndex++;
    this.playStep(this.active);
  }

  private playStep(model: LoadedModel): void {
    const step = this.steps[this.stepIndex];
    model.mmdModel.setRuntimeAnimation(step.model);
    model.playing = step.model;
    this.mmdCamera.setRuntimeAnimation(step.camera); // null clears any camera anim
    this.runtime.seekAnimation(0, true);
    void this.runtime.playAnimation();
    this.updateActiveCamera(step.camera !== null);
  }

  /** Use the MMD camera while the current clip carries a camera track. */
  private updateActiveCamera(clipHasCamera: boolean): void {
    this.scene.activeCamera = clipHasCamera ? this.mmdCamera : this.camera;
  }

  private async resolveStep(
    model: LoadedModel,
    folder: string,
    spec: ClipSpec,
  ): Promise<Step | null> {
    let modelHandle: MmdRuntimeAnimationHandle | null = null;
    for (const url of vmdCandidates(folder, spec.name)) {
      const anim = await this.loadMotion(url);
      if (!anim) continue;
      modelHandle = model.handles.get(url) ?? model.mmdModel.createRuntimeAnimation(anim);
      model.handles.set(url, modelHandle);
      break;
    }
    if (!modelHandle) return null;

    const camera = spec.camera ? await this.resolveCameraHandle(folder, spec.camera) : null;
    return { model: modelHandle, camera };
  }

  private async resolveCameraHandle(
    folder: string,
    name: string,
  ): Promise<MmdRuntimeAnimationHandle | null> {
    for (const url of vmdCandidates(folder, name)) {
      const cached = this.cameraHandles.get(url);
      if (cached) return cached;
      const anim = await this.loadMotion(url);
      if (!anim || anim.cameraTrack.frameNumbers.length === 0) continue;
      const handle = this.mmdCamera.createRuntimeAnimation(anim);
      this.cameraHandles.set(url, handle);
      return handle;
    }
    return null;
  }

  private resolveMotion(candidates: string[]): Promise<MmdAnimation | null> {
    return candidates.reduce<Promise<MmdAnimation | null>>(
      (acc, url) => acc.then((found) => (found ? found : this.loadMotion(url))),
      Promise.resolve(null),
    );
  }

  private loadMotion(url: string): Promise<MmdAnimation | null> {
    const cached = this.motions.get(url);
    if (cached) return cached;
    const promise: Promise<MmdAnimation | null> = this.vmdLoader
      .loadAsync(url, url)
      .catch((): MmdAnimation | null => null);
    this.motions.set(url, promise);
    return promise;
  }

  // -- mouth ----------------------------------------------------------------

  private startTalk(): void {
    if (this.talking) return;
    this.talking = true;
    this.talkTime = 0;
  }

  private stopTalk(): void {
    this.talking = false;
  }

  private resetTalk(): void {
    this.talking = false;
    this.talkAmp = 0;
    const model = this.active;
    if (model) {
      for (const v of model.vowels) model.mmdModel.morph.setMorphWeight(v.name, 0);
    }
  }

  private updateTalk(): void {
    const model = this.active;
    if (!model) return;
    const { vowels } = model;
    if (vowels.length === 0) return;
    if (!this.talking && this.talkAmp <= 0) return;

    const dt = this.engine.getDeltaTime() / 1000;
    const target = this.talking ? 1 : 0;
    this.talkAmp += (target - this.talkAmp) * Math.min(1, dt * TALK_FADE_RATE);

    this.talkTime += dt;
    const idx = Math.floor(this.talkTime / VOWEL_HOLD_SECONDS) % vowels.length;
    const phase = (this.talkTime % VOWEL_HOLD_SECONDS) / VOWEL_HOLD_SECONDS;
    const envelope = Math.sin(phase * Math.PI);

    const morph = model.mmdModel.morph;
    for (let i = 0; i < vowels.length; i++) {
      morph.setMorphWeight(vowels[i].name, (i === idx ? envelope * vowels[i].open : 0) * this.talkAmp);
    }
    if (!this.talking && this.talkAmp <= 0.01) {
      for (const v of vowels) morph.setMorphWeight(v.name, 0);
      this.talkAmp = 0;
    }
  }

  // -- model load / framing -------------------------------------------------

  /**
   * Frames the camera from the skeleton's bone positions rather than the mesh
   * bounding box (which stays at the huge, T-posed bind pose), so a posed
   * character fills the view with feet near the bottom.
   */
  private frameFromSkeleton(
    mesh: MmdMesh,
    skeleton: { bones?: { getAbsolutePosition(): Vector3 }[] } | undefined,
  ): { target: Vector3; radius: number } {
    let minY = Infinity;
    let maxY = -Infinity;
    for (const bone of skeleton?.bones ?? []) {
      const y = bone.getAbsolutePosition().y;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    if (!Number.isFinite(minY) || maxY - minY < 1e-3) {
      const b = mesh.getHierarchyBoundingVectors();
      minY = b.min.y;
      maxY = b.max.y;
    }
    const charHeight = Math.max(maxY - minY, 1);
    const viewTop = maxY + charHeight * 0.18;
    const viewBottom = minY - charHeight * 0.04;
    return {
      target: new Vector3(0, (viewTop + viewBottom) / 2, 0),
      radius: (viewTop - viewBottom) / 2 / Math.tan(this.camera.fov / 2),
    };
  }

  private loadModel(charName: string, modelFile: string): Promise<LoadedModel | null> {
    const key = charName.toLowerCase();
    const cached = this.models.get(key);
    if (cached) return cached;

    const promise = (async (): Promise<LoadedModel | null> => {
      try {
        const url = `${this.characterFolder(charName)}${encodeURI(modelFile)}`;
        const result = await ImportMeshAsync(url, this.scene, {
          pluginOptions: { mmdmodel: { materialBuilder: this.materialBuilder } },
        });
        const mesh = result.meshes[0] as MmdMesh;
        const mmdModel = this.runtime.createMmdModel(mesh);
        const { target, radius } = this.frameFromSkeleton(mesh, result.skeletons?.[0]);
        const morphNames = Array.from(
          (mmdModel.morph as unknown as { _morphIndexMap: Map<string, number[]> })
            ._morphIndexMap.keys(),
        );

        mesh.setEnabled(false);
        return {
          mmdModel,
          mesh,
          handles: new Map(),
          playing: null,
          vowels: resolveVowels(morphNames),
          target,
          radius,
        };
      } catch (err) {
        console.warn(`Failed to load 3D model for ${charName}:`, err);
        return null;
      }
    })();

    this.models.set(key, promise);
    return promise;
  }

  private async loadedModels(): Promise<LoadedModel[]> {
    const results = await Promise.all(this.models.values());
    return results.filter((m): m is LoadedModel => m !== null);
  }

  /** Works around a babylon-mmd race that throws on late texture-load errors. */
  private guardTextureLoader(): void {
    const loader = (this.materialBuilder as unknown as {
      _textureLoader: {
        _loadingModels: Map<number, unknown>;
        _addErrorTextureReferenceCount(uniqueId: number, textureData: unknown): void;
      };
    })._textureLoader;
    if (!loader?._addErrorTextureReferenceCount) return;
    const original = loader._addErrorTextureReferenceCount.bind(loader);
    loader._addErrorTextureReferenceCount = (uniqueId: number, textureData: unknown): void => {
      if (!loader._loadingModels.get(uniqueId)) return;
      original(uniqueId, textureData);
    };
  }
}
