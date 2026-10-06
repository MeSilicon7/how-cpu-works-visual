import { chapterMeta } from "~/lib/meta";
import { CpuSim } from "~/widgets/cpu-sim";

export const meta = () => chapterMeta("functions");

export default function Chapter() {
  return (
    <>
      <p>This chapter is being written.</p>
      <CpuSim programIds={["double-twice", "eat-yourself", "forgot-hlt"]} />
    </>
  );
}
