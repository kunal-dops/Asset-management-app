const router = require("../routes/aiRoutes");
const { detectIssue, buildLocalAnswer, inferScope, estimateTime } = router._internals;

describe("AI Troubleshooting Logic", () => {
  describe("detectIssue", () => {
    test("should detect power issues from keywords", () => {
      const result = detectIssue("battery is swelling and the screen is black");
      expect(result.label).toBe("Power / hardware");
      expect(result.severity).toBe("High");
      expect(result.matchedSignals).toContain("battery");
    });

    test("should detect network issues from keywords", () => {
      const result = detectIssue("wifi is slow and vpn disconnected");
      expect(result.label).toBe("Network");
      expect(result.matchedSignals).toContain("wifi");
    });

    test("should return fallback for vague descriptions", () => {
      const result = detectIssue("something is wrong with the computer");
      expect(result.label).toBe("General troubleshooting");
      expect(result.confidence).toBe(42);
    });
  });

  describe("Heuristics", () => {
    test("inferScope identifies site-wide issues", () => {
      expect(inferScope("everyone in the office cannot print")).toContain("Multiple users");
    });

    test("inferScope identifies individual issues", () => {
      expect(inferScope("only my laptop is broken")).toContain("isolated to one user");
    });

    test("estimateTime adjusts based on severity", () => {
      expect(estimateTime("Network", "Urgent")).toBe("15-30 minutes for first response");
      expect(estimateTime("Power", "High")).toBe("10-25 minutes for adapter/display isolation");
    });
  });

  describe("buildLocalAnswer", () => {
    test("constructs a complete technician plan for known issues", () => {
      const result = buildLocalAnswer({ 
        message: "laptop won't boot", 
        context: { userRole: "technician" } 
      });
      
      expect(result.source).toBe("local-technician");
      expect(result.category).toBe("Power / hardware");
      expect(result.solutionSteps.length).toBeGreaterThan(0);
      expect(result.nextAction).toContain("Try the first two fix steps");
    });

    test("marks priority as urgent for critical messages", () => {
      const result = buildLocalAnswer({ message: "CRITICAL: site down for everyone" });
      expect(result.severity).toBe("Urgent");
      expect(result.requestDraft.priority).toBe("urgent");
    });

    test("handles missing context gracefully", () => {
      const result = buildLocalAnswer({ message: "password reset" });
      expect(result.category).toBe("Login / access");
    });
  });
});