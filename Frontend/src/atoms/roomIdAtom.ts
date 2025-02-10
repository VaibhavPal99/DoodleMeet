import { atom } from "recoil";

export const roomIdAtom = atom<string>({
  key: "roomIdState",
  default: "",
});
