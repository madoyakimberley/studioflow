"use client";

import { useEffect, useRef } from "react";
import "shepherd.js/dist/css/shepherd.css";
import { getWelcomeSteps } from "./welcomeTourSteps";

interface WelcomeTourEngineProps {
  tourActive: boolean;
  onComplete: () => void;
}

export default function WelcomeTourEngine({
  tourActive,
  onComplete,
}: WelcomeTourEngineProps) {
  const tourInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (!tourActive || typeof window === "undefined") return;

    import("shepherd.js").then((ShepherdModule) => {
      const Shepherd = ShepherdModule.default;
      const tour = new Shepherd.Tour({
        defaultStepOptions: {
          cancelIcon: { enabled: true },
          scrollTo: { behavior: "smooth", block: "center" },
          classes: "studioflow-shepherd-theme",
        },
        useModalOverlay: true,
      });

      tourInstanceRef.current = tour;
      tour.addSteps(getWelcomeSteps(tour));

      tour.on("complete", onComplete);
      tour.on("cancel", onComplete);

      // We add a tiny 500ms delay here to ensure the Framer Motion animations
      // on your Welcome Page finish playing before the tour tries to pop up!
      setTimeout(() => {
        tour.start();
      }, 500);

      const handleResize = () => {
        if (tour.isActive()) {
          const activeStep = Shepherd.activeTour?.getCurrentStep() as any;
          if (activeStep && activeStep.updateStep) {
            activeStep.updateStep();
          }
        }
      };

      window.addEventListener("resize", handleResize);
    });

    return () => {
      if (
        tourInstanceRef.current &&
        typeof tourInstanceRef.current.destroy === "function"
      ) {
        tourInstanceRef.current.destroy();
      }
    };
  }, [tourActive, onComplete]);

  return null;
}
