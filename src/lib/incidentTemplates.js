const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

const OPS = ['OPERATION BLACKWELL', 'OPERATION LEATHER JACKET', 'OPERATION CUDA CORE', 'OPERATION TRILLION DOLLAR MOAT', 'OPERATION RTX ON', 'OPERATION GPU SHORTAGE']
const ASSETS = ['a suspiciously well-rendered barista', 'a guy who keeps saying "I own 8 H100s"', 'an AMD fan in a trench coat', 'a "just wants to network" venture capitalist', 'a golden retriever with a CUDA certification']
const FINDINGS = [
  'Subject jawline renders at 240 fps with ray tracing on. Your frame rate is dropping.',
  'Subject told your partner "the more you buy, the more you save." Suspicious.',
  'Detected unauthorized flexing of 8x H100s at 40 feet.',
  'Eye contact held for 4.2 seconds. Keynote limit is 3.0.',
  'Subject out-mogged you in 2 frames. Latency: negligible.',
]
const ACTIONS = [
  'Hold hands immediately. Make it visible.',
  'Deploy the "this is my partner" keynote.',
  'Buy more GPUs. Save more partner.',
  'Book dinner. Pick the good restaurant.',
  'Put on a leather jacket. Do not blink.',
]

export function generateIncident(source = 'manual') {
  const id = `HNY-${Math.floor(1000 + Math.random() * 9000)}-${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`
  return {
    id,
    source,
    operation: pick(OPS),
    asset: pick(ASSETS),
    finding: pick(FINDINGS),
    action: pick(ACTIONS),
    time: new Date(),
    disclaimer: 'Filed by the Bureau of Rizz. The more you report, the more you save.',
  }
}
