import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  resetRetryMemory,
  RETRY_ATTEMPT_LIMIT,
  RETRY_COOLDOWNS_MS,
  RETRY_MEMORY_MS,
} from "@/components/hooks/use-guarded-retry";
import { ERROR_MESSAGE, EXHAUSTED_MESSAGE, RetryErrorView } from "@/components/layout/retry-error-view";

beforeEach(() => jest.useFakeTimers());
afterEach(() => {
  resetRetryMemory();
  jest.useRealTimers();
});

const user = () => userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
const retryButton = () => screen.getByRole("button", { name: "Retry" });

describe("RetryErrorView: guarded retry (AC-STE-5)", () => {
  it("retries once, then holds the button through a growing cooldown", async () => {
    const onRetry = jest.fn();
    render(<RetryErrorView onRetry={onRetry} />);
    await user().click(retryButton());
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(retryButton()).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("Still not working.");

    act(() => jest.advanceTimersByTime(RETRY_COOLDOWNS_MS[1] - 1));
    expect(retryButton()).toBeDisabled();
    act(() => jest.advanceTimersByTime(1));
    expect(retryButton()).toBeEnabled();

    await user().click(retryButton());
    expect(onRetry).toHaveBeenCalledTimes(2);
    act(() => jest.advanceTimersByTime(RETRY_COOLDOWNS_MS[1]));
    expect(retryButton()).toBeDisabled();
    act(() => jest.advanceTimersByTime(RETRY_COOLDOWNS_MS[2] - RETRY_COOLDOWNS_MS[1]));
    expect(retryButton()).toBeEnabled();
  });

  it(`says to come back later after ${RETRY_ATTEMPT_LIMIT} failed attempts`, async () => {
    render(<RetryErrorView onRetry={() => {}} />);
    expect(screen.getByText(ERROR_MESSAGE)).toBeInTheDocument();
    for (let i = 0; i < RETRY_ATTEMPT_LIMIT; i++) {
      await user().click(retryButton());
      act(() => jest.advanceTimersByTime(RETRY_COOLDOWNS_MS[2]));
    }
    expect(screen.getByText(EXHAUSTED_MESSAGE)).toBeInTheDocument();
    expect(retryButton()).toBeEnabled();
  });

  it("keeps the cooldown when a retry remounts the view", async () => {
    const { unmount } = render(<RetryErrorView onRetry={() => {}} />);
    await user().click(retryButton());
    unmount();
    render(<RetryErrorView onRetry={() => {}} />);
    expect(retryButton()).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("Still not working.");
    act(() => jest.advanceTimersByTime(RETRY_COOLDOWNS_MS[1]));
    expect(retryButton()).toBeEnabled();
  });

  it("forgets old attempts, so a later outage starts afresh", async () => {
    render(<RetryErrorView onRetry={() => {}} />);
    for (let i = 0; i < RETRY_ATTEMPT_LIMIT; i++) {
      await user().click(retryButton());
      act(() => jest.advanceTimersByTime(RETRY_COOLDOWNS_MS[2]));
    }
    expect(screen.getByText(EXHAUSTED_MESSAGE)).toBeInTheDocument();
    act(() => jest.advanceTimersByTime(RETRY_MEMORY_MS));
    expect(screen.getByText(ERROR_MESSAGE)).toBeInTheDocument();
  });

  it("uses tailored copy and label when given", () => {
    render(<RetryErrorView onRetry={() => {}} title="Held back" message="Not shown." retryLabel="Check again" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Held back");
    expect(screen.getByRole("button", { name: "Check again" })).toBeInTheDocument();
  });
});
