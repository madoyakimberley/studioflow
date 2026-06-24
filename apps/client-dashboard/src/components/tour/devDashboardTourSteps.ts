const isMobile = () => typeof window !== "undefined" && window.innerWidth < 768;

interface TourActionProps {
  openWizardModal: () => void;
}

export const getDevDashboardSteps = (
  tour: any,
  { openWizardModal }: TourActionProps,
): any[] => [
  {
    id: "dev-welcome",
    title: "👨‍💻 Developer Console Active",
    text: "Welcome to your StudioFlow v2.0 console. Let's review your core framework, theme matrix profiles, and automated compilation pipelines.",
    attachTo: isMobile() ? undefined : { element: "body", on: "center" },
    buttons: [
      {
        text: "Skip Tour",
        classes: "shepherd-btn-secondary",
        action: tour.cancel,
      },
      { text: "Next", classes: "shepherd-btn-primary", action: tour.next },
    ],
  },
  {
    id: "dev-theme-system",
    title: "🎨 Live Theme Telemetry Matrix",
    text: "This switch maps structural style parameters directly into the compilation layers. Switch themes here anytime.",
    attachTo: {
      element: ".dev-theme-trigger",
      on: isMobile() ? "bottom" : "right",
    },
    buttons: [
      { text: "Back", classes: "shepherd-btn-secondary", action: tour.back },
      { text: "Next Step", classes: "shepherd-btn-primary", action: tour.next },
    ],
  },
  {
    id: "dev-navigation-links",
    title: "🎛️ Navigation Systems Matrix",
    text: "Monitor isolated edge network frames, running container nodes, and user data telemetry routes from this matrix.",
    attachTo: { element: ".dev-nav-matrix", on: isMobile() ? "top" : "right" },
    buttons: [
      { text: "Back", classes: "shepherd-btn-secondary", action: tour.back },
      { text: "Next", classes: "shepherd-btn-primary", action: tour.next },
    ],
  },
  {
    id: "dev-scaffold-trigger-step",
    title: "🏗️ Continuous Scaffolding Engine",
    text: "Clicking here kicks off the multi-step structural repository builder. Let's step directly inside to configure an architecture stack.",
    attachTo: { element: ".dev-scaffold-trigger", on: "top" },
    buttons: [
      { text: "Back", classes: "shepherd-btn-secondary", action: tour.back },
      {
        text: "Open Wizard",
        classes: "shepherd-btn-primary",
        action: function () {
          openWizardModal();
          setTimeout(() => {
            tour.next();
          }, 600); // Wait for modal mount and animation
        },
      },
    ],
  },
  {
    id: "wizard-details-step",
    title: "📋 Workspace Configuration",
    text: "Input repository names and deployment providers here. When you are ready, click Next to advance the wizard.",
    attachTo: { element: ".wizard-meta-fields", on: "bottom" },
    buttons: [
      {
        text: "Skip",
        classes: "shepherd-btn-secondary",
        action: tour.cancel,
      },
      {
        text: "Next Step",
        classes: "shepherd-btn-primary",
        action: function () {
          const continueBtn = document.querySelector(
            ".wizard-continue-btn",
          ) as HTMLButtonElement;
          if (continueBtn) {
            continueBtn.click();
            setTimeout(() => tour.next(), 600); // Delay increased for framer-motion transitions
          } else {
            tour.next();
          }
        },
      },
    ],
  },
  {
    id: "wizard-apps-step",
    title: "⚡ Microservice Endpoint Matrices",
    text: "Provision and map runtime components out across isolated container groups.",
    attachTo: {
      element: ".wizard-apps-container",
      on: "top",
    },
    buttons: [
      {
        text: "Back",
        classes: "shepherd-btn-secondary",
        action: function () {
          const backBtn = document.querySelector(
            ".wizard-back-btn",
          ) as HTMLButtonElement;
          if (backBtn) {
            backBtn.click();
            setTimeout(() => tour.back(), 600);
          } else {
            tour.back();
          }
        },
      },
      {
        text: "Next Step",
        classes: "shepherd-btn-primary",
        action: function () {
          const continueBtn = document.querySelector(
            ".wizard-continue-btn",
          ) as HTMLButtonElement;
          if (continueBtn) {
            continueBtn.click();
            setTimeout(() => tour.next(), 600);
          } else {
            tour.next();
          }
        },
      },
    ],
  },
  {
    id: "wizard-packages-step",
    title: "📦 Core Performance Extensions",
    text: "Inject optimization engines like key-value caching nodes into your stack configurations.",
    attachTo: {
      element: ".wizard-packages-grid",
      on: "top",
    },
    buttons: [
      {
        text: "Back",
        classes: "shepherd-btn-secondary",
        action: function () {
          const backBtn = document.querySelector(
            ".wizard-back-btn",
          ) as HTMLButtonElement;
          if (backBtn) {
            backBtn.click();
            setTimeout(() => tour.back(), 600);
          } else {
            tour.back();
          }
        },
      },
      {
        text: "Next Step",
        classes: "shepherd-btn-primary",
        action: function () {
          const continueBtn = document.querySelector(
            ".wizard-continue-btn",
          ) as HTMLButtonElement;
          if (continueBtn) {
            continueBtn.click();
            setTimeout(() => tour.next(), 600);
          } else {
            tour.next();
          }
        },
      },
    ],
  },
  {
    id: "wizard-review-step",
    title: "🚀 Automated Infrastructure Compilation",
    text: "Analyze your final command stream parameters. If the blueprint aligns, you're ready to execute deployment compilation!",
    attachTo: { element: ".wizard-review-terminal", on: "top" },
    buttons: [
      {
        text: "Finish Tour",
        classes: "shepherd-btn-primary",
        action: tour.complete,
      },
    ],
  },
];
