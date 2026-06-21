const isMobile = () => typeof window !== "undefined" && window.innerWidth < 768;

export const getWelcomeSteps = (tour: any): any[] => [
  {
    id: "welcome-intro",
    title: "👋 Welcome to StudioFlow",
    text: "Let's take a quick look around before you initialize your workspace.",
    attachTo: isMobile() ? undefined : { element: "body", on: "center" },
    buttons: [
      { text: "Skip", classes: "shepherd-btn-secondary", action: tour.cancel },
      { text: "Next", classes: "shepherd-btn-primary", action: tour.next },
    ],
  },
  {
    id: "welcome-theme",
    title: "🎨 Select Your Theme",
    text: "StudioFlow adapts to your visual style. Click here to choose your preferred workspace theme before signing in.",
    // This targets the exact class we added to the Welcome Page!
    attachTo: {
      element: ".welcome-theme-trigger",
      on: isMobile() ? "bottom" : "left",
    },
    buttons: [
      { text: "Back", classes: "shepherd-btn-secondary", action: tour.back },
      {
        text: "Got It",
        classes: "shepherd-btn-primary",
        action: tour.complete,
      },
    ],
  },
];
