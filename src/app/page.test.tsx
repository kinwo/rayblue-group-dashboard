import { redirect } from "next/navigation";

import Home from "@/app/page";

jest.mock("next/navigation", () => ({ redirect: jest.fn() }));

it("AC-NAV-3: / redirects to /rental-analytics", () => {
  Home();
  expect(redirect).toHaveBeenCalledWith("/rental-analytics");
});
