import type { MnemoApi } from "../shared/types";
declare global {
  interface Window {
    mnemo: MnemoApi;
  }
}
