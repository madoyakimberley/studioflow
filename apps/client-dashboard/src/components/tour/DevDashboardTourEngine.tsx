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
  const tourInstanceRef = useRef<any>(null);

  // Use a ref for callbacks so we don't need them in the useEffect dependency array
  // This completely stops the infinite looping issue if the parent component re-renders.
  const callbacksRef = useRef({ openWizardModal, onTourComplete });
  useEffect(() => {
    callbacksRef.current = { openWizardModal, onTourComplete };
  }, [openWizardModal, onTourComplete]);

  useEffect(() => {
    if (!onboardingActive || typeof window === "undefined") return;

    let isMounted = true;

    import("shepherd.js").then((ShepherdModule) => {
      if (!isMounted) return;
      const Shepherd = ShepherdModule.default;

      // Clean up any rogue tours before starting a new one
      if (Shepherd.activeTour) {
        Shepherd.activeTour.cancel();
      }

      const tour = new Shepherd.Tour({
        defaultStepOptions: {
          cancelIcon: { enabled: true },
          scrollTo: { behavior: "smooth", block: "center" },
          classes: "studioflow-shepherd-theme",
        },
        useModalOverlay: true,
      });

      tourInstanceRef.current = tour;

      const steps = getDevDashboardSteps(tour, {
        openWizardModal: () => callbacksRef.current.openWizardModal(),
      });

      tour.addSteps(steps);

      tour.on("complete", () => callbacksRef.current.onTourComplete());
      tour.on("cancel", () => callbacksRef.current.onTourComplete());

      tour.start();

      const handleWindowResizeUpdate = () => {
        if (tour.isActive()) {
          const activeStep = Shepherd.activeTour?.getCurrentStep() as any;
          if (activeStep && activeStep.updateStep) {
            activeStep.updateStep();
          }
        }
      };

      window.addEventListener("resize", handleWindowResizeUpdate);
    });

    return () => {
      isMounted = false;
      if (
        tourInstanceRef.current &&
        typeof tourInstanceRef.current.cancel === "function"
      ) {
        tourInstanceRef.current.cancel();
      }
    };
  }, [onboardingActive]); // Safely omitted the callbacks to stop the loop

  return null;
}
