"use client";

import React, { useEffect, useRef, useState } from "react";

// Symmetrical spacing proportions relative to the center (400)
const LETTER_OFFSETS = [
  { char: "S", dx: -91 },
  { char: "t", dx: -65 },
  { char: "u", dx: -47 },
  { char: "d", dx: -25 },
  { char: "i", dx: -6 },
  { char: "o", dx: 7 },
  { char: "F", dx: 33 },
  { char: "l", dx: 51 },
  { char: "o", dx: 64 },
  { char: "w", dx: 91 },
];

const TONE_FREQS = [
  261.63, // S - C5
  293.66, // t - D4
  329.63, // u - E4
  392.0, // d - G4
  440.0, // i - A4
  523.25, // o - C5
  587.33, // F - D5
  659.25, // l - E5
  783.99, // o - G5
  880.0, // w - A5
];

export interface InkDrip {
  xOffset: number;
  length: number;
  targetLength: number;
  width: number;
}

export interface InkParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  color: string;
}

type MotionState =
  | "INTRO"
  | "BALL_DROP"
  | "BOUNCE_FORWARD"
  | "BOUNCE_BACKWARD"
  | "RISE_BACK"
  | "COOLDOWN";

export default function MotionGraphicStage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Core state configurations
  const [isPlaying, setIsPlaying] = useState(true);
  const [audioEnabled] = useState(false);
  const [bounceSpeed] = useState(300);
  const [gravityFactor] = useState(1.4);
  const [, setScrubValue] = useState(0);

  // Physics & Animation mutable state for high performant 60fps frame renders
  const animStateRef = useRef({
    state: "INTRO" as MotionState,
    introProgress: 0.0,
    dropProgress: 0.0,
    bounceIndex: 0,
    bounceProgress: 0.0,
    riseProgress: 0.0,
    cooldownProgress: 0.0,
    ballX: 428,
    ballY: 142,
    ballRadius: 20,
    lettersHit: Array(10).fill(false),
    trackingFactor: 1.0,
    particles: [] as InkParticle[],
    inkDrips: LETTER_OFFSETS.map((offset, i) =>
      i === 0
        ? [
            {
              xOffset: -4,
              length: 0,
              targetLength: 28,
              width: 2.2,
            },
            {
              xOffset: 4,
              length: 0,
              targetLength: 35,
              width: 1.8,
            },
          ]
        : [],
    ) as InkDrip[][],
  });

  // Track state transitions to spawn beautiful organic splatter bursts precisely on impact milliseconds
  const lastStateTrack = useRef({
    lastState: "" as MotionState,
    lastBounceIndex: -1,
  });

  const resetTimeline = () => {
    const s = animStateRef.current;
    s.state = "INTRO";
    s.introProgress = 0.0;
    s.dropProgress = 0.0;
    s.bounceIndex = 0;
    s.bounceProgress = 0.0;
    s.riseProgress = 0.0;
    s.cooldownProgress = 0.0;
    s.lettersHit.fill(false);
    s.trackingFactor = 1.0;
    s.ballRadius = 20;
    s.particles = [];
    s.inkDrips.forEach((drips) => {
      drips.forEach((d) => (d.length = 0));
    });
    setScrubValue(0);
  };

  const getLetterX = (index: number, tf: number) => {
    return 400 + LETTER_OFFSETS[index].dx * tf;
  };

  const triggerAudioTick = (freq: number, isLower = false) => {
    if (!audioEnabled) return;
    try {
      const audioCtx = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(
        isLower ? freq * 0.8 : freq,
        audioCtx.currentTime,
      );

      gainNode.gain.setValueAtTime(0.04, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.0001,
        audioCtx.currentTime + 0.25,
      );

      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } catch (err) {
      console.warn("WebAudio initialize deferred.", err);
    }
  };

  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const renderLoop = (timestamp: number) => {
      const elapsed = timestamp - lastTime;
      lastTime = timestamp;

      const canvas = canvasRef.current;
      if (!canvas) {
        animId = requestAnimationFrame(renderLoop);
        return;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        animId = requestAnimationFrame(renderLoop);
        return;
      }

      const s = animStateRef.current;

      // 1. Kinetic Timeline States auto progressive interpolation
      if (isPlaying) {
        if (s.state === "INTRO") {
          s.introProgress += elapsed / 1200; // soft luxurious intro duration
          if (s.introProgress >= 1.0) {
            s.introProgress = 1.0;
            s.state = "BALL_DROP";
            s.dropProgress = 0.0;
          }
          setScrubValue(s.introProgress * 150);
        } else if (s.state === "BALL_DROP") {
          s.dropProgress += elapsed / 600; // accelerating vertical gravitational drop
          if (s.dropProgress >= 1.0) {
            s.dropProgress = 1.0;
            s.state = "BOUNCE_FORWARD";
            s.bounceIndex = 0;
            s.bounceProgress = 0.0;
            s.lettersHit[0] = true;
            triggerAudioTick(TONE_FREQS[0]);
          }
          setScrubValue(150 + s.dropProgress * 150);
        } else if (s.state === "BOUNCE_FORWARD") {
          s.bounceProgress += elapsed / bounceSpeed;
          if (s.bounceProgress >= 1.0) {
            s.bounceProgress = 0.0;
            const nextIdx = s.bounceIndex + 1;
            if (nextIdx < 10) {
              s.bounceIndex = nextIdx;
              s.lettersHit[nextIdx] = true; // Instantly illuminate the solid logo color
              triggerAudioTick(TONE_FREQS[nextIdx]);
            } else {
              // Seamless reversal trajectory instantly upon hitting 'w'
              s.state = "BOUNCE_BACKWARD";
              s.bounceIndex = 9;
              s.bounceProgress = 0.0;
            }
          }
          const rawTotal = (s.bounceIndex + s.bounceProgress) / 9;
          setScrubValue(300 + Math.min(rawTotal, 1.0) * 300);
        } else if (s.state === "BOUNCE_BACKWARD") {
          s.bounceProgress += elapsed / bounceSpeed;
          if (s.bounceProgress >= 1.0) {
            s.bounceProgress = 0.0;
            const prevIdx = s.bounceIndex - 1;
            if (prevIdx >= 0) {
              s.bounceIndex = prevIdx;
              s.lettersHit[prevIdx + 1] = false; // Drain color upon backward impact
              triggerAudioTick(TONE_FREQS[prevIdx], true);
            } else {
              s.lettersHit[0] = false;
              s.state = "RISE_BACK";
              s.riseProgress = 0.0;
            }
          }
          const rawTotal = (9 - s.bounceIndex + s.bounceProgress) / 9;
          setScrubValue(600 + Math.min(rawTotal, 1.0) * 250);
        } else if (s.state === "RISE_BACK") {
          s.riseProgress += elapsed / 850; // smooth sweep vertical rise
          if (s.riseProgress >= 1.0) {
            s.riseProgress = 1.0;
            s.state = "COOLDOWN";
            s.cooldownProgress = 0.0;
          }
          setScrubValue(850 + s.riseProgress * 100);
        } else if (s.state === "COOLDOWN") {
          s.cooldownProgress += elapsed / 2000; // Hold the pristine original logo cleanly
          if (s.cooldownProgress >= 1.0) {
            resetTimeline();
          }
          setScrubValue(950 + Math.min(s.cooldownProgress, 1.0) * 50);
        }
      }

      // Update actual tracking expansion & ball radius on current physics timeline
      if (
        s.state === "INTRO" ||
        s.state === "BALL_DROP" ||
        s.state === "BOUNCE_FORWARD"
      ) {
        s.trackingFactor = 1.0;
      } else if (s.state === "BOUNCE_BACKWARD") {
        const overallBackwardT = (9 - s.bounceIndex + s.bounceProgress) / 9;
        s.trackingFactor = 1.0 + overallBackwardT * 0.28; // Smooth 1.0 to 1.28 tracking gap expansion
      } else if (s.state === "RISE_BACK" || s.state === "COOLDOWN") {
        s.trackingFactor = 1.28;
      }

      // Ball Radius formulas
      if (s.state === "INTRO" || s.state === "BALL_DROP") {
        s.ballRadius = 20;
      } else if (s.state === "BOUNCE_FORWARD") {
        const rawT = s.bounceIndex + s.bounceProgress;
        s.ballRadius = 20 - (rawT / 9.0) * 9.0; // decreases from 20 to 11
      } else if (s.state === "BOUNCE_BACKWARD") {
        s.ballRadius = 11; // remains elegant & small during color vacuum drain
      } else if (s.state === "RISE_BACK") {
        s.ballRadius = 11 + s.riseProgress * 9.0; // beautiful dynamic scaling back to original size 20
      } else if (s.state === "COOLDOWN") {
        s.ballRadius = 20;
      }

      // 2. Trigonometric Ball Positioning math
      let bx = 428;
      let by = 142;
      const bHeight = 55; // Symmetrical athletic bouncing arc height limit

      if (s.state === "INTRO") {
        bx = 428;
        by = 142;
      } else if (s.state === "BALL_DROP") {
        const t = s.dropProgress;
        const targetS_X = getLetterX(0, 1.0);
        bx = 428 + (targetS_X - 428) * t;
        by = 142 + (350 - 142) * Math.pow(t, 2); // Accelerating mechanical drop vector
      } else if (s.state === "BOUNCE_FORWARD") {
        const fromIdx = s.bounceIndex;
        const toIdx = Math.min(fromIdx + 1, 9);
        const t = s.bounceProgress;

        const x1 = getLetterX(fromIdx, 1.0);
        const x2 = getLetterX(toIdx, 1.0);

        bx = x1 + (x2 - x1) * t;
        by = 350 - bHeight * Math.pow(Math.sin(t * Math.PI), 1 / gravityFactor);
      } else if (s.state === "BOUNCE_BACKWARD") {
        const fromIdx = s.bounceIndex;
        const toIdx = Math.max(fromIdx - 1, 0);
        const t = s.bounceProgress;

        const x1 = getLetterX(fromIdx, s.trackingFactor);
        const x2 = getLetterX(toIdx, s.trackingFactor);

        bx = x1 + (x2 - x1) * t;
        by = 350 - bHeight * Math.pow(Math.sin(t * Math.PI), 1 / gravityFactor);
      } else if (s.state === "RISE_BACK") {
        const t = s.riseProgress;
        const xS_Expanded = getLetterX(0, s.trackingFactor);
        bx = xS_Expanded + (428 - xS_Expanded) * t;
        by = 350 + (142 - 350) * Math.pow(t, 0.7); // deceleration lock in
      } else if (s.state === "COOLDOWN") {
        bx = 428;
        by = 142;
      }

      s.ballX = bx;
      s.ballY = by;

      // Update dynamic liquid ink teardrop drips
      s.inkDrips.forEach((drips, idx) => {
        const isFilled = s.lettersHit[idx];
        drips.forEach((d) => {
          if (isFilled) {
            d.length = Math.min(d.targetLength, d.length + elapsed * 0.08); // beautiful bleeding downward speed
          } else {
            d.length = Math.max(0, d.length - elapsed * 0.16); // instant liquid dry up/vacuum wipe
          }
        });
      });

      // Update Particles
      for (let i = s.particles.length - 1; i >= 0; i--) {
        const p = s.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.14; // acceleration of gravity force
        p.alpha -= 0.025; // fade rate
        if (p.alpha <= 0) {
          s.particles.splice(i, 1);
        }
      }

      // 3. Dynamic millisecond impact detector to generate gorgeous particles spray
      const track = lastStateTrack.current;
      const isNewStateEvent = track.lastState !== s.state;
      const isNewIndexEvent = track.lastBounceIndex !== s.bounceIndex;

      if (s.state === "BOUNCE_FORWARD") {
        if (isNewStateEvent || isNewIndexEvent) {
          track.lastState = s.state;
          track.lastBounceIndex = s.bounceIndex;

          const lx = getLetterX(s.bounceIndex, 1.0);
          // Spawn signature lilac-pink gradient kinetic splash droplets
          for (let pCount = 0; pCount < 8; pCount++) {
            s.particles.push({
              x: lx,
              y: 350,
              vx: (Math.random() - 0.5) * 4.5,
              vy: -Math.random() * 2.8 - 1.4,
              radius: 1.5 + Math.random() * 2.2,
              alpha: 1.0,
              color: pCount % 2 === 0 ? "#AFBAFF" : "#F8C1EE",
            });
          }
        }
      } else if (s.state === "BOUNCE_BACKWARD") {
        if (isNewStateEvent || isNewIndexEvent) {
          track.lastState = s.state;
          track.lastBounceIndex = s.bounceIndex;

          const lx = getLetterX(s.bounceIndex, s.trackingFactor);
          // Spawn colorless dark vacuum wiped droplets particles
          for (let pCount = 0; pCount < 6; pCount++) {
            s.particles.push({
              x: lx,
              y: 350,
              vx: (Math.random() - 0.5) * 3,
              vy: -Math.random() * 2 - 1.0,
              radius: 1.2 + Math.random() * 2.0,
              alpha: 0.8,
              color: "#1b2131",
            });
          }
        }
      } else {
        track.lastState = s.state;
        track.lastBounceIndex = -1;
      }

      // 4. Paint 2D High Fidelity Canvas Frame
      ctx.clearRect(0, 0, 800, 500);

      // Render ultra-dark pure slate background
      ctx.fillStyle = "#0c0f16";
      ctx.fillRect(0, 0, 800, 500);

      // Fine premium camera matrix overlay grid Lines
      ctx.strokeStyle = "rgba(175, 186, 255, 0.015)";
      ctx.lineWidth = 1;
      for (let xG = 0; xG < 800; xG += 40) {
        ctx.beginPath();
        ctx.moveTo(xG, 0);
        ctx.lineTo(xG, 500);
        ctx.stroke();
      }
      for (let yG = 0; yG < 500; yG += 40) {
        ctx.beginPath();
        ctx.moveTo(0, yG);
        ctx.lineTo(800, yG);
        ctx.stroke();
      }

      // Premium soft glow radial light behind the logo squircle
      const introGlowAlpha =
        s.state === "INTRO" ? 0.35 + Math.sin(timestamp * 0.003) * 0.08 : 0.28;
      const glowGrad = ctx.createRadialGradient(400, 130, 20, 400, 130, 140);
      glowGrad.addColorStop(0, `rgba(221, 166, 245, ${introGlowAlpha})`);
      glowGrad.addColorStop(0.5, "rgba(175, 186, 255, 0.05)");
      glowGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(400, 130, 150, 0, Math.PI * 2);
      ctx.fill();

      // Render pristine Squircle Logo Box
      ctx.save();
      ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
      ctx.shadowBlur = 28;
      ctx.shadowOffsetY = 14;

      ctx.fillStyle = "#0d111b"; // Ultra dark navy squircle interior
      ctx.strokeStyle = "#1b2131";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(400 - 85, 130 - 85, 170, 170, 36);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // Linear master native colors lilac-lavender-pink gradient
      const logoGradient = ctx.createLinearGradient(350, 76, 450, 160);
      logoGradient.addColorStop(0, "#AFBAFF");
      logoGradient.addColorStop(0.5, "#DDA6F5");
      logoGradient.addColorStop(1, "#F8C1EE");

      // Draw the "F" hook geometry artwork inside custom squircle
      ctx.save();
      ctx.fillStyle = logoGradient;
      ctx.beginPath();
      ctx.arc(374, 93, 17, Math.PI, 1.5 * Math.PI);
      ctx.lineTo(423, 76);
      ctx.arc(423, 93, 17, 1.5 * Math.PI, 0.5 * Math.PI);
      ctx.lineTo(402, 110);
      ctx.arcTo(391, 110, 391, 121, 11);
      ctx.lineTo(391, 135);
      ctx.arc(374, 135, 17, 0, Math.PI);
      ctx.lineTo(357, 93);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      const textGradient = ctx.createLinearGradient(300, 370, 500, 370);
      textGradient.addColorStop(0, "#AFBAFF");
      textGradient.addColorStop(0.5, "#DDA6F5");
      textGradient.addColorStop(1, "#F8C1EE");

      // Render beautiful organic liquid ink teardrop drips BELOW letter fill but above backplane
      LETTER_OFFSETS.forEach((offset, idx) => {
        const letterX = 400 + offset.dx * s.trackingFactor;
        const drips = s.inkDrips[idx];

        let textOpacity = 1.0;
        if (s.state === "INTRO") {
          textOpacity = 0.0;
        } else if (s.state === "BALL_DROP") {
          textOpacity = s.dropProgress;
        } else if (s.state === "RISE_BACK") {
          textOpacity = 1.0 - s.riseProgress;
        } else if (s.state === "COOLDOWN") {
          textOpacity = 0.0;
        }

        if (textOpacity > 0.01) {
          ctx.save();
          ctx.globalAlpha = textOpacity;
          ctx.fillStyle = textGradient;

          drips.forEach((d) => {
            if (d.length > 0) {
              const dx = letterX + d.xOffset;
              const dy1 = 370; // starts at baseline
              const dy2 = 370 + d.length;

              ctx.beginPath();
              ctx.arc(dx, dy2, d.width, 0, Math.PI);
              ctx.lineTo(dx + d.width, dy1);
              ctx.lineTo(dx - d.width, dy1);
              ctx.closePath();
              ctx.fill();
            }
          });
          ctx.restore();
        }
      });

      // Render Wordmark Characters
      LETTER_OFFSETS.forEach((letter, idx) => {
        const letterX = 400 + letter.dx * s.trackingFactor;
        const yBaseline = 370;
        const isHit = s.lettersHit[idx];

        let textOpacity = 1.0;
        if (s.state === "INTRO") {
          textOpacity = 0.0;
        } else if (s.state === "BALL_DROP") {
          textOpacity = s.dropProgress;
        } else if (s.state === "RISE_BACK") {
          textOpacity = 1.0 - s.riseProgress;
        } else if (s.state === "COOLDOWN") {
          textOpacity = 0.0;
        }

        if (textOpacity > 0.01) {
          ctx.save();
          ctx.globalAlpha = textOpacity;

          ctx.font =
            "600 45px 'Plus Jakarta Sans', 'Inter', system-ui, sans-serif";
          ctx.textBaseline = "alphabetic";
          ctx.textAlign = "center";

          if (isHit) {
            ctx.fillStyle = textGradient;
            ctx.fillText(letter.char, letterX, yBaseline);
          } else {
            ctx.strokeStyle = "#1b2131";
            ctx.lineWidth = 1.2;
            ctx.strokeText(letter.char, letterX, yBaseline);
          }
          ctx.restore();
        }
      });

      // Draw Splatter particles
      s.particles.forEach((p) => {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Render the Ball circular element
      let drawBallNow = true;
      if (s.state === "INTRO" || s.state === "COOLDOWN") {
        drawBallNow = true;
      }

      if (drawBallNow) {
        ctx.save();
        const ballGrad = ctx.createLinearGradient(
          bx - s.ballRadius,
          by - s.ballRadius,
          bx + s.ballRadius,
          by + s.ballRadius,
        );
        ballGrad.addColorStop(0, "#AFBAFF");
        ballGrad.addColorStop(0.5, "#DDA6F5");
        ballGrad.addColorStop(1, "#F8C1EE");

        ctx.fillStyle = ballGrad;
        ctx.beginPath();
        ctx.arc(bx, by, s.ballRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, bounceSpeed, gravityFactor, audioEnabled]);

  return (
    <div className="w-full flex items-center justify-center">
      <canvas
        ref={canvasRef}
        width={800}
        height={500}
        className="w-full max-w-4xl h-auto block cursor-pointer object-contain"
        onClick={() => setIsPlaying(!isPlaying)}
      />
    </div>
  );
}
