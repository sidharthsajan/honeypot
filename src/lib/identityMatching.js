import * as faceapi from '@vladmandic/face-api'

// Real face matching: 128-d face descriptors compared by Euclidean distance.
// Only the numeric descriptor is stored locally; no images are kept.
// Matching proves "looks like the enrolled photo", not trustworthiness.

let modelsPromise = null
export function loadFaceModels() {
  if (!modelsPromise) {
    const url = `${import.meta.env.BASE_URL}face-models`
    modelsPromise = Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(url),
      faceapi.nets.faceLandmark68Net.loadFromUri(url),
      faceapi.nets.faceRecognitionNet.loadFromUri(url),
    ]).catch((e) => { modelsPromise = null; throw e })
  }
  return modelsPromise
}

const opts = () => new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 })

// input: HTMLImageElement | HTMLVideoElement. Returns number[] or null if no face.
export async function describeFace(input) {
  await loadFaceModels()
  const r = await faceapi.detectSingleFace(input, opts()).withFaceLandmarks().withFaceDescriptor()
  return r ? Array.from(r.descriptor) : null
}

// Returns descriptors for all faces plus box area, to pick the most prominent.
export async function describeAllFaces(video) {
  await loadFaceModels()
  const rs = await faceapi.detectAllFaces(video, opts()).withFaceLandmarks().withFaceDescriptors()
  return rs.map((r) => ({ descriptor: r.descriptor, area: r.detection.box.width * r.detection.box.height }))
}

export function distance(a, b) {
  let s = 0
  for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2
  return Math.sqrt(s)
}

export function imageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => { resolve(img); setTimeout(() => URL.revokeObjectURL(url), 1000) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read image')) }
    img.src = url
  })
}
