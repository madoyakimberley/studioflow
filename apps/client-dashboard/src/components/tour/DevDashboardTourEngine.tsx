"use client";

import { useEffect, useRef } from "react";
import "shepherd.js/dist/css/shepherd.css";
import { getDevDashboardSteps } from "./devDashboardTourSteps";

interface DevDashboardTourEngineProps {
  onboardingActive: boolean;
  openWizardModal: () => void;
  onTourComplete: () => void;
}

export default function DevDashboardTourEngine({
  onboardingActive,
  openWizardModal,
  onTourComplete,
}: DevDashboardTourEngineProps) {
  // FIXED: Changed to <any> to bypass TypeScript's strict Shepherd class definitions
  const tourInstanceRef = useRef<any>(null);

  useEffect(() => {
    // FIXED: Ensure this never runs on the Next.js server (prevents window is not defined errors)
    if (!onboardingActive || typeof window === "undefined") return;

    // FIXED: Dynamically import Shepherd so it only initializes in the browser
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

      // Pass the tour instance to your steps
      const steps = getDevDashboardSteps(tour, { openWizardModal });
      tour.addSteps(steps);

      tour.on("complete", onTourComplete);
      tour.on("cancel", onTourComplete);

      tour.start();

      const handleWindowResizeUpdate = () => {
        if (tour.isActive()) {
          // FIXED: Cast the active step to 'any' so TypeScript allows the updateStep() method
          const activeStep = Shepherd.activeTour?.getCurrentStep() as any;
          if (activeStep && activeStep.updateStep) {
            activeStep.updateStep();
          }
        }
      };

      window.addEventListener("resize", handleWindowResizeUpdate);
    });

    return () => {
      // FIXED: Safely check for the destroy method before calling it
      if (
        tourInstanceRef.current &&
        typeof tourInstanceRef.current.destroy === "function"
      ) {
        tourInstanceRef.current.destroy();
      }
    };
  }, [onboardingActive, openWizardModal, onTourComplete]);

  return null;
}
