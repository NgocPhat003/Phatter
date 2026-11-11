import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { AtmosphericShield } from "../components/gateway/AtmosphericShield";

describe("AtmosphericShield (Cold-Start Gateway Interceptor)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("immediately drops the shield when initial probe responds fast (<450ms)", async () => {
    const onServerReady = vi.fn();
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
    } as Response);

    render(<AtmosphericShield onServerReady={onServerReady} />);

    // Flush the initial async fetch microtask
    await act(async () => {
      await Promise.resolve();
    });

    expect(onServerReady).toHaveBeenCalledTimes(1);
  });

  it("renders Cold Start HUD on unreachable server, polls every 3s, and unlocks once backend returns 200", async () => {
    const onServerReady = vi.fn();
    let callCount = 0;

    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      callCount++;
      if (callCount <= 4) {
        throw new Error("Connection refused - container waking");
      }
      return { ok: true, status: 200 } as Response;
    });

    render(<AtmosphericShield onServerReady={onServerReady} />);

    // Initial ping fails
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByText("Phatter Gateway Shield")).toBeInTheDocument();
    expect(screen.getByText("Atmospheric Shield Active")).toBeInTheDocument();
    expect(onServerReady).not.toHaveBeenCalled();

    // Advance 10 seconds to trigger Cold Start amber state + multiple 3s poll attempts
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(screen.getByText("Cold Start In Progress")).toBeInTheDocument();
    expect(screen.getByText("10s")).toBeInTheDocument();

    // Next 3s poll succeeds (callCount #5 returns 200 OK)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_000);
    });

    expect(screen.getByText("Gateway Connected")).toBeInTheDocument();
    expect(screen.getByText("200 OK (Live)")).toBeInTheDocument();

    // Disengage transition timers (600ms success display + 500ms CSS exit)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_200);
    });

    expect(onServerReady).toHaveBeenCalledTimes(1);
  });

  it("allows manual retry via Force Ping Now button", async () => {
    const onServerReady = vi.fn();
    let resolveNext = false;

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () => {
        if (!resolveNext) {
          throw new Error("Still sleeping");
        }
        return { ok: true, status: 200 } as Response;
      });

    render(<AtmosphericShield onServerReady={onServerReady} />);

    await act(async () => {
      await Promise.resolve();
    });

    const initialCalls = fetchSpy.mock.calls.length;
    resolveNext = true;

    const btn = screen.getByRole("button", { name: /force ping now/i });
    await act(async () => {
      fireEvent.click(btn);
      await Promise.resolve();
    });

    expect(fetchSpy.mock.calls.length).toBeGreaterThan(initialCalls);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_200);
    });

    expect(onServerReady).toHaveBeenCalledTimes(1);
  });
});
