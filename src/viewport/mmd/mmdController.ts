import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { ImportMeshAsync } from "@babylonjs/core/Loading/sceneLoader";

// Side-effect imports: register the PMX loader and the model animation runtime.
import "babylon-mmd/esm/Loader/pmxLoader";
import "babylon-mmd/esm/Runtime/Animation/mmdRuntimeModelAnimation";
import { SdefInjector } from "babylon-mmd/esm/Loader/sdefInjector";
import { MmdStandardMaterialBuilder } from "babylon-mmd/esm/Loader/mmdStandardMaterialBuilder";
import { MmdMaterialRenderMethod } from "babylon-mmd/esm/Loader/materialBuilderBase";
import { VmdLoader } from "babylon-mmd/esm/Loader/vmdLoader";
import { MmdRuntime } from "babylon-mmd/esm/Runtime/mmdRuntime";
import type { MmdMesh } from "babylon-mmd/esm/Runtime/mmdMesh";
import type { MmdModel } from "babylon-mmd/esm/Runtime/mmdModel";
import type { MmdAnimation } from "babylon-mmd/esm/Loader/Animation/mmdAnimation";
import type { MmdRuntimeAnimationHandle } from "babylon-mmd/esm/Runtime/mmdRuntimeAnimationHandle";

import { Model3dInfo, MmdState } from "./types";

interface LoadedModel {
  mmdModel: MmdModel;
  mesh: MmdMesh;
  /** Cached runtime animation handles per resolved VMD url. */
  handles: Map<string, MmdRuntimeAnimationHandle>;
  /** The handle currently set on the model, to avoid restarting the base loop. */
  playing: MmdRuntimeAnimationHandle | null;
  /** Resolved mouth vowel morphs present in this model. */
  vowels: Vowel[];
  target: Vector3;
  radius: number;
}

// Mouth shapes shipped as PMX morphs. Talking cycles these with an open/close
// envelope over the (mouth-free) base idle motion, instead of a separate
// talking VMD, since the (a)/(b) sprite split doesn't map to 3D models.
//
// Morph names aren't standardized: stock MMD models use the kana あいうえお,
// while AssetRipper-exported models name the open-mouth vowels
// `Mouth_NN_0(TalkA_A_L)[M_Face]` and similar. Each vowel lists substring
// patterns tried in priority order (kana first, then the "large" talk shapes).
interface VowelSpec {
  patterns: string[];
  open: number;
}
const VOWEL_SPECS: VowelSpec[] = [
  { patterns: ["あ", "TalkA_A_L", "TalkB_A_L", "_A_L"], open: 1.0 },
  { patterns: ["い", "TalkA_I_L", "TalkB_I_L", "TalkC_I", "_I_L"], open: 0.7 },
  { patterns: ["う", "TalkA_U_L", "_U_L"], open: 0.7 },
  { patterns: ["え", "TalkA_E_L", "TalkB_E_L", "_E_L"], open: 0.85 },
  { patterns: ["お", "TalkA_O_L", "_O_L"], open: 0.9 },
];
const VOWEL_HOLD_SECONDS = 0.22;
// How fast the mouth fades in/out when talking starts/stops (per second),
// so leaving the talking phase eases the mouth shut instead of snapping.
const TALK_FADE_RATE = 12;

interface Vowel {
  /** Full morph name as it appears in the model. */
  name: string;
  open: number;
}

/**
 * Resolves each vowel to a concrete morph name present in the model. Prefers an
 * exact match (so the kana "い" doesn't accidentally match "笑い"/smile), then
 * falls back to substring for exported models that wrap the token in a longer
 * name like "Mouth_24_0(TalkA_A_L)[M_Face]".
 */
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
 * Owns a single Babylon engine/scene that renders MMD (.pmx/.vmd) characters
 * in place of the 2D sprite. The one canvas element is reparented into
 * whichever `.client_char` slot is speaking, so the existing flip/offset/pan
 * DOM logic applies to the 3D model unchanged.
 *
 * Binary model/motion data is read with the fetch loader, so 3D characters
 * require the asset host to allow cross-origin reads (sprites do not).
 */
export class MmdController {
  private canvas: HTMLCanvasElement;
  private engine: Engine;
  private scene: Scene;
  private camera: ArcRotateCamera;
  private runtime: MmdRuntime;
  private materialBuilder: MmdStandardMaterialBuilder;
  private vmdLoader: VmdLoader;

