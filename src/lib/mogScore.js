// Entertainment-only facial geometry heuristic. Not a validated attractiveness metric.
// All distances are computed in pixel space (to respect aspect ratio) and then
// normalised by face width, so the score is scale-invariant.

export const WEIGHTS = {
  symmetry: 0.3,
  proportion: 0.2,
  jaw: 0.15,
  eyes: 0.15,
  harmony: 0.2,
}

export const LABELS = {
  symmetry: 'Symmetry',
  proportion: 'Proportions',
  jaw: 'Jawline',
  eyes: 'Eyes',
  harmony: 'Harmony',
}

const clamp01 = (v) => Math.max(0, Math.min(1, v))
const closeness = (value, target, tol) => clamp01(1 - Math.abs(value - target) / tol)
const mean = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length

// MediaPipe face mesh indices (468-point topology)
const I = {
  top: 10, chin: 152, bridge: 168, noseTip: 1, noseBase: 2,
  cheekL: 234, cheekR: 454,
  eyeOuterL: 33, eyeInnerL: 133, eyeOuterR: 263, eyeInnerR: 362,
  eyeTopL: 159, eyeBotL: 145, eyeTopR: 386, eyeBotR: 374,
  mouthL: 61, mouthR: 291,
  jawL: 172, jawR: 397, jawLowL: 58, jawLowR: 288, jawMidL: 132, jawMidR: 361,
  noseWingL: 129, noseWingR: 358,
}

const PAIRS = [
  [I.eyeOuterL, I.eyeOuterR], [I.eyeInnerL, I.eyeInnerR], [I.mouthL, I.mouthR],
  [I.cheekL, I.cheekR], [I.jawL, I.jawR], [I.jawLowL, I.jawLowR],
  [I.jawMidL, I.jawMidR], [I.noseWingL, I.noseWingR], [70, 300], [105, 334],
]

export function computeMog(lm, w, h) {
  if (!lm || lm.length < 468) return { available: false, reason: 'No landmarks' }
  const p = (i) => ({ x: lm[i].x * w, y: lm[i].y * h })
  const d = (a, b) => Math.hypot(p(a).x - p(b).x, p(a).y - p(b).y)

  const W = d(I.cheekL, I.cheekR)
  const H = d(I.top, I.chin)
  if (!(W > 0) || !(H > 0)) return { available: false, reason: 'Degenerate landmarks' }
  if (W < 90) return { available: false, reason: 'Move closer to the camera' }

  // Pose gate: reject strong yaw / pitch instead of showing a misleading score
  const yaw = Math.abs(d(I.noseTip, I.cheekL) - d(I.noseTip, I.cheekR)) / W
  const top = p(I.top), chin = p(I.chin), nose = p(I.noseTip)
  const pitchT = ((nose.x - top.x) * (chin.x - top.x) + (nose.y - top.y) * (chin.y - top.y)) / (H * H)
  if (yaw > 0.22) return { available: false, reason: 'Face the camera directly' }
  if (pitchT < 0.4 || pitchT > 0.8) return { available: false, reason: 'Level your head with the camera' }

  // Face axis frame (handles head roll)
  const u = { x: (chin.x - top.x) / H, y: (chin.y - top.y) / H }
  const v = { x: -u.y, y: u.x }
  const origin = p(I.bridge)
  const across = (i) => (p(i).x - origin.x) * v.x + (p(i).y - origin.y) * v.y
  const along = (i) => (p(i).x - origin.x) * u.x + (p(i).y - origin.y) * u.y

  const asym = mean(
    PAIRS.map(([a, b]) => (Math.abs(across(a) + across(b)) + Math.abs(along(a) - along(b))) / 2 / W),
  )
  const symmetry = closeness(asym, 0, 0.1)

  const interocular = d(I.eyeOuterL, I.eyeOuterR)
  const proportion = mean([
    closeness(H / W, 1.4, 0.4),
    closeness(interocular / W, 0.62, 0.22),
    closeness(d(I.mouthL, I.mouthR) / interocular, 0.65, 0.3),
  ])

  const chainL = d(I.cheekL, I.jawMidL) + d(I.jawMidL, I.jawLowL) + d(I.jawLowL, I.jawL) + d(I.jawL, I.chin)
  const chainR = d(I.cheekR, I.jawMidR) + d(I.jawMidR, I.jawLowR) + d(I.jawLowR, I.jawR) + d(I.jawR, I.chin)
  const jaw = mean([
    closeness(d(I.jawL, I.jawR) / W, 0.78, 0.3),
    closeness(chainL / chainR, 1, 0.15),
    closeness(Math.abs(across(I.chin)) / W, 0, 0.07),
  ])

  const wL = d(I.eyeOuterL, I.eyeInnerL), wR = d(I.eyeOuterR, I.eyeInnerR)
  const oL = d(I.eyeTopL, I.eyeBotL) / wL, oR = d(I.eyeTopR, I.eyeBotR) / wR
  const eyes = mean([
    closeness(Math.abs(oL - oR), 0, 0.12),
    closeness(Math.abs(wL - wR) / ((wL + wR) / 2), 0, 0.15),
    closeness(d(I.eyeInnerL, I.eyeInnerR) / ((wL + wR) / 2), 1, 0.5),
    closeness((oL + oR) / 2, 0.3, 0.25),
  ])

  const t1 = d(I.top, I.bridge), t2 = d(I.bridge, I.noseBase), t3 = d(I.noseBase, I.chin)
  const tm = (t1 + t2 + t3) / 3
  const thirdsDev = mean([t1, t2, t3].map((t) => Math.abs(t - tm))) / tm
  const harmony = mean([
    closeness(thirdsDev, 0, 0.4),
    closeness(d(I.noseWingL, I.noseWingR) / d(I.eyeInnerL, I.eyeInnerR), 1, 0.5),
  ])

  const components = { symmetry, proportion, jaw, eyes, harmony }
  if (Object.values(components).some((c) => Number.isNaN(c))) {
    return { available: false, reason: 'Landmark noise — hold still' }
  }
  return { available: true, components, score: scoreFrom(components) }
}

export function scoreFrom(components) {
  const raw = Object.keys(WEIGHTS).reduce((acc, k) => acc + WEIGHTS[k] * components[k], 0)
  return Math.round(clamp01(raw) * 100) / 10
}
