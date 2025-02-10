import { atom } from "recoil";

export const usernameAtom = atom<string>({
  key: "usernameState",
  default: "",
});
