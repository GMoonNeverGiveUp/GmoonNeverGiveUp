import fs from "fs";
import path from "path";

export const ADDR: Record<string,string> = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "../../deployed-addresses.json"), "utf8")
);