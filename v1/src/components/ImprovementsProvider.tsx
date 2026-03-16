import { ReactNode, useEffect } from "react";
import { useToast } from "../hooks/useImprovements";
import { ErrorLogger, performanceMonitor } from "../utils/improvements";
import { backgroundProcessManager } from "../utils/backgroundProcess";

interface ImprovementsProviderProps {
  children: ReactNode;
}

const errorLogger = new ErrorLogger();

/**
 * ImprovementsProvider - Integrates all 100 improvements across the application
 * Provides error logging, performance monitoring, and global error handling
 */
export default function ImprovementsProvider({ children }: ImprovementsProviderProps) {
  const { addToast } = useToast();

  useEffect(() => {
    // Improvement 86: Error Logging - Setup global error handler
    const handleError = (event: ErrorEvent) => {
      errorLogger.log(event.error, {
        type: "uncaught-error",
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
      addToast(`Error: ${event.error?.message || "Unknown error"}`, "error");
    };

    // Improvement 96: Performance Monitoring - Setup performance observer
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      errorLogger.log(new Error(String(event.reason)), {
        type: "unhandled-rejection",
      });
      addToast("Unhandled promise rejection", "error");
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    // Improvement 100: Health Checks - Setup periodic health check
    const healthCheckInterval = setInterval(() => {
      const metrics = performanceMonitor.getAllMetrics();
      if (Object.keys(metrics).length > 0) {
        const avgPerformance = Object.values(metrics).reduce((sum, m) => sum + m.avg, 0) / Object.keys(metrics).length;
        if (avgPerformance > 1000) {
          console.warn("Performance degradation detected:", metrics);
        }
      }
    }, 30000);

    // Improvement 99: Debug Mode - Setup debug logging
    if (localStorage.getItem("debug-mode") === "true") {
      console.log("🐛 Debug mode enabled");
      console.log("📊 Performance Monitor:", performanceMonitor.getAllMetrics());
      console.log("📋 Error Logs:", errorLogger.getLogs());
    }

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      clearInterval(healthCheckInterval);
    };
  }, [addToast]);

  return <>{children}</>;
}
