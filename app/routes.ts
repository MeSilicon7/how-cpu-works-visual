import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  layout("routes/chapter-layout.tsx", [
    route("transistor", "routes/chapters/transistor.tsx"),
    route("binary", "routes/chapters/binary.tsx"),
    route("logic-gates", "routes/chapters/logic-gates.tsx"),
    route("adder", "routes/chapters/adder.tsx"),
    route("alu", "routes/chapters/alu.tsx"),
    route("memory", "routes/chapters/memory.tsx"),
    route("clock", "routes/chapters/clock.tsx"),
    route("cpu", "routes/chapters/cpu.tsx"),
    route("machine-code", "routes/chapters/machine-code.tsx"),
    route("storage", "routes/chapters/storage.tsx"),
    route("calculator", "routes/chapters/calculator.tsx"),
    route("graphics", "routes/chapters/graphics.tsx"),
    route("video", "routes/chapters/video.tsx"),
    route("network", "routes/chapters/network.tsx"),
  ]),
] satisfies RouteConfig;
