import { useEffect } from "react";

const NotFound = () => {
  useEffect(() => {
    // The SPA answers unknown paths with HTTP 200; keep them out of search indexes.
    const previousTitle = document.title;
    document.title = "Page not found | PromptGrade";
    const robots = document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex";
    document.head.appendChild(robots);
    return () => {
      robots.remove();
      document.title = previousTitle;
    };
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold text-foreground">Page not found</h1>
        <p className="mb-4 text-muted-foreground">This page doesn&apos;t exist.</p>
        <a href="/" className="text-primary underline hover:text-primary/90">
          Go to PromptGrade
        </a>
      </div>
    </div>
  );
};

export default NotFound;
