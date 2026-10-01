import type { AssetContainer } from "@babylonjs/core/assetContainer";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Scene } from "@babylonjs/core/scene";
import { Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";

/** Layer a two-handed working pose after the authored walk/interact animations. */
export class WorkingArms {
  private time = 0;
  private weight = 0;
  private readonly observer;
  private readonly arms;
  constructor(
    private scene: Scene,
    container: AssetContainer,
    private root: TransformNode,
  ) {
    const joint = (name: string) =>
      container.transformNodes.find((n) => n.name === name)!;
    this.arms = ["L", "R"].map((side) => {
      const upper = joint(`UpperArm.${side}`),
        lower = joint(`LowerArm.${side}`),
        wrist = joint(`Wrist.${side}`);
      return {
        upper,
        lower,
        wrist,
        index: joint(`Index2.${side}`),
        pinky: joint(`Pinky2.${side}`),
        a: Vector3.Distance(this.position(upper), this.position(lower)),
        b: Vector3.Distance(this.position(lower), this.position(wrist)),
      };
    });
    this.observer = scene.onAfterAnimationsObservable.add(() => this.apply());
  }
  update(time: number, weight: number) {
    this.time = time;
    this.weight = weight;
  }
  private position(node: TransformNode) {
    node.computeWorldMatrix(true);
    return node.getAbsolutePosition().clone();
  }
  private aim(node: TransformNode, target: Vector3) {
    const parent = node.parent as TransformNode;
    parent.computeWorldMatrix(true);
    const desired = Vector3.TransformCoordinates(
      target,
      Matrix.Invert(parent.getWorldMatrix()),
    )
      .subtract(node.position)
      .normalize();
    const q =
        node.rotationQuaternion ?? Quaternion.FromEulerVector(node.rotation),
      m = Matrix.Identity();
    Matrix.FromQuaternionToRef(q, m);
    const current = Vector3.TransformNormal(Vector3.Up(), m).normalize(),
      delta = Quaternion.Identity();
    Quaternion.FromUnitVectorsToRef(current, desired, delta);
    node.rotationQuaternion = delta.multiply(q).normalize();
    node.computeWorldMatrix(true);
  }
  private apply() {
    if (this.weight <= 0 || !this.root.isEnabled()) return;
    const forward = new Vector3(
      Math.sin(this.root.rotation.y),
      0,
      Math.cos(this.root.rotation.y),
    );
    const right = new Vector3(forward.z, 0, -forward.x),
      origin = this.root.getAbsolutePosition();
    this.arms.forEach((arm, i) => {
      const nodes = [arm.upper, arm.lower, arm.wrist],
        before = nodes.map((n) => n.rotationQuaternion!.clone());
      const start = this.position(arm.upper),
        sign = Math.sign(Vector3.Dot(start.subtract(origin), right)) || 1;
      const rhythm = Math.sin(this.time * 3.4 + i * 0.8);
      const target = origin
        .add(forward.scale(0.43 + 0.035 * rhythm))
        .add(right.scale(sign * 0.2));
      target.y = origin.y + 1.08 + 0.04 * rhythm;
      const direction = target.subtract(start).normalize(),
        distance = Math.max(
          Math.abs(arm.a - arm.b) + 0.001,
          Math.min(Vector3.Distance(start, target), arm.a + arm.b - 0.008),
        );
      const along =
        (arm.a * arm.a - arm.b * arm.b + distance * distance) / (2 * distance);
      const pole = right.scale(sign * 0.5).add(new Vector3(0, -1, 0));
      const bend = pole
        .subtract(direction.scale(Vector3.Dot(pole, direction)))
        .normalize();
      const elbow = start
        .add(direction.scale(along))
        .add(bend.scale(Math.sqrt(Math.max(0, arm.a * arm.a - along * along))));
      this.aim(arm.upper, elbow);
      this.aim(arm.lower, start.add(direction.scale(distance)));
      const handForward = forward.add(new Vector3(0, -0.12, 0)).normalize();
      this.aim(arm.wrist, this.position(arm.wrist).add(handForward));
      const measure = () => {
        const across = this.position(arm.index).subtract(
          this.position(arm.pinky),
        );
        return across
          .subtract(handForward.scale(Vector3.Dot(across, handForward)))
          .normalize();
      };
      const across = measure(),
        inward = right.scale(-sign),
        roll = Math.atan2(
          Vector3.Dot(handForward, Vector3.Cross(across, inward)),
          Vector3.Dot(across, inward),
        );
      const parent = arm.wrist.parent as TransformNode;
      parent.computeWorldMatrix(true);
      const localAxis = Vector3.TransformNormal(
          handForward,
          Matrix.Invert(parent.getWorldMatrix()),
        ).normalize(),
        base = arm.wrist.rotationQuaternion!.clone();
      let best = base,
        error = Infinity;
      for (const angle of [roll, -roll]) {
        arm.wrist.rotationQuaternion = Quaternion.RotationAxis(
          localAxis,
          angle,
        ).multiply(base);
        arm.wrist.computeWorldMatrix(true);
        const e = 1 - Vector3.Dot(measure(), inward);
        if (e < error) {
          error = e;
          best = arm.wrist.rotationQuaternion.clone();
        }
      }
      arm.wrist.rotationQuaternion = best;
      nodes.forEach((n, j) => {
        n.rotationQuaternion = Quaternion.Slerp(
          before[j],
          n.rotationQuaternion!,
          Math.min(1, this.weight),
        );
        n.computeWorldMatrix(true);
      });
    });
  }
  dispose() {
    this.scene.onAfterAnimationsObservable.remove(this.observer);
  }
}
