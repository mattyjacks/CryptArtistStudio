// ---------------------------------------------------------------------------
// Reusable loading spinner component
// ---------------------------------------------------------------------------

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  message?: string;
  fullScreen?: boolean;
}

const sizes = {
  sm: "w-5 h-5 border-2",
  md: "w-8 h-8 border-[3px]",
  lg: "w-12 h-12 border-4",
};

export default function LoadingSpinner({ size = "md", message, fullScreen }: LoadingSpinnerProps) {
  const spinner = (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        className={`${sizes[size]} border-studio-border border-t-studio-cyan rounded-full animate-spin`}
      />
      {message && <p className="text-xs text-studio-muted animate-pulse">{message}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-studio-bg">
        {spinner}
      </div>
    );
  }

  return spinner;
}
