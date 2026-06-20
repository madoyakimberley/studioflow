export const RUNTIME_PRESETS = [
  { value: "javascript", label: "JavaScript / TypeScript" },
  { value: "python", label: "Python" },
  { value: "php", label: "PHP" },
  { value: "java", label: "Java" },
  { value: "csharp", label: "C#" },
  { value: "ruby", label: "Ruby" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
];

export const FRAMEWORK_OPTIONS: Record<
  string,
  Array<{ value: string; type: string; label: string }>
> = {
  javascript: [
    { value: "nextjs", type: "Fullstack", label: "Next.js" },
    { value: "react", type: "Frontend", label: "React (SPA)" },
    { value: "express", type: "Backend", label: "Node.js (Express)" },
    { value: "nestjs", type: "Backend", label: "NestJS" },
  ],
  python: [
    { value: "fastapi", type: "Backend", label: "FastAPI" },
    { value: "django", type: "Backend", label: "Django" },
  ],
  php: [{ value: "laravel", type: "Backend", label: "Laravel" }],
  java: [{ value: "springboot", type: "Backend", label: "Spring Boot" }],
  csharp: [{ value: "dotnet", type: "Backend", label: ".NET Core" }],
  ruby: [{ value: "rails", type: "Backend", label: "Ruby on Rails" }],
};

export const ESSENTIAL_DEPENDENCIES: Record<
  string,
  Array<{ name: string; version: string; desc: string }>
> = {
  javascript: [
    {
      name: "zod",
      version: "latest",
      desc: "The undisputed king of schema validation.",
    },
    {
      name: "fastify",
      version: "latest",
      desc: "Modern, extremely high-performance web framework.",
    },
    {
      name: "pino",
      version: "latest",
      desc: "The fastest JSON logger in the Node ecosystem.",
    },
    {
      name: "helmet",
      version: "latest",
      desc: "Plug-and-play security middleware for HTTP headers.",
    },
    {
      name: "cors",
      version: "latest",
      desc: "Absolute necessity for cross-origin frontend requests.",
    },
  ],
  python: [
    {
      name: "fastapi",
      version: "latest",
      desc: "Incredibly fast, auto-validates, auto-generates Swagger.",
    },
    {
      name: "celery",
      version: "latest",
      desc: "Industry standard for background jobs and async queues.",
    },
    {
      name: "httpx",
      version: "latest",
      desc: "Modern, fully async replacement for classic requests.",
    },
    {
      name: "tenacity",
      version: "latest",
      desc: "Legendary library for automatic retry logic.",
    },
    {
      name: "uvicorn",
      version: "latest",
      desc: "Lightning-fast ASGI web server implementation.",
    },
  ],
  php: [
    {
      name: "guzzlehttp/guzzle",
      version: "latest",
      desc: "Absolute standard HTTP client for PHP.",
    },
    {
      name: "nesbot/carbon",
      version: "latest",
      desc: "Ultimate DateTime extension for PHP.",
    },
    {
      name: "predis/predis",
      version: "latest",
      desc: "Go-to Redis client for session and cache.",
    },
    {
      name: "ramsey/uuid",
      version: "latest",
      desc: "Standard for generating universally unique identifiers.",
    },
    {
      name: "symfony/console",
      version: "latest",
      desc: "Gold standard for building CLI commands.",
    },
  ],
  java: [
    {
      name: "org.mapstruct:mapstruct",
      version: "latest",
      desc: "Remarkably fast object mapper (DTOs to Entities).",
    },
    {
      name: "org.flywaydb:flyway-core",
      version: "latest",
      desc: "Run strictly versioned SQL migration scripts.",
    },
    {
      name: "io.micrometer:micrometer-core",
      version: "latest",
      desc: "Standard for application observability.",
    },
    {
      name: "io.github.resilience4j:resilience4j-all",
      version: "latest",
      desc: "Fault-tolerance library (circuit breakers).",
    },
    {
      name: "org.apache.commons:commons-lang3",
      version: "latest",
      desc: "Essential utility belt for advanced manipulation.",
    },
  ],
  csharp: [
    {
      name: "MediatR",
      version: "latest",
      desc: "Standard for implementing the CQRS pattern.",
    },
    {
      name: "FluentValidation",
      version: "latest",
      desc: "Strongly typed, highly testable validation rules.",
    },
    {
      name: "AutoMapper",
      version: "latest",
      desc: "Most popular convention-based object mapper.",
    },
    {
      name: "Dapper",
      version: "latest",
      desc: "Lightning-fast micro-ORM by Stack Overflow.",
    },
    {
      name: "Refit",
      version: "latest",
      desc: "Turns REST APIs into live C# interfaces.",
    },
  ],
  ruby: [
    {
      name: "sidekiq",
      version: "latest",
      desc: "Heavyweight champion of background processing.",
    },
    {
      name: "devise",
      version: "latest",
      desc: "Ultimate, battle-tested authentication solution.",
    },
    {
      name: "faker",
      version: "latest",
      desc: "Essential for generating realistic dummy data.",
    },
    {
      name: "faraday",
      version: "latest",
      desc: "Flexible, powerful HTTP client library.",
    },
    {
      name: "pundit",
      version: "latest",
      desc: "Standard for implementing authorization.",
    },
  ],
};
