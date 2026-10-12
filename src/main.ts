import * as faceapi from "@vladmandic/face-api";
import { greeting } from "./greeting";
import { identify, type Person } from "./recognition";
import { estimatePose, poseMatches, STEPS, type Pose } from "./pose";

const STORAGE_KEY = "face-greeter:people";
const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/";
const SAMPLES_PER_STEP = 3;
const CONFIRM_FRAMES = 3; // consecutive matches required before greeting
const GREET_COOLDOWN_MS = 30_000; // don't greet again until you've been away this long
const LOST_GRACE_MS = 1500;

const video = document.getElementById("video") as HTMLVideoElement;
const canvas = document.getElementById("overlay") as HTMLCanvasElement;
const greetingEl = document.getElementById("prompt")!;
const doorEl = document.getElementById("door")!;
const doorTextEl = document.getElementById("doorText")!;
const landingEl = document.getElementById("landing")!;
const appEl = document.getElementById("app")!;
const statusEl = document.getElementById("status")!;
const startBtn = document.getElementById("start") as HTMLButtonElement;
const enrollBtn = document.getElementById("enroll") as HTMLButtonElement;
const resetBtn = document.getElementById("reset") as HTMLButtonElement;
const nameInput = document.getElementById("name") as HTMLInputElement;
const ctx = canvas.getContext("2d")!;

let people: Person[] = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
let enrollingName = "";
let enrolling = false;

const detectorOptions = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.3 });

function speak(text: string) {
  speechSynthesis.cancel();
  speechSynthesis.speak(new SpeechSynthesisUtterance(text));
}