  private models = new Map<string, Promise<LoadedModel | null>>();
  private motions = new Map<string, Promise<MmdAnimation | null>>();
  private active: LoadedModel | null = null;
  private looping = false;
  /** Whether the mouth talker is currently animating the active model. */
  private talking = false;
  private talkTime = 0;
  /** Eased 0..1 mouth amplitude; ramps toward 1 while talking, 0 otherwise. */
  private talkAmp = 0;
  /** Asset host used to build character URLs; set on each preload. */
  private host = "";

  private characterFolder(name: string): string {
    return `${this.host}characters/${encodeURI(name.toLowerCase())}/`;
  }

  /**
   * Works around a babylon-mmd race: a texture load error can fire after its
   * loading-model was removed from the loader, so `_addErrorTextureReferenceCount`
   * dereferences `undefined` and throws (fatal in the busy courtroom, where a
   * texture request can be aborted under load). Skip tracking when the model is
   * already gone instead of crashing.
   */
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

    const hemi = new HemisphericLight("hemi", new Vector3(0, 1, 0), this.scene);
    hemi.intensity = 0.7;
    const dir = new DirectionalLight("dir", new Vector3(0.4, -1, 0.6), this.scene);
    dir.intensity = 0.7;

    this.runtime = new MmdRuntime(this.scene);
    this.runtime.register(this.scene);

    // The runtime auto-pauses when an animation reaches its end. For looping
    // states (idle/talking) restart from 0; for one-shots (preanim) hold the
    // last frame. playAnimation() resolves immediately, so it can't drive this.
    this.runtime.onPauseAnimationObservable.add(() => {
      if (!this.looping) return;
      const duration = this.runtime.animationFrameTimeDuration;
      if (duration > 0 && this.runtime.currentFrameTime >= duration - 1e-3) {
        this.runtime.seekAnimation(0, true);
        void this.runtime.playAnimation();
      }
    });

    this.materialBuilder = new MmdStandardMaterialBuilder();
    this.materialBuilder.renderMethod = MmdMaterialRenderMethod.AlphaEvaluation;
    this.guardTextureLoader();

    this.vmdLoader = new VmdLoader(this.scene);

    // Drive the mouth morphs each frame while talking.
    this.scene.onBeforeRenderObservable.add(() => this.updateTalk());

