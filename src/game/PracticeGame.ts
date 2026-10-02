import { PracticeEnding } from "../scenes/ending/PracticeEnding";
import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import "@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import type { AnimationGroup } from "@babylonjs/core/Animations/animationGroup";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { ModelLoader } from "../assets/ModelLoader";
import { groundedCharacterY } from "../scenes/digital/groundCharacter";
import { PracticeWalk } from "../scenes/digital/PracticeWalk";
import { createCourtyard } from "../scenes/courtyard/createCourtyard";
import {
  PracticeObjects,
  PHOTO_TARGETS,
} from "../scenes/courtyard/PracticeObjects";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import {
  STATIONS,
  interactionDistance,
} from "../scenes/courtyard/practiceLayout";
import { PracticeFlow } from "../practice/PracticeFlow";
import { TASKS } from "../practice/PracticeState";

import { createAdministration } from "../scenes/administration/createAdministration";
import {
  canStandInOffice,
  OFFICE_STATIONS,
} from "../scenes/administration/administrationLayout";
import { seatAdministrator } from "../scenes/administration/seatAdministrator";

import {
  CABINET,
  PROTECTION_STATIONS,
  canStandInProtection,
} from "../scenes/protection/protectionLayout";
import { createProtectionRoom } from "../scenes/protection/createProtectionRoom";
import { DayTransition } from "../scenes/time/DayTransition";
import { WorkProgressLabels } from "../ui/work/WorkProgressLabels";
import { WorkingArms } from "../scenes/workers/WorkingArms";
type Location = "courtyard" | "administration" | "protection";
export class PracticeGame {
  private readonly courtyardRoot: TransformNode;
  private readonly officeRoot: TransformNode;
  private readonly protectionRoot: TransformNode;
  private location: Location = "courtyard";
  private get indoor() {
    return this.location !== "courtyard";
  }
  private get stations() {
    return this.location === "protection"
      ? PROTECTION_STATIONS
      : this.indoor
        ? OFFICE_STATIONS
        : STATIONS;
  }
  private transitioning = false;
  private changingDay = false;
  private readonly dayTransition: DayTransition;
  private readonly loadingScreen = document.createElement("div");
  private readonly engine: Engine;
  private readonly scene: Scene;
  private readonly camera: ArcRotateCamera;
  private readonly loader: ModelLoader;
  private readonly objects: PracticeObjects;
  private readonly flow: PracticeFlow;
  private walk?: PracticeWalk;
  private hero?: TransformNode;
  private guide?: TransformNode;
  private ending?: PracticeEnding;
  private workers: TransformNode[] = [];
  private readonly workLabels = new WorkProgressLabels();
  private workMotion: {
    home: Vector3;
    time: number;
    walk?: AnimationGroup;
    work?: AnimationGroup;
    arms: WorkingArms;
  }[] = [];
  private disposed = false;
  private finished = false;
  private nearest = "";
  private photoTask: number | null = null;
  private readonly photoBar = document.createElement("div");
  private photoNotice?: HTMLDivElement;
  private photoFlight?: Animation;
  private readonly reticle = document.createElement("div");
  private cameraBefore?: {
    alpha: number;
    beta: number;
    radius: number;
    target: Vector3;
  };
  readonly ready: Promise<void>;
  private readonly render = () => {
    const dt = Math.min(this.engine.getDeltaTime() / 1000, 0.05);
    this.dayTransition.update(dt);
    this.walk?.update(dt);
    if (
      this.hero &&
      this.flow.started &&
      !this.finished &&
      this.photoTask === null &&
      !this.transitioning &&
      !this.changingDay
    ) {
      let distance = 1.18;
      this.nearest = "";
      for (const s of this.stations) {
        const d = interactionDistance(
          s,
          this.hero.position.x,
          this.hero.position.z,
        );
        if (d < distance) {
          this.nearest = s.id;
          distance = d;
        }
      }
      const station = this.stations.find((s) => s.id === this.nearest);
      this.flow.ui.prompt(station ? `Enter · ${station.name}` : "");
    }
    this.objects.update(
      this.flow.state,
      this.flow.ui.open ||
        this.photoTask !== null ||
        this.transitioning ||
        this.changingDay ||
        this.finished
        ? ""
        : this.nearest,
    );
    this.workers.forEach((worker, i) => {
      const active = this.flow.state.jobs[i].status === "working";
      worker.setEnabled(active);
      const motion = this.workMotion[i];
      if (!active) {
        motion.time = 0;
        motion.arms.update(0, 0);
        return;
      }
      motion.time += dt;
      const k = Math.min(1, motion.time / 1.4);
      worker.position.copyFrom(motion.home);
      if (i === 1) worker.position.z += 0.8 * (1 - k);
      else worker.position.x += (i === 0 ? -1 : 1) * 0.8 * (1 - k);
      worker.rotation.y =
        i === 1 ? Math.PI : i === 0 ? Math.PI / 2 : -Math.PI / 2;
      motion.walk?.setWeightForAllAnimatables(1 - k);
      motion.work?.setWeightForAllAnimatables(k);
      motion.arms.update(motion.time, k);
    });
    this.ending?.update(dt);
    this.scene.render();
    this.workLabels.update(
      this.scene,
      this.workers,
      this.flow.state,
      this.flow.started &&
        !this.finished &&
        !this.flow.ui.open &&
        !this.transitioning &&
        !this.changingDay &&
        this.photoTask === null,
    );
  };
  private readonly resize = () => {
    this.engine.resize();
    if (this.photoTask !== null) this.frameObject(this.photoTask);
  };
  private readonly visibility = () => {
    this.engine.stopRenderLoop(this.render);
    if (!document.hidden && !this.disposed)
      this.engine.runRenderLoop(this.render);
  };
  private readonly key = (e: KeyboardEvent) => {
    if (e.code === "Enter" && e.repeat) {
      e.preventDefault();
      return;
    }
    if (
      e.code === "Enter" &&
      !e.repeat &&
      !this.flow.ui.open &&
      this.photoTask === null
    ) {
      e.preventDefault();
      this.interact();
    }
    if (e.code === "Escape" && this.photoTask !== null) {
      e.preventDefault();
      this.stopPhoto();
    }
  };
  private readonly interact = () => {
    if (
      this.transitioning ||
      this.changingDay ||
      this.flow.ui.open ||
      !this.nearest ||
      this.photoTask !== null
    )
      return;
    if (this.nearest === "enter-admin")
      void this.changeLocation("administration");
    else if (this.nearest === "enter-protection")
      void this.changeLocation("protection");
    else if (this.nearest.startsWith("exit-"))
      void this.changeLocation("courtyard");
    else this.flow.interact(this.nearest);
  };
  constructor(private readonly canvas: HTMLCanvasElement) {
    this.engine = new Engine(canvas, true, { preserveDrawingBuffer: true });
    this.scene = new Scene(this.engine);
    this.scene.clearColor = Color4.FromHexString("#172b3aff");
    this.camera = new ArcRotateCamera(
      "practice-camera",
      1.05,
      0.93,
      15,
      new Vector3(0, 0.8, 2),
      this.scene,
    );
    this.camera.minZ = 0.1;
    this.camera.lowerRadiusLimit = 3;
    this.camera.upperRadiusLimit = 24;
    this.camera.lowerBetaLimit = 0.35;
    this.camera.upperBetaLimit = 1.35;
    this.camera.inputs.removeByType("ArcRotateCameraKeyboardMoveInput");
    this.camera.panningSensibility = 0;
    this.camera.attachControl(canvas, false);
    const sky = new HemisphericLight("sky", Vector3.Up(), this.scene);
    sky.intensity = 0.65;
    sky.groundColor = Color3.FromHexString("#73888d");
    const sun = new DirectionalLight(
      "sun",
      new Vector3(-0.7, -1, 0.5),
      this.scene,
    );
    sun.position.set(7, 12, -5);
    sun.intensity = 0.65;
    this.dayTransition = new DayTransition(this.scene, sky, sun);
    const shadows = new ShadowGenerator(2048, sun);
    shadows.usePercentageCloserFiltering = true;
    shadows.bias = 0.0001;
    shadows.normalBias = 0.025;
    const courtyard = createCourtyard(this.scene, shadows);
    this.scene.getMeshByName("entrance")?.dispose();
    courtyard.notification.setEnabled(false);
    courtyard.board.dispose();
    for (const mesh of [...this.scene.meshes])
      if (mesh.name === "network-node" || mesh.name === "network-trace")
        mesh.dispose();
    this.objects = new PracticeObjects(this.scene, shadows);
    this.courtyardRoot = new TransformNode("courtyard-root", this.scene);
    for (const node of [...this.scene.meshes, ...this.scene.transformNodes])
      if (node !== this.courtyardRoot && !node.parent)
        node.parent = this.courtyardRoot;
    const office = createAdministration(this.scene, shadows);
    this.officeRoot = office.root;
    this.officeRoot.setEnabled(false);
    this.objects.register("admin", [office.desk]);
    this.protectionRoot = createProtectionRoom(this.scene, shadows);
    this.scene.getTransformNodeByName("protection-cabinet")!.parent =
      this.protectionRoot;
    this.protectionRoot.setEnabled(false);

    this.loader = new ModelLoader(this.scene, shadows);
    this.flow = new PracticeFlow(
      (open) => {
        this.walk?.setEnabled(
          !open &&
            this.flow.started &&
            !this.finished &&
            this.photoTask === null &&
            !this.transitioning &&
            !this.changingDay,
        );
        if (open) {
          this.camera.detachControl();
          this.camera.inertialAlphaOffset = 0;
          this.camera.inertialBetaOffset = 0;
          this.camera.inertialRadiusOffset = 0;
          this.canvas.inert = true;
        } else if (!this.transitioning && !this.changingDay) {
          this.canvas.inert = false;
          this.camera.attachControl(this.canvas, false);
          this.canvas.focus();
        }
      },
      this.interact,
      (id) => this.startPhoto(id),
      () => {
        this.finished = true;
        this.walk?.setEnabled(false);
        this.flow.ui.close();
        this.flow.ui.hud.hidden = true;
        this.flow.ui.prompt("");
        this.camera.detachControl();
        this.canvas.inert = true;
        this.camera.inertialAlphaOffset =
          this.camera.inertialBetaOffset =
          this.camera.inertialRadiusOffset =
            0;
        const roots = [this.hero, this.guide].filter(
          (root): root is TransformNode => !!root,
        );
        if (roots.length) {
          const center = roots
            .reduce(
              (sum, root) => sum.add(root.getAbsolutePosition()),
              Vector3.Zero(),
            )
            .scale(1 / roots.length);
          this.camera.setTarget(center.add(new Vector3(0, 0.85, 0)));
          this.camera.radius = 7;
        }
        return new Promise<void>((resolve) => {
          this.ending = new PracticeEnding(this.scene, roots, resolve);
        });
      },
      async (from, to) => {
        this.changingDay = true;
        this.walk?.setEnabled(false);
        this.camera.detachControl();
        this.canvas.inert = true;
        this.flow.ui.prompt("");
        await this.dayTransition.play(from, to);
        if (this.disposed) return;
        this.changingDay = false;
      },
      (id, result, done) => this.startObjectView(id, { result, done }),
    );
    this.photoBar.className = "photo-toolbar";
    this.photoBar.hidden = true;
    this.reticle.className = "camera-reticle";
    this.reticle.hidden = true;
    this.loadingScreen.className = "location-loading";
    this.loadingScreen.hidden = true;
    this.loadingScreen.setAttribute("role", "status");
    this.loadingScreen.setAttribute("aria-live", "polite");
    document.body.append(this.photoBar, this.reticle, this.loadingScreen);
    this.ready = this.load();
    window.addEventListener("keydown", this.key);
    window.addEventListener("resize", this.resize);
    document.addEventListener("visibilitychange", this.visibility);
    this.visibility();
  }
  private async load() {
    await Promise.all(
      [
        {
          name: "administration-entry",
          x: -6,
          z: -1.1,
          height: 1.75,
          rotation: 0,
          inside: false,
          room: "courtyard",
          station: "enter-admin",
        },
        {
          name: "administration-exit",
          x: 2.65,
          z: 3,
          height: 2.2,
          rotation: Math.PI,
          inside: true,
          room: "administration",
          station: "exit-admin",
        },
        {
          name: "protection-exit",
          x: 2.65,
          z: 3,
          height: 2.2,
          rotation: Math.PI,
          inside: true,
          room: "protection",
          station: "exit-protection",
        },
      ].map(async (p) => {
        const model = await this.loader.load(
          "kenney-door/doorway.glb",
          { ...p, y: p.inside ? 0.0355 : 0 },
          p.name,
        );
        if (this.disposed || !model) return;
        const root = this.scene.getTransformNodeByName(p.name + "-pivot")!;
        root.parent =
          p.room === "protection"
            ? this.protectionRoot
            : p.inside
              ? this.officeRoot
              : this.courtyardRoot;
        this.objects.register(
          p.station,
          root
            .getChildMeshes()
            .filter((m) => m.getTotalVertices() > 0) as Mesh[],
        );
      }),
    );
    if (this.disposed) return;
    this.objects.register(
      "enter-protection",
      this.scene.meshes.filter(
        (m) =>
          ["roller-door", "door-slat"].includes(m.name) &&
          Math.abs(m.position.x) < 1,
      ) as Mesh[],
    );
    const placements = [
      {
        name: "hero",
        file: "quaternius/worker.gltf",
        x: -1.2,
        z: 4,
        height: 1.72,
        rotation: Math.PI / 2,
      },
      {
        name: "guide",
        file: "office/andrey.glb",
        x: 0.6,
        z: 4,
        height: 1.78,
        rotation: -Math.PI / 2,
      },
      ...[
        [-6.6, 6.25],
        [CABINET.workerX, CABINET.workerZ],
        [7.2, 0.15],
      ].map(([x, z], i) => ({
        name: "worker-" + i,
        file: "quaternius/maintenance-worker.gltf",
        x,
        z,
        height: 1.78,
        rotation: -Math.PI / 2,
      })),
      {
        name: "administrator",
        file: "quaternius/suit.gltf",
        x: 0,
        z: -1.96,
        height: 1.76,
        rotation: 0,
      },
    ];
    await Promise.all(
      placements.map(async (p, i) => {
        const model = await this.loader.load(p.file, { ...p, y: 0 }, p.name);
        if (this.disposed || !model) return;
        const root = this.scene.getTransformNodeByName(p.name + "-pivot")!;
        const idle = model.animationGroups.find(
          (g) => g.name === "Idle_Neutral",
        );
        idle?.start(true);
        idle?.goToFrame(idle.from);
        root.position.y = groundedCharacterY(
          model,
          root,
          i < 2 || i === 3 ? 0.0355 : 0,
        );
        if (i !== 0)
          root.parent =
            p.name === "administrator"
              ? this.officeRoot
              : i === 3
                ? this.protectionRoot
                : this.courtyardRoot;
        if (p.name === "guide") this.guide = root;
        if (p.name === "administrator") {
          idle?.stop();
          seatAdministrator(model);
        }
        if (p.name === "guide" || p.name === "administrator")
          this.objects.register(
            p.name === "guide" ? "guide" : "admin",
            root
              .getChildMeshes()
              .filter((m) => m.getTotalVertices() > 0) as Mesh[],
          );
        if (i === 0) {
          this.hero = root;
          this.walk = new PracticeWalk(root, model, this.camera);
        }
        if (i >= 2 && i < 5) {
          idle?.stop();
          const work = model.animationGroups.find((g) => g.name === "Interact");
          const walk = model.animationGroups.find((g) => g.name === "Walk");
          work?.start(true, 0.65);
          walk?.start(true, 0.8);
          work?.setWeightForAllAnimatables(0);
          walk?.setWeightForAllAnimatables(0);
          this.workers[i - 2] = root;
          this.workMotion[i - 2] = {
            home: root.position.clone(),
            time: 0,
            work,
            walk,
            arms: new WorkingArms(this.scene, model, root),
          };
          root.setEnabled(false);
        }
      }),
    );
    if (this.disposed) return;
    await this.scene.whenReadyAsync();
    if (this.disposed) return;
    this.flow.intro();
  }
  private async changeLocation(location: Location) {
    if (!this.hero || this.transitioning || this.disposed) return;
    const previous = this.location;
    const indoor = location !== "courtyard";
    this.transitioning = true;
    this.walk?.setEnabled(false);
    this.camera.detachControl();
    this.canvas.inert = true;
    this.nearest = "";
    this.flow.ui.prompt("");
    this.flow.ui.hud.hidden = true;
    this.loadingScreen.textContent =
      location === "protection"
        ? "Загрузка склада средств защиты…"
        : indoor
          ? "Загрузка кабинета…"
          : "Загрузка двора…";
    this.loadingScreen.hidden = false;
    // Paint the opaque loading screen before switching scene roots.
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
    if (this.disposed) return;
    this.courtyardRoot.setEnabled(!indoor);
    this.officeRoot.setEnabled(location === "administration");
    this.protectionRoot.setEnabled(location === "protection");
    this.location = location;
    this.hero.position.x = indoor ? 1.5 : previous === "protection" ? 0 : -6;
    this.hero.position.z = indoor
      ? 1.7
      : previous === "protection"
        ? -2.65
        : -0.15;
    this.hero.rotation.y = indoor ? Math.PI : 0;
    this.walk?.setIndoor(
      indoor,
      location === "protection"
        ? canStandInProtection
        : indoor
          ? canStandInOffice
          : undefined,
    );
    this.camera.inertialAlphaOffset =
      this.camera.inertialBetaOffset =
      this.camera.inertialRadiusOffset =
        0;
    this.camera.lowerAlphaLimit = indoor ? 0.8 : null;
    this.camera.upperAlphaLimit = indoor ? 1.65 : null;
    this.camera.lowerRadiusLimit = indoor ? 8 : 3;
    this.camera.upperRadiusLimit = indoor ? 12 : 24;
    this.camera.upperBetaLimit = indoor ? 1.1 : 1.35;
    this.camera.alpha = indoor ? 1.3 : 1.05;
    this.camera.beta = indoor ? 0.88 : 0.93;
    this.camera.radius = indoor ? 10.8 : 15;
    this.camera.setTarget(
      indoor
        ? new Vector3(0, 0.65, 0)
        : this.hero.position.add(new Vector3(0, 0.9, 0)),
    );
    this.camera.radius = indoor ? 10.8 : 15;
    await this.scene.whenReadyAsync();
    if (this.disposed) return;
    this.scene.render();
    await new Promise((resolve) => setTimeout(resolve, 450));
    if (this.disposed) return;
    this.loadingScreen.hidden = true;
    this.flow.ui.hud.hidden = false;
    this.transitioning = false;
    this.canvas.inert = false;
    this.camera.attachControl(this.canvas, false);
    this.walk?.setEnabled(
      this.flow.started && !this.flow.ui.open && !this.finished,
    );
    this.canvas.focus();
  }
  private startPhoto(id: number) {
    if (!this.flow.state.jobs[id]?.received) return;
    this.startObjectView(id);
  }
  private startObjectView(
    id: number,
    inspection?: { result: boolean; done: () => void },
  ) {
    this.photoTask = id;
    this.camera.detachControl();
    this.camera.inertialAlphaOffset = 0;
    this.camera.inertialBetaOffset = 0;
    this.camera.inertialRadiusOffset = 0;
    this.walk?.setEnabled(false);
    this.hero?.setEnabled(false);
    this.flow.ui.prompt("");
    this.cameraBefore = {
      alpha: this.camera.alpha,
      beta: this.camera.beta,
      radius: this.camera.radius,
      target: this.camera.target.clone(),
    };
    this.camera.lowerRadiusLimit = 2;
    this.camera.upperRadiusLimit = null;
    this.camera.lowerAlphaLimit = id === 1 ? 0.65 : null;
    this.camera.upperAlphaLimit = id === 1 ? 2.4 : null;
    this.camera.setTarget(PHOTO_TARGETS[id].center.clone());
    this.camera.alpha = id === 1 ? 1.35 : id === 0 ? -Math.PI / 2 : Math.PI / 2;
    this.camera.beta = 1;
    this.frameObject(id);
    this.photoBar.replaceChildren();
    const help = document.createElement("p");
    help.textContent = inspection
      ? `${TASKS[id].title}. ${inspection.result ? TASKS[id].result : TASKS[id].observation}`
      : TASKS[id].title;
    const shoot = document.createElement("button");
    shoot.textContent = inspection
      ? inspection.result
        ? "Принять работу"
        : "Завершить осмотр"
      : "Сделать снимок";
    shoot.onclick = () => {
      if (inspection) {
        this.stopPhoto();
        inspection.done();
      } else this.takePhoto();
    };
    const back = document.createElement("button");
    back.textContent = "Назад";
    back.onclick = () => this.stopPhoto();
    this.photoBar.append(help, shoot, back);
    this.flow.ui.hud.hidden = true;
    this.photoBar.hidden = false;
    this.reticle.hidden = !!inspection;
  }
  private photoFrame() {
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.min(680, rect.width * 0.8);
    const height = Math.min(430, rect.height * 0.58);
    return {
      rect,
      width,
      height,
      x: (rect.width - width) / 2,
      y: (rect.height - height) / 2,
    };
  }
  private frameObject(id: number) {
    const { rect, width, height, x, y } = this.photoFrame();
    const radius = PHOTO_TARGETS[id].size.length() / 2;
    const halfAngle = Math.atan(
      ((Math.tan(this.camera.fov / 2) * Math.min(width, height)) /
        Math.max(1, rect.height)) *
        0.84,
    );
    this.camera.radius = Math.max(3, radius / Math.sin(halfAngle));
    Object.assign(this.reticle.style, {
      left: `${rect.left + x}px`,
      top: `${rect.top + y}px`,
      width: `${width}px`,
      height: `${height}px`,
    });
  }
  private takePhoto() {
    if (this.photoTask === null || this.disposed) return;
    const id = this.photoTask;
    this.scene.render();
    const { rect, width, height, x, y } = this.photoFrame();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const snapshot = document.createElement("canvas");
    snapshot.width = Math.round(width * scaleX);
    snapshot.height = Math.round(height * scaleY);
    const context = snapshot.getContext("2d");
    if (!context) return;
    context.drawImage(
      this.canvas,
      x * scaleX,
      y * scaleY,
      width * scaleX,
      height * scaleY,
      0,
      0,
      snapshot.width,
      snapshot.height,
    );
    const url = snapshot.toDataURL("image/jpeg", 0.8);
    // The fixed camera frames the complete object; the player chooses the report attachment.
    this.flow.state.addPhoto(id, true, url);
    this.stopPhoto();
    this.showSavedPhoto(url);
  }
  private showSavedPhoto(url: string) {
    this.photoFlight?.cancel();
    this.photoNotice?.remove();
    const notice = document.createElement("div");
    notice.className = "saved-photo";
    notice.setAttribute("role", "status");
    const title = document.createElement("strong");
    title.textContent = "Снимок сохранён";
    const image = document.createElement("img");
    image.src = url;
    image.alt = "";
    notice.append(title, image);
    document.body.append(notice);
    this.photoNotice = notice;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const animation = notice.animate(
      reduced
        ? [{ opacity: 1 }, { opacity: 0 }]
        : [
            {
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%) scale(1)",
              opacity: 1,
              offset: 0,
            },
            {
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%) scale(1)",
              opacity: 1,
              offset: 0.45,
            },
            {
              left: "36px",
              top: "36px",
              transform: "translate(-50%, -50%) scale(0.08)",
              opacity: 0,
              offset: 1,
            },
          ],
      {
        duration: reduced ? 1200 : 1600,
        easing: "ease-in-out",
        fill: "forwards",
      },
    );
    this.photoFlight = animation;
    void animation.finished
      .then(() => {
        notice.remove();
        if (this.photoNotice === notice) {
          this.photoNotice = undefined;
          this.photoFlight = undefined;
        }
      })
      .catch(() => notice.remove());
  }
  private stopPhoto() {
    this.photoTask = null;
    this.hero?.setEnabled(true);
    this.flow.ui.hud.hidden = false;
    this.photoBar.hidden = true;
    this.reticle.hidden = true;
    this.camera.lowerRadiusLimit = this.indoor ? 8 : 3;
    this.camera.upperRadiusLimit = this.indoor ? 12 : 24;
    this.camera.lowerAlphaLimit = this.indoor ? 0.8 : null;
    this.camera.upperAlphaLimit = this.indoor ? 1.65 : null;
    if (this.cameraBefore) {
      const c = this.cameraBefore;
      this.camera.setTarget(c.target);
      this.camera.alpha = c.alpha;
      this.camera.beta = c.beta;
      this.camera.radius = c.radius;
      this.cameraBefore = undefined;
    }
    this.walk?.setEnabled(!this.flow.ui.open && !this.finished);
    if (!this.flow.ui.open && !this.finished)
      this.camera.attachControl(this.canvas, false);
    this.canvas.focus();
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    window.removeEventListener("keydown", this.key);
    window.removeEventListener("resize", this.resize);
    document.removeEventListener("visibilitychange", this.visibility);
    this.engine.stopRenderLoop(this.render);
    this.walk?.dispose();
    this.workLabels.dispose();
    this.workMotion.forEach((m) => m.arms.dispose());
    this.flow.dispose();
    this.ending?.dispose();
    this.dayTransition.dispose();
    this.photoFlight?.cancel();
    this.photoNotice?.remove();
    this.photoBar.remove();
    this.reticle.remove();
    this.loadingScreen.remove();
    this.objects.dispose();
    this.loader.dispose();
    this.scene.dispose();
    this.engine.dispose();
  }
}