/** Speak and resolve when finished (with a fallback so we never hang). */
function speakAndWait(text: string): Promise<void> {
  return new Promise((resolve) => {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const done = () => resolve();
    u.onend = done;
    u.onerror = done;
    setTimeout(done, 4000);
    speechSynthesis.speak(u);
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function openDoor(text: string) {
  doorTextEl.textContent = text;
  doorEl.classList.add("open");
  doorEl.classList.remove("hidden-door");
}

function closeDoor() {
  doorEl.classList.remove("open");
  // Keep the closed door visible only briefly, then fade it away so the camera is visible.
  setTimeout(() => {
    if (!doorEl.classList.contains("open")) doorEl.classList.add("hidden-door");
  }, 1300);
}

// Serialize model runs so the background loop and enrollment never overlap.
let queue: Promise<unknown> = Promise.resolve();
function detect() {
  const run = async () =>
    await faceapi.detectSingleFace(video, detectorOptions).withFaceLandmarks().withFaceDescriptor();
  const p = queue.then(run);
  queue = p.catch(() => undefined);
  return p;
}

function markNameMissing() {
  nameInput.classList.add("invalid");
  statusEl.textContent = "Please type your name first. I need it to greet you.";
  nameInput.focus();
}

async function enroll() {
  const name = nameInput.value.trim();
  if (!name) {
    markNameMissing();
    return;
  }
  nameInput.classList.remove("invalid");
  nameInput.disabled = true;
  enrollingName = name;
  enrolling = true;
  enrollBtn.disabled = true;
  try {
    await runEnroll();
  } catch (e) {
    greetingEl.textContent = "";
    statusEl.textContent = `Enrollment failed: ${e instanceof Error ? e.message : String(e)}`;
  } finally {
    enrolling = false;
    nameInput.disabled = false;
    enrollBtn.disabled = !nameInput.value.trim();
  }
}

const STEP_TIMEOUT_MS = 20_000;

const FRONT_SAMPLES = 8;
const FUN_STEP_MS = 6_000; // how long we wait for each "extra" angle before moving on

async function runEnroll() {
  const captured: number[][] = [];
  const centerPoses: Pose[] = [];
  let base: Pose | null = null;

  for (const [i, { step, prompt, speech }] of STEPS.entries()) {
    const isFront = step === "center";
    if (i === 0) await speakAndWait(speech);
    const stepStart = performance.now();
    const limit = isFront ? STEP_TIMEOUT_MS : FUN_STEP_MS;
    let got = 0;
    let wasMatching = false;

    // Only the front-facing step saves samples. The other angles are for fun:
    // we watch for the pose briefly, but say "Good" whether or not it was detected.
    while (isFront ? got < FRONT_SAMPLES : true) {
      if (performance.now() - stepStart > limit) {
        if (isFront) {
          throw new Error("Couldn't capture your face. Make sure it's well lit and fully visible, then try again.");
        }
        break;
      }
      greetingEl.textContent = prompt;
      const result = await detect();
      if (!result) {
        statusEl.textContent = `Step ${i + 1}/${STEPS.length} — can't see your face, keep it in frame`;
        await sleep(150);
        continue;
      }
      const pose = estimatePose(result.landmarks.positions);
      if (isFront) {
        centerPoses.push(pose);
        base = {
          yaw: centerPoses.reduce((s, p) => s + p.yaw, 0) / centerPoses.length,
          pitch: centerPoses.reduce((s, p) => s + p.pitch, 0) / centerPoses.length,
        };
        captured.push(Array.from(result.descriptor));
        got++;
        statusEl.textContent = `Step 1/${STEPS.length} — capturing (${got}/${FRONT_SAMPLES})`;
        await sleep(350);
        continue;
      }
      statusEl.textContent = `Step ${i + 1}/${STEPS.length} — hold the pose`;
      const matching = poseMatches(step, pose, base ?? pose);
      if (matching && wasMatching) break;
      wasMatching = matching;
      await sleep(150);
    }

    const next = STEPS[i + 1];
    await speakAndWait(next ? `Good. ${next.speech}` : "Good.");
  }

  // Re-enrolling with the same name replaces that person's samples.
  people = people.filter((p) => p.name.toLowerCase() !== enrollingName.toLowerCase());
  people.push({ name: enrollingName, samples: captured });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(people));

  greetingEl.textContent = "😄 Gotcha! I only needed your front face.";
  statusEl.textContent = `Enrolled ${enrollingName}! Step away and come back to be greeted.`;
  await speakAndWait(
    `Confession time, ${enrollingName}. I never actually needed those other angles. Your front face was all I needed. Thank you for listening to me. Hahaha!`,
  );
}

async function start() {
  startBtn.disabled = true;
  landingEl.hidden = true;
  appEl.hidden = false;
  statusEl.textContent = "Loading models…";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tf = faceapi.tf as any;
  try {
    await tf.setBackend("webgl");
  } catch {
    // fall back to whatever TensorFlow picks
  }
  await tf.ready();
  const backend: string = tf.getBackend();
  console.log("TensorFlow backend:", backend);
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ]);
  video.srcObject = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
  await video.play();

  enrollBtn.hidden = false;
  resetBtn.hidden = false;
  nameInput.hidden = false;
  enrollBtn.disabled = !nameInput.value.trim();
  nameInput.oninput = () => {
    const hasName = nameInput.value.trim().length > 0;
    enrollBtn.disabled = enrolling || !hasName;
    if (hasName) nameInput.classList.remove("invalid");
  };
  nameInput.onkeydown = (e) => {
    if (e.key === "Enter" && !enrolling) void enroll();
  };
  enrollBtn.onclick = () => void enroll();
  resetBtn.onclick = () => {
    people = [];
    localStorage.removeItem(STORAGE_KEY);
    statusEl.textContent = "All enrolled faces deleted.";
  };
  if (backend !== "webgl") {
    statusEl.textContent = `Warning: running on "${backend}" backend (slow). Enable hardware acceleration in your browser.`;
  } else
  statusEl.textContent = people.length
    ? `Ready. Enrolled: ${people.map((p) => p.name).join(", ")}`
    : "Type your name and click “Enroll my face”.";

  let lastSeen = -Infinity;
  const lastGreeted = new Map<string, number>();
  let streak = 0;
  let streakName = "";

  const loop = async () => {
    try {
    if (!enrolling) {
      const now = performance.now();
      const result = await detect();
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (result) {
        const person = identify(result.descriptor, people);
        const b = result.detection.box;
        ctx.strokeStyle = person ? "#4ade80" : "#f87171";
        ctx.lineWidth = 3;
        ctx.strokeRect(b.x, b.y, b.width, b.height);

        if (person) {
          streak = person.name === streakName ? streak + 1 : 1;
          streakName = person.name;
          lastSeen = now;
          if (streak >= CONFIRM_FRAMES) {
            const text = `${greeting(new Date())} ${person.name}!`;
            doorTextEl.textContent = text;
            if (!doorEl.classList.contains("open")) openDoor(text);
            if (now - (lastGreeted.get(person.name) ?? -Infinity) > GREET_COOLDOWN_MS) speak(text);
            lastGreeted.set(person.name, now);
          }
        } else {
          streak = 0;
          streakName = "";
          if (people.length) statusEl.textContent = "I don't recognize you.";
        }
      } else {
        streak = 0;
        if (now - lastSeen > LOST_GRACE_MS) closeDoor();
      }
    }
    } catch (e) {
      console.error(e);
    }
    setTimeout(() => void loop(), 150);
  };
  void loop();
}

document.getElementById("share")!.onclick = async (ev) => {
  const btn = ev.currentTarget as HTMLButtonElement;
  const data = { title: "Face Greeter", text: "A door that knows you. Try Face Greeter!", url: location.href };
  try {
    if (navigator.share) {
      await navigator.share(data);
    } else {
      await navigator.clipboard.writeText(location.href);
      btn.textContent = "Link copied!";
      setTimeout(() => (btn.textContent = "Share"), 2000);
    }
  } catch {
    // user cancelled the share sheet
  }
};

startBtn.onclick = () => {
  start().catch((e) => {
    document.getElementById("error")!.textContent = `Couldn't start: ${e instanceof Error ? e.message : String(e)}`;
    landingEl.hidden = false;
    appEl.hidden = true;
    startBtn.disabled = false;
  });
};