    this.engine.runRenderLoop(() => this.scene.render());
    window.addEventListener("resize", () => this.engine.resize());
  }

  /**
   * Loads the model + motions for a message and measures the preanim
   * length. Returns null (falling back to sprites) if the model can't load.
   */
  async preload(
    host: string,
    charName: string,
    modelFile: string,
    emote: string,
    preanim: string | null,
  ): Promise<Model3dInfo | null> {
    this.host = host;
    const model = await this.loadModel(charName, modelFile);
    if (!model) return null;

    const folder = this.characterFolder(charName);
    const preanimUrl = preanim ? `${folder}${encodeURI(preanim)}.vmd` : null;
    // Base (mouth-free) idle motion, reused for both idle and talking.
    const baseUrl = `${folder}${encodeURI(emote)}.vmd`;
    const legacyIdleUrl = `${folder}${encodeURI(`(a)${emote}`)}.vmd`;

    const [base, preanimAnim] = await Promise.all([
      this.resolveMotion([baseUrl, legacyIdleUrl]),
      preanimUrl ? this.resolveMotion([preanimUrl]) : Promise.resolve(null),
    ]);

    // A model with no usable base motion still renders (bind pose); don't bail.
    void base;

    const preanimDurationMs = preanimAnim
      ? (preanimAnim.endFrame / 30) * 1000
      : 0;

    return { charName, modelFile, emote, preanim, preanimDurationMs };
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
    this.engine.resize();
  }

  /**
   * Applies an emote phase to the active model. idle and talking share one
   * mouth-free base motion (`<emote>.vmd`); talking layers the mouth morphs on
   * top rather than swapping to a separate VMD. preanim plays `<preanim>.vmd`
   * once and then the caller drives the timeline back to idle/talking.
   */
  async playState(state: MmdState, info: Model3dInfo): Promise<void> {
    const model = this.active ?? (await this.loadModel(info.charName, info.modelFile));
    if (!model) return;

    const folder = this.characterFolder(info.charName);
    const baseCandidates = [
      `${folder}${encodeURI(info.emote)}.vmd`,
      `${folder}${encodeURI(`(a)${info.emote}`)}.vmd`,
    ];

    if (state === "preanim") {
      this.stopTalk();
      const preanimUrl = info.preanim
        ? `${folder}${encodeURI(info.preanim)}.vmd`
        : null;
      const handle = await this.resolveHandle(model, preanimUrl ? [preanimUrl] : baseCandidates);
      if (handle) this.playHandle(model, handle, false);
      return;
    }

    // idle / talking: keep (or start) the base loop, then toggle the mouth.
    const handle = await this.resolveHandle(model, baseCandidates);
    if (handle && model.playing !== handle) {
      this.playHandle(model, handle, true);
    }
    if (state === "talking") this.startTalk();
    else this.stopTalk();
  }

  /**
   * Plays a specific VMD by full URL on the active model. Used by the
   * standalone viewer to test arbitrary animation files.
   */
  async playMotionUrl(url: string, loop = true): Promise<void> {
    if (!this.active) return;
    const handle = await this.resolveHandle(this.active, [url]);
    if (!handle) return;
    this.playHandle(this.active, handle, loop);
  }

  /** Enables orbit/zoom camera control (viewer only; off in the courtroom). */
  attachCameraControl(): void {
    this.canvas.style.pointerEvents = "auto";
    this.canvas.style.touchAction = "none";
    this.camera.wheelDeltaPercentage = 0.01;
    this.camera.lowerRadiusLimit = 1;
    this.camera.upperRadiusLimit = 500;
    this.camera.attachControl(this.canvas, false);
  }

  /** Detaches the canvas and stops animating the active model. */
  hide(): void {
    this.looping = false;
    this.resetTalk();
    if (this.runtime.isAnimationPlaying) this.runtime.pauseAnimation();
    if (this.active) {
      this.active.mesh.setEnabled(false);
      this.active.mmdModel.setRuntimeAnimation(null);
      this.active.playing = null;
      this.active = null;
    }
    this.canvas.style.display = "none";
    if (this.canvas.parentElement) this.canvas.remove();
  }

  /**
   * Starts a motion. Looping is handled by the runtime's pause observable
   * (set up in the constructor); here we just seek to 0 and start playback.
   */
  private playHandle(
    model: LoadedModel,
    handle: MmdRuntimeAnimationHandle,
    loop: boolean,
  ): void {
    this.looping = loop;
    model.mmdModel.setRuntimeAnimation(handle);
    model.playing = handle;
    this.runtime.seekAnimation(0, true);
    void this.runtime.playAnimation();
  }

  private startTalk(): void {
    if (this.talking) return;
    this.talking = true;
    this.talkTime = 0;
  }

  /** Stops talking with a smooth fade (the amplitude eases to 0 in updateTalk). */
  private stopTalk(): void {
    this.talking = false;
  }

  /** Immediately closes the mouth (used when swapping/hiding models). */
  private resetTalk(): void {
    this.talking = false;
    this.talkAmp = 0;
    const model = this.active;
    if (model) {
      for (const v of model.vowels) model.mmdModel.morph.setMorphWeight(v.name, 0);
    }
  }

  /** Per-frame mouth animation: cycle vowels with an open/close envelope. */
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

    // Fully closed: zero out and stop updating.
    if (!this.talking && this.talkAmp <= 0.01) {
      for (const v of vowels) morph.setMorphWeight(v.name, 0);
      this.talkAmp = 0;
    }
  }

  private async resolveHandle(
    model: LoadedModel,
    candidates: string[],
  ): Promise<MmdRuntimeAnimationHandle | null> {
    for (const url of candidates) {
      const cached = model.handles.get(url);
      if (cached) return cached;
      const anim = await this.resolveMotion([url]);
      if (anim) {
        const handle = model.mmdModel.createRuntimeAnimation(anim);
        model.handles.set(url, handle);
        return handle;
      }
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

  /**
   * Frames the camera from the skeleton's bone positions rather than the mesh
   * bounding box. A skinned mesh's bounds stay at the (often huge, T-posed)
   * bind pose, which frames the character tiny and floating; the bones reflect
   * the actual standing extent. Biased so the feet sit near the bottom of the
   * view with headroom for hair/hats, matching the 2D sprite framing.
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
    const viewTop = maxY + charHeight * 0.18; // headroom for hair/hats
    const viewBottom = minY - charHeight * 0.04; // feet near the bottom
    const framedHeight = viewTop - viewBottom;
    return {
      target: new Vector3(0, (viewTop + viewBottom) / 2, 0),
      radius: framedHeight / 2 / Math.tan(this.camera.fov / 2),
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

        // Resolve the mouth vowel morphs this model actually ships.
        const morphNames = Array.from(
          (mmdModel.morph as unknown as { _morphIndexMap: Map<string, number[]> })
            ._morphIndexMap.keys(),
        );
        const vowels = resolveVowels(morphNames);

        mesh.setEnabled(false);
        return {
          mmdModel,
          mesh,
          handles: new Map(),
          playing: null,
          vowels,
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
}
